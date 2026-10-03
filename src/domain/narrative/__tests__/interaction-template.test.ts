import {
	instantiateInteractionTemplate,
	InteractionTemplateDefinition,
	interactionTemplateIsStructurallyValid,
	previewInteractionTemplate
} from '../interaction-template';

const shareRumorTemplate: InteractionTemplateDefinition = {
	id: 'share-rumor',
	name: 'Share a rumor',
	roles: [
		{id: 'speaker', label: 'Говорящий', kind: 'character'},
		{id: 'listener', label: 'Слушатель', kind: 'character'}
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
			communicationIntent: 'honest',
			guards: [
				{
					id: 'together',
					label: 'Персонажи рядом',
					condition: {
						type: 'roles-share-location',
						roleIds: ['speaker', 'listener']
					}
				}
			],
			effects: [
				{
					id: 'listener-learns',
					type: 'role-learns-claim',
					recipientRoleId: 'listener',
					claimSlotId: 'claim',
					attitude: 'believes',
					confidence: 0.8,
					source: {type: 'move-actor'}
				}
			]
		}
	],
	tags: ['gossip']
};

describe('interaction templates', () => {
	test('materializes reusable roles, guards and effects for arbitrary bindings', () => {
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
		expect(first.moves[0].guards).toEqual([
			expect.objectContaining({
				id: 'instance-a:tell:guard:together',
				condition: {
					type: 'characters-share-location',
					characterIds: ['katya', 'andrey']
				}
			})
		]);
		expect(first.moves[0].outcomes[0].effects).toEqual([
			expect.objectContaining({
				id: 'instance-a:tell:effect:listener-learns',
				type: 'character-learns-claim',
				recipient: {type: 'character', characterId: 'andrey'},
				claim: {type: 'claim', claimId: 'claim-42'}
			})
		]);
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

	test('previews the exact instantiated structure without requiring a project mutation', () => {
		const incomplete = previewInteractionTemplate(shareRumorTemplate, {
			storyNodeId: 'scene-a',
			characterByRole: {speaker: 'katya'},
			claimBySlot: {}
		});
		expect(incomplete.status).toBe('incomplete');
		expect(incomplete.missingBindings).toEqual([
			expect.objectContaining({kind: 'character-role', id: 'listener'}),
			expect.objectContaining({kind: 'claim-slot', id: 'claim'})
		]);
		expect(incomplete.moves).toEqual([]);

		const binding = {
			storyNodeId: 'scene-a',
			characterByRole: {speaker: 'katya', listener: 'andrey'},
			claimBySlot: {claim: 'claim-42'}
		};
		const preview = previewInteractionTemplate(
			shareRumorTemplate,
			binding,
			'preview-instance'
		);
		const instantiated = instantiateInteractionTemplate(
			shareRumorTemplate,
			binding,
			'preview-instance'
		);

		expect(preview.status).toBe('ready');
		expect(preview.moves).toEqual(instantiated.moves);
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

	test('rejects undeclared role/claim references inside reusable guards and effects', () => {
		expect(
			interactionTemplateIsStructurallyValid({
				...shareRumorTemplate,
				moves: [
					{
						...shareRumorTemplate.moves[0],
						guards: [
							{
								id: 'bad-guard',
								condition: {
									type: 'role-knows-claim',
									characterRoleId: 'missing-role',
									claimSlotId: 'claim'
								}
							}
						]
					}
				]
			})
		).toBe(false);

		expect(
			interactionTemplateIsStructurallyValid({
				...shareRumorTemplate,
				moves: [
					{
						...shareRumorTemplate.moves[0],
						effects: [
							{
								id: 'bad-effect',
								type: 'role-learns-claim',
								recipientRoleId: 'listener',
								claimSlotId: 'missing-claim',
								attitude: 'believes',
								confidence: 1,
								source: {type: 'authored'}
							}
						]
					}
				]
			})
		).toBe(false);
	});
});
