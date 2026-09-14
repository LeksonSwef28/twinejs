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
			'Персонаж сообщает другому выбранный Claim, когда они находятся рядом; при успешном обычном исходе слушатель получает это знание.',
		roles: [
			{id: 'speaker', label: 'Говорящий', kind: 'character'},
			{id: 'listener', label: 'Слушатель', kind: 'character'}
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
				communicationIntent: 'honest',
				guards: [
					{
						id: 'share-location',
						label: 'Говорящий и слушатель находятся рядом',
						condition: {
							type: 'roles-share-location',
							roleIds: ['speaker', 'listener']
						}
					}
				],
				effects: [
					{
						id: 'listener-learns-claim',
						type: 'role-learns-claim',
						recipientRoleId: 'listener',
						claimSlotId: 'claim',
						attitude: 'believes',
						confidence: 0.75,
						source: {type: 'move-actor'}
					}
				]
			}
		],
		tags: ['communication', 'knowledge', 'reusable']
	},
	{
		id: 'starter-request-and-answer',
		name: 'Просьба и ответ',
		description:
			'Двухшаговый EventTemplate-style паттерн: один персонаж просит, второй отвечает. После инстанцирования это два обычных Move.',
		roles: [
			{id: 'requester', label: 'Проситель', kind: 'character'},
			{id: 'responder', label: 'Отвечающий', kind: 'character'}
		],
		claimSlots: [],
		moves: [
			{
				id: 'request',
				kind: 'ask',
				label: 'Попросить о помощи',
				actorRoleId: 'requester',
				targetRoleIds: ['responder'],
				guards: [
					{
						id: 'share-location',
						condition: {
							type: 'roles-share-location',
							roleIds: ['requester', 'responder']
						}
					}
				]
			},
			{
				id: 'answer',
				kind: 'inform',
				label: 'Ответить на просьбу',
				actorRoleId: 'responder',
				targetRoleIds: ['requester']
			}
		],
		tags: ['conversation', 'multi-step', 'reusable']
	}
];
