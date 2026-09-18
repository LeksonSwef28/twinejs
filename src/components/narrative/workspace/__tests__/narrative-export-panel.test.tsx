import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {axe} from 'jest-axe';
import * as React from 'react';
import {prepareNarrativeStoryExport} from '../../../../application/narrative/export-story-adapter';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {Story} from '../../../../store/stories';
import {saveHtml} from '../../../../util/save-file';
import {NarrativeExportPanel} from '../narrative-export-panel';

const mockExecute = jest.fn();
const mockPublishNarrativeProject = jest.fn();
let mockProject = createProject();
let mockHostStory = hostStory();

jest.mock('../../../../store/narrative-project', () => ({
	useNarrativeProject: () => ({
		project: mockProject,
		execute: mockExecute
	})
}));

jest.mock('../../../../store/undoable-stories', () => ({
	useUndoableStoriesContext: () => ({
		stories: [mockHostStory]
	})
}));

jest.mock('../../../../store/use-narrative-publishing', () => ({
	useNarrativePublishing: () => ({
		publishNarrativeProject: mockPublishNarrativeProject
	})
}));

jest.mock('../../../../util/save-file');

const saveHtmlMock = saveHtml as jest.Mock;

function createProject() {
	const value = createNarrativeProject(
		'export-host',
		'Canonical Export Story',
		ninetyThreeDaysTemplate
	);
	value.projectId = 'project-ui';
	return value;
}

function hostStory(): Story {
	return {
		id: 'export-host',
		ifid: 'IFID-EXPORT',
		lastUpdate: new Date('2026-09-18T00:00:00.000Z'),
		name: 'Legacy host',
		passages: [],
		script: '',
		selected: false,
		snapToGrid: false,
		startPassage: '',
		storyFormat: 'SugarCube',
		storyFormatVersion: '2.37.3',
		stylesheet: '',
		tags: [],
		tagColors: {},
		zoom: 1
	};
}

function setPublishResultForCurrentProject() {
	const prepared = prepareNarrativeStoryExport(mockProject, mockHostStory);
	if (prepared.status !== 'ready') {
		throw new Error('Expected ready test export');
	}
	mockPublishNarrativeProject.mockResolvedValue({
		status: 'published',
		artifact: prepared.artifact,
		diagnostics: prepared.diagnostics,
		html: '<html>compiled narrative</html>',
		story: prepared.story
	});
}

describe('<NarrativeExportPanel>', () => {
	beforeEach(() => {
		mockProject = createProject();
		mockHostStory = hostStory();
		mockExecute.mockClear();
		mockPublishNarrativeProject.mockReset();
		saveHtmlMock.mockClear();
	});

	test('shows ready state and explicitly downloads only the derived transient HTML', async () => {
		mockProject.storyNodes = [
			{
				id: 'terminal',
				kind: 'event',
				title: 'Current ending',
				participantIds: [],
				activationState: 'available'
			}
		];
		setPublishResultForCurrentProject();
		render(<NarrativeExportPanel />);

		expect(screen.getByText('Готово к сборке')).toBeInTheDocument();
		expect(screen.getByText('0', {selector: 'strong'})).toBeInTheDocument();
		expect(screen.getByText('1', {selector: 'strong'})).toBeInTheDocument();
		expect(screen.getByText(/narrative-runtime-artifact v1/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', {name: 'Собрать HTML'}));

		await waitFor(() =>
			expect(mockPublishNarrativeProject).toHaveBeenCalledWith(
				mockProject,
				mockHostStory
			)
		);
		expect(saveHtmlMock).toHaveBeenCalledWith(
			'<html>compiled narrative</html>',
			'Canonical Export Story.html'
		);
		expect(screen.getByRole('status')).toHaveTextContent(
			'HTML подготовлен: Canonical Export Story.html'
		);
		expect(mockExecute).not.toHaveBeenCalled();
	});

	test('blocks publishing and exposes Story Brain source navigation using editor-only commands', () => {
		mockProject.storyNodes = [
			{
				id: 'broken-story',
				kind: 'event',
				title: 'Broken Story',
				participantIds: ['missing'],
				activationState: 'available'
			}
		];
		mockProject.editor.storyCanvas!.nodes = [
			{
				id: 'visual-broken-story',
				kind: 'entity',
				entityRef: {type: 'storyNode', id: 'broken-story'},
				position: {x: 100, y: 80}
			}
		];
		render(<NarrativeExportPanel />);

		expect(screen.getByText('Экспорт заблокирован')).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Собрать HTML'})).toBeDisabled();

		const summary = screen.getByText(/отсутствующую сущность character «missing»/);
		const row = summary.closest('li');
		if (!row) {
			throw new Error('Expected export diagnostic row');
		}
		fireEvent.click(within(row).getByRole('button', {name: 'К источнику'}));

		expect(mockExecute).toHaveBeenCalledWith({
			type: 'editor/selectWorkspace',
			workspace: 'story'
		});
		expect(mockExecute).toHaveBeenCalledWith(
			expect.objectContaining({type: 'editor/setStoryViewport'})
		);
		expect(
			mockExecute.mock.calls.every(([command]) =>
				String(command.type).startsWith('editor/')
			)
		).toBe(true);
		expect(mockPublishNarrativeProject).not.toHaveBeenCalled();
		expect(saveHtmlMock).not.toHaveBeenCalled();
	});

	test('shows a project-level blocker when host Story is unavailable', () => {
		mockHostStory = {...hostStory(), id: 'different-host'};
		render(<NarrativeExportPanel />);

		expect(screen.getByText('Host Story недоступен')).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Собрать HTML'})).toBeDisabled();
	});

	test('is accessible in the ready state', async () => {
		setPublishResultForCurrentProject();
		const {container} = render(<NarrativeExportPanel />);
		expect(await axe(container)).toHaveNoViolations();
	});
});
