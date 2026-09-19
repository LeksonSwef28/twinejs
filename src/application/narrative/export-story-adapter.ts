import {NarrativeProject} from '../../domain/narrative/project';
import {Passage, Story} from '../../store/stories';
import {
	NarrativeExportDiagnostic,
	NarrativeRuntimeArtifactV1,
	compileNarrativeRuntimeArtifact,
	serializeNarrativeRuntimeArtifact
} from './export-compiler';

export const narrativeRuntimeArtifactPassageName = '93 Days Runtime Artifact';
export const narrativeRuntimeArtifactPassageTag = '93-days-runtime-artifact';

export interface NarrativeExportAdapterDiagnostic {
	source: 'adapter';
	disposition: 'blocker';
	code: 'host-story-mismatch';
	summary: string;
}

export type NarrativePreparedExportDiagnostic =
	| NarrativeExportDiagnostic
	| NarrativeExportAdapterDiagnostic;

export type NarrativeStoryExportPreparation =
	| {
			status: 'ready';
			artifact: NarrativeRuntimeArtifactV1;
			diagnostics: NarrativePreparedExportDiagnostic[];
			story: Story;
	  }
	| {
			status: 'blocked';
			diagnostics: NarrativePreparedExportDiagnostic[];
	  };

function hostStoryMismatchDiagnostic(
	project: NarrativeProject,
	hostStory: Story
): NarrativeExportAdapterDiagnostic {
	return {
		source: 'adapter',
		disposition: 'blocker',
		code: 'host-story-mismatch',
		summary: `Narrative Project host Story ${project.hostStoryId} does not match supplied Story ${hostStory.id}.`
	};
}

function artifactPassage(
	project: NarrativeProject,
	hostStory: Story,
	artifact: NarrativeRuntimeArtifactV1
): Passage {
	return {
		id: `narrative-runtime-artifact:${project.projectId}`,
		story: hostStory.id,
		name: narrativeRuntimeArtifactPassageName,
		tags: [narrativeRuntimeArtifactPassageTag],
		text: serializeNarrativeRuntimeArtifact(artifact),
		top: 0,
		left: 0,
		width: 100,
		height: 100,
		selected: false,
		highlighted: false
	};
}

function transientStory(
	project: NarrativeProject,
	hostStory: Story,
	passage: Passage
): Story {
	return {
		id: hostStory.id,
		ifid: hostStory.ifid,
		name: project.name,
		lastUpdate: new Date(0),
		passages: [passage],
		script: '',
		selected: false,
		snapToGrid: false,
		startPassage: passage.id,
		storyFormat: hostStory.storyFormat,
		storyFormatVersion: hostStory.storyFormatVersion,
		stylesheet: '',
		tags: [],
		tagColors: {},
		zoom: 1
	};
}

/**
 * A52-S3 derived export adapter. Generated Story/Passage data exists only in
 * memory and is never dispatched into the persisted Twine Story graph.
 */
export function prepareNarrativeStoryExport(
	project: NarrativeProject,
	hostStory: Story
): NarrativeStoryExportPreparation {
	if (hostStory.id !== project.hostStoryId) {
		return {
			status: 'blocked',
			diagnostics: [hostStoryMismatchDiagnostic(project, hostStory)]
		};
	}

	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status === 'blocked') {
		return {status: 'blocked', diagnostics: compiled.diagnostics};
	}

	const passage = artifactPassage(project, hostStory, compiled.artifact);
	return {
		status: 'ready',
		artifact: compiled.artifact,
		diagnostics: compiled.diagnostics,
		story: transientStory(project, hostStory, passage)
	};
}
