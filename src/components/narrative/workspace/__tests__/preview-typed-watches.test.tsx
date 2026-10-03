import {fireEvent, render, screen} from '@testing-library/react';
import * as React from 'react';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {
	createPreviewScenario,
	setPreviewRuntimeInput
} from '../../../../application/narrative/preview-laboratory';
import {PreviewTypedWatches} from '../preview-typed-watches';

function projectForWatches() {
	const project = createNarrativeProject(
		'a51-watch-ui',
		'A51 typed watch UI',
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
	project.claims = [
		{id: 'claim-promise', text: 'Мы ещё увидимся.', stance: 'unresolved', tags: []}
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
	project.relationships = [
		{fromCharacterId: 'player', toCharacterId: 'katya', values: {trust: 3}}
	];
	project.simulation.actualLocationByCharacter = {player: 'home', katya: 'station'};
	return project;
}

describe('<PreviewTypedWatches>', () => {
	it('adds typed watches and recomputes them from the current sandbox', () => {
		const initial = createPreviewScenario(projectForWatches());
		const {rerender} = render(<PreviewTypedWatches scenario={initial} />);

		expect(screen.getByText(/arbitrary object paths are not accepted/)).toBeInTheDocument();
		expect(screen.queryByLabelText(/path/i)).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', {name: 'Add watch'}));
		expect(screen.getByRole('list', {name: 'Typed watch values'})).toHaveTextContent(
			'Simulation moment'
		);

		fireEvent.change(screen.getByLabelText('Watch type'), {
			target: {value: 'actual-location'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Add watch'}));
		expect(screen.getByText(/Actual location · Игрок/)).toBeInTheDocument();
		expect(screen.getByText(/Дом/)).toBeInTheDocument();

		const changed = setPreviewRuntimeInput(initial, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		rerender(<PreviewTypedWatches scenario={changed} />);
		expect(screen.getByText(/Actual location · Игрок/)).toBeInTheDocument();
		expect(screen.getByText(/Станция/)).toBeInTheDocument();
	});

	it('supports knowledge, relationship and Story-state watch selectors without free-form paths', () => {
		const scenario = createPreviewScenario(projectForWatches());
		render(<PreviewTypedWatches scenario={scenario} />);

		fireEvent.change(screen.getByLabelText('Watch type'), {target: {value: 'knowledge'}});
		expect(screen.getByLabelText('Watch character')).toBeInTheDocument();
		expect(screen.getByLabelText('Watch claim')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', {name: 'Add watch'}));
		expect(screen.getByText(/no runtime knowledge state/)).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Watch type'), {
			target: {value: 'relationship-axis'}
		});
		expect(screen.getByLabelText('From character')).toBeInTheDocument();
		expect(screen.getByLabelText('To character')).toBeInTheDocument();
		expect(screen.getByLabelText('Relationship axis')).toHaveValue('trust');
		fireEvent.click(screen.getByRole('button', {name: 'Add watch'}));
		expect(screen.getByText(/Relationship · Игрок → Катя · trust/)).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Watch type'), {
			target: {value: 'story-node-state'}
		});
		expect(screen.getByLabelText('Story node')).toHaveValue('meeting');
		fireEvent.click(screen.getByRole('button', {name: 'Add watch'}));
		expect(screen.getByText(/Story state · Встреча/)).toBeInTheDocument();
		expect(screen.getByText(/available/)).toBeInTheDocument();
	});
});
