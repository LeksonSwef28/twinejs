import {NarrativeProject} from '../project';
import {create93DaysPlayerNpcSocialDeliveryProject} from './93-days-player-npc-social-delivery';

export const firstWeekProjectId = '93-days-first-week-v1';

export const firstWeekIds = {
	locations: {
		oldMarketSquare: 'a67-old-market-square'
	},
	scenes: {
		oldMarketSquare: 'a67-old-market-square:scene'
	},
	characters: {
		cameraStudent: 'a67-camera-student'
	},
	behaviorProfiles: {
		cameraStudent: 'a67-camera-student-week'
	},
	routines: {
		cameraStudentMarket: 'a67-camera-student-market'
	},
	routes: {
		dormToMarketBus: 'a67-route-dorm-market-bus',
		marketToDormBus: 'a67-route-market-dorm-bus'
	},
	story: {
		dayFiveMarketIntroduction: 'a67-day5-market-introduction',
		daySixCinemaSquare: 'a67-day6-cinema-square',
		daySixDormCounterline: 'a67-day6-dorm-counterline',
		daySevenWeekEcho: 'a67-day7-week-echo'
	}
} as const;

/**
 * A67-W1 first-week production skeleton.
 *
 * This layer deliberately reuses the existing A63 runtime and authoring model.
 * It adds canonical content structure only: one additional social hub, one NPC,
 * ordinary routines/routes, and Day 5-7 Story topology. Consequence/provenance
 * wiring is introduced in later A67 first-week slices.
 */
export function create93DaysFirstWeekProject(): NarrativeProject {
	const project = create93DaysPlayerNpcSocialDeliveryProject();
	const ids = firstWeekIds;

	project.projectId = firstWeekProjectId;
	project.name = '93 дня до конца нашего лета — первая неделя';

	project.locations = [
		...project.locations,
		{
			id: ids.locations.oldMarketSquare,
			name: 'Площадь у старого рынка и кинотеатра'
		}
	];

	project.scenes = [
		...project.scenes,
		{
			id: ids.scenes.oldMarketSquare,
			locationId: ids.locations.oldMarketSquare,
			name: 'Площадь между рынком и старым кинотеатром'
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
			name: 'Учёба, рынок и прогулки с фотоаппаратом'
		}
	];

	project.routineRules = [
		...project.routineRules,
		{
			id: ids.routines.cameraStudentMarket,
			characterId: ids.characters.cameraStudent,
			behaviorProfileId: ids.behaviorProfiles.cameraStudent,
			activeRange: {fromDay: 5, toDay: 7},
			recurrence: {type: 'explicitDays', days: [5, 6, 7]},
			timeWindow: {type: 'exact', startMinute: 16 * 60, endMinute: 20 * 60},
			targetLocationId: ids.locations.oldMarketSquare
		}
	];

	project.travelRoutes = [
		...(project.travelRoutes ?? []),
		{
			id: ids.routes.dormToMarketBus,
			label: 'Ехать от общежития к старому рынку',
			originLocationId: 'arrival-student-dormitory',
			destinationLocationId: ids.locations.oldMarketSquare,
			durationMinutes: 24,
			mode: 'city-bus'
		},
		{
			id: ids.routes.marketToDormBus,
			label: 'Ехать от старого рынка к общежитию',
			originLocationId: ids.locations.oldMarketSquare,
			destinationLocationId: 'arrival-student-dormitory',
			durationMinutes: 24,
			mode: 'city-bus'
		}
	];

	project.storyNodes = [
		...project.storyNodes,
		{
			id: ids.story.dayFiveMarketIntroduction,
			kind: 'event',
			title: 'Пятый день: площадь у старого рынка',
			description:
				'Новый знакомый городской узел: рынок ещё живёт повседневной жизнью, а рядом старый кинотеатр становится предметом разговоров о том, что в городе стоит сохранять, а что менять.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [ids.characters.cameraStudent],
			placement: {
				day: 5,
				minuteOfDay: 17 * 60 + 30,
				locationId: ids.locations.oldMarketSquare
			},
			activationState: 'available',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 30,
				missAfterMinutes: 90
			}
		},
		{
			id: ids.story.daySixCinemaSquare,
			kind: 'event',
			title: 'Шестой день: разговор у кинотеатра',
			description:
				'На площади обсуждают будущее старого кинотеатра. Это социальная линия нового городского узла, а не обязательная центральная загадка.',
			primaryCharacterId: ids.characters.cameraStudent,
			participantIds: [ids.characters.cameraStudent],
			placement: {
				day: 6,
				minuteOfDay: 18 * 60,
				locationId: ids.locations.oldMarketSquare
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
			id: 'a67-ref-day5-day6-market',
			sourceNodeId: ids.story.dayFiveMarketIntroduction,
			targetNodeId: ids.story.daySixCinemaSquare,
			kind: 'semantic',
			mode: 'reference'
		},
		{
			id: 'a67-ref-day6-market-week-echo',
			sourceNodeId: ids.story.daySixCinemaSquare,
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
