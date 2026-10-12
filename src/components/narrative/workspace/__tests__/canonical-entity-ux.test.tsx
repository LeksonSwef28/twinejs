import * as React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {
	NarrativeProjectProvider,
	useNarrativeProject
} from '../../../../store/narrative-project';
import {createLocalStorageNarrativeProjectRepository} from '../../../../store/narrative-project/repository';
import {CanonicalEntityPanel} from '../canonical-entity-panel';

const host = 'a81-canonical-rename-host';
const name = 'Canonical metadata test';

const PanelHarness: React.FC = () => {
	const {project, undo} = useNarrativeProject();
	return (
		<>
			<output data-testid="entity-truth">
				{project.characters[0]?.id}:{project.characters[0]?.name}:
				{project.storyNodes[0]?.participantIds[0]}
			</output>
			<button type="button" onClick={undo}>Undo author metadata</button>
			<CanonicalEntityPanel />
		</>
	);
};

describe('W3 metadata update safety and bounded references', () => {
	beforeEach(() => window.localStorage.clear());

	test('shows linked Story before rename, preserves ID and reference, supports Undo', async () => {
		const project = createNarrativeProject(host, name, ninetyThreeDaysTemplate);
		project.characters.push({
			id: 'character-ira',
			name: 'Ира',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'ira-profile'
		});
		project.behaviorProfiles.push({
			id: 'ira-profile',
			characterId: 'character-ira',
			name: 'Рабочий график'
		});
		project.storyNodes.push({
			id: 'scene-ira',
			kind: 'dialogue',
			title: 'Разговор с Ирой',
			participantIds: ['character-ira'],
			activationState: 'draft'
		});
		createLocalStorageNarrativeProjectRepository(
			host, name, ninetyThreeDaysTemplate
		).save(project);

		render(
			<NarrativeProjectProvider hostStoryId={host} projectName={name}>
				<PanelHarness />
			</NarrativeProjectProvider>
		);

		expect(screen.getByText(/Где используется: 1 найдено в поисковом индексе/))
			.toBeInTheDocument();
		fireEvent.click(screen.getByText(/Где используется: 1 найдено в поисковом индексе/));
		expect(screen.getByText('Разговор с Ирой')).toBeInTheDocument();
		expect(screen.getByText(/частичный список известных ссылок/)).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Основное имя canonical entity'), {
			target: {value: 'Ирина'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Сохранить metadata'}));
		await waitFor(() => expect(screen.getByTestId('entity-truth'))
			.toHaveTextContent('character-ira:Ирина:character-ira'));
		fireEvent.click(screen.getByRole('button', {name: 'Undo author metadata'}));
		expect(screen.getByTestId('entity-truth'))
			.toHaveTextContent('character-ira:Ира:character-ira');
	});
});
