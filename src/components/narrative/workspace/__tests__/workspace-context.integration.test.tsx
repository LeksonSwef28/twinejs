import * as React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
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
import {StoryWorkspace} from '../story-workspace';
import {useAuthoringNavigation} from '../use-authoring-navigation';

function workspaceProject() {
	const project = createNarrativeProject(
		'story-a67-workspace-context',
		'A67 Workspace Context',
		ninetyThreeDaysTemplate
	);
	project.characters.push({
		id: 'katya',
		name: 'Катя',
		cognitionTier: 'full',
		defaultBehaviorProfileId: 'katya-profile'
	});
	project.behaviorProfiles.push({
		id: 'katya-profile',
		characterId: 'katya',
		name: 'Обычная жизнь'
	});
	project.itemDefinitions.push({
		id: 'key-def',
		name: 'Ключ',
		tags: []
	});
	project.itemInstances.push({
		id: 'key-1',
		definitionId: 'key-def',
		placement: {type: 'unplaced'}
	});
	project.storyNodes.push({
		id: 'meeting',
		kind: 'event',
		title: 'Встреча',
		participantIds: ['katya'],
		activationState: 'draft',
		placement: {day: 4, minuteOfDay: 600}
	});
	project.editor.storyCanvas!.nodes.push(
		{
			id: 'meeting-a',
			kind: 'entity',
			entityRef: {type: 'storyNode', id: 'meeting'},
			position: {x: 100, y: 200}
		},
		{
			id: 'meeting-b',
			kind: 'entity',
			entityRef: {type: 'storyNode', id: 'meeting'},
			position: {x: 500, y: 300}
		},
		{
			id: 'key-visual',
			kind: 'entity',
			entityRef: {type: 'item', id: 'key-1'},
			position: {x: 800, y: 200}
		}
	);
	return project;
}

const WorkspaceSession: React.FC = () => {
	const {project, undo} = useNarrativeProject();
	const {focus} = useAuthoringSessionFocus();
	const [splitView, setSplitView] = React.useState(false);
	const {navigate} = useAuthoringNavigation({splitView});

	return (
		<>
			<output data-testid="focus">
				{focus ? `${focus.type}:${focus.id}` : 'none'}
			</output>
			<output data-testid="workspace">
				{project.editor.workspaceMode ?? 'story'}
			</output>
			<output data-testid="simulation">
				{`${project.simulation.day}:${project.simulation.minuteOfDay}`}
			</output>
			<output data-testid="world-center">
				{project.editor.worldTimeViewport?.centerAbsoluteMinute ?? -1}
			</output>

			<button
				type="button"
				onClick={() =>
					navigate({type: 'open-character-in-story', characterId: 'katya'})
				}
			>
				external-character
			</button>
			<button
				type="button"
				onClick={() =>
					navigate({type: 'open-story-in-world-time', storyNodeId: 'meeting'})
				}
			>
				show-story-time
			</button>
			<button
				type="button"
				onClick={() =>
					navigate({type: 'open-story-in-story', storyNodeId: 'meeting'})
				}
			>
				show-story-story
			</button>
			<button type="button" onClick={() => setSplitView(current => !current)}>
				toggle-split
			</button>
			<button type="button" onClick={undo}>
				undo-authored
			</button>

			<StoryWorkspace navigate={navigate} />
		</>
	);
};

const WorkspaceFocusBoundary: React.FC = () => (
	<AuthoringSessionFocusProvider>
		<WorkspaceSession />
	</AuthoringSessionFocusProvider>
);

const ProjectInitializer: React.FC = () => {
	const {project, replaceProjectFromStarter} = useNarrativeProject();
	const initialized = React.useRef(false);

	React.useEffect(() => {
		if (!initialized.current && project.storyNodes.length === 0) {
			initialized.current = true;
			replaceProjectFromStarter(workspaceProject());
		}
	}, [project, replaceProjectFromStarter]);

	return project.storyNodes.length === 0 ? null : <WorkspaceFocusBoundary />;
};

function renderWorkspace() {
	return render(
		<NarrativeProjectProvider
			hostStoryId="story-a67-workspace-context"
			projectName="A67 workspace context integration"
		>
			<ProjectInitializer />
		</NarrativeProjectProvider>
	);
}

function storyCanvasButtons(container: HTMLElement) {
	return Array.from(
		container.querySelectorAll<HTMLButtonElement>('.narrative-workspace__node')
	).filter(button => button.textContent?.includes('Встреча'));
}

function itemCanvasButton(container: HTMLElement) {
	return Array.from(
		container.querySelectorAll<HTMLButtonElement>('.narrative-workspace__node')
	).find(button => button.textContent?.includes('Ключ'));
}

describe('A67 workspace context integration', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('Story click establishes one canonical focus across duplicate Canvas copies and cross-workspace navigation', async () => {
		const {container} = renderWorkspace();
		await waitFor(() => expect(storyCanvasButtons(container)).toHaveLength(2));
		const simulationBefore = screen.getByTestId('simulation').textContent;

		fireEvent.click(storyCanvasButtons(container)[0]);
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:meeting');
		expect(screen.getByRole('heading', {level: 2, name: 'Встреча'})).toBeInTheDocument();
		expect(
			container.querySelectorAll('[data-author-focus="true"]')
		).toHaveLength(2);

		fireEvent.click(screen.getByText('show-story-time'));
		expect(screen.getByTestId('workspace')).toHaveTextContent('world-time');
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:meeting');
		expect(screen.getByTestId('simulation')).toHaveTextContent(
			simulationBefore ?? ''
		);

		fireEvent.click(screen.getByText('show-story-story'));
		expect(screen.getByTestId('workspace')).toHaveTextContent('story');
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:meeting');
	});

	test('Item inspection stays local, then external Character focus replaces it without fabricating a Canvas node', async () => {
		const {container} = renderWorkspace();
		await waitFor(() => expect(storyCanvasButtons(container)).toHaveLength(2));

		fireEvent.click(storyCanvasButtons(container)[0]);
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:meeting');

		const itemButton = itemCanvasButton(container);
		expect(itemButton).toBeDefined();
		fireEvent.click(itemButton!);
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:meeting');
		expect(screen.getByRole('heading', {level: 2, name: 'Ключ'})).toBeInTheDocument();

		fireEvent.click(screen.getByText('external-character'));
		await waitFor(() =>
			expect(screen.getByRole('heading', {level: 2, name: 'Катя'})).toBeInTheDocument()
		);
		expect(screen.getByTestId('focus')).toHaveTextContent('character:katya');
		expect(
			Array.from(
				container.querySelectorAll<HTMLButtonElement>('.narrative-workspace__node')
			).filter(button => button.textContent?.includes('Катя'))
		).toHaveLength(0);
		expect(screen.getByRole('button', {name: 'Убрать с доски'})).toBeDisabled();
	});

	test('focused Story deletion clears stale focus and authored Undo does not resurrect it', async () => {
		const {container} = renderWorkspace();
		await waitFor(() => expect(storyCanvasButtons(container)).toHaveLength(2));

		fireEvent.click(storyCanvasButtons(container)[0]);
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:meeting');

		fireEvent.click(screen.getByRole('button', {name: 'Удалить блок'}));
		expect(screen.getByTestId('focus')).toHaveTextContent('none');
		await waitFor(() => expect(storyCanvasButtons(container)).toHaveLength(0));

		fireEvent.click(screen.getByText('undo-authored'));
		await waitFor(() => expect(storyCanvasButtons(container)).toHaveLength(2));
		expect(screen.getByTestId('focus')).toHaveTextContent('none');
	});

	test('Split View navigation moves the destination viewport without switching the canonical workspace', async () => {
		const {container} = renderWorkspace();
		await waitFor(() => expect(storyCanvasButtons(container)).toHaveLength(2));

		fireEvent.click(storyCanvasButtons(container)[0]);
		const simulationBefore = screen.getByTestId('simulation').textContent;
		fireEvent.click(screen.getByText('toggle-split'));
		fireEvent.click(screen.getByText('show-story-time'));

		expect(screen.getByTestId('workspace')).toHaveTextContent('story');
		expect(screen.getByTestId('focus')).toHaveTextContent('story-node:meeting');
		expect(screen.getByTestId('world-center')).toHaveTextContent(
			String(3 * 1440 + 600)
		);
		expect(screen.getByTestId('simulation')).toHaveTextContent(
			simulationBefore ?? ''
		);
	});
});
