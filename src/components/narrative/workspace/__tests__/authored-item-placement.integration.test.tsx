import * as React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {ItemPlacement} from '../../../../domain/narrative/items';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {
	NarrativeProjectProvider,
	useNarrativeProject
} from '../../../../store/narrative-project';
import {createLocalStorageNarrativeProjectRepository} from '../../../../store/narrative-project/repository';
import {AuthoringSessionFocusProvider} from '../authoring-session-focus';
import {StoryWorkspace} from '../story-workspace';
import {useAuthoringNavigation} from '../use-authoring-navigation';

function placementWorkspaceProject(
	placement: ItemPlacement = {type: 'unplaced'}
) {
	const project = createNarrativeProject(
		'story-a67-d2-item-placement',
		'A67-D2 Item Placement',
		ninetyThreeDaysTemplate
	);
	project.locations.push(
		{id: 'home', name: 'Дом'},
		{id: 'cafe', name: 'Кафе'}
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
	project.itemDefinitions.push({id: 'key-def', name: 'Ключ', tags: []});
	project.itemInstances.push({
		id: 'key-1',
		definitionId: 'key-def',
		placement
	});
	project.editor.storyCanvas!.nodes.push(
		{
			id: 'key-visual-a',
			kind: 'entity',
			entityRef: {type: 'item', id: 'key-1'},
			position: {x: 200, y: 200}
		},
		{
			id: 'key-visual-b',
			kind: 'entity',
			entityRef: {type: 'item', id: 'key-1'},
			position: {x: 520, y: 200}
		}
	);
	return project;
}

const PlacementSession: React.FC = () => {
	const {project, execute, undo, redo} = useNarrativeProject();
	const {navigate} = useAuthoringNavigation({splitView: false});
	const item = project.itemInstances.find(candidate => candidate.id === 'key-1');

	return (
		<>
			<output data-testid="canonical-placement">
				{item ? JSON.stringify(item.placement) : 'missing'}
			</output>
			<output data-testid="simulation">
				{`${project.simulation.day}:${project.simulation.minuteOfDay}`}
			</output>
			<button
				type="button"
				onClick={() => execute({type: 'editor/selectDay', day: 2})}
			>
				unrelated-editor-update
			</button>
			<button type="button" onClick={undo}>
				undo-placement
			</button>
			<button type="button" onClick={redo}>
				redo-placement
			</button>
			<StoryWorkspace navigate={navigate} />
		</>
	);
};

const PlacementBoundary: React.FC = () => (
	<AuthoringSessionFocusProvider>
		<PlacementSession />
	</AuthoringSessionFocusProvider>
);

function renderPlacementWorkspace(
	placement: ItemPlacement = {type: 'unplaced'}
) {
	const project = placementWorkspaceProject(placement);
	createLocalStorageNarrativeProjectRepository(
		project.hostStoryId,
		project.name,
		ninetyThreeDaysTemplate
	).save(project);

	return render(
		<NarrativeProjectProvider
			hostStoryId={project.hostStoryId}
			projectName={project.name}
		>
			<PlacementBoundary />
		</NarrativeProjectProvider>
	);
}

function itemCanvasButtons(container: HTMLElement) {
	return Array.from(
		container.querySelectorAll<HTMLButtonElement>('.narrative-workspace__node')
	).filter(button => button.textContent?.includes('Ключ'));
}

async function selectItem(container: HTMLElement, index = 0) {
	await waitFor(() => expect(itemCanvasButtons(container)).toHaveLength(2));
	fireEvent.click(itemCanvasButtons(container)[index]);
	await screen.findByRole('heading', {level: 2, name: 'Ключ'});
}

describe('A67-D2 authored Item Placement Story inspector', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('edits complete authored placement through explicit Apply', async () => {
		const {container} = renderPlacementWorkspace();
		await selectItem(container);

		expect(
			screen.getByText('Текущее размещение: без размещения.')
		).toBeInTheDocument();
		const kind = screen.getByLabelText('Тип размещения предмета');
		const apply = screen.getByRole('button', {name: 'Применить размещение'});
		expect(apply).toBeDisabled();

		fireEvent.change(kind, {target: {value: 'location'}});
		expect(screen.getByLabelText('Локация предмета')).toHaveValue('');
		expect(apply).toBeDisabled();
		fireEvent.change(screen.getByLabelText('Локация предмета'), {
			target: {value: 'home'}
		});
		expect(apply).toBeEnabled();
		fireEvent.click(apply);
		await waitFor(() =>
			expect(screen.getByTestId('canonical-placement')).toHaveTextContent(
				'location'
			)
		);
		expect(
			screen.getByText('Текущее размещение: локация «Дом».')
		).toBeInTheDocument();

		fireEvent.change(kind, {target: {value: 'character'}});
		fireEvent.change(screen.getByLabelText('Персонаж с предметом'), {
			target: {value: 'katya'}
		});
		fireEvent.click(apply);
		await waitFor(() =>
			expect(screen.getByText('Текущее размещение: у персонажа «Катя».')).toBeInTheDocument()
		);

		fireEvent.change(kind, {target: {value: 'unplaced'}});
		fireEvent.click(apply);
		await waitFor(() =>
			expect(
				screen.getByText('Текущее размещение: без размещения.')
			).toBeInTheDocument()
		);
	});

	test('keeps a dirty draft across unrelated updates and duplicate Canvas copies', async () => {
		const {container} = renderPlacementWorkspace();
		await selectItem(container, 0);

		fireEvent.change(screen.getByLabelText('Тип размещения предмета'), {
			target: {value: 'location'}
		});
		fireEvent.change(screen.getByLabelText('Локация предмета'), {
			target: {value: 'cafe'}
		});
		expect(screen.getByLabelText('Локация предмета')).toHaveValue('cafe');

		fireEvent.click(screen.getByText('unrelated-editor-update'));
		expect(screen.getByLabelText('Локация предмета')).toHaveValue('cafe');

		fireEvent.click(itemCanvasButtons(container)[1]);
		expect(screen.getByLabelText('Локация предмета')).toHaveValue('cafe');
		expect(screen.getByTestId('canonical-placement')).toHaveTextContent(
			'unplaced'
		);

		fireEvent.click(screen.getByRole('button', {name: 'Применить размещение'}));
		await waitFor(() =>
			expect(screen.getByText('Текущее размещение: локация «Кафе».')).toBeInTheDocument()
		);
	});

	test('shows an unresolved stored target without silently repairing it', async () => {
		const {container} = renderPlacementWorkspace({
			type: 'location',
			locationId: 'missing-home'
		});
		await selectItem(container);

		expect(
			screen.getByText(
				'Текущее размещение: отсутствующая локация (missing-home).'
			)
		).toBeInTheDocument();
		expect(screen.getByLabelText('Тип размещения предмета')).toHaveValue(
			'location'
		);
		expect(screen.getByLabelText('Локация предмета')).toHaveValue('');
		expect(
			screen.getByRole('button', {name: 'Применить размещение'})
		).toBeDisabled();

		fireEvent.change(screen.getByLabelText('Локация предмета'), {
			target: {value: 'home'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Применить размещение'}));
		await waitFor(() =>
			expect(screen.getByText('Текущее размещение: локация «Дом».')).toBeInTheDocument()
		);
	});

	test('Undo/Redo reset the effective draft from canonical placement', async () => {
		const {container} = renderPlacementWorkspace();
		await selectItem(container);
		const simulationBefore = screen.getByTestId('simulation').textContent;

		fireEvent.change(screen.getByLabelText('Тип размещения предмета'), {
			target: {value: 'location'}
		});
		fireEvent.change(screen.getByLabelText('Локация предмета'), {
			target: {value: 'home'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Применить размещение'}));
		await screen.findByText('Текущее размещение: локация «Дом».');

		fireEvent.click(screen.getByText('undo-placement'));
		await screen.findByText('Текущее размещение: без размещения.');
		expect(screen.getByLabelText('Тип размещения предмета')).toHaveValue(
			'unplaced'
		);
		expect(screen.getByTestId('simulation')).toHaveTextContent(
			simulationBefore ?? ''
		);

		fireEvent.click(screen.getByText('redo-placement'));
		await screen.findByText('Текущее размещение: локация «Дом».');
		expect(screen.getByLabelText('Локация предмета')).toHaveValue('home');
	});

	test('Remove from board removes only the selected Canvas reference', async () => {
		const {container} = renderPlacementWorkspace({
			type: 'location',
			locationId: 'home'
		});
		await selectItem(container, 0);

		fireEvent.click(screen.getByRole('button', {name: 'Убрать с доски'}));
		await waitFor(() => expect(itemCanvasButtons(container)).toHaveLength(1));
		expect(screen.getByTestId('canonical-placement')).toHaveTextContent(
			'location'
		);

		fireEvent.click(itemCanvasButtons(container)[0]);
		await screen.findByText('Текущее размещение: локация «Дом».');
	});
});
