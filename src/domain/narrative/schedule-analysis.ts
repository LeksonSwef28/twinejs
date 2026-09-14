import {NarrativeProject} from './project';
import {RoutineRule} from './schedule';
import {routineWindowForDay} from './world-time';

export interface NarrativeScheduleConflictFinding {
	id: string;
	kind: 'routine-overlap';
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

/**
 * A48 author-facing schedule analysis. It expands authored RoutineRule intent
 * into deterministic absolute windows, then reports temporal overlaps for the
 * same character. It never chooses a winning rule and never writes Actual
 * Presence. ScheduleExceptions are deliberately excluded because their
 * priority/override semantics are different from ordinary recurring intent.
 */
export function analyzeNarrativeScheduleConflicts(
	project: NarrativeProject
): NarrativeScheduleAnalysis {
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

	return {findings};
}
