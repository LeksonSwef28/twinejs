import {fireEvent, render, screen} from '@testing-library/react';
import {axe} from 'jest-axe';
import * as React from 'react';
import {
	compileNarrativeRuntimeArtifact,
	serializeNarrativeRuntimeArtifact
} from '../../application/narrative/export-compiler';
import {NarrativeMoveDefinition} from '../../domain/narrative/interaction';
import {createNarrativeProject} from '../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../domain/narrative/templates/93-days';
import {NarrativePlayerArtifactSource} from '../artifact-source';
import {PlayerApp} from '../player-app';

function source(): NarrativePlayerArtifactSource {
	const project = createNarrativeProject(
		'a55-player-app',
		'A55 Player App',
		ninetyThreeDaysTemplate
	);
	project.projectId = 'a55-player-app-project';
	project.locations = [{id: 'station', name: 'Автовокзал'}];
	project.scenes = [
		{id: 'platform', locationId: 'station', name: 'Платформа прибытия'}
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
	project.behaviorProfiles = [
		{id: 'player-default', characterId: 'player', name: 'Player default'},
		{id: 'katya-default', characterId: 'katya', name: 'Katya default'}
	];
	project.storyNodes = [
		{
			id: 'contact',
			kind: 'dialogue',
			title: 'Первый разговор',
			participantIds: ['player', 'katya'],
			activationState: 'available'
		}
	];
	const move: NarrativeMoveDefinition = {
		id: 'greet',
		storyNodeId: 'contact',
		kind: 'custom',
		label: 'Поздороваться',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [],
		resolution: {type: 'automatic', outcomeId: 'greet:outcome'},
		outcomes: [
			{
				id: 'greet:outcome',
				key: 'continue',
				label: 'Катя отвечает',
				effectStoryNodeIds: [],
				effects: [
					{
						id: 'complete-contact',
						type: 'story-node-set-state',
						storyNodeId: 'contact',
						state: 'completed'
					}
				]
			}
		]
	};
	project.narrativeMoves = [move];

	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A55 PlayerApp fixture to compile.');
	}
	return {
		status: 'found',
		source: 'inline',
		serializedArtifact: serializeNarrativeRuntimeArtifact(compiled.artifact)
	};
}

describe('<PlayerApp> A55 presentation', () => {
	test('executes an unplaced canonical Move from a fresh Player session with outcome feedback', () => {
		render(<PlayerApp artifactSource={source()} />);

		expect(
			screen.getByRole('heading', {name: 'Местоположение не определено'})
		).toBeInTheDocument();
		const action = screen.getByRole('button', {name: /Поздороваться/});
		expect(action).toBeEnabled();

		fireEvent.click(action);

		expect(screen.getByRole('status')).toHaveTextContent('Катя отвечает');
		expect(
			screen.queryByRole('button', {name: /Поздороваться/})
		).not.toBeInTheDocument();
	});

	test('is accessible in the ready player shell', async () => {
		const {container} = render(<PlayerApp artifactSource={source()} />);
		expect(await axe(container)).toHaveNoViolations();
	});
});
