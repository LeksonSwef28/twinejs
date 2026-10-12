import {NarrativeProject} from '../../domain/narrative/project';
import {projectNarrativePersistence} from './persistence-projection';

/**
 * A downloadable checkpoint of this Narrative Project's owned authored, editor
 * and runtime projections. Unlike a compiled Player artifact, this retains
 * source definitions and editing state.
 *
 * It does NOT include the host Twine Story/passages, and there is no automatic
 * import/restore workflow yet. Never describe it as a portable full-story
 * backup or as a game save.
 */
export function serializeNarrativeSourceSnapshot(
	project: NarrativeProject
): string {
	return JSON.stringify(projectNarrativePersistence(project), null, 2);
}

export function narrativeSourceSnapshotFilename(
	project: Pick<NarrativeProject, 'name'>
): string {
	const title = project.name
		.trim()
		.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
		.replace(/[. ]+$/g, '')
		.slice(0, 70)
		.trim();

	return `${title || 'Narrative Project'}.narrative-source.json`;
}
