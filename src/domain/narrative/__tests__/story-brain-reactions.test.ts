import {queryStoryBrain} from '../../../application/narrative/story-brain-query';
import {createDefaultNarrativeOutcome} from '../interaction';
import {createNarrativeProject} from '../project-factory';
import {ninetyThreeDaysTemplate} from '../templates/93-days';

describe('Story Brain reactions', () => {
	test('returns ranked reaction candidates for the focused Story context', () => {
		const project = createNarrativeProject(
			'story-reactions',
			'Reactions',
			ninetyThreeDaysTemplate
		);
		project.characters = [
			{
				id: 'katya',
				name: 'Катя',
				cognitionTier: 'full',
				defaultBehaviorProfileId: 'katya-profile'
			},
			{
				id: 'andrey',
				name: 'Андрей',
				cognitionTier: 'full',
				defaultBehaviorProfileId: 'andrey-profile'
			}
		];
		project.storyNodes = [
			{
				id: 'dialogue',
				kind: 'dialogue',
				title: 'Разговор',
				participantIds: ['katya', 'andrey'],
				activationState: 'active'
			}
		];
		const warmOutcome = createDefaultNarrativeOutcome('warm');
		const sharpOutcome = createDefaultNarrativeOutcome('sharp');
		project.narrativeMoves = [
			{
				id: 'warm',
				storyNodeId: 'dialogue',
				kind: 'joke',
				label: 'Ответить мягко',
				actorCharacterId: 'katya',
				targetCharacterIds: ['andrey'],
				guards: [],
				resolution: {type: 'automatic', outcomeId: warmOutcome.id},
				outcomes: [warmOutcome]
			},
			{
				id: 'sharp',
				storyNodeId: 'dialogue',
				kind: 'accuse',
				label: 'Ответить резко',
				actorCharacterId: 'katya',
				targetCharacterIds: ['andrey'],
				guards: [],
				resolution: {type: 'automatic', outcomeId: sharpOutcome.id},
				outcomes: [sharpOutcome]
			}
		];
		project.reactionCandidateSets = [
			{
				id: 'katya-response',
				storyNodeId: 'dialogue',
				reactingCharacterId: 'katya',
				counterpartCharacterId: 'andrey',
				candidates: [
					{
						id: 'warm-candidate',
						moveId: 'warm',
						valence: 'positive',
						baseScore: 1,
						guards: [],
						considerations: []
					},
					{
						id: 'sharp-candidate',
						moveId: 'sharp',
						valence: 'negative',
						baseScore: 1,
						guards: [],
						considerations: [
							{
								id: 'angry-boost',
								type: 'mood-is',
								mood: 'angry',
								weight: 4
							}
						]
					}
				]
			}
		];
		project.mindStates = [
			{
				characterId: 'katya',
				mood: 'angry',
				activeMemoryIds: [],
				pendingReactionIds: []
			}
		];

		const result = queryStoryBrain(project, {kind: 'story-node', id: 'dialogue'});

		expect(result.reactions).toHaveLength(1);
		expect(result.reactions[0].candidates.map(candidate => candidate.moveId)).toEqual([
			'sharp',
			'warm'
		]);
		expect(result.reactions[0].candidates[0].score).toBe(5);
	});
});
