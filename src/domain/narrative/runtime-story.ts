import {EntityId} from './entities';
import {StoryNodeActivationState, StoryNodeDefinition} from './story';

export interface NarrativeRuntimeMoment {
	day: number;
	minuteOfDay: number;
}

export interface NarrativeRuntimeOccurrence {
	id: EntityId;
	type: 'move-outcome';
	storyNodeId: EntityId;
	moveId: EntityId;
	outcomeId: EntityId;
	effectIds: EntityId[];
	moment: NarrativeRuntimeMoment;
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
	return (
		typeof candidate.id === 'string' &&
		candidate.type === 'move-outcome' &&
		typeof candidate.storyNodeId === 'string' &&
		typeof candidate.moveId === 'string' &&
		typeof candidate.outcomeId === 'string' &&
		Array.isArray(candidate.effectIds) &&
		candidate.effectIds.every(effectId => typeof effectId === 'string') &&
		Boolean(candidate.moment && typeof candidate.moment === 'object') &&
		Number.isInteger(candidate.moment?.day) &&
		(candidate.moment?.day ?? 0) >= 1 &&
		Number.isInteger(candidate.moment?.minuteOfDay) &&
		(candidate.moment?.minuteOfDay ?? -1) >= 0 &&
		(candidate.moment?.minuteOfDay ?? 24 * 60) < 24 * 60
	);
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
	input: Omit<NarrativeRuntimeOccurrence, 'id'>
) {
	const prefix = `occurrence:${input.moveId}:${input.outcomeId}:${input.moment.day}:${input.moment.minuteOfDay}`;
	const ordinal =
		history.filter(occurrence => occurrence.id.startsWith(`${prefix}:`)).length + 1;
	const occurrence: NarrativeRuntimeOccurrence = {
		...input,
		id: `${prefix}:${ordinal}`
	};
	return {history: [...history, occurrence], occurrence};
}
