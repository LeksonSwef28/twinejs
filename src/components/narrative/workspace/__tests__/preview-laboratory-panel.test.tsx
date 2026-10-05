import {fireEvent, render, screen} from '@testing-library/react';
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

function outcomes(prefix = '') {
	return [
		{
			id: `${prefix}accepted`,
			key: 'success',
			label: `${prefix}Принято`,
			effectStoryNodeIds: [],
			effects: [
				{
					id: `${prefix}complete-meeting`,
					type: 'story-node-set-state' as const,
					storyNodeId: 'meeting',
					state: 'completed' as const
				}
			]
		},
		{
			id: `${prefix}declined`,
			key: 'failure',
			label: `${prefix}Отклонено`,
			effectStoryNodeIds: [],
			effects: [
				{
					id: `${prefix}block-meeting`,
					type: 'story-node-set-state' as const,
					storyNodeId: 'meeting',
					state: 'blocked' as const
				}
			]
		}
	];
}

function createProject() {
	const project = createNarrativeProject(
		'a51-preview-ui',
		'A51 preview UI',
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
	project.claims = [
		{id: 'claim-promise', text: 'Мы ещё увидимся.', stance: 'unresolved', tags: []}
	];
	const autoMove: NarrativeMoveDefinition = {
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
		outcomes: outcomes()
	};
	const skillMove: NarrativeMoveDefinition = {
		id: 'skill-promise',
		storyNodeId: 'meeting',
		kind: 'persuade',
		label: 'Убедить',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [],
		resolution: {
			type: 'skill-check',
			check: {
				skillKey: 'charm',
				difficulty: 5,
				rollRule: {type: 'dice', diceCount: 1, dieSides: 6},
				modifiers: [],
				successOutcomeId: 'skill-accepted',
				failureOutcomeId: 'skill-declined',
				retryPolicy: 'once'
			}
		},
		outcomes: outcomes('skill-')
	};
	project.narrativeMoves = [autoMove, skillMove];
	project.simulation.actualLocationByCharacter = {
		player: 'home',
		katya: 'station'
	};
	return project;
}

function selectContainingOption(container: HTMLElement, optionValue: string) {
	const select = Array.from(container.querySelectorAll('select')).find(candidate =>
		Array.from(candidate.options).some(option => option.value === optionValue)
	);
	if (!select) {
		throw new Error(`No select contains option ${optionValue}`);
	}
	return select;
}

function openLayer(name: 'Preview' | 'Analysis' | 'Deep Debug') {
	fireEvent.click(screen.getByRole('tab', {name}));
}

describe('<PreviewLaboratoryPanel>', () => {
	beforeEach(() => {
		mockProject = createProject();
		mockExecute.mockClear();
		mockReplaceRuntimeProject.mockClear();
	});

	it('progressively discloses human-readable analysis and raw deep-debug traces', () => {
		render(<PreviewLaboratoryPanel />);

		expect(screen.getByRole('tab', {name: 'Preview'})).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByText('Move preview')).toBeInTheDocument();
		expect(screen.queryByText('Test-only runtime inputs')).not.toBeInTheDocument();
		expect(screen.queryByText('Raw Move trace')).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', {name: 'Trace only'}));
		expect(
			screen.getByText('Move заблокирован текущим runtime-состоянием.')
		).toBeInTheDocument();
		expect(screen.queryByText(/"status": "blocked"/)).not.toBeInTheDocument();

		openLayer('Analysis');
		expect(screen.getByText('Move analysis')).toBeInTheDocument();
		expect(screen.getByText(/Персонажи находятся в разных локациях/)).toBeInTheDocument();
		expect(screen.getByText('Test-only runtime inputs')).toBeInTheDocument();
		expect(screen.queryByText(/"status": "blocked"/)).not.toBeInTheDocument();

		openLayer('Deep Debug');
		expect(screen.getByText('Raw Move trace')).toBeInTheDocument();
		expect(screen.getByText('Raw Move trace').closest('section')).toHaveTextContent(
			'"status": "blocked"'
		);
		expect(screen.getByText(/Force authored Outcome/)).toBeInTheDocument();

		openLayer('Preview');
		fireEvent.change(screen.getByLabelText('Move'), {target: {value: 'skill-promise'}});
		expect(screen.getByText(/Запустите Trace only/)).toBeInTheDocument();
	});

	it('edits explicit sandbox inputs without dispatching authoring or live-runtime commands', () => {
		render(<PreviewLaboratoryPanel />);
		expect(screen.getByText('Изолированные авторские сценарии')).toBeInTheDocument();
		expect(screen.getByText(/не создаёт authoring Undo\/Redo entries/)).toBeInTheDocument();

		openLayer('Analysis');
		fireEvent.change(screen.getByLabelText('Day'), {target: {value: '2'}});
		fireEvent.change(screen.getByLabelText('Minute'), {target: {value: '600'}});
		fireEvent.click(screen.getByRole('button', {name: 'Set test moment'}));
		expect(screen.getByText('runtime.simulation.day')).toBeInTheDocument();
		expect(screen.getByText('runtime.simulation.minuteOfDay')).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Actual location'), {
			target: {value: 'station'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Set test presence'}));
		expect(
			screen.getByText('runtime.simulation.actualLocationByCharacter.player')
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Knowledge character'), {
			target: {value: 'katya'}
		});
		fireEvent.change(screen.getByLabelText('Attitude'), {target: {value: 'knows'}});
		fireEvent.change(screen.getByLabelText('Confidence'), {target: {value: '0.9'}});
		fireEvent.click(screen.getByRole('button', {name: 'Set test knowledge'}));
		expect(screen.getByText('runtime.simulation.characterKnowledge')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', {name: 'Forget in sandbox'}));
		fireEvent.click(screen.getByRole('button', {name: '+1 мин'}));
		expect(screen.getByText(/lab actions:/)).toBeInTheDocument();

		expect(mockExecute).not.toHaveBeenCalled();
		expect(mockReplaceRuntimeProject).not.toHaveBeenCalled();
	});

	it('traces, resolves and force-inspects authored outcomes with provenance', () => {
		const {container} = render(<PreviewLaboratoryPanel />);

		fireEvent.click(screen.getByRole('button', {name: 'Trace only'}));
		expect(
			screen.getByText('Move заблокирован текущим runtime-состоянием.')
		).toBeInTheDocument();

		openLayer('Analysis');
		fireEvent.change(screen.getByLabelText('Actual location'), {
			target: {value: 'station'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Set test presence'}));

		openLayer('Preview');
		expect(screen.getByText(/Запустите Trace only/)).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', {name: 'Trace only'}));
		expect(screen.getByText(/Move доступен/)).toBeInTheDocument();
		expect(screen.getByText('accepted')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', {name: 'Resolve + apply authored'}));

		openLayer('Analysis');
		expect(screen.getByText(/выполнен/)).toBeInTheDocument();
		openLayer('Deep Debug');
		expect(screen.getByText('Preview provenance').closest('section')).toHaveTextContent(
			'resolved-outcome'
		);
		expect(screen.getAllByText(/occurrence:promise:accepted/).length).toBeGreaterThan(0);

		const outcomeSelect = selectContainingOption(container, 'declined');
		fireEvent.change(outcomeSelect, {target: {value: 'declined'}});
		fireEvent.click(screen.getByRole('button', {name: 'Force Outcome'}));
		expect(screen.getByText('Preview provenance').closest('section')).toHaveTextContent(
			'forced-outcome'
		);
		expect(screen.getByText(/Forced authored outcome promise → declined/)).toBeInTheDocument();

		expect(mockExecute).not.toHaveBeenCalled();
		expect(mockReplaceRuntimeProject).not.toHaveBeenCalled();
	});

	it('forks, resets, compares scenarios and exercises skill-check test inputs', () => {
		const {container} = render(<PreviewLaboratoryPanel />);

		fireEvent.click(screen.getByRole('button', {name: 'Fork current'}));
		expect(screen.getByLabelText('Active scenario')).toHaveValue('preview-fork-1');

		openLayer('Analysis');
		expect(screen.getByLabelText('Compare with')).toHaveValue('preview-main');
		fireEvent.change(screen.getByLabelText('Day'), {target: {value: '3'}});
		fireEvent.click(screen.getByRole('button', {name: 'Set test moment'}));
		expect(screen.getAllByText('runtime.simulation.day').length).toBeGreaterThan(0);

		openLayer('Preview');
		const moveSelect = selectContainingOption(container, 'skill-promise');
		fireEvent.change(moveSelect, {target: {value: 'skill-promise'}});
		expect(screen.getByLabelText('Skill value')).toBeInTheDocument();
		expect(screen.getByLabelText('Roll total')).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText('Skill value'), {target: {value: '4'}});
		fireEvent.change(screen.getByLabelText('Roll total'), {target: {value: '2'}});
		fireEvent.click(screen.getByRole('button', {name: 'Trace only'}));
		expect(screen.getByText('skill-accepted')).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText('Roll total'), {target: {value: '1'}});
		expect(screen.getByText(/Запустите Trace only/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', {name: 'Reset'}));
		fireEvent.click(screen.getByRole('button', {name: 'Set from live runtime'}));
		openLayer('Analysis');
		expect(screen.getByText(/Runtime не отличается от baseline/)).toBeInTheDocument();

		expect(mockExecute).not.toHaveBeenCalled();
		expect(mockReplaceRuntimeProject).not.toHaveBeenCalled();
	});

	it('shows validation errors for invalid test-only values', () => {
		render(<PreviewLaboratoryPanel />);
		openLayer('Analysis');

		fireEvent.change(screen.getByLabelText('Day'), {target: {value: '0'}});
		fireEvent.click(screen.getByRole('button', {name: 'Set test moment'}));
		expect(screen.getByText('Preview day is outside the project template.')).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Day'), {target: {value: '1'}});
		fireEvent.change(screen.getByLabelText('Minute'), {target: {value: '1440'}});
		fireEvent.click(screen.getByRole('button', {name: 'Set test moment'}));
		expect(
			screen.getByText('Preview minuteOfDay must be between 0 and 1439.')
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Confidence'), {target: {value: '2'}});
		fireEvent.click(screen.getByRole('button', {name: 'Set test knowledge'}));
		expect(
			screen.getByText('Preview knowledge confidence must be between 0 and 1.')
		).toBeInTheDocument();
	});
});
