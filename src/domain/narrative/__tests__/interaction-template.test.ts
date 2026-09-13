import {
	instantiateInteractionTemplate,
	InteractionTemplateDefinition,
	interactionTemplateIsStructurallyValid
} from '../interaction-template';

const shareRumorTemplate: InteractionTemplateDefinition = {
	id: 'share-rumor',
	name: 'Share a rumor',
	roles: [
		{id: 'speaker', label: 'Говорящий'},
		{id: 'listener', label: 'Слушатель'}
	],
	claimSlots: [{id: 'claim', label: 'Утверждение', required: true}],
	moves: [
		{
			id: 'tell',
			kind: 'inform',
			label: 'Рассказать слух',
			actorRoleId: 'speaker',
			targetRoleIds: ['listener'],
			communicatedClaimSlotId: 'claim',
			communicationIntent: 'honest'
		}
	],
	tags: ['gossip']
};

describe('interaction templates', () => {
	test('materializes the same authored structure for arbitrary character bindings', () => {
		const first = instantiateInteractionTemplate(
			shareRumorTemplate,
			{
				storyNodeId: 'scene-a',
				characterByRole: {speaker: 'katya', listener: 'andrey'},
				claimBySlot: {claim: 'claim-42'}
			},
			'instance-a'
		);
		const second = instantiateInteractionTemplate(
			shareRumorTemplate,
			{
				storyNodeId: 'scene-b',
				characterByRole: {speaker: 'mira', listener: 'lev'},
				claimBySlot: {claim: 'claim-99'}
			},
			'instance-b'
		);

		expect(first.moves[0]).toEqual(
			expect.objectContaining({
				id: 'instance-a:tell',
				storyNodeId: 'scene-a',
				actorCharacterId: 'katya',
				targetCharacterIds: ['andrey'],
				communicatedClaimId: 'claim-42'
			})
		);
		expect(second.moves[0]).toEqual(
			expect.objectContaining({
				actorCharacterId: 'mira',
				targetCharacterIds: ['lev'],
				communicatedClaimId: 'claim-99'
			})
		);
		expect(first.moves[0].resolution).toEqual({
			type: 'automatic',
			outcomeId: 'instance-a:tell:outcome:continue'
		});
	});

	test('fails closed when a required role or Claim slot is not bound', () => {
		expect(() =>
			instantiateInteractionTemplate(
				shareRumorTemplate,
				{
					storyNodeId: 'scene-a',
					characterByRole: {speaker: 'katya'},
					claimBySlot: {claim: 'claim-42'}
				},
				'bad-role'
			)
		).toThrow('Missing Character binding for role listener.');

		expect(() =>
			instantiateInteractionTemplate(
				shareRumorTemplate,
				{
					storyNodeId: 'scene-a',
					characterByRole: {speaker: 'katya', listener: 'andrey'},
					claimBySlot: {}
				},
				'bad-claim'
			)
		).toThrow('Missing Claim binding for slot claim.');
	});

	test('rejects template moves that reference undeclared roles', () => {
		expect(
			interactionTemplateIsStructurallyValid({
				...shareRumorTemplate,
				moves: [
					{
						...shareRumorTemplate.moves[0],
						targetRoleIds: ['missing-role']
					}
				]
			})
		).toBe(false);
	});
});
