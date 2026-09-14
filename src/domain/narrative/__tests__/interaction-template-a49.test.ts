import {
	instantiateInteractionTemplate,
	InteractionTemplateDefinition,
	previewInteractionTemplate
} from '../interaction-template';

const richTemplate: InteractionTemplateDefinition = {
	id: 'rich-a49-template',
	name: 'Rich A49 template',
	roles: [
		{id: 'actor', label: 'Actor', kind: 'character'},
		{id: 'target', label: 'Target', kind: 'character'}
	],
	claimSlots: [{id: 'topic', label: 'Topic', required: false}],
	moves: [
		{
			id: 'exchange',
			kind: 'inform',
			label: 'Exchange',
			actorRoleId: 'actor',
			targetRoleIds: ['target'],
			guards: [
				{
					id: 'actor-knows',
					condition: {
						type: 'role-knows-claim',
						characterRoleId: 'actor',
						claimSlotId: 'topic'
					}
				},
				{
					id: 'trust',
					condition: {
						type: 'relationship-at-least',
						fromRoleId: 'actor',
						toRoleId: 'target',
						axis: 'trust',
						value: 0.25
					}
				},
				{
					id: 'node-active',
					condition: {type: 'story-node-state', state: 'active'},
					negated: true
				}
			],
			effects: [
				{
					id: 'relationship',
					type: 'relationship-adjust',
					fromRoleId: 'actor',
					toRoleId: 'target',
					axis: 'trust',
					delta: 0.1
				},
				{
					id: 'mood',
					type: 'role-mood-set',
					roleId: 'target',
					mood: 'curious'
				},
				{
					id: 'memory',
					type: 'role-remembers',
					roleId: 'target',
					summary: 'Запомнил разговор',
					importance: 0.6,
					baseStrength: 0.7,
					tags: ['conversation'],
					source: {type: 'current-move'}
				},
				{
					id: 'complete-node',
					type: 'story-node-set-state',
					state: 'completed'
				}
			]
		}
	],
	tags: ['a49']
};

describe('A49 reusable template coverage', () => {
	test('materializes all reusable guard and effect variants into canonical move contracts', () => {
		const instance = instantiateInteractionTemplate(
			richTemplate,
			{
				storyNodeId: 'scene-1',
				characterByRole: {actor: 'alice', target: 'bob'},
				claimBySlot: {topic: 'claim-1'}
			},
			'instance-rich'
		);
		const move = instance.moves[0];

		expect(move.guards).toEqual([
			expect.objectContaining({
				condition: {
					type: 'character-knows-claim',
					characterId: 'alice',
					claimId: 'claim-1'
				}
			}),
			expect.objectContaining({
				condition: {
					type: 'relationship-at-least',
					fromCharacterId: 'alice',
					toCharacterId: 'bob',
					axis: 'trust',
					value: 0.25
				}
			}),
			expect.objectContaining({
				condition: {
					type: 'story-node-state',
					storyNodeId: 'scene-1',
					state: 'active'
				},
				negated: true
			})
		]);

		expect(move.outcomes[0].effects).toEqual([
			expect.objectContaining({
				type: 'relationship-adjust',
				from: {type: 'character', characterId: 'alice'},
				to: {type: 'character', characterId: 'bob'},
				axis: 'trust',
				delta: 0.1
			}),
			expect.objectContaining({
				type: 'character-mood-set',
				character: {type: 'character', characterId: 'bob'},
				mood: 'curious'
			}),
			expect.objectContaining({
				type: 'character-remembers',
				character: {type: 'character', characterId: 'bob'},
				summary: 'Запомнил разговор',
				source: {type: 'current-move'}
			}),
			expect.objectContaining({
				type: 'story-node-set-state',
				storyNodeId: 'scene-1',
				state: 'completed'
			})
		]);
	});

	test('reports missing Story node and referenced optional Claim before commit', () => {
		const preview = previewInteractionTemplate(richTemplate, {
			storyNodeId: '',
			characterByRole: {actor: 'alice', target: 'bob'},
			claimBySlot: {}
		});

		expect(preview.status).toBe('incomplete');
		expect(preview.missingBindings).toEqual([
			expect.objectContaining({kind: 'story-node'}),
			expect.objectContaining({kind: 'claim-slot', id: 'topic'})
		]);
	});

	test('returns invalid preview for a structurally invalid template', () => {
		const preview = previewInteractionTemplate(
			{...richTemplate, moves: []},
			{
				storyNodeId: 'scene-1',
				characterByRole: {actor: 'alice', target: 'bob'},
				claimBySlot: {topic: 'claim-1'}
			}
		);

		expect(preview).toEqual(
			expect.objectContaining({
				status: 'invalid',
				moves: [],
				error: 'Interaction template is structurally invalid.'
			})
		);
	});
});
