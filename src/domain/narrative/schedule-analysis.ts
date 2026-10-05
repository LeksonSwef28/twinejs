import {minutesPerDay} from './calendar';
import {NarrativeProject} from './project';
import {RoutineRule, ScheduleException} from './schedule';
import {routineWindowForDay} from './world-time';

export interface NarrativeScheduleConflictFinding {
	id: string;
	kind: 'routine-overlap' | 'schedule-exception-ambiguity';
	severity: 'warning';
	summary: string;
	characterId: string;
	ruleIds: [string, string];
	authoredDays: [number, number];
	overlap: {start: number; end: number};
}

export interface NarrativeScheduleAnalysis {
	findings: NarrativeScheduleConflictFinding[];
}

interface ExpandedRoutineWindow {
	rule: RoutineRule;
	authoredDay: number;
	start: number;
	end: number;
}

interface ExpandedScheduleExceptionWindow {
	exception: ScheduleException;
	authoredDay: number;
	start: number;
	end: number;
}

function locationIntent(rule: RoutineRule, project: NarrativeProject) {
	if (rule.absent) {
		return 'отсутствие';
	}
	if (rule.targetLocationId) {
		return (
			project.locations.find(location => location.id === rule.targetLocationId)?.name ??
			`локация ${rule.targetLocationId}`
		);
	}
	return 'без целевой локации';
}

function expandRoutineWindows(project: NarrativeProject) {
	const byCharacter = new Map<string, ExpandedRoutineWindow[]>();
	for (const rule of project.routineRules) {
		for (let day = 1; day <= project.template.dayCount; day++) {
			const window = routineWindowForDay(
				rule,
				day,
				project.template.periods,
				project.template.day1Weekday
			);
			if (!window || window.end <= window.start) {
				continue;
			}
			const expanded: ExpandedRoutineWindow = {
				rule,
				authoredDay: day,
				start: window.start,
				end: window.end
			};
			const existing = byCharacter.get(rule.characterId);
			if (existing) {
				existing.push(expanded);
			} else {
				byCharacter.set(rule.characterId, [expanded]);
			}
		}
	}
	return byCharacter;
}

function exceptionWindowForDay(
	project: NarrativeProject,
	exception: ScheduleException,
	day: number
) {
	if (
		day < exception.activeRange.fromDay ||
		(exception.activeRange.toDay !== undefined && day > exception.activeRange.toDay)
	) {
		return undefined;
	}

	const dayStart = (day - 1) * minutesPerDay;
	const window = exception.timeWindow;
	if (window?.type === 'exact') {
		const inferredOffset = window.endMinute < window.startMinute ? 1 : 0;
		const endDayOffset = window.endDayOffset ?? inferredOffset;
		return {
			start: dayStart + window.startMinute,
			end: dayStart + endDayOffset * minutesPerDay + window.endMinute
		};
	}

	const periodId = window?.type === 'period' ? window.periodId : exception.periodId;
	const period = project.template.periods.find(candidate => candidate.id === periodId);
	if (!period) {
		return undefined;
	}
	return {
		start: dayStart + period.startMinute,
		end:
			dayStart +
			(period.endMinute <= period.startMinute ? minutesPerDay : 0) +
			period.endMinute
	};
}

function expandScheduleExceptionWindows(project: NarrativeProject) {
	const byCharacter = new Map<string, ExpandedScheduleExceptionWindow[]>();
	for (const exception of project.scheduleExceptions) {
		const firstDay = Math.max(1, exception.activeRange.fromDay);
		const lastDay = Math.min(
			project.template.dayCount,
			exception.activeRange.toDay ?? project.template.dayCount
		);
		for (let day = firstDay; day <= lastDay; day++) {
			const window = exceptionWindowForDay(project, exception, day);
			if (!window || window.end <= window.start) {
				continue;
			}
			const expanded: ExpandedScheduleExceptionWindow = {
				exception,
				authoredDay: day,
				start: window.start,
				end: window.end
			};
			const existing = byCharacter.get(exception.characterId);
			if (existing) {
				existing.push(expanded);
			} else {
				byCharacter.set(exception.characterId, [expanded]);
			}
		}
	}
	return byCharacter;
}

function routineOverlapFindings(project: NarrativeProject) {
	const findings: NarrativeScheduleConflictFinding[] = [];
	const windowsByCharacter = expandRoutineWindows(project);

	for (const [characterId, windows] of windowsByCharacter) {
		windows.sort(
			(a, b) =>
				a.start - b.start ||
				a.end - b.end ||
				a.rule.id.localeCompare(b.rule.id) ||
				a.authoredDay - b.authoredDay
		);

		for (let leftIndex = 0; leftIndex < windows.length; leftIndex++) {
			const left = windows[leftIndex];
			for (let rightIndex = leftIndex + 1; rightIndex < windows.length; rightIndex++) {
				const right = windows[rightIndex];
				if (right.start >= left.end) {
					break;
				}
				if (left.rule.id === right.rule.id || right.end <= left.start) {
					continue;
				}
				const overlap = {
					start: Math.max(left.start, right.start),
					end: Math.min(left.end, right.end)
				};
				if (overlap.end <= overlap.start) {
					continue;
				}
				const [firstRuleId, secondRuleId] = [left.rule.id, right.rule.id].sort();
				findings.push({
					id: `schedule-overlap:${characterId}:${firstRuleId}:${secondRuleId}:${overlap.start}:${overlap.end}`,
					kind: 'routine-overlap',
					severity: 'warning',
					summary: `Расписания «${left.rule.id}» (${locationIntent(
						left.rule,
						project
					)}) и «${right.rule.id}» (${locationIntent(
						right.rule,
						project
					)}) одновременно занимают время одного персонажа.`,
					characterId,
					ruleIds: [firstRuleId, secondRuleId],
					authoredDays: [left.authoredDay, right.authoredDay],
					overlap
				});
			}
		}
	}

	return findings;
}

interface ScheduleExceptionAmbiguitySegment {
	first: ExpandedScheduleExceptionWindow;
	second: ExpandedScheduleExceptionWindow;
	start: number;
	end: number;
}

function scheduleExceptionAmbiguityFindings(project: NarrativeProject) {
	const findings: NarrativeScheduleConflictFinding[] = [];
	const windowsByCharacter = expandScheduleExceptionWindows(project);

	for (const [characterId, windows] of windowsByCharacter) {
		const boundaries = [...new Set(windows.flatMap(window => [window.start, window.end]))].sort(
			(a, b) => a - b
		);
		const segmentsByPair = new Map<string, ScheduleExceptionAmbiguitySegment[]>();

		for (let boundaryIndex = 0; boundaryIndex < boundaries.length - 1; boundaryIndex++) {
			const start = boundaries[boundaryIndex];
			const end = boundaries[boundaryIndex + 1];
			if (end <= start) {
				continue;
			}
			const active = windows.filter(window => window.start < end && window.end > start);
			if (active.length < 2) {
				continue;
			}
			const maximumPriority = Math.max(
				...active.map(window => window.exception.priority)
			);
			const winners = active
				.filter(window => window.exception.priority === maximumPriority)
				.sort(
					(a, b) =>
						a.exception.id.localeCompare(b.exception.id) ||
						a.authoredDay - b.authoredDay
				);

			for (let leftIndex = 0; leftIndex < winners.length; leftIndex++) {
				for (let rightIndex = leftIndex + 1; rightIndex < winners.length; rightIndex++) {
					const first = winners[leftIndex];
					const second = winners[rightIndex];
					if (first.exception.id === second.exception.id) {
						continue;
					}
					const key = `${first.exception.id}:${first.authoredDay}:${second.exception.id}:${second.authoredDay}`;
					const segments = segmentsByPair.get(key) ?? [];
					const previous = segments[segments.length - 1];
					if (previous?.end === start) {
						previous.end = end;
					} else {
						segments.push({first, second, start, end});
					}
					segmentsByPair.set(key, segments);
				}
			}
		}

		for (const segments of segmentsByPair.values()) {
			for (const segment of segments) {
				const firstId = segment.first.exception.id;
				const secondId = segment.second.exception.id;
				const priority = segment.first.exception.priority;
				findings.push({
					id: `schedule-exception-ambiguity:${characterId}:${firstId}:${secondId}:${segment.start}:${segment.end}`,
					kind: 'schedule-exception-ambiguity',
					severity: 'warning',
					summary: `Schedule exceptions «${firstId}» и «${secondId}» одновременно имеют максимальный priority ${priority}; authored-присутствие персонажа неоднозначно.`,
					characterId,
					ruleIds: [firstId, secondId],
					authoredDays: [segment.first.authoredDay, segment.second.authoredDay],
					overlap: {start: segment.start, end: segment.end}
				});
			}
		}
	}

	return findings;
}

/**
 * A48 author-facing schedule analysis. It reports conflicting recurring intent
 * and ambiguous ScheduleException priority ties without choosing a winner or
 * writing Actual Presence. Different-priority exceptions are valid overrides;
 * only simultaneous maximum-priority ties are ambiguous.
 */
export function analyzeNarrativeScheduleConflicts(
	project: NarrativeProject
): NarrativeScheduleAnalysis {
	return {
		findings: [
			...routineOverlapFindings(project),
			...scheduleExceptionAmbiguityFindings(project)
		]
	};
}
