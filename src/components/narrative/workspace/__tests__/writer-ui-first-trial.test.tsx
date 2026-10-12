import * as React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {
	NarrativeProjectProvider,
	useNarrativeProject
} from '../../../../store/narrative-project';
import {createLocalStorageNarrativeProjectRepository} from '../../../../store/narrative-project/repository';
import {AuthoringSessionFocusProvider} from '../authoring-session-focus';
import {MoveConditionsPanel} from '../move-conditions-panel';
import {NarrativeMovePanel} from '../narrative-move-panel';
import {StoryWorkspace} from '../story-workspace';
import {useAuthoringNavigation} from '../use-authoring-navigation';

const hostStoryId = 'a81-blank-writer-story';
const projectName = 'UI-only writer authoring trial';

const WriterSurface: React.FC = () => {
	const {project, saveStatus} = useNarrativeProject();
	const {navigate} = useAuthoringNavigation({splitView: false});
	return (
		<>
			<output data-testid="writer-save">{saveStatus}</output>
			<output data-testid="writer-author-state">
				{project.characters.length}:{project.storyNodes.length}:
				{project.narrativeMoves.length}:{project.narrativeMoves[0]?.guards.length ?? 0}
			</output>
			<StoryWorkspace navigate={navigate} />
			<NarrativeMovePanel />
			<MoveConditionsPanel />
		</>
	);
};

function renderWriter() {
	return render(
		<NarrativeProjectProvider
			hostStoryId={hostStoryId}
			projectName={projectName}
		>
			<AuthoringSessionFocusProvider>
				<WriterSurface />
			</AuthoringSessionFocusProvider>
		</NarrativeProjectProvider>
	);
}

describe('W1 first editor-only writer workflow', () => {
	beforeEach(() => window.localStorage.clear());

	test('creates character, Story, Move and availability guard through visible forms; survives close/reopen', async () => {
		const screenOne = renderWriter();
		const repo = createLocalStorageNarrativeProjectRepository(
			hostStoryId, projectName, ninetyThreeDaysTemplate
		);
		expect(repo.load().storyNodes).toHaveLength(0);

		fireEvent.change(screen.getByLabelText('Имя нового персонажа'), {
			target: {value: 'Ира'}
		});
		fireEvent.click(screen.getByRole('button', {name: '+ Персонаж'}));
		fireEvent.change(screen.getByLabelText('Название сюжетного блока'), {
			target: {value: 'Разговор у подъезда'}
		});
		fireEvent.click(screen.getByRole('button', {name: '+ На доску'}));
		expect(screen.getByTestId('writer-author-state')).toHaveTextContent('1:1:0:0');

		// No project data or Move is injected by test code; the writer uses the UI.
		const story = screen.getByLabelText('Сюжетный блок Narrative Move');
		fireEvent.change(story, {
			target: {value: screenOne.container.querySelector<HTMLSelectElement>(
			'select[aria-label="Сюжетный блок Narrative Move"]'
		)?.options[1]?.value}
		});
		fireEvent.change(screen.getByLabelText('Текст или смысл narrative move'), {
			target: {value: 'Спросить про письмо'}
		});
		fireEvent.click(screen.getByRole('button', {name: '+ Narrative Move'}));
		expect(screen.getByTestId('writer-author-state')).toHaveTextContent('1:1:1:0');

		fireEvent.change(screen.getByLabelText('Тип условия Narrative Move'), {
			target: {value: 'story-node-state'}
		});
		const nodeSelector = screen.getByLabelText('Story node условия');
		const authoredNodeId = (nodeSelector as HTMLSelectElement).options[1]?.value;
		fireEvent.change(nodeSelector, {target: {value: authoredNodeId}});
		fireEvent.click(screen.getByRole('button', {name: '+ Добавить Guard'}));
		expect(screen.getByTestId('writer-author-state')).toHaveTextContent('1:1:1:1');

		await waitFor(() => expect(screen.getByTestId('writer-save')).toHaveTextContent('saved'), {
			timeout: 5000
		});
		await waitFor(() => expect(repo.load().narrativeMoves).toHaveLength(1), {
			timeout: 5000
		});
		const saved = repo.load();
		expect(saved.characters[0].name).toBe('Ира');
		expect(saved.storyNodes[0].title).toBe('Разговор у подъезда');
		expect(saved.narrativeMoves[0].guards[0].condition).toEqual({
			type: 'story-node-state',
			storyNodeId: saved.storyNodes[0].id,
			state: 'available'
		});

		screenOne.unmount();
		renderWriter();
		expect(screen.getByTestId('writer-author-state')).toHaveTextContent('1:1:1:1');
		expect(screen.getByText('Спросить про письмо')).toBeInTheDocument();
	});
});
