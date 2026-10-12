import * as React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {
	NarrativeProjectProvider,
	useNarrativeProject
} from '../../../../store/narrative-project';
import {createLocalStorageNarrativeProjectRepository} from '../../../../store/narrative-project/repository';
import {
	inspectNarrativeSourceSnapshot,
	serializeNarrativeSourceSnapshot
} from '../../../../store/narrative-project/author-snapshot';
import {AuthoringSessionFocusProvider} from '../authoring-session-focus';
import {NarrativeMovePanel} from '../narrative-move-panel';
import {OutcomeEffectsPanel} from '../outcome-effects-panel';
import {ProjectLibrary} from '../project-library';
import {StoryWorkspace} from '../story-workspace';
import {useAuthoringNavigation} from '../use-authoring-navigation';

const hostStoryId = 'a82-writer-host';
const projectName = 'A82 writer roundtrip';

const WriterSurface: React.FC = () => {
	const {project, saveStatus} = useNarrativeProject();
	const {navigate} = useAuthoringNavigation({splitView: false});
	const [libraryOpen, setLibraryOpen] = React.useState(false);
	return (
		<>
			<button type="button" onClick={() => setLibraryOpen(true)}>
				Открыть библиотеку
			</button>
			<output data-testid="writer-save">{saveStatus}</output>
			<output data-testid="writer-progress">
				{project.characters.length}:{project.storyNodes.length}:
				{project.claims.length}:{project.initialKnowledge.length}:
				{project.narrativeMoves.length}
			</output>
			<ProjectLibrary open={libraryOpen} onClose={() => setLibraryOpen(false)} />
			<StoryWorkspace navigate={navigate} />
			<NarrativeMovePanel />
			<OutcomeEffectsPanel />
		</>
	);
};

function renderWriter() {
	return render(
		<NarrativeProjectProvider hostStoryId={hostStoryId} projectName={projectName}>
			<AuthoringSessionFocusProvider>
				<WriterSurface />
			</AuthoringSessionFocusProvider>
		</NarrativeProjectProvider>
	);
}

function selectNamedOption(label: string, name: string) {
	const select = screen.getByLabelText(label) as HTMLSelectElement;
	const option = Array.from(select.options).find(option =>
		option.textContent?.includes(name) && !option.disabled
	);
	if (!option) {
		throw new Error(`Missing selectable option ${name} in ${label}`);
	}
	fireEvent.change(select, {target: {value: option.value}});
	return option.value;
}

function typeInto(label: string, value: string) {
	fireEvent.change(screen.getByLabelText(label), {target: {value}});
}

describe('A82 extended author-only W1 workflow', () => {
	beforeEach(() => window.localStorage.clear());

	test('authors two people, fact/claim, independent sources, conditional social effect and snapshot from blank UI', async () => {
		const first = renderWriter();
		const repo = createLocalStorageNarrativeProjectRepository(
			hostStoryId, projectName, ninetyThreeDaysTemplate
		);
		expect(repo.load().characters).toHaveLength(0);
		expect(repo.load().storyNodes).toHaveLength(0);

		for (const name of ['Ира', 'Миша']) {
			typeInto('Имя нового персонажа', name);
			fireEvent.click(screen.getByRole('button', {name: '+ Персонаж'}));
		}
		for (const title of ['Встреча во дворе', 'Разговор на следующий день']) {
			typeInto('Название сюжетного блока', title);
			fireEvent.click(screen.getByRole('button', {name: '+ На доску'}));
		}

		fireEvent.click(screen.getByRole('button', {name: 'Открыть библиотеку'}));
		typeInto('Название объективного факта', 'В клубе оставили письмо');
		fireEvent.click(screen.getByRole('button', {name: '+ Факт'}));
		typeInto('Текст утверждения', 'Письмо спрятал администратор');
		selectNamedOption('Связанный объективный факт', 'В клубе оставили письмо');
		fireEvent.click(screen.getByRole('button', {name: '+ Утверждение'}));

		selectNamedOption('Персонаж стартового знания', 'Ира');
		selectNamedOption('Claim стартового знания', 'Письмо спрятал администратор');
		fireEvent.change(screen.getByLabelText('Источник стартового знания'), {
			target: {value: 'observed'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Задать стартовое знание'}));

		selectNamedOption('Персонаж стартового знания', 'Миша');
		fireEvent.change(screen.getByLabelText('Источник стартового знания'), {
			target: {value: 'mediated'}
		});
		typeInto('Канал стартового knowledge source', 'forum');
		typeInto('Атрибуция стартового knowledge source', 'nickname-2000');
		fireEvent.click(screen.getByRole('button', {name: 'Задать стартовое знание'}));
		fireEvent.click(screen.getByRole('button', {name: 'Закрыть библиотеку'}));

		selectNamedOption('Сюжетный блок Narrative Move', 'Встреча во дворе');
		typeInto('Текст или смысл narrative move', 'Спросить Мишу про письмо');
		selectNamedOption('Актор narrative move', 'Ира');
		selectNamedOption('Цель narrative move', 'Миша');
		selectNamedOption('Передаваемое утверждение', 'Письмо спрятал администратор');
		fireEvent.click(screen.getByRole('button', {name: '+ Narrative Move'}));

		selectNamedOption('Narrative Move для эффекта', 'Спросить Мишу про письмо');
		fireEvent.change(screen.getByLabelText('Тип Outcome effect'), {
			target: {value: 'relationship-adjust'}
		});
		selectNamedOption('Отношение от персонажа', 'Ира');
		selectNamedOption('Отношение к персонажу', 'Миша');
		typeInto('Ось отношения', 'trust');
		typeInto('Изменение отношения', '2');
		fireEvent.click(screen.getByRole('button', {name: 'Добавить эффект'}));

		// This is an outcome-dependent unlock, NOT a true timed/deferred event.
		fireEvent.change(screen.getByLabelText('Тип Outcome effect'), {
			target: {value: 'story-node-set-state'}
		});
		selectNamedOption('Story node для state effect', 'Разговор на следующий день');
		fireEvent.click(screen.getByRole('button', {name: 'Добавить эффект'}));

		expect(screen.getByTestId('writer-progress')).toHaveTextContent('2:2:1:2:1');
		await waitFor(() => expect(repo.load().narrativeMoves[0]?.outcomes[0]?.effects).toHaveLength(2), {
			timeout: 5000
		});
		const saved = repo.load();
		expect(saved.initialKnowledge).toHaveLength(2);
		expect(saved.initialKnowledge[0].source).toEqual({type: 'observed'});
		expect(saved.initialKnowledge[1].source).toEqual({
			type: 'mediated',
			medium: 'forum',
			attribution: 'nickname-2000'
		});
		expect(saved.initialKnowledge[0].characterId).not.toBe(saved.initialKnowledge[1].characterId);
		expect(saved.narrativeMoves[0].outcomes[0].effects).toEqual([
			expect.objectContaining({type: 'relationship-adjust', axis: 'trust', delta: 2}),
			expect.objectContaining({
				type: 'story-node-set-state',
				storyNodeId: saved.storyNodes[1].id,
				state: 'available'
			})
		]);
		// Distinguish persisted authored content from the still-unplayed simulation.
		expect(saved.simulation.day).toBe(1);
		const snapshot = serializeNarrativeSourceSnapshot(saved);
		const target = createNarrativeProject(hostStoryId, projectName, ninetyThreeDaysTemplate);
		const inspected = inspectNarrativeSourceSnapshot(snapshot, target);
		expect(inspected.status).toBe('ready');
		if (inspected.status === 'ready') {
			expect(inspected.project.narrativeMoves).toEqual(saved.narrativeMoves);
			expect(inspected.project.initialKnowledge).toEqual(saved.initialKnowledge);
		}

		first.unmount();
		renderWriter();
		expect(screen.getByTestId('writer-progress')).toHaveTextContent('2:2:1:2:1');
	});
});
