import {NarrativeProject} from '../project';
import {create93DaysPlayerNpcSocialDeliveryProject} from './93-days-player-npc-social-delivery';

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
	story: {
		dayFiveMarketIntroduction: 'a67-day5-market-introduction',
		daySixCinema: 'a67-day6-cinema',
		daySixDormCounterline: 'a67-day6-dorm-counterline',
		daySevenWeekEcho: 'a67-day7-week-echo'
	}
} as const;

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
			originLocationId: 'arrival-student-dormitory',
			destinationLocationId: ids.locations.oldMarket,
			durationMinutes: 24,
			mode: 'city-bus'
		},
		{
			id: ids.routes.marketToDormBus,
			label: 'Ехать от старого рынка к общежитию',
			originLocationId: ids.locations.oldMarket,
			destinationLocationId: 'arrival-student-dormitory',
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

	project.storyNodes = [
		...project.storyNodes,
		{
			id: ids.story.dayFiveMarketIntroduction,
			kind: 'event',
			title: 'Пятый день: старый рынок',
			description:
				'Новый городской узел живёт обычной торговой жизнью. Через знакомство и наблюдение игрок получает первый необязательный вход в тему того, как город меняется.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [ids.characters.cameraStudent],
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
			id: ids.story.daySixCinema,
			kind: 'event',
			title: 'Шестой день: разговор у старого кинотеатра',
			description:
				'У отдельного старого кинотеатра возникает разговор о его будущем. Это социальная линия Старого города, а не обязательная центральная загадка.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [ids.characters.cameraStudent],
			placement: {
				day: 6,
				minuteOfDay: 18 * 60,
				locationId: ids.locations.oldCinema
			},
			activationState: 'available',
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
			participantIds: [],
			placement: {
				day: 6,
				minuteOfDay: 18 * 60 + 15,
				locationId: 'arrival-student-dormitory'
			},
			activationState: 'available',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 30,
				missAfterMinutes: 45
			}
		},
		{
			id: ids.story.daySevenWeekEcho,
			kind: 'beat',
			title: 'Седьмой день: город возвращает последствия',
			description:
				'К концу первой недели игрок должен увидеть не одинаковую финальную сцену, а следствие того, где он был, чего не видел и что о нём успели узнать другие.',
			participantIds: [],
			placement: {
				day: 7,
				minuteOfDay: 11 * 60,
				locationId: 'arrival-student-dormitory'
			},
			activationState: 'dormant'
		}
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
			id: 'a67-ref-day6-dorm-week-echo',
			sourceNodeId: ids.story.daySixDormCounterline,
			targetNodeId: ids.story.daySevenWeekEcho,
			kind: 'semantic',
			mode: 'reference'
		}
	];

	return project;
}
