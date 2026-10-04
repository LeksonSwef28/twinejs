import {NarrativeMoveDefinition} from '../interaction';
import {NarrativeProject} from '../project';
import {arrivalCorridorIds} from './93-days-arrival-corridor';
import {
	create93DaysFirstWeekProject,
	firstWeekIds
} from './93-days-first-week';

export const computerClubCycleProjectId = '93-days-computer-club-cycle-v1';

export const computerClubCycleIds = {
	locations: {
		computerClub: 'a68-computer-club'
	},
	scenes: {
		mainRoom: 'a68-computer-club:main-room'
	},
	characters: {
		clubWorker: 'a68-club-worker',
		clubRegular: 'a68-club-regular'
	},
	behaviorProfiles: {
		clubWorker: 'a68-club-worker-shift',
		clubRegular: 'a68-club-regular-routine'
	},
	routines: {
		clubWorker: 'a68-club-worker-at-club',
		clubRegular: 'a68-club-regular-at-club'
	},
	routes: {
		dormToClub: 'a68-route-dorm-club',
		clubToDorm: 'a68-route-club-dorm'
	},
	claims: {
		nightSession: 'a68-claim-night-session'
	},
	story: {
		workerArrival: 'a68-day8-club-worker-arrival',
		regularArrival: 'a68-day8-club-regular-arrival',
		entry: 'a68-day8-club-entry',
		dormEcho: 'a68-day9-dorm-club-echo'
	},
	moves: {
		askWorker: 'a68-day8-club-entry:ask-worker',
		readForum: 'a68-day8-club-entry:read-forum',
		referenceCinema: 'a68-day8-club-entry:reference-old-cinema',
		tellDormDuty: 'a68-day9-dorm-club-echo:tell-duty'
	}
} as const;

const playerId = arrivalCorridorIds.characters.player;

function storyActiveGuard(id: string, storyNodeId: string) {
	return {
		id,
		condition: {
			type: 'story-node-state' as const,
			storyNodeId,
			state: 'active' as const
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

function clubEntryMoves(): NarrativeMoveDefinition[] {
	const ids = computerClubCycleIds;
	const directId = ids.moves.askWorker;
	const forumId = ids.moves.readForum;
	const continuityId = ids.moves.referenceCinema;
	return [
		{
			id: directId,
			storyNodeId: ids.story.entry,
			kind: 'ask',
			label: 'Спросить администратора, что сегодня обсуждают',
			actorCharacterId: playerId,
			targetCharacterIds: [ids.characters.clubWorker],
			guards: [
				storyActiveGuard(directId + ':entry-active', ids.story.entry),
				{
					id: directId + ':same-place',
					condition: {
						type: 'characters-share-location',
						characterIds: [playerId, ids.characters.clubWorker]
					}
				}
			],
			resolution: {type: 'automatic', outcomeId: directId + ':outcome'},
			outcomes: [
				{
					id: directId + ':outcome',
					key: 'heard-directly',
					label: 'Администратор коротко объясняет, что планируется вечером.',
					effectStoryNodeIds: [ids.story.dormEcho],
					effects: [
						{
							id: directId + ':learn',
							type: 'character-learns-claim',
							recipient: {type: 'character', characterId: playerId},
							claim: {type: 'claim', claimId: ids.claims.nightSession},
							attitude: 'believes',
							confidence: 0.88,
							source: {type: 'move-target', targetIndex: 0}
						},
						{
							id: directId + ':open-dorm-echo',
							type: 'story-node-set-state',
							storyNodeId: ids.story.dormEcho,
							state: 'available'
						}
					]
				}
			]
		},
		{
			id: forumId,
			storyNodeId: ids.story.entry,
			kind: 'observe',
			label: 'Прочитать закреплённое сообщение на локальном форуме',
			actorCharacterId: playerId,
			targetCharacterIds: [],
			guards: [storyActiveGuard(forumId + ':entry-active', ids.story.entry)],
			resolution: {type: 'automatic', outcomeId: forumId + ':outcome'},
			outcomes: [
				{
					id: forumId + ':outcome',
					key: 'read-mediated',
					label: 'Сообщение описывает тот же план, но через сетевую атрибуцию.',
					effectStoryNodeIds: [ids.story.dormEcho],
					effects: [
						{
							id: forumId + ':learn',
							type: 'character-learns-claim',
							recipient: {type: 'character', characterId: playerId},
							claim: {type: 'claim', claimId: ids.claims.nightSession},
							attitude: 'believes',
							confidence: 0.68,
							source: {
								type: 'mediated',
								medium: 'forum',
								attribution: 'north_bridge'
							}
						},
						{
							id: forumId + ':open-dorm-echo',
							type: 'story-node-set-state',
							storyNodeId: ids.story.dormEcho,
							state: 'available'
						}
					]
				}
			]
		},
		{
			id: continuityId,
			storyNodeId: ids.story.entry,
			kind: 'inform',
			label: 'Упомянуть спор о будущем старого кинотеатра',
			actorCharacterId: playerId,
			targetCharacterIds: [ids.characters.clubWorker],
			guards: [
				storyActiveGuard(continuityId + ':entry-active', ids.story.entry),
				knowsClaimGuard(
					continuityId + ':old-city-history',
					playerId,
					firstWeekIds.claims.cinemaFutureContested
				),
				{
					id: continuityId + ':same-place',
					condition: {
						type: 'characters-share-location',
						characterIds: [playerId, ids.characters.clubWorker]
					}
				}
			],
			resolution: {type: 'automatic', outcomeId: continuityId + ':outcome'},
			outcomes: [
				{
					id: continuityId + ':outcome',
					key: 'old-city-continuity',
					label:
						'Знакомый городской спор делает первый разговор с администратором менее формальным.',
					effectStoryNodeIds: [],
					effects: [
						{
							id: continuityId + ':familiarity',
							type: 'relationship-adjust',
							from: {type: 'move-target', targetIndex: 0},
							to: {type: 'move-actor'},
							axis: 'familiarity',
							delta: 0.04
						},
						{
							id: continuityId + ':memory',
							type: 'character-remembers',
							character: {type: 'move-actor'},
							summary:
								'В компьютерном клубе разговор неожиданно связался с тем, что я уже видел у старого кинотеатра.',
							importance: 0.42,
							baseStrength: 0.48,
							tags: [
								'a68',
								'computer-club',
								'a67-continuity',
								'old-city'
							],
							source: {type: 'current-move'}
						}
					]
				}
			]
		}
	];
}

function dormEchoMove(): NarrativeMoveDefinition {
	const ids = computerClubCycleIds;
	const id = ids.moves.tellDormDuty;
	return {
		id,
		storyNodeId: ids.story.dormEcho,
		kind: 'inform',
		label: 'Рассказать дежурной, что услышал о завтрашнем вечере в клубе',
		actorCharacterId: playerId,
		targetCharacterIds: [arrivalCorridorIds.characters.dormDuty],
		communicatedClaimId: ids.claims.nightSession,
		communicationIntent: 'honest',
		guards: [
			storyActiveGuard(id + ':echo-active', ids.story.dormEcho),
			{
				id: id + ':player-knows',
				condition: {
					type: 'character-knows-claim',
					characterId: playerId,
					claimId: ids.claims.nightSession
				}
			},
			{
				id: id + ':same-place',
				condition: {
					type: 'characters-share-location',
					characterIds: [
						playerId,
						arrivalCorridorIds.characters.dormDuty
					]
				}
			}
		],
		resolution: {type: 'automatic', outcomeId: id + ':outcome'},
		outcomes: [
			{
				id: id + ':outcome',
				key: 'shared-at-dorm',
				label: 'Информация из клуба становится частью обычного разговора в общежитии.',
				effectStoryNodeIds: [],
				effects: [
					{
						id: id + ':learn',
						type: 'character-learns-claim',
						recipient: {type: 'move-target', targetIndex: 0},
						claim: {type: 'communicated-claim'},
						attitude: 'believes',
						confidence: 0.72,
						source: {type: 'move-actor'}
					},
					{
						id: id + ':goodwill',
						type: 'relationship-adjust',
						from: {
							type: 'character',
							characterId: arrivalCorridorIds.characters.dormDuty
						},
						to: {type: 'move-actor'},
						axis: 'goodwill',
						delta: 0.02
					},
					{
						id: id + ':memory',
						type: 'character-remembers',
						character: {type: 'move-actor'},
						summary:
							'Разговор из компьютерного клуба не остался отдельным эпизодом: на следующий вечер я сам принёс эту историю обратно в общежитие.',
						importance: 0.48,
						baseStrength: 0.54,
						tags: ['a68', 'computer-club', 'dorm', 'cross-place'],
						source: {type: 'current-move'}
					},
					{
						id: id + ':complete',
						type: 'story-node-set-state',
						storyNodeId: ids.story.dormEcho,
						state: 'completed'
					}
				]
			}
		]
	};
}

/**
 * A68-C1 initial production skeleton.
 *
 * This layer expands the already proven first-week project with one MASTER-backed
 * central/student social space. It intentionally adds only ordinary canonical
 * content data: a Computer Club location, two NPC roles, routine intent,
 * explicit travel routes and a source-aware Story entry. Cross-place
 * consequence and A67 continuity are now explicit; repeated bridge
 * relationship and save/continue remain later C1 slices.
 */
export function create93DaysComputerClubCycleProject(): NarrativeProject {
	const project = create93DaysFirstWeekProject();
	const ids = computerClubCycleIds;

	project.projectId = computerClubCycleProjectId;
	project.name = '93 дня до конца нашего лета — компьютерный клуб';

	project.locations = [
		...project.locations,
		{
			id: ids.locations.computerClub,
			name: 'Компьютерный клуб'
		}
	];

	project.scenes = [
		...project.scenes,
		{
			id: ids.scenes.mainRoom,
			locationId: ids.locations.computerClub,
			name: 'Основной зал компьютерного клуба'
		}
	];

	project.characters = [
		...project.characters,
		{
			id: ids.characters.clubWorker,
			name: 'Администратор компьютерного клуба',
			cognitionTier: 'light',
			defaultBehaviorProfileId: ids.behaviorProfiles.clubWorker
		},
		{
			id: ids.characters.clubRegular,
			name: 'Завсегдатай компьютерного клуба',
			cognitionTier: 'light',
			defaultBehaviorProfileId: ids.behaviorProfiles.clubRegular
		}
	];

	project.behaviorProfiles = [
		...project.behaviorProfiles,
		{
			id: ids.behaviorProfiles.clubWorker,
			characterId: ids.characters.clubWorker,
			name: 'Смена в компьютерном клубе'
		},
		{
			id: ids.behaviorProfiles.clubRegular,
			characterId: ids.characters.clubRegular,
			name: 'Учёба, общежитие и вечера в компьютерном клубе'
		}
	];

	project.routineRules = [
		...project.routineRules,
		{
			id: ids.routines.clubWorker,
			characterId: ids.characters.clubWorker,
			behaviorProfileId: ids.behaviorProfiles.clubWorker,
			activeRange: {fromDay: 8, toDay: 93},
			recurrence: {type: 'everyDay'},
			timeWindow: {
				type: 'exact',
				startMinute: 12 * 60,
				endMinute: 23 * 60
			},
			targetLocationId: ids.locations.computerClub
		},
		{
			id: ids.routines.clubRegular,
			characterId: ids.characters.clubRegular,
			behaviorProfileId: ids.behaviorProfiles.clubRegular,
			activeRange: {fromDay: 8, toDay: 93},
			recurrence: {type: 'everyDay'},
			timeWindow: {
				type: 'exact',
				startMinute: 17 * 60,
				endMinute: 22 * 60
			},
			targetLocationId: ids.locations.computerClub
		}
	];

	project.travelRoutes = [
		...(project.travelRoutes ?? []),
		{
			id: ids.routes.dormToClub,
			label: 'Дойти от общежития до компьютерного клуба',
			originLocationId: arrivalCorridorIds.locations.studentDormitory,
			destinationLocationId: ids.locations.computerClub,
			durationMinutes: 16,
			mode: 'walk',
			physicalAction: 'walk'
		},
		{
			id: ids.routes.clubToDorm,
			label: 'Вернуться от компьютерного клуба к общежитию',
			originLocationId: ids.locations.computerClub,
			destinationLocationId: arrivalCorridorIds.locations.studentDormitory,
			durationMinutes: 16,
			mode: 'walk',
			physicalAction: 'walk'
		}
	];

	project.claims = [
		...project.claims,
		{
			id: ids.claims.nightSession,
			text: 'На девятый день в компьютерном клубе хотят оставить несколько машин на позднюю сетевую игру, но мест меньше, чем желающих.',
			stance: 'supports',
			tags: ['a68', 'computer-club', 'social-plan', 'early-internet']
		}
	];

	project.storyNodes = [
		...project.storyNodes,
		{
			id: ids.story.workerArrival,
			kind: 'event',
			title: 'Восьмой день: администратор приходит на вечернюю смену',
			description:
				'Явное authored arrival превращает рабочее расписание в фактическое присутствие.',
			primaryCharacterId: ids.characters.clubWorker,
			participantIds: [ids.characters.clubWorker],
			placement: {
				day: 8,
				minuteOfDay: 17 * 60 + 50,
				locationId: ids.locations.computerClub
			},
			activationState: 'available',
			runtimePolicy: {occurrenceMode: 'one-shot', durationMinutes: 0}
		},
		{
			id: ids.story.regularArrival,
			kind: 'event',
			title: 'Восьмой день: завсегдатай приходит в клуб',
			description:
				'Второй authored arrival создаёт реальное пересечение людей, а не только Scheduled Presence.',
			primaryCharacterId: ids.characters.clubRegular,
			participantIds: [ids.characters.clubRegular],
			placement: {
				day: 8,
				minuteOfDay: 17 * 60 + 55,
				locationId: ids.locations.computerClub
			},
			activationState: 'available',
			runtimePolicy: {occurrenceMode: 'one-shot', durationMinutes: 0}
		},
		{
			id: ids.story.entry,
			kind: 'dialogue',
			title: 'Восьмой день: первый вечер в компьютерном клубе',
			description:
				'Игрок впервые видит клуб как обычное социальное место: разговоры, машины, локальная сеть и форум существуют в одной среде.',
			primaryCharacterId: ids.characters.clubWorker,
			participantIds: [
				playerId,
				ids.characters.clubWorker,
				ids.characters.clubRegular
			],
			placement: {
				day: 8,
				minuteOfDay: 18 * 60,
				locationId: ids.locations.computerClub
			},
			activationState: 'available',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 30,
				missAfterMinutes: 120
			}
		},
		{
			id: ids.story.dormEcho,
			kind: 'dialogue',
			title: 'Девятый день: клубная новость возвращается в общежитие',
			description:
				'Cross-place consequence появляется только если игрок сам унёс информацию из клуба и позже поделился ею в общежитии.',
			primaryCharacterId: arrivalCorridorIds.characters.dormDuty,
			participantIds: [
				playerId,
				arrivalCorridorIds.characters.dormDuty
			],
			placement: {
				day: 9,
				minuteOfDay: 19 * 60,
				locationId: arrivalCorridorIds.locations.studentDormitory
			},
			activationState: 'dormant',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 15,
				missAfterMinutes: 180
			}
		}
	];

	project.narrativeMoves = [
		...project.narrativeMoves,
		...clubEntryMoves(),
		dormEchoMove()
	];

	// Keep the existing A67 Old City content intact. The first C1 bridge Story
	// will explicitly reconnect to this character rather than duplicating it.
	if (
		!project.characters.some(
			character => character.id === firstWeekIds.characters.cameraStudent
		)
	) {
		throw new Error('A68-C1 requires the canonical A67 camera student.');
	}

	return project;
}
