import {NarrativeEditorState} from '../../domain/narrative/editor';
import {NarrativeProject, NarrativeSimulationState} from '../../domain/narrative/project';

export const narrativeProjectPersistenceFormat = 'narrative-project-projections-v1';

type RuntimeProjectionKeys =
	| 'memories'
	| 'relationships'
	| 'pendingReactions'
	| 'mindStates'
	| 'injuriesByCharacter'
	| 'itemPlacementOverrides'
	| 'storyNodeStateOverrides'
	| 'runtimeOccurrences'
	| 'activeStoryExecutions'
	| 'simulation';

type EditorProjectionKeys = 'editor';

/**
 * A35 authored persistence boundary. Runtime cognition, physical state, Story
 * state/history/execution and editor navigation are deliberately absent so
 * simulation updates cannot be mistaken for authored definitions.
 */
export type NarrativeProjectAuthoredProjection = Omit<
	NarrativeProject,
	'schemaVersion' | RuntimeProjectionKeys | EditorProjectionKeys
>;

export interface NarrativeProjectRuntimeProjection {
	memories: NarrativeProject['memories'];
	relationships: NarrativeProject['relationships'];
	pendingReactions: NarrativeProject['pendingReactions'];
	mindStates: NarrativeProject['mindStates'];
	/** Optional only so pre-A39 projection-v1 payloads remain readable. */
	injuriesByCharacter?: NarrativeProject['injuriesByCharacter'];
	/** Optional only so pre-A39 projection-v1 payloads remain readable. */
	itemPlacementOverrides?: NarrativeProject['itemPlacementOverrides'];
	/** Optional only so pre-A41 projection-v1 payloads remain readable. */
	storyNodeStateOverrides?: NarrativeProject['storyNodeStateOverrides'];
	/** Optional only so pre-A41 projection-v1 payloads remain readable. */
	runtimeOccurrences?: NarrativeProject['runtimeOccurrences'];
	/** Optional only so pre-A42 projection-v1 payloads remain readable. */
	activeStoryExecutions?: NarrativeProject['activeStoryExecutions'];
	simulation: NarrativeSimulationState;
}

export interface NarrativeProjectPersistenceEnvelope {
	format: typeof narrativeProjectPersistenceFormat;
	schemaVersion: number;
	authored: NarrativeProjectAuthoredProjection;
	editor: NarrativeEditorState;
	runtime: NarrativeProjectRuntimeProjection;
}

export function projectNarrativePersistence(
	project: NarrativeProject
): NarrativeProjectPersistenceEnvelope {
	const {
		schemaVersion,
		editor,
		memories,
		relationships,
		pendingReactions,
		mindStates,
		injuriesByCharacter,
		itemPlacementOverrides,
		storyNodeStateOverrides,
		runtimeOccurrences,
		activeStoryExecutions,
		simulation,
		...authored
	} = project;

	return {
		format: narrativeProjectPersistenceFormat,
		schemaVersion,
		authored,
		editor,
		runtime: {
			memories,
			relationships,
			pendingReactions,
			mindStates,
			injuriesByCharacter,
			itemPlacementOverrides,
			storyNodeStateOverrides,
			runtimeOccurrences,
			activeStoryExecutions,
			simulation
		}
	};
}

export function isNarrativeProjectPersistenceEnvelope(
	value: unknown
): value is NarrativeProjectPersistenceEnvelope {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const candidate = value as Partial<NarrativeProjectPersistenceEnvelope>;
	return (
		candidate.format === narrativeProjectPersistenceFormat &&
		Number.isInteger(candidate.schemaVersion) &&
		Boolean(candidate.authored && typeof candidate.authored === 'object') &&
		Boolean(candidate.editor && typeof candidate.editor === 'object') &&
		Boolean(candidate.runtime && typeof candidate.runtime === 'object')
	);
}

export function composeNarrativeProjectPersistence(
	envelope: NarrativeProjectPersistenceEnvelope
): NarrativeProject {
	return {
		schemaVersion: envelope.schemaVersion,
		...envelope.authored,
		editor: envelope.editor,
		memories: envelope.runtime.memories,
		relationships: envelope.runtime.relationships,
		pendingReactions: envelope.runtime.pendingReactions,
		mindStates: envelope.runtime.mindStates,
		injuriesByCharacter: envelope.runtime.injuriesByCharacter ?? {},
		itemPlacementOverrides: envelope.runtime.itemPlacementOverrides ?? {},
		storyNodeStateOverrides: envelope.runtime.storyNodeStateOverrides ?? {},
		runtimeOccurrences: envelope.runtime.runtimeOccurrences ?? [],
		activeStoryExecutions: envelope.runtime.activeStoryExecutions ?? [],
		simulation: envelope.runtime.simulation
	};
}
