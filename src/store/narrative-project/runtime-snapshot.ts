import {CharacterBodyState, bodyStateIsValid} from '../../domain/narrative/body';
import {
	CharacterMindState,
	MemoryTrace,
	PendingReaction,
	RelationshipState
} from '../../domain/narrative/cognition';
import {narrativeMoneyAmountIsValid} from '../../domain/narrative/economy';
import {InjuryState, injuryStateIsValid} from '../../domain/narrative/injury';
import {
	ItemRuntimePlacement,
	itemRuntimePlacementIsValid
} from '../../domain/narrative/items';
import {CharacterKnowledgeState, knowledgeConfidenceIsValid} from '../../domain/narrative/knowledge';
import {NarrativeProject, NarrativeSimulationState} from '../../domain/narrative/project';
import {
	ActiveStoryExecutionState,
	activeStoryExecutionIsValid
} from '../../domain/narrative/runtime-execution';
import {
	NarrativeRuntimeOccurrence,
	narrativeRuntimeOccurrenceIsValid,
	storyNodeActivationStateIsValid
} from '../../domain/narrative/runtime-story';
import {StoryNodeActivationState} from '../../domain/narrative/story';
import {
	NarrativeProjectRuntimeProjection,
	projectNarrativePersistence
} from './persistence-projection';

export const narrativeRuntimeSnapshotFormat = 'narrative-runtime-snapshot';
export const narrativeRuntimeSnapshotVersion = 1 as const;

export interface NarrativeRuntimeSnapshotV1 {
	format: typeof narrativeRuntimeSnapshotFormat;
	version: typeof narrativeRuntimeSnapshotVersion;
	projectId: string;
	hostStoryId: string;
	runtime: NarrativeProjectRuntimeProjection;
}

interface NarrativeRuntimeSnapshotV0 {
	format: typeof narrativeRuntimeSnapshotFormat;
	version: 0;
	projectId: string;
	hostStoryId: string;
	state: NarrativeProjectRuntimeProjection;
}

export type NarrativeRuntimeRestoreStatus =
	| 'restored'
	| 'migrated'
	| 'rejected'
	| 'missing';

export interface NarrativeRuntimeRestoreResult {
	project: NarrativeProject;
	status: NarrativeRuntimeRestoreStatus;
	migratedFromVersion?: number;
	reason?: string;
}

export interface NarrativeRuntimeSnapshotRepository {
	save(project: NarrativeProject): void;
	load(project: NarrativeProject): NarrativeRuntimeRestoreResult;
	clear(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function finiteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isStringRecord(value: unknown) {
	return (
		isRecord(value) &&
		Object.values(value).every(entry => typeof entry === 'string')
	);
}

function cashStateRecordIsValid(value: unknown): value is Record<string, number> {
	return (
		isRecord(value) &&
		Object.values(value).every(narrativeMoneyAmountIsValid)
	);
}

function cloneCashStateRecord(value: unknown): Record<string, number> {
	return cashStateRecordIsValid(value) ? {...value} : {};
}

function bodyStateRecordIsValid(
	value: unknown
): value is Record<string, CharacterBodyState> {
	return (
		isRecord(value) &&
		Object.entries(value).every(
			([characterId, state]) =>
				bodyStateIsValid(state) && state.characterId === characterId
		)
	);
}

function cloneBodyStateRecord(value: unknown): Record<string, CharacterBodyState> {
	if (!bodyStateRecordIsValid(value)) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(value).map(([characterId, state]) => [
			characterId,
			{...state}
		])
	) as Record<string, CharacterBodyState>;
}

function injuryStateRecordIsValid(
	value: unknown
): value is Record<string, InjuryState[]> {
	return (
		isRecord(value) &&
		Object.entries(value).every(
			([characterId, injuries]) =>
				Array.isArray(injuries) &&
				injuries.every(
					injury =>
						injuryStateIsValid(injury) && injury.characterId === characterId
				)
		)
	);
}

function cloneInjuryStateRecord(value: unknown): Record<string, InjuryState[]> {
	if (!injuryStateRecordIsValid(value)) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(value).map(([characterId, injuries]) => [
			characterId,
			injuries.map(injury => ({...injury}))
		])
	) as Record<string, InjuryState[]>;
}

function itemPlacementRecordIsValid(
	value: unknown
): value is Record<string, ItemRuntimePlacement> {
	return (
		isRecord(value) &&
		Object.values(value).every(itemRuntimePlacementIsValid)
	);
}

function cloneItemPlacementRecord(
	value: unknown
): Record<string, ItemRuntimePlacement> {
	if (!itemPlacementRecordIsValid(value)) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(value).map(([itemInstanceId, placement]) => [
			itemInstanceId,
			{...placement}
		])
	) as Record<string, ItemRuntimePlacement>;
}

function storyNodeStateRecordIsValid(
	value: unknown
): value is Record<string, StoryNodeActivationState> {
	return (
		isRecord(value) &&
		Object.values(value).every(storyNodeActivationStateIsValid)
	);
}

function cloneStoryNodeStateRecord(
	value: unknown
): Record<string, StoryNodeActivationState> {
	if (!storyNodeStateRecordIsValid(value)) {
		return {};
	}
	return {...value};
}

function occurrenceHistoryIsValid(
	value: unknown
): value is NarrativeRuntimeOccurrence[] {
	return Array.isArray(value) && value.every(narrativeRuntimeOccurrenceIsValid);
}

function cloneOccurrenceHistory(value: unknown): NarrativeRuntimeOccurrence[] {
	if (!occurrenceHistoryIsValid(value)) {
		return [];
	}
	return value.map(occurrence =>
		occurrence.type === 'move-outcome'
			? {
					...occurrence,
					effectIds: [...occurrence.effectIds],
					moment: {...occurrence.moment}
			  }
			: {
					...occurrence,
					scheduledMoment: {...occurrence.scheduledMoment},
					startedAt: occurrence.startedAt ? {...occurrence.startedAt} : undefined,
					moment: {...occurrence.moment}
			  }
	);
}

function activeStoryExecutionsAreValid(
	value: unknown
): value is ActiveStoryExecutionState[] {
	return Array.isArray(value) && value.every(activeStoryExecutionIsValid);
}

function cloneActiveStoryExecutions(value: unknown): ActiveStoryExecutionState[] {
	if (!activeStoryExecutionsAreValid(value)) {
		return [];
	}
	return value.map(execution => ({
		...execution,
		participantIds: [...execution.participantIds],
		scheduledMoment: {...execution.scheduledMoment},
		startedAt: {...execution.startedAt},
		completesAt: {...execution.completesAt}
	}));
}

function memoryIsValid(value: unknown): value is MemoryTrace {
	if (!isRecord(value)) {
		return false;
	}
	return (
		typeof value.id === 'string' &&
		typeof value.characterId === 'string' &&
		typeof value.summary === 'string' &&
		finiteNumber(value.createdAtDay) &&
		Number.isInteger(value.createdAtDay) &&
		finiteNumber(value.createdAtMinute) &&
		finiteNumber(value.importance) &&
		value.importance >= 0 &&
		value.importance <= 1 &&
		finiteNumber(value.baseStrength) &&
		value.baseStrength >= 0 &&
		value.baseStrength <= 1 &&
		isStringArray(value.tags) &&
		isStringArray(value.relatedEntityIds) &&
		(value.source === undefined ||
			(isRecord(value.source) && typeof value.source.type === 'string'))
	);
}

function relationshipIsValid(value: unknown): value is RelationshipState {
	return (
		isRecord(value) &&
		typeof value.fromCharacterId === 'string' &&
		typeof value.toCharacterId === 'string' &&
		isRecord(value.values) &&
		Object.values(value.values).every(finiteNumber)
	);
}

function pendingReactionIsValid(value: unknown): value is PendingReaction {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.characterId === 'string' &&
		typeof value.reactionType === 'string' &&
		finiteNumber(value.priority) &&
		isStringArray(value.conditions)
	);
}

function mindStateIsValid(value: unknown): value is CharacterMindState {
	return (
		isRecord(value) &&
		typeof value.characterId === 'string' &&
		(value.mood === undefined || typeof value.mood === 'string') &&
		isStringArray(value.activeMemoryIds) &&
		isStringArray(value.pendingReactionIds)
	);
}

function knowledgeStateIsValid(value: unknown): value is CharacterKnowledgeState {
	if (!isRecord(value)) {
		return false;
	}
	return (
		typeof value.id === 'string' &&
		typeof value.characterId === 'string' &&
		typeof value.claimId === 'string' &&
		(value.attitude === 'knows' ||
			value.attitude === 'believes' ||
			value.attitude === 'doubts' ||
			value.attitude === 'disbelieves') &&
		finiteNumber(value.confidence) &&
		knowledgeConfidenceIsValid(value.confidence) &&
		isRecord(value.source) &&
		typeof value.source.type === 'string' &&
		finiteNumber(value.timesHeard) &&
		Number.isInteger(value.timesHeard) &&
		value.timesHeard >= 0
	);
}

function simulationIsValid(value: unknown): value is NarrativeSimulationState {
	if (!isRecord(value)) {
		return false;
	}
	return (
		finiteNumber(value.day) &&
		Number.isInteger(value.day) &&
		value.day >= 1 &&
		finiteNumber(value.minuteOfDay) &&
		Number.isInteger(value.minuteOfDay) &&
		value.minuteOfDay >= 0 &&
		value.minuteOfDay < 24 * 60 &&
		isStringRecord(value.activeBehaviorProfileByCharacter) &&
		isStringRecord(value.actualLocationByCharacter) &&
		Array.isArray(value.characterKnowledge) &&
		value.characterKnowledge.every(knowledgeStateIsValid) &&
		(value.bodyByCharacter === undefined || bodyStateRecordIsValid(value.bodyByCharacter))
	);
}

function runtimeProjectionIsValid(
	value: unknown
): value is NarrativeProjectRuntimeProjection {
	if (!isRecord(value)) {
		return false;
	}
	return (
		Array.isArray(value.memories) &&
		value.memories.every(memoryIsValid) &&
		Array.isArray(value.relationships) &&
		value.relationships.every(relationshipIsValid) &&
		Array.isArray(value.pendingReactions) &&
		value.pendingReactions.every(pendingReactionIsValid) &&
		Array.isArray(value.mindStates) &&
		value.mindStates.every(mindStateIsValid) &&
		(value.cashByCharacter === undefined || cashStateRecordIsValid(value.cashByCharacter)) &&
		(value.injuriesByCharacter === undefined ||
			injuryStateRecordIsValid(value.injuriesByCharacter)) &&
		(value.itemPlacementOverrides === undefined ||
			itemPlacementRecordIsValid(value.itemPlacementOverrides)) &&
		(value.storyNodeStateOverrides === undefined ||
			storyNodeStateRecordIsValid(value.storyNodeStateOverrides)) &&
		(value.runtimeOccurrences === undefined ||
			occurrenceHistoryIsValid(value.runtimeOccurrences)) &&
		(value.activeStoryExecutions === undefined ||
			activeStoryExecutionsAreValid(value.activeStoryExecutions)) &&
		simulationIsValid(value.simulation)
	);
}

function cloneRuntimeProjection(
	runtime: NarrativeProjectRuntimeProjection
): NarrativeProjectRuntimeProjection {
	return {
		memories: runtime.memories.map(memory => ({
			...memory,
			tags: [...memory.tags],
			relatedEntityIds: [...memory.relatedEntityIds],
			source: memory.source ? {...memory.source} : undefined
		})),
		relationships: runtime.relationships.map(relationship => ({
			...relationship,
			values: {...relationship.values}
		})),
		pendingReactions: runtime.pendingReactions.map(reaction => ({
			...reaction,
			conditions: [...reaction.conditions]
		})),
		mindStates: runtime.mindStates.map(mind => ({
			...mind,
			activeMemoryIds: [...mind.activeMemoryIds],
			pendingReactionIds: [...mind.pendingReactionIds]
		})),
		cashByCharacter: cloneCashStateRecord(runtime.cashByCharacter),
		injuriesByCharacter: cloneInjuryStateRecord(runtime.injuriesByCharacter),
		itemPlacementOverrides: cloneItemPlacementRecord(runtime.itemPlacementOverrides),
		storyNodeStateOverrides: cloneStoryNodeStateRecord(
			runtime.storyNodeStateOverrides
		),
		runtimeOccurrences: cloneOccurrenceHistory(runtime.runtimeOccurrences),
		activeStoryExecutions: cloneActiveStoryExecutions(
			runtime.activeStoryExecutions
		),
		simulation: {
			...runtime.simulation,
			activeBehaviorProfileByCharacter: {
				...runtime.simulation.activeBehaviorProfileByCharacter
			},
			actualLocationByCharacter: {
				...runtime.simulation.actualLocationByCharacter
			},
			characterKnowledge: runtime.simulation.characterKnowledge.map(state => ({
				...state,
				source: {...state.source},
				learnedAt: state.learnedAt ? {...state.learnedAt} : undefined,
				lastReinforcedAt: state.lastReinforcedAt
					? {...state.lastReinforcedAt}
					: undefined
			})),
			bodyByCharacter: cloneBodyStateRecord(
				(runtime.simulation as NarrativeSimulationState & {
					bodyByCharacter?: Record<string, CharacterBodyState>;
				}).bodyByCharacter
			)
		}
	};
}

export function createNarrativeRuntimeSnapshot(
	project: NarrativeProject
): NarrativeRuntimeSnapshotV1 {
	return {
		format: narrativeRuntimeSnapshotFormat,
		version: narrativeRuntimeSnapshotVersion,
		projectId: project.projectId,
		hostStoryId: project.hostStoryId,
		runtime: cloneRuntimeProjection(projectNarrativePersistence(project).runtime)
	};
}

export function serializeNarrativeRuntimeSnapshot(project: NarrativeProject) {
	return JSON.stringify(createNarrativeRuntimeSnapshot(project));
}

function normalizeRuntimeSnapshot(value: unknown): {
	snapshot?: NarrativeRuntimeSnapshotV1;
	migratedFromVersion?: number;
	reason?: string;
} {
	if (!isRecord(value) || value.format !== narrativeRuntimeSnapshotFormat) {
		return {reason: 'invalid-format'};
	}
	if (value.version === narrativeRuntimeSnapshotVersion) {
		if (
			typeof value.projectId !== 'string' ||
			typeof value.hostStoryId !== 'string' ||
			!runtimeProjectionIsValid(value.runtime)
		) {
			return {reason: 'invalid-runtime'};
		}
		return {
			snapshot: {
				format: narrativeRuntimeSnapshotFormat,
				version: narrativeRuntimeSnapshotVersion,
				projectId: value.projectId,
				hostStoryId: value.hostStoryId,
				runtime: cloneRuntimeProjection(value.runtime)
			}
		};
	}
	if (value.version === 0) {
		const legacy = value as unknown as NarrativeRuntimeSnapshotV0;
		if (
			typeof legacy.projectId !== 'string' ||
			typeof legacy.hostStoryId !== 'string' ||
			!runtimeProjectionIsValid(legacy.state)
		) {
			return {reason: 'invalid-runtime'};
		}
		return {
			migratedFromVersion: 0,
			snapshot: {
				format: narrativeRuntimeSnapshotFormat,
				version: narrativeRuntimeSnapshotVersion,
				projectId: legacy.projectId,
				hostStoryId: legacy.hostStoryId,
				runtime: cloneRuntimeProjection(legacy.state)
			}
		};
	}
	return {reason: 'unsupported-version'};
}

export function restoreNarrativeRuntimeSnapshot(
	project: NarrativeProject,
	value: unknown
): NarrativeRuntimeRestoreResult {
	const normalized = normalizeRuntimeSnapshot(value);
	if (!normalized.snapshot) {
		return {project, status: 'rejected', reason: normalized.reason};
	}
	if (
		normalized.snapshot.projectId !== project.projectId ||
		normalized.snapshot.hostStoryId !== project.hostStoryId
	) {
		return {project, status: 'rejected', reason: 'identity-mismatch'};
	}

	const runtime = cloneRuntimeProjection(normalized.snapshot.runtime);
	return {
		project: {
			...project,
			memories: runtime.memories,
			relationships: runtime.relationships,
			pendingReactions: runtime.pendingReactions,
			mindStates: runtime.mindStates,
			cashByCharacter: runtime.cashByCharacter ?? {},
			injuriesByCharacter: runtime.injuriesByCharacter ?? {},
			itemPlacementOverrides: runtime.itemPlacementOverrides ?? {},
			storyNodeStateOverrides: runtime.storyNodeStateOverrides ?? {},
			runtimeOccurrences: runtime.runtimeOccurrences ?? [],
			activeStoryExecutions: runtime.activeStoryExecutions ?? [],
			simulation: runtime.simulation
		},
		status:
			normalized.migratedFromVersion === undefined ? 'restored' : 'migrated',
		migratedFromVersion: normalized.migratedFromVersion
	};
}

export function restoreNarrativeRuntimeSnapshotJson(
	project: NarrativeProject,
	serialized: string
): NarrativeRuntimeRestoreResult {
	try {
		return restoreNarrativeRuntimeSnapshot(project, JSON.parse(serialized));
	} catch {
		return {project, status: 'rejected', reason: 'invalid-json'};
	}
}

export function createLocalStorageNarrativeRuntimeSnapshotRepository(
	projectId: string
): NarrativeRuntimeSnapshotRepository {
	const key = `twine:narrative-runtime:v${narrativeRuntimeSnapshotVersion}:${projectId}`;
	return {
		save(project) {
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(key, serializeNarrativeRuntimeSnapshot(project));
			}
		},
		load(project) {
			if (typeof window === 'undefined') {
				return {project, status: 'missing'};
			}
			const saved = window.localStorage.getItem(key);
			return saved
				? restoreNarrativeRuntimeSnapshotJson(project, saved)
				: {project, status: 'missing'};
		},
		clear() {
			if (typeof window !== 'undefined') {
				window.localStorage.removeItem(key);
			}
		}
	};
}
