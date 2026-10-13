import {EntityId} from './entities';
import {StoryNodeActivationState, StoryNodeDefinition} from './story';

export interface NarrativeRuntimeMoment {
	day: number;
	minuteOfDay: number;
}

export interface NarrativeMoveOutcomeOccurrence {
	id: EntityId;
	type: 'move-outcome';
	storyNodeId: EntityId;
	moveId: EntityId;
	outcomeId: EntityId;
	effectIds: EntityId[];
	moment: NarrativeRuntimeMoment;
}

export type NarrativeStoryWorkResult = 'executed' | 'missed' | 'interrupted';

export interface NarrativeStoryWorkOccurrence {
	id: EntityId;
	type: 'story-work';
	workId: EntityId;
	storyNodeId: EntityId;
	result: NarrativeStoryWorkResult;
	scheduledMoment: NarrativeRuntimeMoment;
	startedAt?: NarrativeRuntimeMoment;
	moment: NarrativeRuntimeMoment;
	plannedDurationMinutes: number;
	elapsedMinutes: number;
}

/**
 * Append-only delayed Claim ledger. The source is an actual Outcome occurrence,
 * never authoring time. One 'scheduled' is completed by 'applied' or 'expired'.
 */
export interface NarrativeDeferredClaimOccurrence {
	id: EntityId;
	type: 'deferred-claim';
	result: 'scheduled' | 'applied' | 'expired';
	storyNodeId: EntityId;
	moveId: EntityId;
	outcomeId: EntityId;
	effectId: EntityId;
	causeOccurrenceId: EntityId;
	dueMoment: NarrativeRuntimeMoment;
	moment: NarrativeRuntimeMoment;
	/** Immutable semantic contract captured at scheduling; absent in legacy A84 saves. */
	definitionSignature?: string;
	reason?:
		| 'past-project-end'
		| 'missing-definition'
		| 'changed-definition'
		| 'missing-reference'
		| 'unverifiable-definition';
}

export type NarrativeRuntimeOccurrence =
	| NarrativeMoveOutcomeOccurrence
	| NarrativeStoryWorkOccurrence
	| NarrativeDeferredClaimOccurrence;

function runtimeMomentIsValid(value: unknown): value is NarrativeRuntimeMoment {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const candidate = value as Partial<NarrativeRuntimeMoment>;
	return (
		Number.isInteger(candidate.day) &&
		(candidate.day ?? 0) >= 1 &&
		Number.isInteger(candidate.minuteOfDay) &&
		(candidate.minuteOfDay ?? -1) >= 0 &&
		(candidate.minuteOfDay ?? 24 * 60) < 24 * 60
	);
}

export function storyNodeActivationStateIsValid(
	value: unknown
): value is StoryNodeActivationState {
	return (
		value === 'draft' ||
		value === 'dormant' ||
		value === 'available' ||
		value === 'active' ||
		value === 'blocked' ||
		value === 'completed'
	);
}

export function narrativeRuntimeOccurrenceIsValid(
	value: unknown
): value is NarrativeRuntimeOccurrence {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const candidate = value as Partial<NarrativeRuntimeOccurrence>;
	if (
		typeof candidate.id !== 'string' ||
		typeof candidate.storyNodeId !== 'string' ||
		!runtimeMomentIsValid(candidate.moment)
	) {
		return false;
	}
	if (candidate.type === 'move-outcome') {
		return (
			typeof candidate.moveId === 'string' &&
			typeof candidate.outcomeId === 'string' &&
			Array.isArray(candidate.effectIds) &&
			candidate.effectIds.every(effectId => typeof effectId === 'string')
		);
	}
	if (candidate.type === 'deferred-claim') {
		const deferred = candidate as Partial<NarrativeDeferredClaimOccurrence>;
		return (
			(deferred.result === 'scheduled' ||
				deferred.result === 'applied' ||
				deferred.result === 'expired') &&
			typeof deferred.moveId === 'string' &&
			typeof deferred.outcomeId === 'string' &&
			typeof deferred.effectId === 'string' &&
			typeof deferred.causeOccurrenceId === 'string' &&
			runtimeMomentIsValid(deferred.dueMoment) &&
			(deferred.definitionSignature === undefined ||
				(typeof deferred.definitionSignature === 'string' &&
					deferred.definitionSignature.length > 0)) &&
			(deferred.reason === undefined ||
				deferred.reason === 'past-project-end' ||
				deferred.reason === 'missing-definition' ||
				deferred.reason === 'changed-definition' ||
				deferred.reason === 'missing-reference' ||
				deferred.reason === 'unverifiable-definition')
		);
	}
	if (candidate.type === 'story-work') {
		return (
			typeof candidate.workId === 'string' &&
			(candidate.result === 'executed' ||
				candidate.result === 'missed' ||
				candidate.result === 'interrupted') &&
			runtimeMomentIsValid(candidate.scheduledMoment) &&
			(candidate.startedAt === undefined || runtimeMomentIsValid(candidate.startedAt)) &&
			typeof candidate.plannedDurationMinutes === 'number' &&
			Number.isInteger(candidate.plannedDurationMinutes) &&
			candidate.plannedDurationMinutes >= 0 &&
			typeof candidate.elapsedMinutes === 'number' &&
			Number.isInteger(candidate.elapsedMinutes) &&
			candidate.elapsedMinutes >= 0
		);
	}
	return false;
}

export function effectiveStoryNodeActivationState(
	node: StoryNodeDefinition,
	overrides: Record<string, StoryNodeActivationState>
) {
	return overrides[node.id] ?? node.activationState;
}

export function effectiveRuntimeStoryNodes(
	nodes: StoryNodeDefinition[],
	overrides: Record<string, StoryNodeActivationState>
) {
	return nodes.map(node => ({
		...node,
		activationState: effectiveStoryNodeActivationState(node, overrides)
	}));
}

export function applyStoryNodeStateOverride(
	overrides: Record<string, StoryNodeActivationState>,
	storyNodeId: EntityId,
	state: StoryNodeActivationState
) {
	return {...overrides, [storyNodeId]: state};
}

export function appendNarrativeRuntimeOccurrence(
	history: NarrativeRuntimeOccurrence[],
	input: Omit<NarrativeMoveOutcomeOccurrence, 'id'>
) {
	const prefix = `occurrence:${input.moveId}:${input.outcomeId}:${input.moment.day}:${input.moment.minuteOfDay}`;
	const ordinal =
		history.filter(occurrence => occurrence.id.startsWith(`${prefix}:`)).length + 1;
	const occurrence: NarrativeMoveOutcomeOccurrence = {
		...input,
		id: `${prefix}:${ordinal}`
	};
	return {history: [...history, occurrence], occurrence};
}

export function appendNarrativeStoryWorkOccurrence(
	history: NarrativeRuntimeOccurrence[],
	input: Omit<NarrativeStoryWorkOccurrence, 'id'>
) {
	const prefix = `story-work:${input.workId}:${input.result}:${input.moment.day}:${input.moment.minuteOfDay}`;
	const ordinal =
		history.filter(occurrence => occurrence.id.startsWith(`${prefix}:`)).length + 1;
	const occurrence: NarrativeStoryWorkOccurrence = {
		...input,
		id: `${prefix}:${ordinal}`
	};
	return {history: [...history, occurrence], occurrence};
}
