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

function outcomes(prefix = '') {
	return [
		{
			id: `${prefix}accepted`,
			key: 'success',
			label: `${prefix}Принято`,
			effectStoryNodeIds: [],
			effects: []
		},
		{
			id: `${prefix}declined`,
			key: 'failure',
			label: `${prefix}Отклонено`,
			effectStoryNodeIds: [],
			effects: []
		}
	];
}

function createProject() {
	const project = createNarrativeProject(
		'a51-reproduction-ui',
		'A51 reproduction UI',
		ninetyThreeDaysTemplate
	);
	project.characters = [
		{
			id: 'player',
			name: 'Игрок',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.storyNodes = [
		{
			id: 'meeting',
			kind: 'event',
			title: 'Встреча',
			participantIds: ['player'],
			activationState: 'available'
		}
	];
	const automatic: NarrativeMoveDefinition = {
		id: 'automatic',
		storyNodeId: 'meeting',
		kind: 'inform',
		label: 'Автоматически',
		actorCharacterId: 'player',
		targetCharacterIds: [],
		guards: [],
		resolution: {type: 'automatic', outcomeId: 'accepted'},
		outcomes: outcomes()
	};
	const skill: NarrativeMoveDefinition = {
		id: 'skill',
		storyNodeId: 'meeting',
		kind: 'persuade',
		label: 'Проверка навыка',
		actorCharacterId: 'player',
		targetCharacterIds: [],
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
	project.narrativeMoves = [automatic, skill];
	return project;
}

function openLayer(name: 'Preview' | 'Analysis' | 'Deep Debug') {
	fireEvent.click(screen.getByRole('tab', {name}));
}

describe('A51 reproduction metadata UI', () => {
	beforeEach(() => {
		mockProject = createProject();
		mockExecute.mockClear();
		mockReplaceRuntimeProject.mockClear();
	});

	it('keeps raw reproduction data in Deep Debug and Trace only remains read-only', () => {
		render(<PreviewLaboratoryPanel />);

		expect(
			screen.queryByText('Reproduction metadata · explicit inputs')
	).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole('button', {name: 'Trace only'}));

		openLayer('Analysis');
		expect(
			screen.queryByText('Reproduction metadata · explicit inputs')
	).not.toBeInTheDocument();

		openLayer('Deep Debug');
		expect(screen.getByText('Reproduction metadata · explicit inputs')).toBeInTheDocument();
		const reproduction = screen.getByRole('region', {name: 'Preview reproduction metadata'});
		let current = screen.getByLabelText('Current trace reproduction metadata');
		expect(current).toHaveTextContent('"moveId": "automatic"');
		expect(current).toHaveTextContent('"input": {}');
		expect(current.textContent).not.toMatch(/seed|random|rng/i);
		expect(
			within(reproduction).queryByRole('list', {name: 'Reproduction metadata history'})
		).not.toBeInTheDocument();
		expect(within(reproduction).queryByText('resolved-outcome')).not.toBeInTheDocument();

		openLayer('Preview');
		fireEvent.change(screen.getByLabelText('Move'), {target: {value: 'skill'}});
		fireEvent.change(screen.getByLabelText('Skill value'), {target: {value: '4'}});
		fireEvent.change(screen.getByLabelText('Roll total'), {target: {value: '2'}});
		fireEvent.click(screen.getByRole('button', {name: 'Trace only'}));

		openLayer('Deep Debug');
		current = screen.getByLabelText('Current trace reproduction metadata');
		expect(current).toHaveTextContent('"skillValue": 4');
		expect(current).toHaveTextContent('"rollTotal": 2');
		expect(screen.queryByRole('list', {name: 'Reproduction metadata history'})).not.toBeInTheDocument();

		openLayer('Preview');
		fireEvent.click(screen.getByRole('button', {name: 'Resolve + apply authored'}));
		openLayer('Deep Debug');
		const history = screen.getByRole('list', {name: 'Reproduction metadata history'});
		expect(history).toHaveTextContent('resolved-outcome');
		expect(history).toHaveTextContent('"skillValue": 4');
		expect(history).toHaveTextContent('"rollTotal": 2');
		expect(history.textContent).not.toMatch(/seed|random|rng/i);

		expect(mockExecute).not.toHaveBeenCalled();
		expect(mockReplaceRuntimeProject).not.toHaveBeenCalled();
	});
});
