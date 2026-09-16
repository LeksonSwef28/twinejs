import {fireEvent, render, screen, within} from '@testing-library/react';
import * as React from 'react';
import {NarrativeMoveDefinition} from '../../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {PreviewLaboratoryPanel} from '../preview-laboratory-panel';

const mockExecute = jest.fn();
const mockReplaceRuntimeProject = jest.fn();
let mockProject = createProject();

jest.mock('../../../../store/narrative-project', () => ({
	useNarrativeProject: () => ({
		project: mockProject,
		execute: mockExecute,
		replaceRuntimeProject: mockReplaceRuntimeProject
	})
}));

function createProject() {
	const project = createNarrativeProject(
		'a51-checkpoint-ui',
		'A51 checkpoint UI',
		ninetyThreeDaysTemplate
	);
	project.locations = [
		{id: 'home', name: 'Дом'},
		{id: 'station', name: 'Станция'}
	];
	project.characters = [
		{
			id: 'player',
			name: 'Игрок',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		},
		{
			id: 'katya',
			name: 'Катя',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'katya-default'
		}
	];
	project.storyNodes = [
		{
			id: 'meeting',
			kind: 'event',
			title: 'Встреча',
			participantIds: ['player', 'katya'],
			activationState: 'available'
		}
	];
	const move: NarrativeMoveDefinition = {
		id: 'promise',
		storyNodeId: 'meeting',
		kind: 'inform',
		label: 'Дать обещание',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [
			{
				id: 'same-place',
				condition: {
					type: 'characters-share-location',
					characterIds: ['player', 'katya']
				}
			}
		],
		resolution: {type: 'automatic', outcomeId: 'accepted'},
		outcomes: [
			{
				id: 'accepted',
				key: 'success',
				label: 'Принято',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
	project.narrativeMoves = [move];
	project.simulation.actualLocationByCharacter = {
		player: 'home',
		katya: 'station'
	};
	return project;
}

function openAnalysis() {
	fireEvent.click(screen.getByRole('tab', {name: 'Analysis'}));
}

describe('A51 checkpoint UI integration', () => {
	beforeEach(() => {
		mockProject = createProject();
		mockExecute.mockClear();
		mockReplaceRuntimeProject.mockClear();
	});

	it('shows checkpoints only in Analysis and restores sandbox state with Watch re-evaluation', () => {
		render(<PreviewLaboratoryPanel />);

		expect(screen.queryByText('Checkpoints · sandbox only')).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', {name: 'Trace only'}));
		expect(
			screen.getByText('Move заблокирован текущим runtime-состоянием.')
		).toBeInTheDocument();

		openAnalysis();
		expect(screen.getByText('Checkpoints · sandbox only')).toBeInTheDocument();
		expect(screen.getByText(/не authoring Undo\/Redo/)).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Watch type'), {
			target: {value: 'actual-location'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Add watch'}));
		let watchList = screen.getByRole('list', {name: 'Typed watch values'});
		expect(within(watchList).getByText(/Дом/)).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Checkpoint label'), {
			target: {value: 'Before presence change'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Create checkpoint'}));
		expect(screen.getByText('Before presence change')).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Actual location'), {
			target: {value: 'station'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Set test presence'}));
		watchList = screen.getByRole('list', {name: 'Typed watch values'});
		expect(within(watchList).getByText(/Станция/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole('tab', {name: 'Preview'}));
		fireEvent.click(screen.getByRole('button', {name: 'Trace only'}));
		expect(screen.getByText(/Move доступен/)).toBeInTheDocument();

		openAnalysis();
		fireEvent.click(screen.getByRole('button', {name: 'Restore'}));
		expect(screen.getByText(/Запустите Trace only/)).toBeInTheDocument();
		watchList = screen.getByRole('list', {name: 'Typed watch values'});
		expect(within(watchList).getByText(/Дом/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole('tab', {name: 'Deep Debug'}));
		expect(screen.getByText(/checkpoint-restore/)).toBeInTheDocument();
		expect(mockExecute).not.toHaveBeenCalled();
		expect(mockReplaceRuntimeProject).not.toHaveBeenCalled();
	});

	it('keeps checkpoints through Reset, isolates Fork and clears them on Set from live runtime', () => {
		render(<PreviewLaboratoryPanel />);
		openAnalysis();
		fireEvent.click(screen.getByRole('button', {name: 'Create checkpoint'}));
		expect(screen.getByText('Checkpoint 1')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', {name: 'Reset'}));
		expect(screen.getByText('Checkpoint 1')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', {name: 'Fork current'}));
		expect(screen.getByLabelText('Active scenario')).toHaveValue('preview-fork-1');
		expect(screen.getByText('Checkpoints ещё не созданы.')).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Active scenario'), {
			target: {value: 'preview-main'}
		});
		expect(screen.getByText('Checkpoint 1')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', {name: 'Set from live runtime'}));
		expect(screen.getByText('Checkpoints ещё не созданы.')).toBeInTheDocument();
		expect(mockExecute).not.toHaveBeenCalled();
		expect(mockReplaceRuntimeProject).not.toHaveBeenCalled();
	});

	it('surfaces and enforces the finite checkpoint limit and allows removal', () => {
		render(<PreviewLaboratoryPanel />);
		openAnalysis();
		const create = screen.getByRole('button', {name: 'Create checkpoint'});
		for (let index = 0; index < 8; index += 1) {
			fireEvent.click(create);
		}
		expect(screen.getByText('8 / 8 checkpoints')).toBeInTheDocument();
		expect(create).toBeDisabled();

		fireEvent.click(screen.getAllByRole('button', {name: 'Remove'})[0]);
		expect(screen.getByText('7 / 8 checkpoints')).toBeInTheDocument();
		expect(create).not.toBeDisabled();
	});
});
