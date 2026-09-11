import {NarrativeProject, narrativeProjectSchemaVersion} from '../../domain/narrative/project';
import {createNarrativeProject} from '../../domain/narrative/project-factory';
import {NarrativeProjectTemplate} from '../../domain/narrative/template';

export interface NarrativeProjectRepository {
	load(): NarrativeProject;
	save(project: NarrativeProject): void;
}

function looksLikeNarrativeProject(value: unknown): value is NarrativeProject {
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

	return {
		...fresh,
		...legacy,
		schemaVersion: narrativeProjectSchemaVersion,
		name: legacy.name ?? projectName,
		template,
		locations: legacy.locations,
		scenes: legacy.scenes ?? [],
		characters: legacy.characters,
		behaviorProfiles: legacy.behaviorProfiles ?? [],
		routineRules: legacy.routineRules ?? [],
		scheduleExceptions: legacy.scheduleExceptions ?? [],
		storyNodes: [],
		storyConnections: [],
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
				pixelsPerHour: Math.min(480, Math.max(0.35, legacyWorldTime?.pixelsPerHour ?? 0.4))
			}
		},
		simulation: legacy.simulation ?? fresh.simulation
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
					if (looksLikeNarrativeProject(parsed) && parsed.hostStoryId === hostStoryId) {
						return parsed;
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
