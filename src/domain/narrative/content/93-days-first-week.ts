import {NarrativeMoveDefinition} from '../interaction';
import {NarrativeProject} from '../project';
import {arrivalCorridorIds} from './93-days-arrival-corridor';
import {phoneSocialLoopIds} from './93-days-phone-social-loop';
import {create93DaysPlayerNpcSocialDeliveryProject} from './93-days-player-npc-social-delivery';
import {rumorSocialEchoIds} from './93-days-rumor-social-echo';

export const firstWeekProjectId = '93-days-first-week-v1';

export const firstWeekIds = {
	locations: {
		oldMarket: 'a67-old-market',
		oldCinema: 'a67-old-cinema'
	},
	scenes: {
		oldMarket: 'a67-old-market:scene',
		oldCinema: 'a67-old-cinema:scene'
	},
	characters: {
		cameraStudent: 'a67-camera-student'
	},
	behaviorProfiles: {
		cameraStudent: 'a67-camera-student-week'
	},
	routines: {
		cameraStudentMarket: 'a67-camera-student-market',
		cameraStudentCinema: 'a67-camera-student-cinema'
	},
	routes: {
		dormToMarketBus: 'a67-route-dorm-market-bus',
		marketToDormBus: 'a67-route-market-dorm-bus',
		marketToCinemaWalk: 'a67-route-market-cinema-walk',
		cinemaToMarketWalk: 'a67-route-cinema-market-walk'
	},
	claims: {
		cinemaInvitation: 'a67-claim-cinema-invitation',
		cinemaFutureContested: 'a67-claim-cinema-future-contested',
		cinemaAftermath: 'a67-claim-cinema-aftermath',
		dormEveningContinuation: 'a67-claim-dorm-evening-continuation'
	},
	moves: {
		marketKept: 'a67-day5-market:kept-history',
		marketMissed: 'a67-day5-market:missed-history',
		marketDeclined: 'a67-day5-market:declined-history',
		cinemaStay: 'a67-day6-cinema:stay',
		cameraCinemaAftermath: 'a67-day6-cinema:aftermath',
		dormStay: 'a67-day6-dorm:stay',
		learnCinemaAftermath: 'a67-day7-market:aftermath',
		weekOldCity: 'a67-day7-week:old-city',
		weekDorm: 'a67-day7-week:dorm'
	},
	story: {
		dayFiveCameraArrival: 'a67-day5-camera-arrival',
		dayFiveMarketIntroduction: 'a67-day5-market-introduction',
		daySixCameraArrival: 'a67-day6-camera-arrival',
		daySixCinema: 'a67-day6-cinema',
		daySixDormCounterline: 'a67-day6-dorm-counterline',
		daySixCinemaAftermath: 'a67-day6-cinema-aftermath',
		daySevenWeekEcho: 'a67-day7-week-echo',
		daySevenCameraArrival: 'a67-day7-camera-arrival',
		daySevenMarketAftermath: 'a67-day7-market-aftermath'
	}
} as const;


const playerId = arrivalCorridorIds.characters.player;
const dormDutyId = arrivalCorridorIds.characters.dormDuty;

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

function knowsClaimGuard(id: string, characterId: string, claimId: string) {
	return {
		id,
		condition: {
			type: 'character-knows-claim' as const,
			characterId,
			claimId
		}
	};
}

function doesNotKnowClaimGuard(id: string, characterId: string, claimId: string) {
	return {
		...knowsClaimGuard(id, characterId, claimId),
		negated: true
	};
}

function dayFiveHistoryMove(
	id: string,
	label: string,
	communicatedClaimId: string,
	historyGuards: NarrativeMoveDefinition['guards'],
	memorySummary: string
): NarrativeMoveDefinition {
	const ids = firstWeekIds;
	const outcomeId = id + ':outcome';
	return {
		id,
		storyNodeId: ids.story.dayFiveMarketIntroduction,
		kind: 'inform',
		label,
		actorCharacterId: playerId,
		targetCharacterIds: [ids.characters.cameraStudent],
		communicatedClaimId,
		communicationIntent: 'honest',
		guards: [
			storyStateGuard(
				id + ':market-active',
				ids.story.dayFiveMarketIntroduction,
				'active'
			),
			doesNotKnowClaimGuard(
				id + ':new-to-camera-student',
				ids.characters.cameraStudent,
				communicatedClaimId
			),
			...historyGuards
		],
		resolution: {type: 'automatic', outcomeId},
		outcomes: [
			{
				id: outcomeId,
				key: 'continue',
				label: 'Разговор связывает первые дни в городе с новым знакомством.',
				effectStoryNodeIds: [ids.story.daySixCinema],
				effects: [
					{
						id: id + ':share-history',
						type: 'character-learns-claim',
						recipient: {type: 'move-target', targetIndex: 0},
						claim: {type: 'communicated-claim'},
						attitude: 'believes',
						confidence: 0.78,
						source: {type: 'move-actor'}
					},
					{
						id: id + ':learn-invitation',
						type: 'character-learns-claim',
						recipient: {type: 'character', characterId: playerId},
						claim: {type: 'claim', claimId: ids.claims.cinemaInvitation},
						attitude: 'believes',
						confidence: 0.9,
						source: {type: 'observed'}
					},
					{
						id: id + ':familiarity',
						type: 'relationship-adjust',
						from: {
							type: 'character',
							characterId: ids.characters.cameraStudent
						},
						to: {type: 'move-actor'},
						axis: 'familiarity',
						delta: 0.08
					},
					{
						id: id + ':player-memory',
						type: 'character-remembers',
						character: {type: 'move-actor'},
						summary: memorySummary,
						importance: 0.52,
						baseStrength: 0.58,
						tags: ['day-five', 'old-city', 'market', 'new-contact'],
						source: {type: 'current-move'}
					},
					{
						id: id + ':camera-memory',
						type: 'character-remembers',
						character: {type: 'move-target', targetIndex: 0},
						summary:
							'Новенький сам рассказал, как у него сложилась одна из первых договорённостей в городе.',
						importance: 0.42,
						baseStrength: 0.5,
						tags: ['day-five', 'market', 'new-arrival', 'firsthand'],
						source: {type: 'communicated-claim'}
					},
					{
						id: id + ':open-cinema',
						type: 'story-node-set-state',
						storyNodeId: ids.story.daySixCinema,
						state: 'available'
					}
				]
			}
		]
	};
}

function dayFiveMarketMoves(): NarrativeMoveDefinition[] {
	const ids = firstWeekIds;
	return [
		dayFiveHistoryMove(
			ids.moves.marketKept,
			'Рассказать, что на первую договорённость всё-таки пришёл',
			rumorSocialEchoIds.claims.keptMeeting,
			[
				knowsClaimGuard(
					ids.moves.marketKept + ':accepted',
					playerId,
					phoneSocialLoopIds.claims.meetingAccepted
				),
				storyStateGuard(
					ids.moves.marketKept + ':meeting',
					phoneSocialLoopIds.story.meeting,
					'completed'
				)
			],
			'На старом рынке разговор о первых днях в городе неожиданно привёл к приглашению заглянуть завтра к старому кинотеатру.'
		),
		dayFiveHistoryMove(
			ids.moves.marketMissed,
			'Не приукрашивать: рассказать о пропущенной встрече',
			rumorSocialEchoIds.claims.missedMeeting,
			[
				knowsClaimGuard(
					ids.moves.marketMissed + ':accepted',
					playerId,
					phoneSocialLoopIds.claims.meetingAccepted
				),
				storyStateGuard(
					ids.moves.marketMissed + ':meeting',
					phoneSocialLoopIds.story.meeting,
					'blocked'
				)
			],
			'На старом рынке я не стал делать вид, будто первые дни прошли идеально. Разговор всё равно закончился приглашением к старому кинотеатру.'
		),
		dayFiveHistoryMove(
			ids.moves.marketDeclined,
			'Сказать, что тогда отказался заранее, а не исчез',
			rumorSocialEchoIds.claims.declinedMeeting,
			[
				knowsClaimGuard(
					ids.moves.marketDeclined + ':declined',
					playerId,
					phoneSocialLoopIds.claims.meetingDeclined
				),
				storyStateGuard(
					ids.moves.marketDeclined + ':meeting',
					phoneSocialLoopIds.story.meeting,
					'blocked'
				)
			],
			'На старом рынке я рассказал, что одну из первых встреч отменил заранее. Новый разговор оказался проще старого слуха и привёл к приглашению к кинотеатру.'
		)
	];
}

function daySixCinemaMove(): NarrativeMoveDefinition {
	const ids = firstWeekIds;
	const id = ids.moves.cinemaStay;
	return {
		id,
		storyNodeId: ids.story.daySixCinema,
		kind: 'observe',
		label: 'Остаться и выслушать спор о будущем кинотеатра',
		actorCharacterId: playerId,
		targetCharacterIds: [ids.characters.cameraStudent],
		guards: [
			storyStateGuard(id + ':cinema-active', ids.story.daySixCinema, 'active'),
			knowsClaimGuard(
				id + ':invited',
				playerId,
				ids.claims.cinemaInvitation
			),
			doesNotKnowClaimGuard(
				id + ':new-information',
				playerId,
				ids.claims.cinemaFutureContested
			)
		],
		resolution: {type: 'automatic', outcomeId: id + ':outcome'},
		outcomes: [
			{
				id: id + ':outcome',
				key: 'old-city',
				label:
					'Игрок видит, что спор о старом здании состоит из нескольких нормальных человеческих интересов.',
				effectStoryNodeIds: [ids.story.daySevenWeekEcho],
				effects: [
					{
						id: id + ':learn',
						type: 'character-learns-claim',
						recipient: {type: 'character', characterId: playerId},
						claim: {
							type: 'claim',
							claimId: ids.claims.cinemaFutureContested
						},
						attitude: 'believes',
						confidence: 0.92,
						source: {type: 'observed'}
					},
					{
						id: id + ':familiarity',
						type: 'relationship-adjust',
						from: {
							type: 'character',
							characterId: ids.characters.cameraStudent
						},
						to: {type: 'move-actor'},
						axis: 'familiarity',
						delta: 0.1
					},
					{
						id: id + ':memory',
						type: 'character-remembers',
						character: {type: 'move-actor'},
						summary:
							'У старого кинотеатра спорили не о том, хорошее прошлое или плохое будущее, а о работе, безопасности, памяти и том, кому вообще принадлежит это место.',
						importance: 0.7,
						baseStrength: 0.72,
						tags: ['day-six', 'old-city', 'cinema', 'city-change'],
						source: {type: 'current-move'}
					},
					{
						id: id + ':block-dorm',
						type: 'story-node-set-state',
						storyNodeId: ids.story.daySixDormCounterline,
						state: 'blocked'
					},
					{
						id: id + ':open-week-echo',
						type: 'story-node-set-state',
						storyNodeId: ids.story.daySevenWeekEcho,
						state: 'available'
					}
				]
			}
		]
	};
}

function daySixDormMove(): NarrativeMoveDefinition {
	const ids = firstWeekIds;
	const id = ids.moves.dormStay;
	return {
		id,
		storyNodeId: ids.story.daySixDormCounterline,
		kind: 'observe',
		label: 'Остаться в общежитии и продолжить знакомый разговор',
		actorCharacterId: playerId,
		targetCharacterIds: [dormDutyId],
		guards: [
			storyStateGuard(
				id + ':dorm-active',
				ids.story.daySixDormCounterline,
				'active'
			),
			doesNotKnowClaimGuard(
				id + ':new-information',
				playerId,
				ids.claims.dormEveningContinuation
			)
		],
		resolution: {type: 'automatic', outcomeId: id + ':outcome'},
		outcomes: [
			{
				id: id + ':outcome',
				key: 'dorm',
				label:
					'Знакомая линия общежития продолжается вместо поездки в Старый город.',
				effectStoryNodeIds: [ids.story.daySevenWeekEcho],
				effects: [
					{
						id: id + ':learn',
						type: 'character-learns-claim',
						recipient: {type: 'character', characterId: playerId},
						claim: {
							type: 'claim',
							claimId: ids.claims.dormEveningContinuation
						},
						attitude: 'believes',
						confidence: 0.95,
						source: {type: 'observed'}
					},
					{
						id: id + ':goodwill',
						type: 'relationship-adjust',
						from: {type: 'character', characterId: dormDutyId},
						to: {type: 'move-actor'},
						axis: 'goodwill',
						delta: 0.03
					},
					{
						id: id + ':memory',
						type: 'character-remembers',
						character: {type: 'move-actor'},
						summary:
							'Вечером я остался в общежитии. Разговор у вахты оказался маленьким продолжением уже накопившейся здесь истории.',
						importance: 0.58,
						baseStrength: 0.64,
						tags: ['day-six', 'dorm', 'social-continuity'],
						source: {type: 'current-move'}
					},
					{
						id: id + ':block-cinema',
						type: 'story-node-set-state',
						storyNodeId: ids.story.daySixCinema,
						state: 'blocked'
					},
					{
						id: id + ':open-week-echo',
						type: 'story-node-set-state',
						storyNodeId: ids.story.daySevenWeekEcho,
						state: 'available'
					}
				]
			}
		]
	};
}


function cameraCinemaAftermathMove(): NarrativeMoveDefinition {
	const ids = firstWeekIds;
	const id = ids.moves.cameraCinemaAftermath;
	return {
		id,
		storyNodeId: ids.story.daySixCinemaAftermath,
		kind: 'observe',
		label: 'Остаться после основного разговора и увидеть, чем закончился вечер',
		actorCharacterId: ids.characters.cameraStudent,
		targetCharacterIds: [],
		guards: [
			storyStateGuard(
				id + ':aftermath-available',
				ids.story.daySixCinemaAftermath,
				'available'
			),
			doesNotKnowClaimGuard(
				id + ':new-aftermath',
				ids.characters.cameraStudent,
				ids.claims.cinemaAftermath
			)
		],
		resolution: {type: 'automatic', outcomeId: id + ':outcome'},
		outcomes: [
			{
				id: id + ':outcome',
				key: 'observed',
				label:
					'После основной встречи спор не закончился: часть людей разошлась, а несколько человек остались договариваться о следующем разговоре.',
				effectStoryNodeIds: [ids.story.daySevenMarketAftermath],
				effects: [
					{
						id: id + ':learn',
						type: 'character-learns-claim',
						recipient: {
							type: 'character',
							characterId: ids.characters.cameraStudent
						},
						claim: {type: 'claim', claimId: ids.claims.cinemaAftermath},
						attitude: 'believes',
						confidence: 0.96,
						source: {type: 'observed'}
					},
					{
						id: id + ':memory',
						type: 'character-remembers',
						character: {
							type: 'character',
							characterId: ids.characters.cameraStudent
						},
						summary:
							'После основного разговора у старого кинотеатра несколько человек задержались и договорились продолжить обсуждение позже.',
						importance: 0.62,
						baseStrength: 0.68,
						tags: ['day-six', 'old-city', 'cinema', 'aftermath', 'npc-only'],
						source: {type: 'owning-story-node'}
					},
					{
						id: id + ':open-later-evidence',
						type: 'story-node-set-state',
						storyNodeId: ids.story.daySevenMarketAftermath,
						state: 'available'
					}
				]
			}
		]
	};
}

function daySevenMarketAftermathMove(): NarrativeMoveDefinition {
	const ids = firstWeekIds;
	const id = ids.moves.learnCinemaAftermath;
	return {
		id,
		storyNodeId: ids.story.daySevenMarketAftermath,
		kind: 'ask',
		label: 'Спросить, чем закончился вчерашний разговор у кинотеатра',
		actorCharacterId: playerId,
		targetCharacterIds: [ids.characters.cameraStudent],
		guards: [
			storyStateGuard(
				id + ':followup-active',
				ids.story.daySevenMarketAftermath,
				'active'
			),
			{
				id: id + ':same-place',
				condition: {
					type: 'characters-share-location',
					characterIds: [playerId, ids.characters.cameraStudent]
				}
			},
			doesNotKnowClaimGuard(
				id + ':new-to-player',
				playerId,
				ids.claims.cinemaAftermath
			)
		],
		resolution: {type: 'automatic', outcomeId: id + ':outcome'},
		outcomes: [
			{
				id: id + ':outcome',
				key: 'heard-later',
				label:
					'Пропущенная часть вечера всё равно стала частью истории: о ней можно узнать позже от человека, который там остался.',
				effectStoryNodeIds: [],
				effects: [
					{
						id: id + ':learn',
						type: 'character-learns-claim',
						recipient: {type: 'character', characterId: playerId},
						claim: {type: 'claim', claimId: ids.claims.cinemaAftermath},
						attitude: 'believes',
						confidence: 0.9,
						source: {type: 'observed'}
					},
					{
						id: id + ':memory',
						type: 'character-remembers',
						character: {type: 'move-actor'},
						summary:
							'На следующий день я узнал, что после основного разговора у кинотеатра люди ещё долго не расходились и договорились продолжить спор.',
						importance: 0.58,
						baseStrength: 0.64,
						tags: ['day-seven', 'old-city', 'missed-event', 'later-evidence'],
						source: {type: 'current-move'}
					}
				]
			}
		]
	};
}

function daySevenMoves(): NarrativeMoveDefinition[] {
	const ids = firstWeekIds;
	const branchMove = (
		id: string,
		label: string,
		claimId: string,
		memorySummary: string
	): NarrativeMoveDefinition => ({
		id,
		storyNodeId: ids.story.daySevenWeekEcho,
		kind: 'observe',
		label,
		actorCharacterId: playerId,
		targetCharacterIds: [],
		guards: [
			storyStateGuard(
				id + ':week-available',
				ids.story.daySevenWeekEcho,
				'available'
			),
			knowsClaimGuard(id + ':branch', playerId, claimId)
		],
		resolution: {type: 'automatic', outcomeId: id + ':outcome'},
		outcomes: [
			{
				id: id + ':outcome',
				key: 'reflect',
				label: memorySummary,
				effectStoryNodeIds: [],
				effects: [
					{
						id: id + ':memory',
						type: 'character-remembers',
						character: {type: 'move-actor'},
						summary: memorySummary,
						importance: 0.66,
						baseStrength: 0.7,
						tags: ['day-seven', 'first-week', 'reflection'],
						source: {type: 'owning-story-node'}
					},
					{
						id: id + ':complete-week',
						type: 'story-node-set-state',
						storyNodeId: ids.story.daySevenWeekEcho,
						state: 'completed'
					}
				]
			}
		]
	});
	return [
		branchMove(
			ids.moves.weekOldCity,
			'Подумать о том, как быстро город перестал быть только маршрутом',
			ids.claims.cinemaFutureContested,
			'К концу недели у города появилось лицо: старый рынок, кинотеатр и люди, которые спорят о будущем не как декорации, а как о своей жизни.'
		),
		branchMove(
			ids.moves.weekDorm,
			'Подумать о том, как общежитие стало первой своей точкой',
			ids.claims.dormEveningContinuation,
			'К концу недели общежитие перестало быть просто местом ночёвки: здесь уже помнят разговоры, решения и моё присутствие.'
		)
	];
}

/**
 * A67-W1 first-week production skeleton.
 *
 * This layer deliberately reuses the existing A63 runtime and authoring model.
 * It adds canonical content structure only: an Old City social hub, one NPC,
 * ordinary routines/routes, and Day 5-7 Story topology. Consequence/provenance
 * wiring is introduced in later A67 first-week slices.
 *
 * MASTER v31 treats the old market and old cinema as distinct Old City objects;
 * this builder keeps them distinct rather than inventing an unverified combined
 * square/location.
 */
export function create93DaysFirstWeekProject(): NarrativeProject {
	const project = create93DaysPlayerNpcSocialDeliveryProject();
	const ids = firstWeekIds;

	project.projectId = firstWeekProjectId;
	project.name = '93 дня до конца нашего лета — первая неделя';

	project.locations = [
		...project.locations,
		{id: ids.locations.oldMarket, name: 'Старый рынок'},
		{id: ids.locations.oldCinema, name: 'Старый кинотеатр'}
	];

	project.scenes = [
		...project.scenes,
		{
			id: ids.scenes.oldMarket,
			locationId: ids.locations.oldMarket,
			name: 'Торговые ряды старого рынка'
		},
		{
			id: ids.scenes.oldCinema,
			locationId: ids.locations.oldCinema,
			name: 'Вход и площадка у старого кинотеатра'
		}
	];

	project.characters = [
		...project.characters,
		{
			id: ids.characters.cameraStudent,
			name: 'Студентка с фотоаппаратом',
			cognitionTier: 'light',
			defaultBehaviorProfileId: ids.behaviorProfiles.cameraStudent
		}
	];

	project.behaviorProfiles = [
		...project.behaviorProfiles,
		{
			id: ids.behaviorProfiles.cameraStudent,
			characterId: ids.characters.cameraStudent,
			name: 'Учёба, Старый город и прогулки с фотоаппаратом'
		}
	];

	project.routineRules = [
		...project.routineRules,
		{
			id: ids.routines.cameraStudentMarket,
			characterId: ids.characters.cameraStudent,
			behaviorProfileId: ids.behaviorProfiles.cameraStudent,
			activeRange: {fromDay: 5, toDay: 7},
			recurrence: {type: 'explicitDays', days: [5, 7]},
			timeWindow: {type: 'exact', startMinute: 16 * 60, endMinute: 20 * 60},
			targetLocationId: ids.locations.oldMarket
		},
		{
			id: ids.routines.cameraStudentCinema,
			characterId: ids.characters.cameraStudent,
			behaviorProfileId: ids.behaviorProfiles.cameraStudent,
			activeRange: {fromDay: 6, toDay: 6},
			recurrence: {type: 'explicitDays', days: [6]},
			timeWindow: {type: 'exact', startMinute: 16 * 60, endMinute: 20 * 60},
			targetLocationId: ids.locations.oldCinema
		}
	];

	project.travelRoutes = [
		...(project.travelRoutes ?? []),
		{
			id: ids.routes.dormToMarketBus,
			label: 'Ехать от общежития к старому рынку',
			originLocationId: arrivalCorridorIds.locations.studentDormitory,
			destinationLocationId: ids.locations.oldMarket,
			durationMinutes: 24,
			mode: 'city-bus'
		},
		{
			id: ids.routes.marketToDormBus,
			label: 'Ехать от старого рынка к общежитию',
			originLocationId: ids.locations.oldMarket,
			destinationLocationId: arrivalCorridorIds.locations.studentDormitory,
			durationMinutes: 24,
			mode: 'city-bus'
		},
		{
			id: ids.routes.marketToCinemaWalk,
			label: 'Дойти от старого рынка до кинотеатра',
			originLocationId: ids.locations.oldMarket,
			destinationLocationId: ids.locations.oldCinema,
			durationMinutes: 8,
			mode: 'walk',
			physicalAction: 'walk'
		},
		{
			id: ids.routes.cinemaToMarketWalk,
			label: 'Вернуться от кинотеатра к старому рынку',
			originLocationId: ids.locations.oldCinema,
			destinationLocationId: ids.locations.oldMarket,
			durationMinutes: 8,
			mode: 'walk',
			physicalAction: 'walk'
		}
	];

	project.claims = [
		...project.claims,
		{
			id: ids.claims.cinemaInvitation,
			text: 'Студентка с фотоаппаратом сказала, что на шестой день у старого кинотеатра будет разговор о будущем здания.',
			stance: 'supports',
			tags: ['day-five', 'old-city', 'cinema', 'invitation']
		},
		{
			id: ids.claims.cinemaFutureContested,
			text: 'У старого кинотеатра нет одной очевидной судьбы: разные люди связывают с ним безопасность, работу, память и право города меняться.',
			stance: 'supports',
			tags: ['day-six', 'old-city', 'cinema', 'city-change']
		},
		{
			id: ids.claims.cinemaAftermath,
			text: 'После основного разговора у старого кинотеатра часть людей задержалась и договорилась продолжить обсуждение в другой день.',
			stance: 'supports',
			tags: ['day-six', 'old-city', 'cinema', 'aftermath', 'missable']
		},
		{
			id: ids.claims.dormEveningContinuation,
			text: 'Разговоры и впечатления первых дней уже стали частью повседневной жизни общежития.',
			stance: 'supports',
			tags: ['day-six', 'dorm', 'social-continuity']
		}
	];

	project.storyNodes = [
		...project.storyNodes,
		{
			id: ids.story.dayFiveCameraArrival,
			kind: 'event',
			title: 'Пятый день: студентка приходит к старому рынку',
			description:
				'Authored NPC movement: расписание объясняет намерение, а это событие фиксирует реальное прибытие в Actual Presence.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [ids.characters.cameraStudent],
			placement: {
				day: 5,
				minuteOfDay: 17 * 60 + 20,
				locationId: ids.locations.oldMarket
			},
			activationState: 'available',
			runtimePolicy: {occurrenceMode: 'one-shot', durationMinutes: 0}
		},
		{
			id: ids.story.dayFiveMarketIntroduction,
			kind: 'event',
			title: 'Пятый день: старый рынок',
			description:
				'Новый городской узел живёт обычной торговой жизнью. Через знакомство и наблюдение игрок получает первый необязательный вход в тему того, как город меняется.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [
				arrivalCorridorIds.characters.player,
				ids.characters.cameraStudent
			],
			placement: {
				day: 5,
				minuteOfDay: 17 * 60 + 30,
				locationId: ids.locations.oldMarket
			},
			activationState: 'available',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 30,
				missAfterMinutes: 90
			}
		},
		{
			id: ids.story.daySixCameraArrival,
			kind: 'event',
			title: 'Шестой день: студентка приходит к старому кинотеатру',
			description:
				'Явное authored arrival переводит Scheduled Presence в фактическое присутствие только через runtime-оркестрацию.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [ids.characters.cameraStudent],
			placement: {
				day: 6,
				minuteOfDay: 17 * 60 + 50,
				locationId: ids.locations.oldCinema
			},
			activationState: 'available',
			runtimePolicy: {occurrenceMode: 'one-shot', durationMinutes: 0}
		},
		{
			id: ids.story.daySixCinema,
			kind: 'event',
			title: 'Шестой день: разговор у старого кинотеатра',
			description:
				'У отдельного старого кинотеатра возникает разговор о его будущем. Это социальная линия Старого города, а не обязательная центральная загадка.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [
				arrivalCorridorIds.characters.player,
				ids.characters.cameraStudent
			],
			placement: {
				day: 6,
				minuteOfDay: 18 * 60,
				locationId: ids.locations.oldCinema
			},
			activationState: 'dormant',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 45,
				missAfterMinutes: 60
			}
		},
		{
			id: ids.story.daySixDormCounterline,
			kind: 'dialogue',
			title: 'Шестой день: жизнь общежития продолжается',
			description:
				'В то же время в общежитии продолжается уже знакомая социальная линия. Игрок не должен иметь возможность бездумно присутствовать в двух местах одновременно.',
			primaryCharacterId: arrivalCorridorIds.characters.dormDuty,
			participantIds: [
				arrivalCorridorIds.characters.player,
				arrivalCorridorIds.characters.dormDuty
			],
			placement: {
				day: 6,
				minuteOfDay: 18 * 60 + 15,
				locationId: arrivalCorridorIds.locations.studentDormitory
			},
			activationState: 'available',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 30,
				missAfterMinutes: 45
			}
		},
		{
			id: ids.story.daySixCinemaAftermath,
			kind: 'event',
			title: 'Шестой день: разговор продолжается без героя',
			description:
				'После основного окна у кинотеатра мир продолжает жить: студентка остаётся ещё ненадолго и видит продолжение спора, даже если игрок ушёл или выбрал общежитие.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [ids.characters.cameraStudent],
			placement: {
				day: 6,
				minuteOfDay: 19 * 60 + 15,
				locationId: ids.locations.oldCinema
			},
			activationState: 'available',
			runtimePolicy: {occurrenceMode: 'one-shot', durationMinutes: 0}
		},
		{
			id: ids.story.daySevenWeekEcho,
			kind: 'beat',
			title: 'Седьмой день: город возвращает последствия',
			description:
				'К концу первой недели игрок должен увидеть не одинаковую финальную сцену, а следствие того, где он был, чего не видел и что о нём успели узнать другие.',
			primaryCharacterId: arrivalCorridorIds.characters.player,
			participantIds: [arrivalCorridorIds.characters.player],
			placement: {
				day: 7,
				minuteOfDay: 11 * 60,
				locationId: arrivalCorridorIds.locations.studentDormitory
			},
			activationState: 'dormant'
		},
		{
			id: ids.story.daySevenCameraArrival,
			kind: 'event',
			title: 'Седьмой день: студентка возвращается к старому рынку',
			description: 'Явное authored прибытие для Day 7 follow-up.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [ids.characters.cameraStudent],
			placement: {
				day: 7,
				minuteOfDay: 15 * 60 + 45,
				locationId: ids.locations.oldMarket
			},
			activationState: 'available',
			runtimePolicy: {occurrenceMode: 'one-shot', durationMinutes: 0}
		},
		{
			id: ids.story.daySevenMarketAftermath,
			kind: 'dialogue',
			title: 'Седьмой день: узнать о пропущенном продолжении',
			description:
				'Если вчерашний вечер прошёл без игрока, последствия не исчезают: при новой встрече можно узнать, что происходило после основного разговора.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [playerId, ids.characters.cameraStudent],
			placement: {
				day: 7,
				minuteOfDay: 16 * 60,
				locationId: ids.locations.oldMarket
			},
			activationState: 'dormant',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 20,
				missAfterMinutes: 120
			}
		}
	];

	project.narrativeMoves = [
		...project.narrativeMoves,
		...dayFiveMarketMoves(),
		daySixCinemaMove(),
		cameraCinemaAftermathMove(),
		daySixDormMove(),
		daySevenMarketAftermathMove(),
		...daySevenMoves()
	];

	project.storyConnections = [
		...project.storyConnections,
		{
			id: 'a67-ref-day5-day6-old-city',
			sourceNodeId: ids.story.dayFiveMarketIntroduction,
			targetNodeId: ids.story.daySixCinema,
			kind: 'semantic',
			mode: 'reference'
		},
		{
			id: 'a67-ref-day6-cinema-week-echo',
			sourceNodeId: ids.story.daySixCinema,
			targetNodeId: ids.story.daySevenWeekEcho,
			kind: 'semantic',
			mode: 'reference'
		},
		{
			id: 'a67-ref-day6-aftermath-day7-market',
			sourceNodeId: ids.story.daySixCinemaAftermath,
			targetNodeId: ids.story.daySevenMarketAftermath,
			kind: 'semantic',
			mode: 'reference'
		},
		{
			id: 'a67-ref-day6-dorm-week-echo',
			sourceNodeId: ids.story.daySixDormCounterline,
			targetNodeId: ids.story.daySevenWeekEcho,
			kind: 'semantic',
			mode: 'reference'
		}
	];

	return project;
}
