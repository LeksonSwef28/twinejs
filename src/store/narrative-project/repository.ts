import {
	NarrativeMoveDefinition,
	narrativeMoveIsStructurallyValid
} from '../../domain/narrative/interaction';
import {NarrativeProject, narrativeProjectSchemaVersion} from '../../domain/narrative/project';
import {createNarrativeProject} from '../../domain/narrative/project-factory';
import {
	StoryConnectionDefinition,
	StoryEdgeMode,
	storyConnectionKindCanExecute
} from '../../domain/narrative/story';
import {NarrativeProjectTemplate} from '../../domain/narrative/template';

export interface NarrativeProjectRepository {
	load(): NarrativeProject;
	save(project: NarrativeProject): void;
}

type PersistedStoryConnection = Omit<StoryConnectionDefinition, 'mode'> & {
	mode?: StoryEdgeMode;
};

function looksLikeSchemaV2(value: unknown) {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Partial<NarrativeProject>;
	return (
		candidate.schemaVersion === narrativeProjectSchemaVersion &&
		typeof candidate.projectId === 'string' &&
		typeof candidate.hostStoryId === 'string' &&
		Array.isArray(candidate.locations) &&
		Array.isArray(candidate.characters) &&
		Array.isArray(candidate.storyNodes) &&
		Array.isArray(candidate.storyConnections)
	);
}

/**
 * Missing edge mode means legacy schema-v2 data. Only the old TRUE/FALSE kinds
 * are unambiguous enough to retain executable semantics automatically. Every
 * other legacy edge becomes a safe reference edge until the author explicitly
 * promotes it. Explicit executable mode is also downgraded when ports/kind are
 * not executable-safe.
 */
function hydrateStoryConnection(
	connection: PersistedStoryConnection
): StoryConnectionDefinition {
	const hasExecutableShape =
		storyConnectionKindCanExecute(connection.kind) &&
		Boolean(connection.sourcePortId) &&
		Boolean(connection.targetPortId);
	const clearlyExecutableLegacyKind =
		connection.kind === 'condition-true' || connection.kind === 'condition-false';
	const mode: StoryEdgeMode =
		(connection.mode === 'executable' && hasExecutableShape) ||
		(connection.mode === undefined && clearlyExecutableLegacyKind && hasExecutableShape)
			? 'executable'
			: 'reference';

	return {...connection, mode};
}

function hydrateStoryConnections(value: unknown): StoryConnectionDefinition[] {
	return Array.isArray(value)
		? (value as PersistedStoryConnection[]).map(hydrateStoryConnection)
		: [];
}

/**
 * A20/A21 projects predate explicit Outcome effects. Add an empty effect list
 * during hydration before validating the current NarrativeMove shape.
 */
function hydrateNarrativeMoves(value: unknown): NarrativeMoveDefinition[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap(raw => {
		if (!raw || typeof raw !== 'object') {
			return [];
		}
		const candidate = raw as NarrativeMoveDefinition;
		if (!Array.isArray(candidate.outcomes)) {
			return [];
		}
		const hydrated: NarrativeMoveDefinition = {
			...candidate,
			outcomes: candidate.outcomes.map(outcome => ({
				...outcome,
				effectStoryNodeIds: Array.isArray(outcome.effectStoryNodeIds)
					? outcome.effectStoryNodeIds
					: [],
				effects: Array.isArray(outcome.effects) ? outcome.effects : []
			}))
		};
		return narrativeMoveIsStructurallyValid(hydrated) ? [hydrated] : [];
	});
}

/**
 * Schema v2 intentionally grows during the Authoring MVP. Hydration supplies
 * newly introduced collections so a project saved by an earlier v2 patch does
 * not disappear just because a new authoring concept was added.
 */
function hydrateSchemaV2(
	value: unknown,
	hostStoryId: string,
	projectName: string,
	template: NarrativeProjectTemplate
): NarrativeProject | undefined {
	if (!looksLikeSchemaV2(value)) {
		return undefined;
	}

	const saved = value as NarrativeProject;
	if (saved.hostStoryId !== hostStoryId) {
		return undefined;
	}

	const fresh = createNarrativeProject(hostStoryId, projectName, template);
	const savedEditor = saved.editor ?? fresh.editor;
	const freshCanvas = fresh.editor.storyCanvas!;
	const savedCanvas = savedEditor.storyCanvas;
	const freshWorldTime = fresh.editor.worldTimeViewport!;
	const savedWorldTime = savedEditor.worldTimeViewport;
	const savedSimulation = saved.simulation ?? fresh.simulation;

	return {
		...fresh,
		...saved,
		template,
		itemDefinitions: Array.isArray(saved.itemDefinitions)
			? saved.itemDefinitions
			: [],
		itemInstances: Array.isArray(saved.itemInstances) ? saved.itemInstances : [],
		objectiveFacts: Array.isArray(saved.objectiveFacts) ? saved.objectiveFacts : [],
		claims: Array.isArray(saved.claims) ? saved.claims : [],
		initialKnowledge: Array.isArray(saved.initialKnowledge)
			? saved.initialKnowledge
			: [],
		storyConnections: hydrateStoryConnections(saved.storyConnections),
		narrativeMoves: hydrateNarrativeMoves(saved.narrativeMoves),
		editor: {
			...fresh.editor,
			...savedEditor,
			storyCanvas: {
				...freshCanvas,
				...savedCanvas,
				viewport: savedCanvas?.viewport ?? freshCanvas.viewport,
				nodes: savedCanvas?.nodes ?? []
			},
			worldTimeViewport: {
				...freshWorldTime,
				...savedWorldTime,
				pixelsPerHour: Math.min(
					480,
					Math.max(0.35, savedWorldTime?.pixelsPerHour ?? 0.4)
				)
			}
		},
		simulation: {
			...fresh.simulation,
			...savedSimulation,
			characterKnowledge: Array.isArray(savedSimulation.characterKnowledge)
				? savedSimulation.characterKnowledge
				: []
		}
	};
}

function migrateSchemaV1(
	value: unknown,
	hostStoryId: string,
	projectName: string,
	template: NarrativeProjectTemplate
): NarrativeProject | undefined {
	if (!value || typeof value !== 'object') {
		return undefined;
	}

	const legacy = value as Partial<NarrativeProject> & {schemaVersion?: number};
	if (
		legacy.schemaVersion !== 1 ||
		legacy.hostStoryId !== hostStoryId ||
		!Array.isArray(legacy.locations) ||
		!Array.isArray(legacy.characters)
	) {
		return undefined;
	}

	const fresh = createNarrativeProject(hostStoryId, projectName, template);
	const legacyEditor = legacy.editor ?? fresh.editor;
	const freshCanvas = fresh.editor.storyCanvas!;
	const legacyCanvas = legacyEditor.storyCanvas;
	const freshWorldTime = fresh.editor.worldTimeViewport!;
	const legacyWorldTime = legacyEditor.worldTimeViewport;
	const legacySimulation = legacy.simulation ?? fresh.simulation;

	return {
		...fresh,
		...legacy,
		schemaVersion: narrativeProjectSchemaVersion,
		name: legacy.name ?? projectName,
		template,
		locations: legacy.locations,
		scenes: legacy.scenes ?? [],
		characters: legacy.characters,
		itemDefinitions: [],
		itemInstances: [],
		objectiveFacts: [],
		claims: [],
		initialKnowledge: [],
		behaviorProfiles: legacy.behaviorProfiles ?? [],
		routineRules: legacy.routineRules ?? [],
		scheduleExceptions: legacy.scheduleExceptions ?? [],
		storyNodes: [],
		storyConnections: [],
		narrativeMoves: [],
		memories: legacy.memories ?? [],
		relationships: legacy.relationships ?? [],
		pendingReactions: legacy.pendingReactions ?? [],
		mindStates: legacy.mindStates ?? [],
		editor: {
			...fresh.editor,
			...legacyEditor,
			storyCanvas: {
				...freshCanvas,
				...legacyCanvas,
				viewport: legacyCanvas?.viewport ?? freshCanvas.viewport,
				nodes: legacyCanvas?.nodes ?? []
			},
			worldTimeViewport: {
				...freshWorldTime,
				...legacyWorldTime,
				pixelsPerHour: Math.min(
					480,
					Math.max(0.35, legacyWorldTime?.pixelsPerHour ?? 0.4)
				)
			}
		},
		simulation: {
			...fresh.simulation,
			...legacySimulation,
			characterKnowledge: []
		}
	};
}

export function createLocalStorageNarrativeProjectRepository(
	hostStoryId: string,
	projectName: string,
	template: NarrativeProjectTemplate
): NarrativeProjectRepository {
	const key = `twine:narrative-project:v${narrativeProjectSchemaVersion}:${hostStoryId}`;
	const legacyV1Key = `twine:narrative-project:v1:${hostStoryId}`;

	return {
		load() {
			if (typeof window === 'undefined') {
				return createNarrativeProject(hostStoryId, projectName, template);
			}

			try {
				const saved = window.localStorage.getItem(key);
				if (saved) {
					const hydrated = hydrateSchemaV2(
						JSON.parse(saved),
						hostStoryId,
						projectName,
						template
					);
					if (hydrated) {
						return hydrated;
					}
				}

				const legacySaved = window.localStorage.getItem(legacyV1Key);
				if (legacySaved) {
					const migrated = migrateSchemaV1(
						JSON.parse(legacySaved),
						hostStoryId,
						projectName,
						template
					);
					if (migrated) {
						window.localStorage.setItem(key, JSON.stringify(migrated));
						return migrated;
					}
				}
			} catch {
				// A damaged or unavailable localStorage payload must not block Story Edit.
			}

			return createNarrativeProject(hostStoryId, projectName, template);
		},
		save(project) {
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(key, JSON.stringify(project));
			}
		}
	};
}
