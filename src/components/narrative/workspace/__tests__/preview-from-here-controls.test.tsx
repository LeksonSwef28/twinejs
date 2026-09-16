import {fireEvent, render, screen} from '@testing-library/react';
import * as React from 'react';
import {createPreviewFromHereRequest} from '../../../../application/narrative/preview-from-here';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {CrossWorkspaceNavigator} from '../cross-workspace-navigator';
import {
	PreviewFromHereContextCard,
	PreviewThisViewButton
} from '../preview-from-here-controls';
import {PreviewFromHereSessionContext} from '../preview-from-here-session';

const mockExecute = jest.fn();
let mockProject = createProject();

jest.mock('../../../../store/narrative-project', () => ({
	useNarrativeProject: () => ({project: mockProject, execute: mockExecute})
}));

function createProject() {
	const project = createNarrativeProject(
		'a51-preview-from-here-ui',
		'A51 Preview from here UI',
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
		}
	];
	project.storyNodes = [
		{
			id: 'meeting',
			kind: 'event',
			title: 'Встреча',
			participantIds: ['player'],
			placement: {day: 2, minuteOfDay: 600, locationId: 'station'},
			activationState: 'available'
		}
	];
	project.simulation.day = 1;
	project.simulation.minuteOfDay = 480;
	project.simulation.actualLocationByCharacter = {player: 'home'};
	return project;
}

describe('A51 Preview from here controls', () => {
	beforeEach(() => {
		mockProject = createProject();
		mockExecute.mockClear();
	});

	it('emits typed View Cursor focus instead of changing runtime state', () => {
		const requestPreviewFromHere = jest.fn();
		render(
			<PreviewFromHereSessionContext.Provider
				value={{requestPreviewFromHere}}
			>
				<PreviewThisViewButton day={4} minuteOfDay={900} />
			</PreviewFromHereSessionContext.Provider>
		);

		fireEvent.click(screen.getByRole('button', {name: 'Preview this view'}));
		expect(requestPreviewFromHere).toHaveBeenCalledWith({
			type: 'view-moment',
			day: 4,
			minuteOfDay: 900
		});
	});

	it('emits the selected Story node as typed authoring focus', () => {
		const requestPreviewFromHere = jest.fn();
		render(
			<PreviewFromHereSessionContext.Provider
				value={{requestPreviewFromHere}}
			>
				<CrossWorkspaceNavigator />
			</PreviewFromHereSessionContext.Provider>
		);

		fireEvent.click(screen.getByRole('button', {name: 'Preview from here'}));
		expect(requestPreviewFromHere).toHaveBeenCalledWith({
			type: 'story-node',
			storyNodeId: 'meeting'
		});
		expect(mockExecute).not.toHaveBeenCalled();
	});

	it('shows the focus/playhead mismatch before any explicit sandbox override', () => {
		const request = createPreviewFromHereRequest(mockProject, 1, {
			type: 'story-node',
			storyNodeId: 'meeting'
		});
		render(<PreviewFromHereContextCard request={request} />);

		expect(
			screen.getByText('Контекст относится к другому моменту. Sandbox Playhead не изменён.')
		).toBeInTheDocument();
		expect(screen.getByText(/Authored moment:/)).toHaveTextContent('День 2 · 10:00');
		expect(screen.getByText(/Simulation Playhead:/)).toHaveTextContent('День 1 · 08:00');
		expect(screen.getByText(/not comparable at this moment/)).toBeInTheDocument();
	});
});
