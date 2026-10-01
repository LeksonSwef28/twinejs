import * as React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {
	NarrativeProjectProvider,
	useNarrativeProject
} from '../../../../store/narrative-project';
import {
	AuthoringSessionFocusProvider,
	useAuthoringSessionFocus
} from '../authoring-session-focus';

function projectWithStory(name: string) {
	const project = createNarrativeProject(
		'story-a67-focus-provider',
		name,
		ninetyThreeDaysTemplate
	);
	project.storyNodes.push({
		id: 'story-a',
		kind: 'event',
		title: 'Story A',
		participantIds: [],
		activationState: 'draft'
	});
	project.characters.push({
		id: 'katya',
		name: 'Катя',
		cognitionTier: 'full',
		defaultBehaviorProfileId: 'katya-profile'
	});
	return project;
}

const FocusProbe: React.FC = () => {
	const {focus, setFocus, clearFocus} = useAuthoringSessionFocus();
	const {execute, undo, replaceProjectFromStarter} = useNarrativeProject();

	return (
		<div>
			<output data-testid="focus">
				{focus ? `${focus.type}:${focus.id}` : 'none'}
			</output>
			<button
				type="button"
				onClick={() => setFocus({type: 'story-node', id: 'story-a'})}
			>
				focus-story
			</button>
			<button
				type="button"
				onClick={() => setFocus({type: 'character', id: 'katya'})}
			>
				focus-character
			</button>
			<button
				type="button"
				onClick={() => setFocus({type: 'story-node', id: 'missing'})}
			>
				focus-missing
			</button>
			<button type="button" onClick={clearFocus}>
				clear-focus
			</button>
			<button
				type="button"
				onClick={() => execute({type: 'story/removeNode', id: 'story-a'})}
			>
				delete-story
			</button>
			<button type="button" onClick={undo}>
				undo
			</button>
			<button
				type="button"
				onClick={() => replaceProjectFromStarter(projectWithStory('Replacement'))}
			>
				replace-project
			</button>
		</div>
	);
};

const KeyedFocusBoundary: React.FC = () => {
	const {project} = useNarrativeProject();
	return (
		<AuthoringSessionFocusProvider key={project.projectId}>
			<FocusProbe />
		</AuthoringSessionFocusProvider>
	);
};

function ProjectInitializer() {
	const {project, replaceProjectFromStarter} = useNarrativeProject();
	const initialized = React.useRef(false);
	React.useEffect(() => {
		if (!initialized.current && project.storyNodes.length === 0) {
			initialized.current = true;
			replaceProjectFromStarter(projectWithStory('Initial'));
		}
	}, [project, replaceProjectFromStarter]);
	return <KeyedFocusBoundary />;
}

function renderFixture() {
	return render(
		<NarrativeProjectProvider
			hostStoryId="story-a67-focus-provider"
			projectName="A67 focus provider test"
		>
			<ProjectInitializer />
		</NarrativeProjectProvider>
	);
}

describe('A67 authoring session focus provider', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('sets valid Story and Character focus, rejects missing targets and clears explicitly', async () => {
		renderFixture();
		expect(await screen.findByTestId('focus')).toHaveTextContent('none');

		fireEvent.click(screen.getByText('focus-story'));
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:story-a');

		fireEvent.click(screen.getByText('focus-missing'));
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:story-a');

		fireEvent.click(screen.getByText('focus-character'));
		expect(screen.getByTestId('focus')).toHaveTextContent('character:katya');

		fireEvent.click(screen.getByText('clear-focus'));
		expect(screen.getByTestId('focus')).toHaveTextContent('none');
	});

	test('committed deletion hides and permanently clears stale Focus before Undo', async () => {
		renderFixture();
		await screen.findByTestId('focus');

		fireEvent.click(screen.getByText('focus-story'));
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:story-a');

		fireEvent.click(screen.getByText('delete-story'));
		expect(screen.getByTestId('focus')).toHaveTextContent('none');

		fireEvent.click(screen.getByText('undo'));
		expect(screen.getByTestId('focus')).toHaveTextContent('none');
	});

	test('keyed project replacement resets session Focus even when entity ids collide', async () => {
		renderFixture();
		await screen.findByTestId('focus');

		fireEvent.click(screen.getByText('focus-story'));
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:story-a');

		fireEvent.click(screen.getByText('replace-project'));
		expect(screen.getByTestId('focus')).toHaveTextContent('none');
	});
});
