import * as React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {createDefaultNarrativeOutcome} from '../../../../domain/narrative/interaction';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {NarrativeProjectProvider} from '../../../../store/narrative-project';
import {createLocalStorageNarrativeProjectRepository} from '../../../../store/narrative-project/repository';
import {OutcomeEffectsPanel} from '../outcome-effects-panel';

const host = 'a84-knowledge-ui-host';
const name = 'A84 outcome knowledge';

describe('A84 no-code delayed Claim authoring control', () => {
	beforeEach(() => window.localStorage.clear());

	test('author selects a Claim, recipient, source and two-day delay via form, and reopens it', async () => {
		const project = createNarrativeProject(host, name, ninetyThreeDaysTemplate);
		project.characters = [{
			id: 'ira', name: 'Ира', cognitionTier: 'full', defaultBehaviorProfileId: 'ira-default'
		}, {
			id: 'misha', name: 'Миша', cognitionTier: 'full', defaultBehaviorProfileId: 'misha-default'
		}];
		project.claims = [{id: 'rumor', text: 'Клуб закрыт', stance: 'unresolved', tags: []}];
		project.storyNodes = [{
			id: 'first', kind: 'dialogue', title: 'Слух', participantIds: ['ira', 'misha'],
			activationState: 'available'
		}];
		project.narrativeMoves = [{
			id: 'talk', storyNodeId: 'first', kind: 'inform',
			label: 'Передать слух', actorCharacterId: 'ira', targetCharacterIds: ['misha'],
			communicatedClaimId: 'rumor', guards: [],
			resolution: {type: 'automatic', outcomeId: 'talk:outcome:continue'},
			outcomes: [createDefaultNarrativeOutcome('talk')]
		}];
		const repository = createLocalStorageNarrativeProjectRepository(
			host, name, ninetyThreeDaysTemplate
		);
		repository.save(project);
		const ui = render(
			<NarrativeProjectProvider hostStoryId={host} projectName={name}>
				<OutcomeEffectsPanel />
			</NarrativeProjectProvider>
		);
		fireEvent.change(screen.getByLabelText('Тип Outcome effect'), {
			target: {value: 'character-learns-claim'}
		});
		fireEvent.change(screen.getByLabelText('Персонаж получает Claim'), {
			target: {value: 'misha'}
		});
		fireEvent.change(screen.getByLabelText('Конкретный Claim knowledge effect'), {
			target: {value: 'rumor'}
		});
		fireEvent.change(screen.getByLabelText('Источник knowledge effect'), {
			target: {value: 'mediated'}
		});
		fireEvent.change(screen.getByLabelText('Канал mediated knowledge source'), {
			target: {value: 'forum'}
		});
		fireEvent.change(screen.getByLabelText('Задержка knowledge effect в днях'), {
			target: {value: '2'}
		});
		fireEvent.click(screen.getByRole('button', {name: 'Добавить эффект'}));
		await waitFor(() => expect(repository.load().narrativeMoves[0].outcomes[0].effects).toHaveLength(1));
		expect(repository.load().narrativeMoves[0].outcomes[0].effects[0]).toEqual(
			expect.objectContaining({
				type: 'character-learns-claim',
				delayDays: 2,
				source: expect.objectContaining({type: 'mediated', medium: 'forum'})
			})
		);
		expect(repository.load().simulation.characterKnowledge).toHaveLength(0);
		ui.unmount();
		render(
			<NarrativeProjectProvider hostStoryId={host} projectName={name}>
				<OutcomeEffectsPanel />
			</NarrativeProjectProvider>
		);
		expect(repository.load().narrativeMoves[0].outcomes[0].effects[0]).toEqual(
			expect.objectContaining({delayDays: 2})
		);
	});
});
