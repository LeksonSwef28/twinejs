import {NarrativeMoveDefinition} from '../interaction';
import {NarrativeProject} from '../project';
import {arrivalCorridorIds, create93DaysArrivalCorridorProject} from './93-days-arrival-corridor';

export const dayOneNarrativeIds = {
	characters: {
		localContact: 'day1-local-contact',
		dormResident: 'day1-dorm-resident'
	},
	facts: {
		towerRouteExists: 'day1-fact-tower-route-exists'
	},
	claims: {
		destinationNearTower: 'day1-claim-destination-near-tower',
		contactUnavailable: 'day1-claim-contact-unavailable',
		towerUsefulLandmark: 'day1-claim-tower-useful-landmark',
		towerTransferRoute: 'day1-claim-tower-transfer-route'
	},
	story: {
		callContact: 'day1-call-contact',
		clerkOpening: 'day1-clerk-opening',
		clerkFollowup: 'day1-clerk-followup',
		stationOpportunity: 'day1-station-opportunity',
		dormNpcOccurrence: 'day1-dorm-npc-occurrence',
		dayTwoMorning: 'day2-morning-reflection'
	},
	moves: {
		callContact: 'day1-call-contact:move',
		askTowerPolitely: 'day1-clerk-opening:ask-tower-politely',
		showApproximateClue: 'day1-clerk-opening:show-clue',
		askAbruptly: 'day1-clerk-opening:ask-abruptly',
		clarifyTransfer: 'day1-clerk-followup:clarify-transfer',
		thankAndLeave: 'day1-clerk-followup:thank-and-leave',
		dayTwoKnownRoute: 'day2-morning:known-route',
		dayTwoUnknownRoute: 'day2-morning:unknown-route',
		dayTwoSawOpportunity: 'day2-morning:saw-opportunity',
		dayTwoMissedOpportunity: 'day2-morning:missed-opportunity'
	}
} as const;

function storyStateEffect(
	id: string,
	storyNodeId: string,
	state: 'available' | 'completed'
) {
	return {
		id,
		type: 'story-node-set-state' as const,
		storyNodeId,
		state
	};
}

function completeAndOpenFollowup(prefix: string) {
	return [
		storyStateEffect(
			`${prefix}:complete-opening`,
			dayOneNarrativeIds.story.clerkOpening,
			'completed'
		),
		storyStateEffect(
			`${prefix}:open-followup`,
			dayOneNarrativeIds.story.clerkFollowup,
			'available'
		)
	];
}

function samePlaceGuard(id: string, otherCharacterId: string) {
	return {
		id,
		label: 'Персонажи должны находиться рядом',
		condition: {
			type: 'characters-share-location' as const,
			characterIds: [arrivalCorridorIds.characters.player, otherCharacterId]
		}
	};
}

function clerkOpeningMoves(): NarrativeMoveDefinition[] {
	const clerk = arrivalCorridorIds.characters.stationClerk;
	const player = arrivalCorridorIds.characters.player;
	return [
		{
			id: dayOneNarrativeIds.moves.askTowerPolitely,
			storyNodeId: dayOneNarrativeIds.story.clerkOpening,
			kind: 'ask',
			label: 'Вежливо спросить про водонапорную башню',
			actorCharacterId: player,
			targetCharacterIds: [clerk],
			guards: [samePlaceGuard('day1-clerk-polite:same-place', clerk)],
			resolution: {
				type: 'automatic',
				outcomeId: 'day1-clerk-polite:answer'
			},
			outcomes: [
				{
					id: 'day1-clerk-polite:answer',
					key: 'continue',
					label: 'Кассир спокойно объясняет ориентир',
					effectStoryNodeIds: [],
					effects: [
						{
							id: 'day1-clerk-polite:learn-landmark',
							type: 'character-learns-claim',
							recipient: {type: 'character', characterId: player},
							claim: {
								type: 'claim',
								claimId: dayOneNarrativeIds.claims.towerUsefulLandmark
							},
							attitude: 'believes',
							confidence: 0.82,
							source: {type: 'observed'}
						},
						{
							id: 'day1-clerk-polite:goodwill',
							type: 'relationship-adjust',
							from: {type: 'character', characterId: clerk},
							to: {type: 'move-actor'},
							axis: 'goodwill',
							delta: 0.15
						},
						{
							id: 'day1-clerk-polite:memory',
							type: 'character-remembers',
							character: {type: 'move-actor'},
							summary:
								'Кассир на автовокзале спокойно объяснила, что башня годится как ориентир.',
							importance: 0.45,
							baseStrength: 0.55,
							tags: ['day-one', 'route', 'station-clerk'],
							source: {type: 'current-move'}
						},
						...completeAndOpenFollowup('day1-clerk-polite')
					]
				}
			]
		},
		{
			id: dayOneNarrativeIds.moves.showApproximateClue,
			storyNodeId: dayOneNarrativeIds.story.clerkOpening,
			kind: 'ask',
			label: 'Показать записанный ориентир и попросить разобраться',
			actorCharacterId: player,
			targetCharacterIds: [clerk],
			guards: [samePlaceGuard('day1-clerk-clue:same-place', clerk)],
			resolution: {
				type: 'automatic',
				outcomeId: 'day1-clerk-clue:answer'
			},
			outcomes: [
				{
					id: 'day1-clerk-clue:answer',
					key: 'continue',
					label: 'Кассир связывает запись с дорогой через башню',
					effectStoryNodeIds: [],
					effects: [
						{
							id: 'day1-clerk-clue:learn-landmark',
							type: 'character-learns-claim',
							recipient: {type: 'character', characterId: player},
							claim: {
								type: 'claim',
								claimId: dayOneNarrativeIds.claims.towerUsefulLandmark
							},
							attitude: 'believes',
							confidence: 0.9,
							source: {type: 'observed'}
						},
						{
							id: 'day1-clerk-clue:goodwill',
							type: 'relationship-adjust',
							from: {type: 'character', characterId: clerk},
							to: {type: 'move-actor'},
							axis: 'goodwill',
							delta: 0.2
						},
						...completeAndOpenFollowup('day1-clerk-clue')
					]
				}
			]
		},
		{
			id: dayOneNarrativeIds.moves.askAbruptly,
			storyNodeId: dayOneNarrativeIds.story.clerkOpening,
			kind: 'ask',
			label: 'Резко спросить, как быстрее добраться до общежития',
			actorCharacterId: player,
			targetCharacterIds: [clerk],
			guards: [samePlaceGuard('day1-clerk-abrupt:same-place', clerk)],
			resolution: {
				type: 'automatic',
				outcomeId: 'day1-clerk-abrupt:answer'
			},
			outcomes: [
				{
					id: 'day1-clerk-abrupt:answer',
					key: 'continue',
					label: 'Кассир отвечает коротко и без подробностей',
					effectStoryNodeIds: [],
					effects: [
						{
							id: 'day1-clerk-abrupt:learn-landmark',
							type: 'character-learns-claim',
							recipient: {type: 'character', characterId: player},
							claim: {
								type: 'claim',
								claimId: dayOneNarrativeIds.claims.towerUsefulLandmark
							},
							attitude: 'believes',
							confidence: 0.62,
							source: {type: 'observed'}
						},
						{
							id: 'day1-clerk-abrupt:goodwill',
							type: 'relationship-adjust',
							from: {type: 'character', characterId: clerk},
							to: {type: 'move-actor'},
							axis: 'goodwill',
							delta: -0.15
						},
						...completeAndOpenFollowup('day1-clerk-abrupt')
					]
				}
			]
		}
	];
}

function clerkFollowupMoves(): NarrativeMoveDefinition[] {
	const clerk = arrivalCorridorIds.characters.stationClerk;
	const player = arrivalCorridorIds.characters.player;
	return [
		{
			id: dayOneNarrativeIds.moves.clarifyTransfer,
			storyNodeId: dayOneNarrativeIds.story.clerkFollowup,
			kind: 'ask',
			label: 'Уточнить, где пересаживаться после башни',
			actorCharacterId: player,
			targetCharacterIds: [clerk],
			guards: [samePlaceGuard('day1-clerk-followup:same-place', clerk)],
			resolution: {
				type: 'automatic',
				outcomeId: 'day1-clerk-followup:route'
			},
			outcomes: [
				{
					id: 'day1-clerk-followup:route',
					key: 'continue',
					label: 'Теперь маршрут через башню складывается в понятную цепочку',
					effectStoryNodeIds: [],
					effects: [
						{
							id: 'day1-clerk-followup:learn-transfer',
							type: 'character-learns-claim',
							recipient: {type: 'character', characterId: player},
							claim: {
								type: 'claim',
								claimId: dayOneNarrativeIds.claims.towerTransferRoute
							},
							attitude: 'believes',
							confidence: 0.9,
							source: {type: 'observed'}
						},
						{
							id: 'day1-clerk-followup:goodwill',
							type: 'relationship-adjust',
							from: {type: 'character', characterId: clerk},
							to: {type: 'move-actor'},
							axis: 'goodwill',
							delta: 0.05
						},
						{
							id: 'day1-clerk-followup:memory',
							type: 'character-remembers',
							character: {type: 'move-actor'},
							summary:
								'После второго вопроса маршрут через башню стал понятнее.',
							importance: 0.5,
							baseStrength: 0.6,
							tags: ['day-one', 'route', 'transfer'],
							source: {type: 'current-move'}
						},
						storyStateEffect(
							'day1-clerk-followup:complete',
							dayOneNarrativeIds.story.clerkFollowup,
							'completed'
						)
					]
				}
			]
		},
		{
			id: dayOneNarrativeIds.moves.thankAndLeave,
			storyNodeId: dayOneNarrativeIds.story.clerkFollowup,
			kind: 'leave',
			label: 'Поблагодарить и не задерживать кассира',
			actorCharacterId: player,
			targetCharacterIds: [clerk],
			guards: [samePlaceGuard('day1-clerk-thanks:same-place', clerk)],
			resolution: {
				type: 'automatic',
				outcomeId: 'day1-clerk-thanks:leave'
			},
			outcomes: [
				{
					id: 'day1-clerk-thanks:leave',
					key: 'continue',
					label: 'Кассир кивает и возвращается к работе',
					effectStoryNodeIds: [],
					effects: [
						{
							id: 'day1-clerk-thanks:goodwill',
							type: 'relationship-adjust',
							from: {type: 'character', characterId: clerk},
							to: {type: 'move-actor'},
							axis: 'goodwill',
							delta: 0.1
						},
						storyStateEffect(
							'day1-clerk-thanks:complete',
							dayOneNarrativeIds.story.clerkFollowup,
							'completed'
						)
					]
				}
			]
		}
	];
}

function dayTwoMoves(): NarrativeMoveDefinition[] {
	const player = arrivalCorridorIds.characters.player;
	const storyNodeId = dayOneNarrativeIds.story.dayTwoMorning;
	return [
		{
			id: dayOneNarrativeIds.moves.dayTwoKnownRoute,
			storyNodeId,
			kind: 'observe',
			label: 'Вспомнить точный совет кассира',
			actorCharacterId: player,
			targetCharacterIds: [],
			guards: [
				{
					id: 'day2-known-route:guard',
					condition: {
						type: 'character-knows-claim',
						characterId: player,
						claimId: dayOneNarrativeIds.claims.towerTransferRoute
					}
				}
			],
			resolution: {
				type: 'automatic',
				outcomeId: 'day2-known-route:outcome'
			},
			outcomes: [
				{
					id: 'day2-known-route:outcome',
					key: 'continue',
					label: 'Вчерашняя дорога уже ощущается знакомее',
					effectStoryNodeIds: [],
					effects: []
				}
			]
		},
		{
			id: dayOneNarrativeIds.moves.dayTwoUnknownRoute,
			storyNodeId,
			kind: 'observe',
			label: 'Признать, что маршрут всё ещё помнится смутно',
			actorCharacterId: player,
			targetCharacterIds: [],
			guards: [
				{
					id: 'day2-unknown-route:guard',
					negated: true,
					condition: {
						type: 'character-knows-claim',
						characterId: player,
						claimId: dayOneNarrativeIds.claims.towerTransferRoute
					}
				}
			],
			resolution: {
				type: 'automatic',
				outcomeId: 'day2-unknown-route:outcome'
			},
			outcomes: [
				{
					id: 'day2-unknown-route:outcome',
					key: 'continue',
					label: 'На второй день город всё ещё приходится собирать по кускам',
					effectStoryNodeIds: [],
					effects: []
				}
			]
		},
		{
			id: dayOneNarrativeIds.moves.dayTwoSawOpportunity,
			storyNodeId,
			kind: 'observe',
			label: 'Вспомнить утреннее объявление на вокзале',
			actorCharacterId: player,
			targetCharacterIds: [],
			guards: [
				{
					id: 'day2-saw-opportunity:guard',
					condition: {
						type: 'story-node-state',
						storyNodeId: dayOneNarrativeIds.story.stationOpportunity,
						state: 'completed'
					}
				}
			],
			resolution: {
				type: 'automatic',
				outcomeId: 'day2-saw-opportunity:outcome'
			},
			outcomes: [
				{
					id: 'day2-saw-opportunity:outcome',
					key: 'continue',
					label: 'Один маленький фрагмент первого утра остался в памяти',
					effectStoryNodeIds: [],
					effects: []
				}
			]
		},
		{
			id: dayOneNarrativeIds.moves.dayTwoMissedOpportunity,
			storyNodeId,
			kind: 'observe',
			label: 'Поймать ощущение, что утром на вокзале что-то прошло мимо',
			actorCharacterId: player,
			targetCharacterIds: [],
			guards: [
				{
					id: 'day2-missed-opportunity:guard',
					condition: {
						type: 'story-node-state',
						storyNodeId: dayOneNarrativeIds.story.stationOpportunity,
						state: 'blocked'
					}
				}
			],
			resolution: {
				type: 'automatic',
				outcomeId: 'day2-missed-opportunity:outcome'
			},
			outcomes: [
				{
					id: 'day2-missed-opportunity:outcome',
					key: 'continue',
					label: 'Первое утро уже содержит маленький пробел',
					effectStoryNodeIds: [],
					effects: []
				}
			]
		}
	];
}

export function create93DaysDayOneDayTwoProject(): NarrativeProject {
	const project = create93DaysArrivalCorridorProject();
	project.projectId = '93-days-day-one-day-two-v1';
	project.name = '93 дня до конца нашего лета — День 1 → День 2';

	project.characters = [
		...project.characters,
		{
			id: dayOneNarrativeIds.characters.localContact,
			name: 'Контакт по записанному номеру',
			cognitionTier: 'light',
			defaultBehaviorProfileId: 'day1-local-contact-offscreen'
		},
		{
			id: dayOneNarrativeIds.characters.dormResident,
			name: 'Жилец общежития',
			cognitionTier: 'light',
			defaultBehaviorProfileId: 'day1-dorm-resident-evening'
		}
	];

	project.behaviorProfiles = [
		...project.behaviorProfiles,
		{
			id: 'day1-local-contact-offscreen',
			characterId: dayOneNarrativeIds.characters.localContact,
			name: 'Вне стартовой сцены'
		},
		{
			id: 'day1-dorm-resident-evening',
			characterId: dayOneNarrativeIds.characters.dormResident,
			name: 'Вечер в общежитии'
		}
	];

	project.routineRules = [
		...project.routineRules,
		{
			id: 'day1-dorm-resident-evening',
			characterId: dayOneNarrativeIds.characters.dormResident,
			behaviorProfileId: 'day1-dorm-resident-evening',
			activeRange: {fromDay: 1, toDay: 93},
			recurrence: {type: 'everyDay'},
			timeWindow: {type: 'exact', startMinute: 17 * 60, endMinute: 23 * 60},
			targetLocationId: arrivalCorridorIds.locations.studentDormitory
		}
	];

	project.objectiveFacts = [
		...project.objectiveFacts,
		{
			id: dayOneNarrativeIds.facts.towerRouteExists,
			title: 'Маршрут через водонапорную башню существует',
			description:
				'В authored Arrival Corridor остановка связана с башней, а башня — с общежитием.',
			tags: ['route', 'tower', 'day-one']
		}
	];

	project.claims = [
		...project.claims,
		{
			id: dayOneNarrativeIds.claims.destinationNearTower,
			text: 'Нужное место связано с районом или ориентиром у водонапорной башни.',
			stance: 'unresolved',
			tags: ['starting-clue', 'route']
		},
		{
			id: dayOneNarrativeIds.claims.contactUnavailable,
			text: 'Человек по записанному номеру сейчас не отвечает.',
			stance: 'unresolved',
			tags: ['contact', 'phone', 'day-one']
		},
		{
			id: dayOneNarrativeIds.claims.towerUsefulLandmark,
			text: 'Водонапорная башня — полезный ориентир на пути к нужному месту.',
			aboutFactId: dayOneNarrativeIds.facts.towerRouteExists,
			stance: 'supports',
			tags: ['route', 'tower']
		},
		{
			id: dayOneNarrativeIds.claims.towerTransferRoute,
			text: 'От остановки у автовокзала можно доехать к башне, а оттуда продолжить путь к общежитию.',
			aboutFactId: dayOneNarrativeIds.facts.towerRouteExists,
			stance: 'supports',
			tags: ['route', 'transfer', 'tower']
		}
	];

	project.initialKnowledge = [
		...project.initialKnowledge,
		{
			id: 'day1-starting-clue',
			characterId: arrivalCorridorIds.characters.player,
			claimId: dayOneNarrativeIds.claims.destinationNearTower,
			attitude: 'believes',
			confidence: 0.55,
			source: {type: 'authored'}
		}
	];

	project.storyNodes = [
		...project.storyNodes,
		{
			id: dayOneNarrativeIds.story.callContact,
			kind: 'event',
			title: 'Первый звонок после приезда',
			description:
				'Герой пробует дозвониться по записанному номеру. Никто не отвечает.',
			primaryCharacterId: arrivalCorridorIds.characters.player,
			participantIds: [
				arrivalCorridorIds.characters.player,
				dayOneNarrativeIds.characters.localContact
			],
			placement: {
				locationId: arrivalCorridorIds.locations.busStation
			},
			activationState: 'available'
		},
		{
			id: dayOneNarrativeIds.story.clerkOpening,
			kind: 'dialogue',
			title: 'Спросить дорогу у кассира',
			description:
				'Первый полноценный разговор о том, как связать записанный ориентир с реальным городом.',
			primaryCharacterId: arrivalCorridorIds.characters.stationClerk,
			participantIds: [
				arrivalCorridorIds.characters.player,
				arrivalCorridorIds.characters.stationClerk
			],
			placement: {
				locationId: arrivalCorridorIds.locations.busStation
			},
			activationState: 'available'
		},
		{
			id: dayOneNarrativeIds.story.clerkFollowup,
			kind: 'dialogue',
			title: 'Уточнить или закончить разговор',
			primaryCharacterId: arrivalCorridorIds.characters.stationClerk,
			participantIds: [
				arrivalCorridorIds.characters.player,
				arrivalCorridorIds.characters.stationClerk
			],
			placement: {
				locationId: arrivalCorridorIds.locations.busStation
			},
			activationState: 'dormant'
		},
		{
			id: dayOneNarrativeIds.story.stationOpportunity,
			kind: 'event',
			title: 'Короткое утреннее объявление на вокзале',
			description:
				'Небольшая возможность заметить ещё один фрагмент жизни вокзала. Её можно пропустить без провала прохождения.',
			primaryCharacterId: arrivalCorridorIds.characters.player,
			participantIds: [arrivalCorridorIds.characters.player],
			placement: {
				day: 1,
				minuteOfDay: 6 * 60 + 10,
				locationId: arrivalCorridorIds.locations.busStation
			},
			activationState: 'available',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 0,
				missAfterMinutes: 10,
				interruption: 'interruptible'
			}
		},
		{
			id: dayOneNarrativeIds.story.dormNpcOccurrence,
			kind: 'event',
			title: 'Разговор у вахты без героя',
			description:
				'Дежурная и жилец общежития коротко обсуждают бытовой вопрос, пока герой может находиться в другой части города.',
			primaryCharacterId: arrivalCorridorIds.characters.dormDuty,
			participantIds: [
				arrivalCorridorIds.characters.dormDuty,
				dayOneNarrativeIds.characters.dormResident
			],
			placement: {
				day: 1,
				minuteOfDay: 18 * 60,
				locationId: arrivalCorridorIds.locations.studentDormitory
			},
			activationState: 'available',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 0,
				interruption: 'interruptible'
			}
		},
		{
			id: dayOneNarrativeIds.story.dayTwoMorning,
			kind: 'beat',
			title: 'Первое утро после приезда',
			description:
				'Утро второго дня показывает, что вчерашние знания и пропущенные мелочи уже стали частью конкретной истории.',
			primaryCharacterId: arrivalCorridorIds.characters.player,
			participantIds: [arrivalCorridorIds.characters.player],
			placement: {
				day: 2,
				minuteOfDay: 7 * 60 + 30,
				locationId: arrivalCorridorIds.locations.studentDormitory
			},
			activationState: 'available'
		}
	];

	project.narrativeMoves = [
		...project.narrativeMoves,
		{
			id: dayOneNarrativeIds.moves.callContact,
			storyNodeId: dayOneNarrativeIds.story.callContact,
			kind: 'custom',
			label: 'Позвонить по записанному номеру',
			actorCharacterId: arrivalCorridorIds.characters.player,
			targetCharacterIds: [dayOneNarrativeIds.characters.localContact],
			communicatedClaimId: dayOneNarrativeIds.claims.contactUnavailable,
			communicationIntent: 'uncertain',
			guards: [
				{
					id: 'day1-call:has-phone',
					condition: {
						type: 'character-has-item',
						characterId: arrivalCorridorIds.characters.player,
						itemInstanceId: arrivalCorridorIds.items.buttonPhone
					}
				}
			],
			resolution: {
				type: 'automatic',
				outcomeId: 'day1-call:no-answer'
			},
			outcomes: [
				{
					id: 'day1-call:no-answer',
					key: 'continue',
					label: 'Длинные гудки. Никто не отвечает.',
					effectStoryNodeIds: [],
					effects: [
						{
							id: 'day1-call:learn-unavailable',
							type: 'character-learns-claim',
							recipient: {
								type: 'character',
								characterId: arrivalCorridorIds.characters.player
							},
							claim: {
								type: 'claim',
								claimId: dayOneNarrativeIds.claims.contactUnavailable
							},
							attitude: 'believes',
							confidence: 0.95,
							source: {type: 'observed'}
						},
						{
							id: 'day1-call:memory',
							type: 'character-remembers',
							character: {type: 'move-actor'},
							summary:
								'Первый звонок после приезда остался без ответа, и никто не вышел встречать.',
							importance: 0.65,
							baseStrength: 0.7,
							tags: ['day-one', 'arrival', 'phone', 'alone'],
							source: {type: 'current-move'}
						},
						storyStateEffect(
							'day1-call:complete',
							dayOneNarrativeIds.story.callContact,
							'completed'
						)
					]
				}
			]
		},
		...clerkOpeningMoves(),
		...clerkFollowupMoves(),
		...dayTwoMoves()
	];

	return project;
}
