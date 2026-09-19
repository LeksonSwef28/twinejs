import {fireEvent, render, screen} from '@testing-library/react';
import * as React from 'react';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {NarrativeWorkspace} from '../narrative-workspace';

const mockExecute = jest.fn();
const mockUndo = jest.fn();
const mockRedo = jest.fn();
let mockProject = createProject();

jest.mock('../../../../store/narrative-project', () => ({
	useNarrativeProject: () => ({
		project: mockProject,
		execute: mockExecute,
		undo: mockUndo,
		redo: mockRedo,
		canUndo: false,
		canRedo: false,
		saveStatus: 'saved'
	})
}));

jest.mock('../project-identity-panel', () => ({ProjectIdentityPanel: () => null}));
jest.mock('../project-search-panel', () => ({ProjectSearchPanel: () => null}));
jest.mock('../cross-workspace-navigator', () => ({CrossWorkspaceNavigator: () => null}));
jest.mock('../project-library', () => ({ProjectLibrary: () => null}));
jest.mock('../story-workspace', () => ({StoryWorkspace: () => null}));
jest.mock('../world-time-workspace', () => ({WorldTimeWorkspace: () => null}));
jest.mock('../routine-authoring-panel', () => ({RoutineAuthoringPanel: () => null}));
jest.mock('../story-metadata-panel', () => ({StoryMetadataPanel: () => null}));
jest.mock('../story-brain-panel', () => ({StoryBrainPanel: () => null}));
jest.mock('../narrative-move-panel', () => ({NarrativeMovePanel: () => null}));
jest.mock('../move-conditions-panel', () => ({MoveConditionsPanel: () => null}));
jest.mock('../outcome-effects-panel', () => ({OutcomeEffectsPanel: () => null}));
jest.mock('../memory-salience-panel', () => ({MemorySaliencePanel: () => null}));
jest.mock('../interaction-template-panel', () => ({InteractionTemplatePanel: () => null}));
jest.mock('../reaction-candidates-panel', () => ({ReactionCandidatesPanel: () => null}));
jest.mock('../simulation-debug-panel', () => ({
	SimulationDebugPanel: ({open}: {open: boolean}) => (
		<div data-testid="simulation-debug-stub">{open ? 'open' : 'closed'}</div>
	)
}));

function createProject() {
	const project = createNarrativeProject(
		'a51-preview-from-here-workspace',
		'A51 Preview from here workspace',
		ninetyThreeDaysTemplate
	);
	project.editor.selectedDay = 2;
	project.editor.selectedMinuteOfDay = 600;
	project.simulation.day = 1;
	project.simulation.minuteOfDay = 480;
	return project;
}

describe('<NarrativeWorkspace> Preview from here handoff', () => {
	beforeEach(() => {
		mockProject = createProject();
		mockExecute.mockClear();
		mockUndo.mockClear();
		mockRedo.mockClear();
	});

	it('opens Playtest for View Cursor focus without dispatching an authoring command', () => {
		render(<NarrativeWorkspace />);
		expect(screen.getByTestId('simulation-debug-stub')).toHaveTextContent('closed');

		fireEvent.click(screen.getByRole('button', {name: 'Preview this view'}));

		expect(screen.getByTestId('simulation-debug-stub')).toHaveTextContent('open');
		expect(screen.getByLabelText('Preview from here context')).toBeInTheDocument();
		expect(
			screen.getByText('Контекст относится к другому моменту. Sandbox Playhead не изменён.')
		).toBeInTheDocument();
		expect(mockExecute).not.toHaveBeenCalled();
	});
});
