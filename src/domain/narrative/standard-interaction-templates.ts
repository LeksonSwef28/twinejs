import {InteractionTemplateDefinition} from './interaction-template';

/**
 * Small built-in starter library. These are authoring conveniences, not runtime
 * special cases: instantiation always produces ordinary NarrativeMove records.
 */
export const starterInteractionTemplates: InteractionTemplateDefinition[] = [
	{
		id: 'starter-share-claim',
		name: 'Поделиться утверждением',
		description:
			'Один персонаж сообщает другому выбранный Claim. Подходит для слухов, новостей и обычной передачи информации.',
		roles: [
			{id: 'speaker', label: 'Говорящий'},
			{id: 'listener', label: 'Слушатель'}
		],
		claimSlots: [{id: 'claim', label: 'Claim', required: true}],
		moves: [
			{
				id: 'tell',
				kind: 'inform',
				label: 'Сообщить утверждение',
				actorRoleId: 'speaker',
				targetRoleIds: ['listener'],
				communicatedClaimSlotId: 'claim',
				communicationIntent: 'honest'
			}
		],
		tags: ['communication', 'knowledge']
	}
];
