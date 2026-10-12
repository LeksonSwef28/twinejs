import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {axe} from 'jest-axe';
import * as React from 'react';
import {
	prepareNarrativeStoryExport
} from '../../../../application/narrative/export-story-adapter';
import {
	serializeNarrativeRuntimeArtifact
} from '../../../../application/narrative/export-compiler';
import {prepareNarrativeRuntimeProof} from '../../../../application/narrative/runtime-proof';
import {fakeAppInfo} from '../../../../test-util';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {
	computerClubCycleProjectId,
	create93DaysComputerClubCycleProject
} from '../../../../domain/narrative/content/93-days-computer-club-cycle';
import {launchNarrativePlayerDevelopment} from '../../../../player/development-handoff';
import {Story} from '../../../../store/stories';
import {saveHtml, saveJson} from '../../../../util/save-file';
import {serializeNarrativeSourceSnapshot} from '../../../../store/narrative-project/author-snapshot';
import {NarrativeExportPanel} from '../narrative-export-panel';

const mockExecute = jest.fn();
const mockReplaceProjectFromStarter = jest.fn();
const mockPublishNarrativeProject = jest.fn();
const mockPublishNarrativeProof = jest.fn();
let mockProject = createProject();
let mockRecovery: {backupKeys: string[]} | undefined;
let mockHostStory = hostStory();

jest.mock('../../../../store/narrative-project', () => ({
	useNarrativeProject: () => ({
		project: mockProject,
		execute: mockExecute,
		replaceProjectFromStarter: mockReplaceProjectFromStarter,
		recovery: mockRecovery
	})
}));

jest.mock('../../../../store/undoable-stories', () => ({
	useUndoableStoriesContext: () => ({
		stories: [mockHostStory]
	})
}));

jest.mock('../../../../store/use-narrative-publishing', () => ({
	useNarrativePublishing: () => ({
		publishNarrativeProject: mockPublishNarrativeProject,
		publishNarrativeProof: mockPublishNarrativeProof
	})
}));

jest.mock('../../../../player/development-handoff');
jest.mock('../../../../util/save-file');

const launchPlayerMock = launchNarrativePlayerDevelopment as jest.Mock;
const saveHtmlMock = saveHtml as jest.Mock;
const saveJsonMock = saveJson as jest.Mock;

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

function setProofResultForCurrentProject() {
	const proof = prepareNarrativeRuntimeProof(
		mockProject,
		mockHostStory,
		fakeAppInfo({name: 'Twine', version: '2.12.0'})
	);
	if (proof.status !== 'ready') {
		throw new Error('Expected ready test compiler proof');
	}
	mockPublishNarrativeProof.mockReturnValue(proof);
	return proof;
}

function preparedForCurrentProject() {
	const prepared = prepareNarrativeStoryExport(mockProject, mockHostStory);
	if (prepared.status !== 'ready') {
		throw new Error('Expected ready test export');
	}
	return prepared;
}

function setPublishResultForCurrentProject() {
	const prepared = preparedForCurrentProject();
	mockPublishNarrativeProject.mockResolvedValue({
		status: 'published',
		artifact: prepared.artifact,
		diagnostics: prepared.diagnostics,
		html: '<html>compiled narrative</html>',
		story: prepared.story
	});
	return prepared;
}

describe('<NarrativeExportPanel>', () => {
	beforeEach(() => {
		mockProject = createProject();
		mockRecovery = undefined;
		mockHostStory = hostStory();
		mockExecute.mockClear();
		mockReplaceProjectFromStarter.mockReset();
		mockPublishNarrativeProject.mockReset();
		mockPublishNarrativeProof.mockReset();
		launchPlayerMock.mockReset();
		launchPlayerMock.mockReturnValue({
			status: 'launched',
			url: 'player.html#handoff=development'
		});
		saveHtmlMock.mockClear();
		saveJsonMock.mockClear();
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

		fireEvent.click(
			screen.getByRole('button', {name: 'Legacy Story Format HTML'})
		);

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
			'Файл подготовлен: Canonical Export Story.html'
		);
		expect(mockExecute).not.toHaveBeenCalled();
	});

	test('loads the explicit current A68 production starter into a blank host project', () => {
		render(<NarrativeExportPanel />);

		fireEvent.click(
			screen.getByRole('button', {name: 'Загрузить A68-C1 production project'})
		);

		expect(mockReplaceProjectFromStarter).toHaveBeenCalledTimes(1);
		const [production] = mockReplaceProjectFromStarter.mock.calls[0];
		expect(production.projectId).toBe(computerClubCycleProjectId);
		expect(production.hostStoryId).toBe(mockProject.hostStoryId);
		expect(production.name).toBe(mockProject.name);
		expect(production.storyNodes.length).toBeGreaterThan(0);
		expect(screen.getByRole('status')).toHaveTextContent(
			'A68-C1 production project загружен'
		);
		expect(mockExecute).not.toHaveBeenCalled();
	});

	test('recognizes A68-C1 as the current production target', () => {
		const production = create93DaysComputerClubCycleProject();
		mockProject = {
			...production,
			hostStoryId: 'export-host',
			name: 'Canonical Export Story'
		};
		render(<NarrativeExportPanel />);

		expect(
			screen.getByText(`A68-C1 · ${computerClubCycleProjectId}`)
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', {
				name: 'Загрузить A68-C1 production project'
			})
		).not.toBeInTheDocument();
		expect(screen.queryByText(/Автозагрузка A68-C1 отключена/)).not.toBeInTheDocument();
	});

	test('never offers automatic current-production replacement over authored content', () => {
		mockProject.locations = [{id: 'author-location', name: 'Авторская локация'}];
		render(<NarrativeExportPanel />);

		expect(
			screen.queryByRole('button', {name: 'Загрузить A68-C1 production project'})
		).not.toBeInTheDocument();
		expect(screen.getByText(/Данные автора не перезаписываются автоматически/))
			.toBeInTheDocument();
		expect(mockReplaceProjectFromStarter).not.toHaveBeenCalled();
	});

	test('launches the canonical player from the compiled artifact without editor commands', () => {
		const prepared = preparedForCurrentProject();
		render(<NarrativeExportPanel />);

		fireEvent.click(screen.getByRole('button', {name: 'Открыть Player'}));

		expect(launchPlayerMock).toHaveBeenCalledWith(prepared.artifact);
		expect(screen.getByRole('status')).toHaveTextContent(
			'Canonical Player открыт'
		);
		expect(mockExecute).not.toHaveBeenCalled();
		 expect(mockPublishNarrativeProject).not.toHaveBeenCalled();
	});


	test('downloads editable Narrative Project projections even when runtime compilation is blocked', () => {
		mockProject.storyNodes = [{
			id: 'draft-broken',
			kind: 'dialogue',
			title: 'Незаконченный диалог',
			participantIds: ['missing-character'],
			activationState: 'available'
		}];
		const original = JSON.stringify(mockProject);
		render(<NarrativeExportPanel />);

		expect(screen.getByText('Экспорт заблокирован')).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole('button', {name: 'Снимок Narrative Project JSON'})
		);

		expect(saveJsonMock).toHaveBeenCalledWith(
			serializeNarrativeSourceSnapshot(mockProject),
			'Canonical Export Story.narrative-source.json'
		);
		expect(screen.getByRole('status')).toHaveTextContent(
			'Файл подготовлен: Canonical Export Story.narrative-source.json'
		);
		expect(screen.getByText(/НЕ включает host Twine Story\/passages/))
			.toBeInTheDocument();
		expect(mockExecute).not.toHaveBeenCalled();
		expect(JSON.stringify(mockProject)).toBe(original);
	});

	test('never exports a blank fallback as the original source during recovery', () => {
		mockRecovery = {backupKeys: ['recovery:damaged']};
		render(<NarrativeExportPanel />);

		const snapshot = screen.getByRole('button', {
			name: 'Снимок Narrative Project JSON'
		});
		expect(snapshot).toBeDisabled();
		fireEvent.click(snapshot);
		expect(saveJsonMock).not.toHaveBeenCalled();
	});


	test('previews and restores source snapshot only after explicit confirmation on the same blank host', async () => {
		const saved = createProject();
		saved.name = 'Снимок сценариста';
		saved.storyNodes = [{
			id: 'intro',
			kind: 'dialogue',
			title: 'Первые слова',
			participantIds: [],
			activationState: 'draft'
		}];
		render(<NarrativeExportPanel />);
		const file = new File(
			[serializeNarrativeSourceSnapshot(saved)],
			'author.narrative-source.json',
			{type: 'application/json'}
		);
		fireEvent.change(
			screen.getByLabelText('Проверить исходный снимок перед восстановлением'),
			{target: {files: [file]}}
		);
		expect(await screen.findByText(/Проверен снимок «Снимок сценариста»/))
			.toBeInTheDocument();

		const restore = screen.getByRole('button', {
			name: 'Восстановить проверенный снимок'
		});
		expect(restore).toBeDisabled();
		expect(mockReplaceProjectFromStarter).not.toHaveBeenCalled();
		fireEvent.click(screen.getByLabelText(
			'Подтверждаю восстановление в пустой проект текущей Story.'
		));
		expect(restore).toBeEnabled();
		fireEvent.click(restore);
		expect(mockReplaceProjectFromStarter).toHaveBeenCalledTimes(1);
		expect(mockReplaceProjectFromStarter).toHaveBeenCalledWith(saved);
		expect(mockExecute).not.toHaveBeenCalled();
		expect(screen.getByRole('status')).toHaveTextContent('Снимок восстановлен');
	});

	test('rejects another host and never offers destructive restoration', async () => {
		const fromOtherStory = createNarrativeProject(
			'another-host', 'Чужой проект', ninetyThreeDaysTemplate
		);
		render(<NarrativeExportPanel />);
		const file = new File(
			[serializeNarrativeSourceSnapshot(fromOtherStory)],
			'wrong.narrative-source.json',
			{type: 'application/json'}
		);
		fireEvent.change(
			screen.getByLabelText('Проверить исходный снимок перед восстановлением'),
			{target: {files: [file]}}
		);
		expect(await screen.findByRole('alert'))
			.toHaveTextContent(/другой host Twine Story/);
		expect(screen.queryByRole('button', {
			name: 'Восстановить проверенный снимок'
		})).not.toBeInTheDocument();
		expect(mockReplaceProjectFromStarter).not.toHaveBeenCalled();
	});

	test('downloads canonical runtime artifact JSON directly', () => {
		const prepared = preparedForCurrentProject();
		render(<NarrativeExportPanel />);

		fireEvent.click(
			screen.getByRole('button', {name: 'Runtime artifact JSON'})
		);

		expect(saveJsonMock).toHaveBeenCalledWith(
			serializeNarrativeRuntimeArtifact(prepared.artifact),
			'Canonical Export Story.runtime-artifact.json'
		);
		expect(mockExecute).not.toHaveBeenCalled();
	});

	test('downloads validation-only compiler proof without dispatching authoring/runtime commands', () => {
		const proof = setProofResultForCurrentProject();
		render(<NarrativeExportPanel />);

		fireEvent.click(screen.getByRole('button', {name: 'Compiler proof HTML'}));

		expect(mockPublishNarrativeProof).toHaveBeenCalledWith(
			mockProject,
			mockHostStory
		);
		expect(saveHtmlMock).toHaveBeenCalledWith(
			proof.html,
			'Canonical Export Story.compiler-proof.html'
		);
		expect(screen.getByRole('status')).toHaveTextContent(
			'Файл подготовлен: Canonical Export Story.compiler-proof.html'
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
		expect(screen.getByRole('button', {name: 'Открыть Player'})).toBeDisabled();
		expect(
			screen.getByRole('button', {name: 'Runtime artifact JSON'})
		).toBeDisabled();
		expect(
			screen.getByRole('button', {name: 'Legacy Story Format HTML'})
		).toBeDisabled();
		expect(screen.getByRole('button', {name: 'Compiler proof HTML'})).toBeDisabled();

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
		expect(mockPublishNarrativeProof).not.toHaveBeenCalled();
		expect(launchPlayerMock).not.toHaveBeenCalled();
		expect(saveHtmlMock).not.toHaveBeenCalled();
		expect(saveJsonMock).not.toHaveBeenCalled();
	});

	test('shows a project-level blocker when host Story is unavailable', () => {
		mockHostStory = {...hostStory(), id: 'different-host'};
		render(<NarrativeExportPanel />);

		expect(screen.getByText('Host Story недоступен')).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Открыть Player'})).toBeDisabled();
		expect(
			screen.getByRole('button', {name: 'Legacy Story Format HTML'})
		).toBeDisabled();
		expect(screen.getByRole('button', {name: 'Compiler proof HTML'})).toBeDisabled();
	});

	test('is accessible in the ready state', async () => {
		setPublishResultForCurrentProject();
		const {container} = render(<NarrativeExportPanel />);
		expect(await axe(container)).toHaveNoViolations();
	});
});
