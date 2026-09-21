import {NarrativeMoveDefinition} from '../interaction';
import {NarrativeProject} from '../project';
import {arrivalCorridorIds} from './93-days-arrival-corridor';
import {dayOneNarrativeIds} from './93-days-day-one-day-two';
import {create93DaysEverydaySystemsProject} from './93-days-everyday-systems';

export const phoneSocialLoopIds = {
	locations: {
		dormCourtyard: 'a60-dorm-courtyard'
	},
	routes: {
		dormToCourtyard: 'a60-route-dorm-courtyard',
		courtyardToDorm: 'a60-route-courtyard-dorm'
	},
	claims: {
		meetingAccepted: 'a60-claim-meeting-accepted',
		meetingDeclined: 'a60-claim-meeting-declined'
	},
	story: {
		incomingSms: 'a60-day2-incoming-sms',
		reply: 'a60-day2-sms-reply',
		meeting: 'a60-day2-evening-meeting',
		dayThreeEcho: 'a60-day3-social-echo'
	},
	moves: {
		accept: 'a60-day2-sms-reply:accept',
		decline: 'a60-day2-sms-reply:decline',
		metEcho: 'a60-day3-social-echo:met',
		missedEcho: 'a60-day3-social-echo:missed',
		declinedEcho: 'a60-day3-social-echo:declined'
	}
} as const;

const playerId = arrivalCorridorIds.characters.player;
const contactId = dayOneNarrativeIds.characters.localContact;

function phoneGuard(id: string) {
	return {
		id,
		label: 'Нужен кнопочный телефон',
		condition: {
			type: 'character-has-item' as const,
			characterId: playerId,
			itemInstanceId: arrivalCorridorIds.items.buttonPhone
		}
	};
}

function storyStateGuard(
	id: string,
	storyNodeId: string,
	state: 'available' | 'active' | 'blocked' | 'completed'
) {
	return {
		id,
		condition: {
			type: 'story-node-state' as const,
			storyNodeId,
			state
		}
	};
}

function knowsClaimGuard(id: string, claimId: string) {
	return {
		id,
		condition: {
			type: 'character-knows-claim' as const,
			characterId: playerId,
			claimId
		}
	};
}

function replyMoves(): NarrativeMoveDefinition[] {
	return [
		{
			id: phoneSocialLoopIds.moves.accept,
			storyNodeId: phoneSocialLoopIds.story.reply,
			kind: 'inform',
			label: 'Ответить, что придёшь вечером',
			actorCharacterId: playerId,
			targetCharacterIds: [contactId],
			communicationIntent: 'honest',
			guards: [
				phoneGuard('a60-accept:has-phone'),
				storyStateGuard(
					'a60-accept:sms-read',
					phoneSocialLoopIds.story.incomingSms,
					'completed'
				)
			],
			resolution: {
				type: 'automatic',
				outcomeId: 'a60-accept:outcome'
			},
			outcomes: [
				{
					id: 'a60-accept:outcome',
					key: 'accept',
					label: 'Договориться встретиться вечером во дворе общежития',
					effectStoryNodeIds: [phoneSocialLoopIds.story.meeting],
					effects: [
						{
							id: 'a60-accept:learn-agreement',
							type: 'character-learns-claim',
							recipient: {type: 'character', characterId: playerId},
							claim: {
								type: 'claim',
								claimId: phoneSocialLoopIds.claims.meetingAccepted
							},
							attitude: 'believes',
							confidence: 1,
							source: {type: 'observed'}
						},
						{
							id: 'a60-accept:open-meeting',
							type: 'story-node-set-state',
							storyNodeId: phoneSocialLoopIds.story.meeting,
							state: 'available'
						},
						{
							id: 'a60-accept:complete-reply',
							type: 'story-node-set-state',
							storyNodeId: phoneSocialLoopIds.story.reply,
							state: 'completed'
						},
						{
							id: 'a60-accept:memory',
							type: 'character-remembers',
							character: {type: 'move-actor'},
							summary:
								'После утреннего SMS договорились встретиться вечером во дворе общежития.',
							importance: 0.6,
							baseStrength: 0.65,
							tags: ['day-two', 'phone', 'meeting', 'social'],
							source: {type: 'current-move'}
						}
					]
				}
			]
		},
		{
			id: phoneSocialLoopIds.moves.decline,
			storyNodeId: phoneSocialLoopIds.story.reply,
			kind: 'refuse',
			label: 'Ответить, что сегодня не получится',
			actorCharacterId: playerId,
			targetCharacterIds: [contactId],
			communicationIntent: 'honest',
			guards: [
				phoneGuard('a60-decline:has-phone'),
				storyStateGuard(
					'a60-decline:sms-read',
					phoneSocialLoopIds.story.incomingSms,
					'completed'
				)
			],
			resolution: {
				type: 'automatic',
				outcomeId: 'a60-decline:outcome'
			},
			outcomes: [
				{
					id: 'a60-decline:outcome',
					key: 'decline',
					label: 'Отказаться без конфликта',
					effectStoryNodeIds: [phoneSocialLoopIds.story.dayThreeEcho],
					effects: [
						{
							id: 'a60-decline:learn-decision',
							type: 'character-learns-claim',
							recipient: {type: 'character', characterId: playerId},
							claim: {
								type: 'claim',
								claimId: phoneSocialLoopIds.claims.meetingDeclined
							},
							attitude: 'believes',
							confidence: 1,
							source: {type: 'observed'}
						},
						{
							id: 'a60-decline:block-meeting',
							type: 'story-node-set-state',
							storyNodeId: phoneSocialLoopIds.story.meeting,
							state: 'blocked'
						},
						{
							id: 'a60-decline:complete-reply',
							type: 'story-node-set-state',
							storyNodeId: phoneSocialLoopIds.story.reply,
							state: 'completed'
						},
						{
							id: 'a60-decline:memory',
							type: 'character-remembers',
							character: {type: 'move-actor'},
							summary:
								'На приглашение встретиться вечером пришлось ответить отказом.',
							importance: 0.4,
							baseStrength: 0.5,
							tags: ['day-two', 'phone', 'declined'],
							source: {type: 'current-move'}
						}
					]
				}
			]
		}
	];
}

function echoMove(
	id: string,
	label: string,
	outcomeId: string,
	outcomeLabel: string,
	guards: NarrativeMoveDefinition['guards'],
	goodwillDelta: number,
	memorySummary: string
): NarrativeMoveDefinition {
	return {
		id,
		storyNodeId: phoneSocialLoopIds.story.dayThreeEcho,
		kind: 'observe',
		label,
		actorCharacterId: playerId,
		targetCharacterIds: [],
		guards,
		resolution: {type: 'automatic', outcomeId},
		outcomes: [
			{
				id: outcomeId,
				key: 'continue',
				label: outcomeLabel,
				effectStoryNodeIds: [],
				effects: [
					{
						id: `${outcomeId}:goodwill`,
						type: 'relationship-adjust',
						from: {type: 'character', characterId: contactId},
						to: {type: 'move-actor'},
						axis: 'goodwill',
						delta: goodwillDelta
					},
					{
						id: `${outcomeId}:memory`,
						type: 'character-remembers',
						character: {type: 'move-actor'},
						summary: memorySummary,
						importance: 0.55,
						baseStrength: 0.6,
						tags: ['day-three', 'social-echo'],
						source: {type: 'current-move'}
					}
				]
			}
		]
	};
}

function dayThreeMoves(): NarrativeMoveDefinition[] {
	return [
		echoMove(
			phoneSocialLoopIds.moves.metEcho,
			'Вспомнить вчерашнюю встречу',
			'a60-day3-met:outcome',
			'Вечерняя встреча стала первым настоящим социальным продолжением приезда',
			[
				knowsClaimGuard(
					'a60-day3-met:accepted',
					phoneSocialLoopIds.claims.meetingAccepted
				),
				storyStateGuard(
					'a60-day3-met:meeting',
					phoneSocialLoopIds.story.meeting,
					'completed'
				)
			],
			0.15,
			'Встреча после SMS состоялась, и контакт перестал быть просто номером в записке.'
		),
		echoMove(
			phoneSocialLoopIds.moves.missedEcho,
			'Подумать о пропущенной встрече',
			'a60-day3-missed:outcome',
			'Пропущенная договорённость уже стала частью отношений',
			[
				knowsClaimGuard(
					'a60-day3-missed:accepted',
					phoneSocialLoopIds.claims.meetingAccepted
				),
				storyStateGuard(
					'a60-day3-missed:meeting',
					phoneSocialLoopIds.story.meeting,
					'blocked'
				)
			],
			-0.15,
			'После согласия встреча всё-таки была пропущена.'
		),
		echoMove(
			phoneSocialLoopIds.moves.declinedEcho,
			'Вспомнить, что от встречи отказался заранее',
			'a60-day3-declined:outcome',
			'Отказ остался спокойным решением, а не пропущенным обещанием',
			[
				knowsClaimGuard(
					'a60-day3-declined:declined',
					phoneSocialLoopIds.claims.meetingDeclined
				)
			],
			0,
			'Встречу отменили заранее, поэтому обещание не оказалось нарушено.'
		)
	];
}

export function create93DaysPhoneSocialLoopProject(): NarrativeProject {
	const project = create93DaysEverydaySystemsProject();
	project.projectId = '93-days-phone-social-loop-v1';
	project.name = '93 дня до конца нашего лета — телефон и первая встреча';

	project.locations = [
		...project.locations,
		{
			id: phoneSocialLoopIds.locations.dormCourtyard,
			name: 'Двор общежития'
		}
	];
	project.scenes = [
		...project.scenes,
		{
			id: 'a60-dorm-courtyard:scene',
			locationId: phoneSocialLoopIds.locations.dormCourtyard,
			name: 'Скамейки во дворе общежития'
		}
	];
	project.travelRoutes = [
		...(project.travelRoutes ?? []),
		{
			id: phoneSocialLoopIds.routes.dormToCourtyard,
			label: 'Выйти во двор общежития',
			originLocationId: arrivalCorridorIds.locations.studentDormitory,
			destinationLocationId: phoneSocialLoopIds.locations.dormCourtyard,
			durationMinutes: 2,
			mode: 'walk',
			physicalAction: 'walk'
		},
		{
			id: phoneSocialLoopIds.routes.courtyardToDorm,
			label: 'Вернуться в общежитие',
			originLocationId: phoneSocialLoopIds.locations.dormCourtyard,
			destinationLocationId: arrivalCorridorIds.locations.studentDormitory,
			durationMinutes: 2,
			mode: 'walk',
			physicalAction: 'walk'
		}
	];

	project.routineRules = [
		...project.routineRules,
		{
			id: 'a60-local-contact-evening-courtyard',
			characterId: contactId,
			behaviorProfileId: 'day1-local-contact-offscreen',
			activeRange: {fromDay: 2, toDay: 2},
			recurrence: {type: 'explicitDays', days: [2]},
			timeWindow: {
				type: 'exact',
				startMinute: 18 * 60 + 45,
				endMinute: 23 * 60
			},
			targetLocationId: phoneSocialLoopIds.locations.dormCourtyard
		}
	];

	project.claims = [
		...project.claims,
		{
			id: phoneSocialLoopIds.claims.meetingAccepted,
			text: 'Герой согласился встретиться вечером во дворе общежития.',
			stance: 'supports',
			tags: ['day-two', 'phone', 'meeting']
		},
		{
			id: phoneSocialLoopIds.claims.meetingDeclined,
			text: 'Герой заранее отказался от вечерней встречи.',
			stance: 'supports',
			tags: ['day-two', 'phone', 'meeting']
		}
	];

	project.storyNodes = [
		...project.storyNodes,
		{
			id: phoneSocialLoopIds.story.incomingSms,
			kind: 'event',
			title: 'Сообщение с записанного номера',
			description:
				'Утром второго дня приходит короткое SMS: вчера ответить не получилось, вечером можно встретиться во дворе общежития.',
			primaryCharacterId: contactId,
			participantIds: [playerId, contactId],
			placement: {day: 2, minuteOfDay: 10 * 60 + 30},
			activationState: 'available',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 0,
				interruption: 'interruptible'
			}
		},
		{
			id: phoneSocialLoopIds.story.reply,
			kind: 'dialogue',
			title: 'Ответить на утреннее сообщение',
			description:
				'После прочтения сообщения можно согласиться на встречу или отказаться заранее.',
			primaryCharacterId: playerId,
			participantIds: [playerId, contactId],
			activationState: 'available'
		},
		{
			id: phoneSocialLoopIds.story.meeting,
			kind: 'event',
			title: 'Вечерняя встреча во дворе',
			description:
				'Договорённость не требует прихода ровно в одну минуту: во дворе ждут несколько часов.',
			primaryCharacterId: contactId,
			participantIds: [playerId, contactId],
			placement: {
				day: 2,
				minuteOfDay: 19 * 60,
				locationId: phoneSocialLoopIds.locations.dormCourtyard
			},
			activationState: 'dormant',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 30,
				missAfterMinutes: 4 * 60,
				interruption: 'interruptible'
			}
		},
		{
			id: phoneSocialLoopIds.story.dayThreeEcho,
			kind: 'beat',
			title: 'Что осталось от вчерашней договорённости',
			description:
				'На следующий день становится понятно, чем для отношений оказались встреча, пропуск или заранее сказанный отказ.',
			primaryCharacterId: playerId,
			participantIds: [playerId],
			placement: {day: 3, minuteOfDay: 7 * 60 + 30},
			activationState: 'available'
		}
	];

	project.narrativeMoves = [
		...project.narrativeMoves,
		...replyMoves(),
		...dayThreeMoves()
	];

	return project;
}
