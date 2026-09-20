import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession
} from '../player-runtime';
import {executeNarrativePlayerAction} from '../player-action';

function session(): NarrativePlayerSession {
	const project = createNarrativeProject(
		'a55-action',
		'A55 Action',
		ninetyThreeDaysTemplate
	);
	project.projectId = 'a55-action-project';
	project.locations = [{id: 'station', name: 'Автовокзал'}];
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
	project.simulation.actualLocationByCharacter = {
		player: 'station',
		katya: 'station'
	};
	project.storyNodes = [
		{
			id: 'contact',
			kind: 'dialogue',
			title: 'Первый разговор',
			participantIds: ['player', 'katya'],
			placement: {locationId: 'station'},
			activationState: 'available'
		}
	];
	const greet: NarrativeMoveDefinition = {
		id: 'greet',
		storyNodeId: 'contact',
		kind: 'custom',
		label: 'Поздороваться',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [
			{
				id: 'same-place',
				condition: {
					type: 'characters-share-location',
					characterIds: ['player', 'katya']
				}
			}
		],
		resolution: {type: 'automatic', outcomeId: 'greet:outcome'},
		outcomes: [
			{
				id: 'greet:outcome',
				key: 'continue',
				label: 'Катя отвечает',
				effectStoryNodeIds: [],
				effects: [
					{
						id: 'trust',
						type: 'relationship-adjust',
						from: {type: 'move-target', targetIndex: 0},
						to: {type: 'move-actor'},
						axis: 'trust',
						delta: 1
					}
				]
			}
		]
	};
	const check: NarrativeMoveDefinition = {
		id: 'check',
		storyNodeId: 'contact',
		kind: 'observe',
		label: 'Проверить реакцию',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [],
		resolution: {
			type: 'skill-check',
			check: {
				skillKey: 'empathy',
				difficulty: 4,
				rollRule: {type: 'dice', diceCount: 1, dieSides: 6},
				modifiers: [],
				successOutcomeId: 'check:success',
				failureOutcomeId: 'check:failure'
			}
		},
		outcomes: [
			{
				id: 'check:success',
				key: 'success',
				label: 'Успех',
				effectStoryNodeIds: [],
				effects: []
			},
			{
				id: 'check:failure',
				key: 'failure',
				label: 'Провал',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
	project.narrativeMoves = [greet, check];

	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A55 action fixture to compile.');
	}
	const materialized = materializeNarrativePlayerSession(compiled.artifact);
	if (materialized.status !== 'ready') {
		throw new Error('Expected A55 action fixture to materialize.');
	}
	return materialized.session;
}

describe('A55 player action boundary', () => {
	test('applies canonical Move outcome through A53 session replacement', () => {
		const initial = session();
		const result = executeNarrativePlayerAction(initial, 'greet', 'player');

		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error('Expected canonical action to apply.');
		}
		expect(result.outcomeLabel).toBe('Катя отвечает');
		expect(result.session).not.toBe(initial);
		expect(initial.currentProject.relationships).toEqual([]);
		expect(
			result.session.currentProject.relationships.find(
				relationship =>
					relationship.fromCharacterId === 'katya' &&
					relationship.toCharacterId === 'player'
			)?.values.trust
		).toBe(1);
		expect(result.session.currentProject.runtimeOccurrences).toHaveLength(1);
	});

	test('does not invent random input for skill-check Moves', () => {
		const initial = session();
		const result = executeNarrativePlayerAction(initial, 'check', 'player');

		expect(result).toEqual(
			expect.objectContaining({
				status: 'rejected',
				session: initial,
				moveId: 'check',
				reason: 'input-required'
			})
		);
		expect(initial.currentProject.runtimeOccurrences).toEqual([]);
	});

	test('rejects actions owned by another actor before runtime mutation', () => {
		const initial = session();
		const result = executeNarrativePlayerAction(initial, 'greet', 'katya');

		expect(result).toEqual(
			expect.objectContaining({
				status: 'rejected',
				session: initial,
				reason: 'actor-mismatch'
			})
		);
		expect(initial.currentProject.runtimeOccurrences).toEqual([]);
	});
});
