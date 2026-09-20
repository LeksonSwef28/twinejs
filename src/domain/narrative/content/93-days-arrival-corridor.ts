import {NarrativeMoveDefinition} from '../interaction';
import {NarrativeProject} from '../project';
import {createNarrativeProject} from '../project-factory';
import {ninetyThreeDaysTemplate} from '../templates/93-days';

export const arrivalCorridorIds = {
	locations: {
		busStation: 'arrival-bus-station',
		transportSquare: 'arrival-transport-square',
		stationStop: 'arrival-station-stop',
		foodPoint: 'arrival-food-point',
		waterTowerTransfer: 'arrival-water-tower-transfer',
		studentDormitory: 'arrival-student-dormitory'
	},
	characters: {
		player: 'player',
		stationClerk: 'arrival-station-clerk',
		kioskSeller: 'arrival-kiosk-seller',
		routeDriver: 'arrival-route-driver',
		dormDuty: 'arrival-dorm-duty',
		studentTraveller: 'arrival-student-traveller'
	},
	items: {
		travelBagDefinition: 'arrival-travel-bag',
		buttonPhoneDefinition: 'arrival-button-phone',
		passportDefinition: 'arrival-passport',
		travelBag: 'arrival-travel-bag-1',
		buttonPhone: 'arrival-button-phone-1',
		passport: 'arrival-passport-1'
	}
} as const;

const fixedTimestamp = '2000-06-01T00:00:00.000Z';

function observationMove(
	id: string,
	storyNodeId: string,
	label: string,
	outcomeLabel: string
): NarrativeMoveDefinition {
	return {
		id,
		storyNodeId,
		kind: 'observe',
		label,
		actorCharacterId: arrivalCorridorIds.characters.player,
		targetCharacterIds: [],
		guards: [],
		resolution: {type: 'automatic', outcomeId: `${id}:outcome`},
		outcomes: [
			{
				id: `${id}:outcome`,
				key: 'continue',
				label: outcomeLabel,
				effectStoryNodeIds: [],
				effects: [
					{
						id: `${id}:complete`,
						type: 'story-node-set-state',
						storyNodeId,
						state: 'completed'
					}
				]
			}
		]
	};
}

/**
 * A56-S1 authored opening world. This builder intentionally contains no live
 * Actual Presence and no travel runtime state. A52 owns fresh runtime creation;
 * A56-S2/S3 own explicit arrival/travel orchestration.
 */
export function create93DaysArrivalCorridorProject(): NarrativeProject {
	const project = createNarrativeProject(
		'93-days-arrival-corridor',
		'93 дня до конца нашего лета — Arrival Corridor',
		ninetyThreeDaysTemplate
	);

	project.projectId = '93-days-arrival-corridor-v1';
	project.createdAt = fixedTimestamp;
	project.updatedAt = fixedTimestamp;

	project.locations = [
		{
			id: arrivalCorridorIds.locations.busStation,
			name: 'Междугородний автовокзал'
		},
		{
			id: arrivalCorridorIds.locations.transportSquare,
			name: 'Транспортная площадь'
		},
		{
			id: arrivalCorridorIds.locations.stationStop,
			name: 'Остановка у автовокзала'
		},
		{
			id: arrivalCorridorIds.locations.foodPoint,
			name: 'Киоски у транспортной площади'
		},
		{
			id: arrivalCorridorIds.locations.waterTowerTransfer,
			name: 'Пересадка у водонапорной башни'
		},
		{
			id: arrivalCorridorIds.locations.studentDormitory,
			name: 'Студенческое общежитие'
		}
	];

	project.scenes = project.locations.map(location => ({
		id: `${location.id}:scene`,
		locationId: location.id,
		name:
			location.id === arrivalCorridorIds.locations.busStation
				? 'Платформа прибытия'
				: location.id === arrivalCorridorIds.locations.transportSquare
					? 'Площадь перед вокзалом'
					: location.id === arrivalCorridorIds.locations.stationStop
						? 'Посадочная площадка'
						: location.id === arrivalCorridorIds.locations.foodPoint
							? 'Ряд небольших киосков'
							: location.id ===
								  arrivalCorridorIds.locations.waterTowerTransfer
								? 'Остановка рядом с башней'
								: 'Вход и вахта'
	}));

	project.characters = [
		{
			id: arrivalCorridorIds.characters.player,
			name: 'Неизвестный',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'arrival-player-free'
		},
		{
			id: arrivalCorridorIds.characters.stationClerk,
			name: 'Кассир автовокзала',
			cognitionTier: 'background',
			defaultBehaviorProfileId: 'arrival-station-clerk-shift'
		},
		{
			id: arrivalCorridorIds.characters.kioskSeller,
			name: 'Продавец у площади',
			cognitionTier: 'background',
			defaultBehaviorProfileId: 'arrival-kiosk-seller-shift'
		},
		{
			id: arrivalCorridorIds.characters.routeDriver,
			name: 'Водитель маршрутки',
			cognitionTier: 'light',
			defaultBehaviorProfileId: 'arrival-route-driver-shift'
		},
		{
			id: arrivalCorridorIds.characters.dormDuty,
			name: 'Дежурная общежития',
			cognitionTier: 'light',
			defaultBehaviorProfileId: 'arrival-dorm-duty-shift'
		},
		{
			id: arrivalCorridorIds.characters.studentTraveller,
			name: 'Студент с дорожной сумкой',
			cognitionTier: 'light',
			defaultBehaviorProfileId: 'arrival-student-traveller-day'
		}
	];

	project.behaviorProfiles = [
		{
			id: 'arrival-player-free',
			characterId: arrivalCorridorIds.characters.player,
			name: 'Свободный маршрут игрока'
		},
		{
			id: 'arrival-station-clerk-shift',
			characterId: arrivalCorridorIds.characters.stationClerk,
			name: 'Смена на автовокзале'
		},
		{
			id: 'arrival-kiosk-seller-shift',
			characterId: arrivalCorridorIds.characters.kioskSeller,
			name: 'Работа у транспортной площади'
		},
		{
			id: 'arrival-route-driver-shift',
			characterId: arrivalCorridorIds.characters.routeDriver,
			name: 'Маршрут между вокзалом и башней'
		},
		{
			id: 'arrival-dorm-duty-shift',
			characterId: arrivalCorridorIds.characters.dormDuty,
			name: 'Дежурство в общежитии'
		},
		{
			id: 'arrival-student-traveller-day',
			characterId: arrivalCorridorIds.characters.studentTraveller,
			name: 'Дорога от вокзала к общежитию'
		}
	];

	project.routineRules = [
		{
			id: 'arrival-clerk-station',
			characterId: arrivalCorridorIds.characters.stationClerk,
			behaviorProfileId: 'arrival-station-clerk-shift',
			activeRange: {fromDay: 1, toDay: 93},
			recurrence: {type: 'everyDay'},
			timeWindow: {type: 'exact', startMinute: 6 * 60, endMinute: 14 * 60},
			targetLocationId: arrivalCorridorIds.locations.busStation
		},
		{
			id: 'arrival-kiosk-open',
			characterId: arrivalCorridorIds.characters.kioskSeller,
			behaviorProfileId: 'arrival-kiosk-seller-shift',
			activeRange: {fromDay: 1, toDay: 93},
			recurrence: {type: 'everyDay'},
			timeWindow: {type: 'exact', startMinute: 7 * 60, endMinute: 19 * 60},
			targetLocationId: arrivalCorridorIds.locations.foodPoint
		},
		{
			id: 'arrival-driver-station-half',
			characterId: arrivalCorridorIds.characters.routeDriver,
			behaviorProfileId: 'arrival-route-driver-shift',
			activeRange: {fromDay: 1, toDay: 93},
			recurrence: {type: 'everyDay'},
			timeWindow: {type: 'exact', startMinute: 6 * 60 + 30, endMinute: 12 * 60},
			targetLocationId: arrivalCorridorIds.locations.stationStop
		},
		{
			id: 'arrival-driver-tower-half',
			characterId: arrivalCorridorIds.characters.routeDriver,
			behaviorProfileId: 'arrival-route-driver-shift',
			activeRange: {fromDay: 1, toDay: 93},
			recurrence: {type: 'everyDay'},
			timeWindow: {type: 'exact', startMinute: 12 * 60, endMinute: 18 * 60},
			targetLocationId: arrivalCorridorIds.locations.waterTowerTransfer
		},
		{
			id: 'arrival-dorm-duty',
			characterId: arrivalCorridorIds.characters.dormDuty,
			behaviorProfileId: 'arrival-dorm-duty-shift',
			activeRange: {fromDay: 1, toDay: 93},
			recurrence: {type: 'everyDay'},
			timeWindow: {type: 'exact', startMinute: 8 * 60, endMinute: 23 * 60},
			targetLocationId: arrivalCorridorIds.locations.studentDormitory
		},
		{
			id: 'arrival-student-at-station',
			characterId: arrivalCorridorIds.characters.studentTraveller,
			behaviorProfileId: 'arrival-student-traveller-day',
			activeRange: {fromDay: 1, toDay: 1},
			recurrence: {type: 'explicitDays', days: [1]},
			timeWindow: {type: 'exact', startMinute: 9 * 60, endMinute: 9 * 60 + 30},
			targetLocationId: arrivalCorridorIds.locations.busStation
		},
		{
			id: 'arrival-student-at-stop',
			characterId: arrivalCorridorIds.characters.studentTraveller,
			behaviorProfileId: 'arrival-student-traveller-day',
			activeRange: {fromDay: 1, toDay: 1},
			recurrence: {type: 'explicitDays', days: [1]},
			timeWindow: {type: 'exact', startMinute: 9 * 60 + 30, endMinute: 10 * 60},
			targetLocationId: arrivalCorridorIds.locations.stationStop
		},
		{
			id: 'arrival-student-at-dorm',
			characterId: arrivalCorridorIds.characters.studentTraveller,
			behaviorProfileId: 'arrival-student-traveller-day',
			activeRange: {fromDay: 1, toDay: 1},
			recurrence: {type: 'explicitDays', days: [1]},
			timeWindow: {type: 'exact', startMinute: 10 * 60, endMinute: 20 * 60},
			targetLocationId: arrivalCorridorIds.locations.studentDormitory
		}
	];

	project.itemDefinitions = [
		{
			id: arrivalCorridorIds.items.travelBagDefinition,
			name: 'Дорожная сумка',
			description: 'Небольшая сумка с вещами на первые дни.',
			tags: ['luggage', 'bag'],
			carry: {
				weightKg: 1.1,
				volumeUnits: 8,
				sizeClass: 'medium'
			},
			container: {
				capacityVolumeUnits: 12,
				maxContentsWeightKg: 7,
				maxItemSize: 'medium',
				carryStyle: 'shoulder',
				handsRequired: 0
			}
		},
		{
			id: arrivalCorridorIds.items.buttonPhoneDefinition,
			name: 'Кнопочный телефон',
			tags: ['phone', 'communication'],
			carry: {
				weightKg: 0.18,
				volumeUnits: 1,
				sizeClass: 'small',
				handsRequiredWhenLoose: 0
			}
		},
		{
			id: arrivalCorridorIds.items.passportDefinition,
			name: 'Паспорт',
			tags: ['document', 'identity'],
			carry: {
				weightKg: 0.04,
				volumeUnits: 0.4,
				sizeClass: 'tiny',
				handsRequiredWhenLoose: 0
			}
		}
	];

	project.itemInstances = [
		{
			id: arrivalCorridorIds.items.travelBag,
			definitionId: arrivalCorridorIds.items.travelBagDefinition,
			placement: {
				type: 'character',
				characterId: arrivalCorridorIds.characters.player
			}
		},
		{
			id: arrivalCorridorIds.items.buttonPhone,
			definitionId: arrivalCorridorIds.items.buttonPhoneDefinition,
			placement: {
				type: 'character',
				characterId: arrivalCorridorIds.characters.player
			}
		},
		{
			id: arrivalCorridorIds.items.passport,
			definitionId: arrivalCorridorIds.items.passportDefinition,
			placement: {
				type: 'character',
				characterId: arrivalCorridorIds.characters.player
			}
		}
	];

	project.storyNodes = [
		{
			id: 'arrival-look-bus-station',
			kind: 'event',
			title: 'Первые минуты после автобуса',
			description:
				'Герой выходит из междугороднего автобуса и впервые остаётся один перед незнакомым городом.',
			primaryCharacterId: arrivalCorridorIds.characters.player,
			participantIds: [arrivalCorridorIds.characters.player],
			placement: {locationId: arrivalCorridorIds.locations.busStation},
			activationState: 'available'
		},
		{
			id: 'arrival-look-transport-square',
			kind: 'beat',
			title: 'Площадь перед вокзалом',
			description:
				'Такси, маршрутки, городской транспорт и несколько направлений сразу.',
			primaryCharacterId: arrivalCorridorIds.characters.player,
			participantIds: [arrivalCorridorIds.characters.player],
			placement: {locationId: arrivalCorridorIds.locations.transportSquare},
			activationState: 'available'
		},
		{
			id: 'arrival-look-station-stop',
			kind: 'beat',
			title: 'Понять остановку',
			description:
				'Таблички и люди обещают несколько способов уехать дальше, но очевидного правильного маршрута нет.',
			primaryCharacterId: arrivalCorridorIds.characters.player,
			participantIds: [arrivalCorridorIds.characters.player],
			placement: {locationId: arrivalCorridorIds.locations.stationStop},
			activationState: 'available'
		},
		{
			id: 'arrival-look-food-point',
			kind: 'beat',
			title: 'Еда у площади',
			description:
				'Небольшие киоски дают возможность задержаться и перекусить, не покидая район вокзала.',
			primaryCharacterId: arrivalCorridorIds.characters.player,
			participantIds: [arrivalCorridorIds.characters.player],
			placement: {locationId: arrivalCorridorIds.locations.foodPoint},
			activationState: 'available'
		},
		{
			id: 'arrival-look-water-tower',
			kind: 'beat',
			title: 'Ориентир у башни',
			description:
				'Старая водонапорная башня помогает впервые связать услышанные направления с реальным городом.',
			primaryCharacterId: arrivalCorridorIds.characters.player,
			participantIds: [arrivalCorridorIds.characters.player],
			placement: {locationId: arrivalCorridorIds.locations.waterTowerTransfer},
			activationState: 'available'
		},
		{
			id: 'arrival-look-dormitory',
			kind: 'event',
			title: 'Вход в общежитие',
			description:
				'Рабочая точка назначения первой дороги. Финальная роль общежития в истории ещё не закреплена.',
			primaryCharacterId: arrivalCorridorIds.characters.player,
			participantIds: [arrivalCorridorIds.characters.player],
			placement: {locationId: arrivalCorridorIds.locations.studentDormitory},
			activationState: 'available'
		}
	];

	project.narrativeMoves = [
		observationMove(
			'arrival-observe-bus-station',
			'arrival-look-bus-station',
			'Осмотреть автовокзал',
			'Вокзал немного прояснился'
		),
		observationMove(
			'arrival-observe-transport-square',
			'arrival-look-transport-square',
			'Осмотреть транспортную площадь',
			'Стало понятнее, куда расходятся потоки транспорта'
		),
		observationMove(
			'arrival-observe-station-stop',
			'arrival-look-station-stop',
			'Разобраться в остановке',
			'Варианты дороги стали заметнее'
		),
		observationMove(
			'arrival-observe-food-point',
			'arrival-look-food-point',
			'Осмотреть киоски',
			'Теперь понятно, где можно перекусить'
		),
		observationMove(
			'arrival-observe-water-tower',
			'arrival-look-water-tower',
			'Запомнить башню как ориентир',
			'Башня стала первым знакомым ориентиром'
		),
		observationMove(
			'arrival-observe-dormitory',
			'arrival-look-dormitory',
			'Осмотреть вход в общежитие',
			'Точка назначения найдена'
		)
	];

	project.simulation.day = 1;
	project.simulation.minuteOfDay = ninetyThreeDaysTemplate.periods[0].startMinute;
	project.simulation.actualLocationByCharacter = {};

	return project;
}
