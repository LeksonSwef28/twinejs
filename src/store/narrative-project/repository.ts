import {
	CharacterMindState,
	MemoryTrace,
	PendingReaction,
	RelationshipState
} from '../../domain/narrative/cognition';
import {
	NarrativeMoveDefinition,
	narrativeMoveIsStructurallyValid
} from '../../domain/narrative/interaction';
import {
	InteractionTemplateDefinition,
	interactionTemplateIsStructurallyValid
} from '../../domain/narrative/interaction-template';
import {
	CharacterKnowledgeState,
	knowledgeConfidenceIsValid
} from '../../domain/narrative/knowledge';
import {
	NarrativeProject,
	NarrativeSimulationState,
	narrativeProjectSchemaVersion
} from '../../domain/narrative/project';
import {createNarrativeProject} from '../../domain/narrative/project-factory';
import {
	ReactionCandidateSetDefinition,
	reactionCandidateSetIsStructurallyValid
} from '../../domain/narrative/reaction';
import {
	StoryConnectionDefinition,
	StoryEdgeMode,
	storyConnectionKindCanExecute
} from '../../domain/narrative/story';
import {NarrativeProjectTemplate} from '../../domain/narrative/template';
import {
	composeNarrativeProjectPersistence,
	isNarrativeProjectPersistenceEnvelope,
	projectNarrativePersistence
} from './persistence-projection';

export interface NarrativeProjectRepository {
	load(): NarrativeProject;
	save(project: NarrativeProject): void;
}

type PersistedStoryConnection = Omit<StoryConnectionDefinition, 'mode'> & {
	mode?: StoryEdgeMode;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function finiteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function hydrateStringRecord(value: unknown): Record<string, string> {
	if (!isRecord(value)) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(value).filter(([, entry]) => typeof entry === 'string')
	) as Record<string, string>;
}

function hydrateMemories(value: unknown): MemoryTrace[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((raw): raw is MemoryTrace => {
		if (!isRecord(raw)) {
			return false;
		}
		return (
			typeof raw.id === 'string' &&
			typeof raw.characterId === 'string' &&
			typeof raw.summary === 'string' &&
			Number.isInteger(raw.createdAtDay) &&
			finiteNumber(raw.createdAtMinute) &&
			finiteNumber(raw.importance) &&
			raw.importance >= 0 &&
			raw.importance <= 1 &&
			finiteNumber(raw.baseStrength) &&
			raw.baseStrength >= 0 &&
			raw.baseStrength <= 1 &&
			isStringArray(raw.tags) &&
			isStringArray(raw.relatedEntityIds)
		);
	});
}

function hydrateRelationships(value: unknown): RelationshipState[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((raw): raw is RelationshipState => {
		if (!isRecord(raw) || !isRecord(raw.values)) {
			return false;
		}
		return (
			typeof raw.fromCharacterId === 'string' &&
			typeof raw.toCharacterId === 'string' &&
			Object.values(raw.values).every(finiteNumber)
		);
	});
}

function hydratePendingReactions(value: unknown): PendingReaction[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((raw): raw is PendingReaction => {
		if (!isRecord(raw)) {
			return false;
		}
		return (
			typeof raw.id === 'string' &&
			typeof raw.characterId === 'string' &&
			typeof raw.reactionType === 'string' &&
			finiteNumber(raw.priority) &&
			isStringArray(raw.conditions)
		);
	});
}

function hydrateMindStates(value: unknown): CharacterMindState[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((raw): raw is CharacterMindState => {
		if (!isRecord(raw)) {
			return false;
		}
		return (
			typeof raw.characterId === 'string' &&
			(raw.mood === undefined || typeof raw.mood === 'string') &&
			isStringArray(raw.activeMemoryIds) &&
			isStringArray(raw.pendingReactionIds)
		);
	});
}

function hydrateCharacterKnowledge(value: unknown): CharacterKnowledgeState[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const attitudes = new Set(['knows', 'believes', 'doubts', 'disbelieves']);
	return value.filter((raw): raw is CharacterKnowledgeState => {
		if (!isRecord(raw)) {
			return false;
		}
		return (
			typeof raw.id === 'string' &&
			typeof raw.characterId === 'string' &&
			typeof raw.claimId === 'string' &&
			typeof raw.attitude === 'string' &&
			attitudes.has(raw.attitude) &&
			finiteNumber(raw.confidence) &&
			knowledgeConfidenceIsValid(raw.confidence) &&
			isRecord(raw.source) &&
			Number.isInteger(raw.timesHeard) &&
			raw.timesHeard >= 0
		);
	});
}

function hydrateSimulation(
	value: unknown,
	fallback: NarrativeSimulationState
): NarrativeSimulationState {
	if (!isRecord(value)) {
		return fallback;
	}
	const day =
		Number.isInteger(value.day) && (value.day as number) >= 1
			? (value.day as number)
			: fallback.day;
	const minuteOfDay =
		Number.isInteger(value.minuteOfDay) &&
		(value.minuteOfDay as number) >= 0 &&
		(value.minuteOfDay as number) < 24 * 60
			? (value.minuteOfDay as number)
			: fallback.minuteOfDay;

	return {
		day,
		minuteOfDay,
		activeBehaviorProfileByCharacter: hydrateStringRecord(
			value.activeBehaviorProfileByCharacter
		),
		actualLocationByCharacter: hydrateStringRecord(value.actualLocationByCharacter),
		characterKnowledge: hydrateCharacterKnowledge(value.characterKnowledge)
	};
}

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

function hydrateInteractionTemplates(value: unknown): InteractionTemplateDefinition[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.flatMap(raw => {
		if (!raw || typeof raw !== 'object') {
			return [];
		}
		const candidate = raw as InteractionTemplateDefinition;
		return interactionTemplateIsStructurallyValid(candidate) ? [candidate] : [];
	});
}

function hydrateReactionCandidateSets(value: unknown): ReactionCandidateSetDefinition[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.flatMap(raw => {
		if (!raw || typeof raw !== 'object') {
			return [];
		}
		const candidate = raw as ReactionCandidateSetDefinition;
		return reactionCandidateSetIsStructurallyValid(candidate) ? [candidate] : [];
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
		interactionTemplates: hydrateInteractionTemplates(saved.interactionTemplates),
		reactionCandidateSets: hydrateReactionCandidateSets(saved.reactionCandidateSets),
		memories: hydrateMemories(saved.memories),
		relationships: hydrateRelationships(saved.relationships),
		pendingReactions: hydratePendingReactions(saved.pendingReactions),
		mindStates: hydrateMindStates(saved.mindStates),
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
		simulation: hydrateSimulation(saved.simulation, fresh.simulation)
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
		interactionTemplates: [],
		reactionCandidateSets: [],
		memories: hydrateMemories(legacy.memories),
		relationships: hydrateRelationships(legacy.relationships),
		pendingReactions: hydratePendingReactions(legacy.pendingReactions),
		mindStates: hydrateMindStates(legacy.mindStates),
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
			...hydrateSimulation(legacySimulation, fresh.simulation),
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
					const parsed: unknown = JSON.parse(saved);
					const projected = isNarrativeProjectPersistenceEnvelope(parsed)
						? composeNarrativeProjectPersistence(parsed)
						: parsed;
					const hydrated = hydrateSchemaV2(
						projected,
						hostStoryId,
						projectName,
						template
					);
					if (hydrated) {
						if (!isNarrativeProjectPersistenceEnvelope(parsed)) {
							window.localStorage.setItem(
								key,
								JSON.stringify(projectNarrativePersistence(hydrated))
							);
						}
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
						window.localStorage.setItem(
							key,
							JSON.stringify(projectNarrativePersistence(migrated))
						);
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
				window.localStorage.setItem(
					key,
					JSON.stringify(projectNarrativePersistence(project))
				);
			}
		}
	};
}
