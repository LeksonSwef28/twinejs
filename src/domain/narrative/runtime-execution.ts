import {minutesPerDay} from './calendar';
import {EntityId} from './entities';
import {
	appendNarrativeStoryWorkOccurrence,
	NarrativeRuntimeMoment,
	NarrativeRuntimeOccurrence
} from './runtime-story';
import {
	StoryInterruptionPolicy,
	StoryNodeActivationState,
	StoryNodeDefinition,
	StoryOccurrenceMode,
	StoryRuntimePolicyDefinition
} from './story';

export interface NormalizedStoryRuntimePolicy {
	occurrenceMode: StoryOccurrenceMode;
	durationMinutes: number;
	missAfterMinutes?: number;
	interruption: StoryInterruptionPolicy;
}

export interface ActiveStoryExecutionState {
	id: EntityId;
	workId: EntityId;
	storyNodeId: EntityId;
	participantIds: EntityId[];
	scheduledMoment: NarrativeRuntimeMoment;
	startedAt: NarrativeRuntimeMoment;
	completesAt: NarrativeRuntimeMoment;
	durationMinutes: number;
	occurrenceMode: StoryOccurrenceMode;
	interruption: StoryInterruptionPolicy;
}

export interface StoryExecutionCompletionTrace {
	executionId: EntityId;
	workId: EntityId;
	storyNodeId: EntityId;
	completedAt: NarrativeRuntimeMoment;
	occurrenceId: EntityId;
}

export interface StoryExecutionAdvanceResult {
	activeExecutions: ActiveStoryExecutionState[];
	runtimeOccurrences: NarrativeRuntimeOccurrence[];
	storyNodeStateOverrides: Record<string, StoryNodeActivationState>;
	completionTraces: StoryExecutionCompletionTrace[];
}

export interface StoryExecutionInterruptResult {
	status: 'interrupted' | 'locked' | 'missing';
	activeExecutions: ActiveStoryExecutionState[];
	runtimeOccurrences: NarrativeRuntimeOccurrence[];
	storyNodeStateOverrides: Record<string, StoryNodeActivationState>;
	occurrenceId?: EntityId;
	executionId: EntityId;
}

function nonNegativeInteger(value: unknown) {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function runtimeExecutionMomentIsValid(
	moment: unknown
): moment is NarrativeRuntimeMoment {
	if (!moment || typeof moment !== 'object' || Array.isArray(moment)) {
		return false;
	}
	const candidate = moment as Partial<NarrativeRuntimeMoment>;
	return (
		Number.isInteger(candidate.day) &&
		(candidate.day ?? 0) >= 1 &&
		Number.isInteger(candidate.minuteOfDay) &&
		(candidate.minuteOfDay ?? -1) >= 0 &&
		(candidate.minuteOfDay ?? minutesPerDay) < minutesPerDay
	);
}

export function runtimeExecutionAbsoluteMinute(moment: NarrativeRuntimeMoment) {
	if (!runtimeExecutionMomentIsValid(moment)) {
		throw new RangeError('Runtime moment must use day >= 1 and minute 0..1439.');
	}
	return (moment.day - 1) * minutesPerDay + moment.minuteOfDay;
}

export function runtimeExecutionMomentFromAbsoluteMinute(
	absoluteMinute: number
): NarrativeRuntimeMoment {
	if (!Number.isInteger(absoluteMinute) || absoluteMinute < 0) {
		throw new RangeError('absoluteMinute must be a non-negative integer.');
	}
	return {
		day: Math.floor(absoluteMinute / minutesPerDay) + 1,
		minuteOfDay: absoluteMinute % minutesPerDay
	};
}

export function storyRuntimePolicyIsValid(
	value: StoryRuntimePolicyDefinition | undefined
) {
	if (value === undefined) {
		return true;
	}
	return (
		(value.occurrenceMode === undefined ||
			value.occurrenceMode === 'one-shot' ||
			value.occurrenceMode === 'repeatable') &&
		(value.durationMinutes === undefined || nonNegativeInteger(value.durationMinutes)) &&
		(value.missAfterMinutes === undefined || nonNegativeInteger(value.missAfterMinutes)) &&
		(value.interruption === undefined ||
			value.interruption === 'interruptible' ||
			value.interruption === 'locked')
	);
}

export function normalizedStoryRuntimePolicy(
	node: StoryNodeDefinition
): NormalizedStoryRuntimePolicy {
	if (!storyRuntimePolicyIsValid(node.runtimePolicy)) {
		throw new Error(`Invalid Story runtime policy: ${node.id}`);
	}
	return {
		occurrenceMode: node.runtimePolicy?.occurrenceMode ?? 'one-shot',
		durationMinutes: node.runtimePolicy?.durationMinutes ?? 0,
		missAfterMinutes: node.runtimePolicy?.missAfterMinutes,
		interruption: node.runtimePolicy?.interruption ?? 'interruptible'
	};
}

export function activeStoryExecutionIsValid(
	value: unknown
): value is ActiveStoryExecutionState {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const candidate = value as Partial<ActiveStoryExecutionState>;
	return (
		typeof candidate.id === 'string' &&
		typeof candidate.workId === 'string' &&
		typeof candidate.storyNodeId === 'string' &&
		Array.isArray(candidate.participantIds) &&
		candidate.participantIds.every(id => typeof id === 'string') &&
		runtimeExecutionMomentIsValid(candidate.scheduledMoment) &&
		runtimeExecutionMomentIsValid(candidate.startedAt) &&
		runtimeExecutionMomentIsValid(candidate.completesAt) &&
		nonNegativeInteger(candidate.durationMinutes) &&
		(candidate.occurrenceMode === 'one-shot' || candidate.occurrenceMode === 'repeatable') &&
		(candidate.interruption === 'interruptible' || candidate.interruption === 'locked') &&
		runtimeExecutionAbsoluteMinute(candidate.completesAt) >=
			runtimeExecutionAbsoluteMinute(candidate.startedAt)
	);
}

export function storyWorkWasConsumed(
	history: NarrativeRuntimeOccurrence[],
	workId: EntityId
) {
	return history.some(
		occurrence =>
			occurrence.type === 'story-work' &&
			occurrence.workId === workId &&
			(occurrence.result === 'executed' || occurrence.result === 'missed')
	);
}

export function storyExecutionConflicts(
	active: ActiveStoryExecutionState[],
	participantIds: EntityId[]
) {
	const participants = new Set(participantIds);
	return active
		.filter(execution =>
			execution.participantIds.some(participantId => participants.has(participantId))
		)
		.sort((a, b) => a.id.localeCompare(b.id));
}

export function createActiveStoryExecution(
	workId: EntityId,
	node: StoryNodeDefinition,
	scheduledMoment: NarrativeRuntimeMoment,
	startedAt: NarrativeRuntimeMoment,
	policy: NormalizedStoryRuntimePolicy,
	existing: ActiveStoryExecutionState[],
	history: NarrativeRuntimeOccurrence[] = []
) {
	const startAbsolute = runtimeExecutionAbsoluteMinute(startedAt);
	const completesAt = runtimeExecutionMomentFromAbsoluteMinute(
		startAbsolute + policy.durationMinutes
	);
	const prefix = `execution:${workId}:${startedAt.day}:${startedAt.minuteOfDay}`;
	const priorAtMoment = history.filter(
		occurrence =>
			occurrence.type === 'story-work' &&
			occurrence.workId === workId &&
			occurrence.startedAt?.day === startedAt.day &&
			occurrence.startedAt.minuteOfDay === startedAt.minuteOfDay
	).length;
	const activeAtMoment = existing.filter(execution =>
		execution.id.startsWith(`${prefix}:`)
	).length;
	const ordinal = priorAtMoment + activeAtMoment + 1;
	return {
		id: `${prefix}:${ordinal}`,
		workId,
		storyNodeId: node.id,
		participantIds: [...new Set(node.participantIds)].sort(),
		scheduledMoment: {...scheduledMoment},
		startedAt: {...startedAt},
		completesAt,
		durationMinutes: policy.durationMinutes,
		occurrenceMode: policy.occurrenceMode,
		interruption: policy.interruption
	} satisfies ActiveStoryExecutionState;
}

export function interruptActiveStoryExecution(
	activeExecutions: ActiveStoryExecutionState[],
	runtimeOccurrences: NarrativeRuntimeOccurrence[],
	storyNodeStateOverrides: Record<string, StoryNodeActivationState>,
	executionId: EntityId,
	moment: NarrativeRuntimeMoment
): StoryExecutionInterruptResult {
	const execution = activeExecutions.find(candidate => candidate.id === executionId);
	if (!execution) {
		return {
			status: 'missing',
			activeExecutions,
			runtimeOccurrences,
			storyNodeStateOverrides,
			executionId
		};
	}
	if (execution.interruption === 'locked') {
		return {
			status: 'locked',
			activeExecutions,
			runtimeOccurrences,
			storyNodeStateOverrides,
			executionId
		};
	}
	const elapsedMinutes = Math.max(
		0,
		Math.min(
			execution.durationMinutes,
			runtimeExecutionAbsoluteMinute(moment) -
				runtimeExecutionAbsoluteMinute(execution.startedAt)
		)
	);
	const write = appendNarrativeStoryWorkOccurrence(runtimeOccurrences, {
		type: 'story-work',
		workId: execution.workId,
		storyNodeId: execution.storyNodeId,
		result: 'interrupted',
		scheduledMoment: {...execution.scheduledMoment},
		startedAt: {...execution.startedAt},
		moment: {...moment},
		plannedDurationMinutes: execution.durationMinutes,
		elapsedMinutes
	});
	return {
		status: 'interrupted',
		activeExecutions: activeExecutions.filter(candidate => candidate.id !== executionId),
		runtimeOccurrences: write.history,
		storyNodeStateOverrides: {
			...storyNodeStateOverrides,
			[execution.storyNodeId]: 'available'
		},
		occurrenceId: write.occurrence.id,
		executionId
	};
}

export function advanceActiveStoryExecutions(
	activeExecutions: ActiveStoryExecutionState[],
	runtimeOccurrences: NarrativeRuntimeOccurrence[],
	storyNodeStateOverrides: Record<string, StoryNodeActivationState>,
	toMoment: NarrativeRuntimeMoment
): StoryExecutionAdvanceResult {
	const toAbsolute = runtimeExecutionAbsoluteMinute(toMoment);
	let history = runtimeOccurrences;
	const overrides = {...storyNodeStateOverrides};
	const completionTraces: StoryExecutionCompletionTrace[] = [];
	const completedIds = new Set<EntityId>();

	const completing = [...activeExecutions]
		.filter(
			execution =>
				runtimeExecutionAbsoluteMinute(execution.completesAt) <= toAbsolute
		)
		.sort(
			(a, b) =>
				runtimeExecutionAbsoluteMinute(a.completesAt) -
					runtimeExecutionAbsoluteMinute(b.completesAt) || a.id.localeCompare(b.id)
		);

	for (const execution of completing) {
		const write = appendNarrativeStoryWorkOccurrence(history, {
			type: 'story-work',
			workId: execution.workId,
			storyNodeId: execution.storyNodeId,
			result: 'executed',
			scheduledMoment: {...execution.scheduledMoment},
			startedAt: {...execution.startedAt},
			moment: {...execution.completesAt},
			plannedDurationMinutes: execution.durationMinutes,
			elapsedMinutes: execution.durationMinutes
		});
		history = write.history;
		overrides[execution.storyNodeId] =
			execution.occurrenceMode === 'one-shot' ? 'completed' : 'available';
		completedIds.add(execution.id);
		completionTraces.push({
			executionId: execution.id,
			workId: execution.workId,
			storyNodeId: execution.storyNodeId,
			completedAt: {...execution.completesAt},
			occurrenceId: write.occurrence.id
		});
	}

	return {
		activeExecutions: activeExecutions.filter(execution => !completedIds.has(execution.id)),
		runtimeOccurrences: history,
		storyNodeStateOverrides: overrides,
		completionTraces
	};
}
