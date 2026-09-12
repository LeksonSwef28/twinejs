import {
	applyNarrativeOutcomeKnowledgeEffects,
	characterIsAwareOfClaim,
	evaluateNarrativeGuards
} from '../interaction-runtime';
import {NarrativeMoveDefinition} from '../interaction';
import {
	createCharacterKnowledgeStateFromSeed,
	initializeCharacterKnowledge
} from '../knowledge';

describe('Narrative knowledge runtime bridge', () => {
	test('initial knowledge is generic per character and per claim', () => {
		const states = initializeCharacterKnowledge([
			{
				id: 'seed-katya',
				characterId: 'katya',
				claimId: 'claim-key',
				attitude: 'believes',
				confidence: 0.8,
				source: {type: 'told', sourceCharacterId: 'olga'}
			},
			{
				id: 'seed-olga',
				characterId: 'olga',
				claimId: 'claim-key',
				attitude: 'doubts',
				confidence: 0.4,
				source: {type: 'observed'}
			}
		]);

		expect(states).toEqual([
			expect.objectContaining({
				characterId: 'katya',
				claimId: 'claim-key',
				attitude: 'believes',
				confidence: 0.8
			}),
			expect.objectContaining({
				characterId: 'olga',
				claimId: 'claim-key',
				attitude: 'doubts',
				confidence: 0.4
			})
		]);
		expect(characterIsAwareOfClaim(states, 'igor', 'claim-key')).toBe(false);
	});

	test('rejects invalid confidence when a seed becomes runtime state', () => {
		expect(() =>
			createCharacterKnowledgeStateFromSeed({
				id: 'bad-seed',
				characterId: 'katya',
				claimId: 'claim-key',
				attitude: 'believes',
				confidence: 1.5,
				source: {type: 'authored'}
			})
		).toThrow(RangeError);
	});

	test('knowledge guard checks awareness, not whether the character believes the claim', () => {
		const knowledge = initializeCharacterKnowledge([
			{
				id: 'seed-andrey',
				characterId: 'andrey',
				claimId: 'claim-key',
				attitude: 'disbelieves',
				confidence: 1,
				source: {type: 'authored'}
			}
		]);
		const context = {
			characterKnowledge: knowledge,
			itemInstances: [],
			relationships: [],
			storyNodes: [],
			actualLocationByCharacter: {}
		};

		const result = evaluateNarrativeGuards(
			[
				{
					id: 'knows',
					condition: {
						type: 'character-knows-claim',
						characterId: 'andrey',
						claimId: 'claim-key'
					}
				}
			],
			context
		);

		expect(result.available).toBe(true);
		expect(result.traces[0].status).toBe('met');
	});

	test('a resolved communication can give the target a claim without changing authored truth', () => {
		const move: NarrativeMoveDefinition = {
			id: 'move-rumor',
			storyNodeId: 'dialogue-a',
			kind: 'deceive',
			label: 'Сказать, что Андрей украл ключ',
			actorCharacterId: 'katya',
			targetCharacterIds: ['igor'],
			communicatedClaimId: 'claim-key',
			communicationIntent: 'deceptive',
			guards: [],
			resolution: {type: 'automatic', outcomeId: 'heard'},
			outcomes: [
				{
					id: 'heard',
					key: 'continue',
					label: 'Игорь услышал',
					effectStoryNodeIds: [],
					effects: [
						{
							id: 'learn-rumor',
							type: 'character-learns-claim',
							recipient: {type: 'move-target', targetIndex: 0},
							claim: {type: 'communicated-claim'},
							attitude: 'believes',
							confidence: 0.7,
							source: {type: 'move-actor'}
						}
					]
				}
			]
		};

		const result = applyNarrativeOutcomeKnowledgeEffects(
			move,
			move.outcomes[0],
			[],
			{moment: {day: 12, minuteOfDay: 840}, sourceEventId: 'event-12'}
		);

		expect(result.characterKnowledge).toEqual([
			expect.objectContaining({
				characterId: 'igor',
				claimId: 'claim-key',
				attitude: 'believes',
				confidence: 0.7,
				learnedAt: {day: 12, minuteOfDay: 840},
				timesHeard: 1,
				source: {
					type: 'told',
					sourceCharacterId: 'katya',
					sourceEventId: 'event-12'
				}
			})
		]);
		expect(result.traces[0].claimId).toBe('claim-key');
	});

	test('hearing a claim again reinforces the same runtime knowledge state', () => {
		const move: NarrativeMoveDefinition = {
			id: 'move-repeat',
			storyNodeId: 'dialogue-a',
			kind: 'inform',
			label: 'Повторить слух',
			actorCharacterId: 'katya',
			targetCharacterIds: ['igor'],
			communicatedClaimId: 'claim-key',
			guards: [],
			resolution: {type: 'automatic', outcomeId: 'heard'},
			outcomes: [
				{
					id: 'heard',
					key: 'continue',
					label: 'Услышал',
					effectStoryNodeIds: [],
					effects: [
						{
							id: 'learn-repeat',
							type: 'character-learns-claim',
							recipient: {type: 'move-target', targetIndex: 0},
							claim: {type: 'communicated-claim'},
							attitude: 'believes',
							confidence: 0.9,
							source: {type: 'move-actor'}
						}
					]
				}
			]
		};
		const previous = [
			{
				id: 'knowledge:igor:claim-key',
				characterId: 'igor',
				claimId: 'claim-key',
				attitude: 'doubts' as const,
				confidence: 0.3,
				source: {type: 'observed' as const},
				learnedAt: {day: 3, minuteOfDay: 600},
				timesHeard: 1
			}
		];

		const result = applyNarrativeOutcomeKnowledgeEffects(
			move,
			move.outcomes[0],
			previous,
			{moment: {day: 14, minuteOfDay: 900}}
		);

		expect(previous[0].attitude).toBe('doubts');
		expect(result.characterKnowledge).toHaveLength(1);
		expect(result.characterKnowledge[0]).toEqual(
			expect.objectContaining({
				attitude: 'believes',
				confidence: 0.9,
				learnedAt: {day: 3, minuteOfDay: 600},
				lastReinforcedAt: {day: 14, minuteOfDay: 900},
				timesHeard: 2
			})
		);
	});
});
