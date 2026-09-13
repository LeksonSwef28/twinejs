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
	| 'simulation';

type EditorProjectionKeys = 'editor';

/**
 * A35 authored persistence boundary. Runtime cognition, physical state and
 * editor navigation are deliberately absent so simulation/editor updates
 * cannot be mistaken for authored definitions when reading persisted data.
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
	/** Optional only so pre-A39 projection-v1 payloads remain readable. New saves always write it. */
	injuriesByCharacter?: NarrativeProject['injuriesByCharacter'];
	/** Optional only so pre-A39 projection-v1 payloads remain readable. New saves always write it. */
	itemPlacementOverrides?: NarrativeProject['itemPlacementOverrides'];
	simulation: NarrativeSimulationState;
}

export interface NarrativeProjectPersistenceEnvelope {
	format: typeof narrativeProjectPersistenceFormat;
	schemaVersion: number;
	authored: NarrativeProjectAuthoredProjection;
	editor: NarrativeEditorState;
	runtime: NarrativeProjectRuntimeProjection;
}

/**
 * Projects the convenient in-memory aggregate into explicit physical
 * persistence sections. This function is pure and does not mutate the project.
 */
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

/**
 * Re-composes the aggregate expected by reducer/UI. Hydration still owns
 * validation/migration; this helper only restores the physical sections to the
 * convenient in-memory shape. Missing A39 fields are safe pre-A39 data.
 */
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
		simulation: envelope.runtime.simulation
	};
}
