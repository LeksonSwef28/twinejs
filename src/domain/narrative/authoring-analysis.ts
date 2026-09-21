import {minutesPerDay} from './calendar';
import {NarrativeConditionDefinition, NarrativeMoveDefinition} from './interaction';
import {
	evaluateNarrativeGuards,
	NarrativeRuntimeEvaluationContext
} from './interaction-runtime';
import {NarrativeProject} from './project';
import {ScheduleException} from './schedule';
import {storyCommunicationIsValid} from './story';
import {routineWindowForDay} from './world-time';

export type NarrativeAuthoringFindingKind =
	| 'impossible-guard-set'
	| 'unknown-guard'
	| 'missing-story-participant'
	| 'partial-story-placement'
	| 'invalid-story-placement'
	| 'invalid-story-communication'
	| 'runtime-policy-without-exact-placement'
	| 'story-schedule-location-conflict'
	| 'story-participant-schedule-gap';

export interface NarrativeAuthoringFinding {
	id: string;
	kind: NarrativeAuthoringFindingKind;
	severity: 'warning' | 'info';
	summary: string;
	storyNodeId?: string;
	moveId?: string;
	characterId?: string;
	guardId?: string;
	guardIds?: string[];
	ruleIds?: string[];
	centerAbsoluteMinute?: number;
}

export interface NarrativeAuthoringAnalysisResult {
	findings: NarrativeAuthoringFinding[];
}

function conditionKey(condition: NarrativeConditionDefinition) {
	switch (condition.type) {
		case 'character-knows-claim':
			return `knows:${condition.characterId}:${condition.claimId}`;
		case 'character-has-item':
			return `item:${condition.characterId}:${condition.itemInstanceId}`;
		case 'relationship-at-least':
			return `relationship:${condition.fromCharacterId}:${condition.toCharacterId}:${condition.axis}:${condition.value}`;
		case 'story-node-state':
			return `story-state:${condition.storyNodeId}:${condition.state}`;
		case 'characters-share-location':
			return `share-location:${[...condition.characterIds].sort().join(',')}`;
	}
}

function conditionCharacterId(condition: NarrativeConditionDefinition) {
	switch (condition.type) {
		case 'character-knows-claim':
		case 'character-has-item':
			return condition.characterId;
		case 'relationship-at-least':
			return condition.fromCharacterId;
		default:
			return undefined;
	}
}

function conditionReferencesExist(
	project: NarrativeProject,
	condition: NarrativeConditionDefinition
) {
	const hasCharacter = (id: string) =>
		project.characters.some(character => character.id === id);
	switch (condition.type) {
		case 'character-knows-claim':
			return (
				hasCharacter(condition.characterId) &&
				project.claims.some(claim => claim.id === condition.claimId)
			);
		case 'character-has-item':
			return (
				hasCharacter(condition.characterId) &&
				project.itemInstances.some(item => item.id === condition.itemInstanceId)
			);
		case 'relationship-at-least':
			return (
				hasCharacter(condition.fromCharacterId) &&
				hasCharacter(condition.toCharacterId)
			);
		case 'story-node-state':
			return project.storyNodes.some(node => node.id === condition.storyNodeId);
		case 'characters-share-location':
			return condition.characterIds.every(hasCharacter);
	}
}

function exactPlacementIsValid(
	project: NarrativeProject,
	placement: {day?: number; minuteOfDay?: number} | undefined
) {
	return (
		placement?.day !== undefined &&
		placement.minuteOfDay !== undefined &&
		Number.isInteger(placement.day) &&
		placement.day >= 1 &&
		placement.day <= project.template.dayCount &&
		Number.isInteger(placement.minuteOfDay) &&
		placement.minuteOfDay >= 0 &&
		placement.minuteOfDay < minutesPerDay
	);
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
	const window = exception.timeWindow;
	const dayStart = (day - 1) * minutesPerDay;
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

interface ScheduledPresenceSource {
	kind: 'routine' | 'exception';
	id: string;
	targetLocationId?: string;
	absent?: boolean;
}

type ScheduledPresenceResolution =
	| {status: 'resolved'; source: ScheduledPresenceSource}
	| {status: 'gap'}
	| {status: 'ambiguous'}
	| {status: 'not-authored'};

function scheduledPresenceAt(
	project: NarrativeProject,
	characterId: string,
	absoluteMinute: number
): ScheduledPresenceResolution {
	const day = Math.floor(absoluteMinute / minutesPerDay) + 1;
	const candidateDays = [day - 1, day].filter(candidate => candidate >= 1);
	const characterExceptions = project.scheduleExceptions.filter(
		exception => exception.characterId === characterId
	);
	const matchingExceptions = characterExceptions.filter(exception =>
		candidateDays.some(candidateDay => {
			const window = exceptionWindowForDay(project, exception, candidateDay);
			return Boolean(
				window && absoluteMinute >= window.start && absoluteMinute < window.end
			);
		})
	);
	if (matchingExceptions.length > 0) {
		const maximumPriority = Math.max(...matchingExceptions.map(item => item.priority));
		const winners = matchingExceptions.filter(item => item.priority === maximumPriority);
		if (winners.length !== 1) {
			return {status: 'ambiguous'};
		}
		return {
			status: 'resolved',
			source: {
				kind: 'exception',
				id: winners[0].id,
				targetLocationId: winners[0].targetLocationId,
				absent: winners[0].absent
			}
		};
	}

	const characterRules = project.routineRules.filter(rule => rule.characterId === characterId);
	const matchingRules = characterRules.filter(rule =>
		candidateDays.some(candidateDay => {
			const window = routineWindowForDay(
				rule,
				candidateDay,
				project.template.periods,
				project.template.day1Weekday
			);
			return Boolean(
				window && absoluteMinute >= window.start && absoluteMinute < window.end
			);
		})
	);
	if (matchingRules.length > 1) {
		return {status: 'ambiguous'};
	}
	if (matchingRules.length === 1) {
		const rule = matchingRules[0];
		return {
			status: 'resolved',
			source: {
				kind: 'routine',
				id: rule.id,
				targetLocationId: rule.targetLocationId,
				absent: rule.absent
			}
		};
	}
	return characterRules.length > 0 || characterExceptions.length > 0
		? {status: 'gap'}
		: {status: 'not-authored'};
}

function moveStructuralFindings(project: NarrativeProject, move: NarrativeMoveDefinition) {
	const findings: NarrativeAuthoringFinding[] = [];
	const storyNode = project.storyNodes.find(node => node.id === move.storyNodeId);
	if (!storyNode) {
		return findings;
	}

	const guardsByCondition = new Map<
		string,
		{positive: string[]; negative: string[]}
	>();
	for (const guard of move.guards) {
		const key = conditionKey(guard.condition);
		const group = guardsByCondition.get(key) ?? {positive: [], negative: []};
		(guard.negated ? group.negative : group.positive).push(guard.id);
		guardsByCondition.set(key, group);
	}
	for (const [key, group] of guardsByCondition) {
		if (group.positive.length === 0 || group.negative.length === 0) {
			continue;
		}
		const guardIds = [...group.positive, ...group.negative].sort();
		findings.push({
			id: `authoring:impossible-guards:${move.id}:${key}`,
			kind: 'impossible-guard-set',
			severity: 'warning',
			summary: `Move «${move.label}» одновременно требует условие и его отрицание.`,
			storyNodeId: move.storyNodeId,
			moveId: move.id,
			guardIds
		});
	}

	const authoredParticipants = new Set(storyNode.participantIds);
	if (storyNode.primaryCharacterId) {
		authoredParticipants.add(storyNode.primaryCharacterId);
	}
	const moveParticipants = [move.actorCharacterId, ...move.targetCharacterIds].filter(
		(id): id is string => Boolean(id)
	);
	for (const characterId of [...new Set(moveParticipants)].sort()) {
		if (
		authoredParticipants.has(characterId) ||
		!project.characters.some(character => character.id === characterId)
		) {
			continue;
		}
		findings.push({
			id: `authoring:missing-participant:${move.id}:${characterId}`,
			kind: 'missing-story-participant',
			severity: 'warning',
			summary: `Персонаж Move «${move.label}» не указан участником Story «${storyNode.title}».`,
			storyNodeId: storyNode.id,
			moveId: move.id,
			characterId
		});
	}
	return findings;
}

function storyPlacementFindings(project: NarrativeProject) {
	const findings: NarrativeAuthoringFinding[] = [];
	for (const node of project.storyNodes) {
		const placement = node.placement;
		const hasDay = placement?.day !== undefined;
		const hasMinute = placement?.minuteOfDay !== undefined;
		const validExact = exactPlacementIsValid(project, placement);
		if (
			node.communication !== undefined &&
			!storyCommunicationIsValid(node.communication)
		) {
			findings.push({
				id: `authoring:invalid-communication:${node.id}`,
				kind: 'invalid-story-communication',
				severity: 'warning',
				summary: `Story «${node.title}» имеет неизвестный канал связи.`,
				storyNodeId: node.id
			});
		}
		if (hasDay !== hasMinute) {
			findings.push({
				id: `authoring:partial-placement:${node.id}`,
				kind: 'partial-story-placement',
				severity: 'warning',
				summary: `Story «${node.title}» имеет неполное точное время: день и минута должны задаваться вместе.`,
				storyNodeId: node.id
			});
		}
		if (hasDay && hasMinute && !validExact) {
			findings.push({
				id: `authoring:invalid-placement:${node.id}`,
				kind: 'invalid-story-placement',
				severity: 'warning',
				summary: `Story «${node.title}» размещён за пределами допустимого календаря проекта.`,
				storyNodeId: node.id
			});
		}
		if (node.runtimePolicy && !validExact) {
			findings.push({
				id: `authoring:runtime-policy-placement:${node.id}`,
				kind: 'runtime-policy-without-exact-placement',
				severity: 'warning',
				summary: `Runtime policy Story «${node.title}» требует корректного точного времени.`,
				storyNodeId: node.id
			});
		}
		if (!validExact || !placement) {
			continue;
		}
		// Locationless SMS/calls are remote communication, not physical co-presence.
		if (node.communication && !placement.locationId) {
			continue;
		}
		const absoluteMinute =
			(placement.day! - 1) * minutesPerDay + placement.minuteOfDay!;
		const participants = new Set(node.participantIds);
		if (node.primaryCharacterId) {
			participants.add(node.primaryCharacterId);
		}
		for (const characterId of [...participants].sort()) {
			if (!project.characters.some(character => character.id === characterId)) {
				continue;
			}
			const presence = scheduledPresenceAt(project, characterId, absoluteMinute);
			if (presence.status === 'gap') {
				findings.push({
					id: `authoring:schedule-gap:${node.id}:${characterId}`,
					kind: 'story-participant-schedule-gap',
					severity: 'info',
					summary: `Участник Story «${node.title}» не имеет authored-присутствия на этот момент.`,
					storyNodeId: node.id,
					characterId,
					centerAbsoluteMinute: absoluteMinute
				});
				continue;
			}
			if (presence.status !== 'resolved') {
				continue;
			}
			const source = presence.source;
			const targetLocationExists =
				!source.targetLocationId ||
				project.locations.some(location => location.id === source.targetLocationId);
			const storyLocationExists =
				!placement.locationId ||
				project.locations.some(location => location.id === placement.locationId);
			const locationConflict = Boolean(
				placement.locationId &&
				source.targetLocationId &&
				targetLocationExists &&
				storyLocationExists &&
				placement.locationId !== source.targetLocationId
			);
			if (!source.absent && !locationConflict) {
				continue;
			}
			findings.push({
				id: `authoring:story-schedule-conflict:${node.id}:${characterId}:${source.kind}:${source.id}`,
				kind: 'story-schedule-location-conflict',
				severity: 'warning',
				summary: source.absent
					? `Участник Story «${node.title}» помечен отсутствующим в authored-расписании.`
					: `Локация участника по расписанию конфликтует с локацией Story «${node.title}».`,
				storyNodeId: node.id,
				characterId,
				ruleIds: [source.id],
				centerAbsoluteMinute: absoluteMinute
			});
		}
	}
	return findings;
}

/** Read-only authored diagnostics. Preview/runtime state is intentionally excluded. */
export function analyzeNarrativeAuthoring(
	project: NarrativeProject
): NarrativeAuthoringAnalysisResult {
	return {
		findings: [
			...project.narrativeMoves.flatMap(move => moveStructuralFindings(project, move)),
			...storyPlacementFindings(project)
		]
	};
}

function runtimeContext(project: NarrativeProject): NarrativeRuntimeEvaluationContext {
	return {
		characterKnowledge: project.simulation.characterKnowledge,
		itemInstances: project.itemInstances,
		relationships: project.relationships,
		storyNodes: project.storyNodes,
		actualLocationByCharacter: project.simulation.actualLocationByCharacter
	};
}

/**
 * Preview-dependent diagnostics stay out of project-wide authored validation.
 * They explain why a valid authored guard cannot currently be evaluated.
 */
export function analyzeUnknownNarrativeGuards(
	project: NarrativeProject,
	moves: NarrativeMoveDefinition[] = project.narrativeMoves
): NarrativeAuthoringFinding[] {
	const context = runtimeContext(project);
	return moves.flatMap(move => {
		const traces = evaluateNarrativeGuards(move.guards, context).traces;
		return traces.flatMap((trace, index) => {
			const guard = move.guards[index];
			if (
				trace.status !== 'unknown' ||
				!guard ||
				!conditionReferencesExist(project, guard.condition)
			) {
				return [];
			}
			return [
				{
					id: `preview:unknown-guard:${move.id}:${guard.id}`,
					kind: 'unknown-guard' as const,
					severity: 'info' as const,
					summary: `Guard «${guard.label ?? guard.id}» нельзя однозначно вычислить в текущем preview.`,
					storyNodeId: move.storyNodeId,
					moveId: move.id,
					characterId: conditionCharacterId(guard.condition),
					guardId: guard.id
				}
			];
		});
	});
}
