import * as React from 'react';
import {useParams} from 'react-router-dom';
import {NarrativeWorkspace} from '../../components/narrative/workspace/narrative-workspace';
import {MainContent} from '../../components/container/main-content';
import {DocumentTitle} from '../../components/document-title/document-title';
import {DialogsContextProvider} from '../../dialogs';
import {NarrativeProjectProvider} from '../../store/narrative-project';
import {storyWithId} from '../../store/stories';
import {
	UndoableStoriesContextProvider,
	useUndoableStoriesContext
} from '../../store/undoable-stories';
import './story-edit-route.css';

export const InnerStoryEditRoute: React.FC = () => {
	const {storyId} = useParams<{storyId: string}>();
	const {stories} = useUndoableStoriesContext();
	const story = storyWithId(stories, storyId);

	return (
		<div className="story-edit-route">
			<DocumentTitle title={story.name} />
			<MainContent padded={false}>
				<NarrativeProjectProvider hostStoryId={story.id} projectName={story.name}>
					<NarrativeWorkspace />
				</NarrativeProjectProvider>
			</MainContent>
		</div>
	);
};

export const StoryEditRoute: React.FC = () => (
	<UndoableStoriesContextProvider>
		<DialogsContextProvider>
			<InnerStoryEditRoute />
		</DialogsContextProvider>
	</UndoableStoriesContextProvider>
);
