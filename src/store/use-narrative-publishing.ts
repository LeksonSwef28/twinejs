import * as React from 'react';
import {NarrativeProject} from '../domain/narrative/project';
import {
	NarrativePreparedExportDiagnostic,
	prepareNarrativeStoryExport
} from '../application/narrative/export-story-adapter';
import {NarrativeRuntimeArtifactV1} from '../application/narrative/export-compiler';
import {
	NarrativeRuntimeProofPreparation,
	prepareNarrativeRuntimeProof
} from '../application/narrative/runtime-proof';
import {publishStoryWithFormat} from '../util/publish';
import {getAppInfo} from '../util/app-info';
import {
	formatWithNameAndVersion,
	loadFormatProperties,
	useStoryFormatsContext
} from './story-formats';
import {Story} from './stories';

export type NarrativePublishResult =
	| {
			status: 'blocked';
			diagnostics: NarrativePreparedExportDiagnostic[];
	  }
	| {
			status: 'published';
			artifact: NarrativeRuntimeArtifactV1;
			diagnostics: NarrativePreparedExportDiagnostic[];
			html: string;
			story: Story;
	  };

export interface UseNarrativePublishingProps {
	publishNarrativeProject(
		project: NarrativeProject,
		hostStory: Story
	): Promise<NarrativePublishResult>;
	publishNarrativeProof(
		project: NarrativeProject,
		hostStory: Story
	): NarrativeRuntimeProofPreparation;
}

/**
 * A52-S3 publishing orchestration for derived Narrative export data. The hook
 * loads the already configured Twine story format and delegates final binding
 * to the generic publisher. It never dispatches generated Story/Passage data.
 */
export function useNarrativePublishing(): UseNarrativePublishingProps {
	const {dispatch: storyFormatsDispatch, formats} = useStoryFormatsContext();

	return {
		publishNarrativeProof: React.useCallback(
			(project, hostStory) =>
				prepareNarrativeRuntimeProof(project, hostStory, getAppInfo()),
			[]
		),
		publishNarrativeProject: React.useCallback(
			async (project, hostStory) => {
				const prepared = prepareNarrativeStoryExport(project, hostStory);
				if (prepared.status === 'blocked') {
					return prepared;
				}

				const format = formatWithNameAndVersion(
					formats,
					prepared.story.storyFormat,
					prepared.story.storyFormatVersion
				);
				const formatProperties = await loadFormatProperties(format)(
					storyFormatsDispatch
				);
				if (!formatProperties) {
					throw new Error(`Couldn't load story format properties`);
				}

				return {
					status: 'published' as const,
					artifact: prepared.artifact,
					diagnostics: prepared.diagnostics,
					html: publishStoryWithFormat(
						prepared.story,
						formatProperties.source,
						getAppInfo()
					),
					story: prepared.story
				};
			},
			[formats, storyFormatsDispatch]
		)
	};
}
