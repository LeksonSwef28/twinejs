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
		Array.isArray(candidate.characters)
	);
}

export function createLocalStorageNarrativeProjectRepository(
	hostStoryId: string,
	projectName: string,
	template: NarrativeProjectTemplate
): NarrativeProjectRepository {
	const key = `twine:narrative-project:v${narrativeProjectSchemaVersion}:${hostStoryId}`;

	return {
		load() {
			if (typeof window === 'undefined') {
				return createNarrativeProject(hostStoryId, projectName, template);
			}

			try {
				const saved = window.localStorage.getItem(key);
				if (!saved) {
					return createNarrativeProject(hostStoryId, projectName, template);
				}

				const parsed: unknown = JSON.parse(saved);
				if (looksLikeNarrativeProject(parsed) && parsed.hostStoryId === hostStoryId) {
					return parsed;
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
