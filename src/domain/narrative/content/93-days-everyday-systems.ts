import {NarrativeProject} from '../project';
import {
	arrivalCorridorIds
} from './93-days-arrival-corridor';
import {create93DaysDayOneDayTwoProject} from './93-days-day-one-day-two';

export const everydaySystemsIds = {
	items: {
		heavyMealDefinition: 'a58-heavy-meal',
		heavyMeal: 'a58-heavy-meal-1'
	},
	offers: {
		heavyMeal: 'a58-offer-heavy-meal'
	}
} as const;

/**
 * A58 authored integration layer over the verified A57 narrative.
 *
 * Money values here are provisional gameplay values for the vertical slice.
 * They are not assertions about historically verified city prices.
 */
export function create93DaysEverydaySystemsProject(): NarrativeProject {
	const project = create93DaysDayOneDayTwoProject();
	project.projectId = '93-days-everyday-systems-v1';
	project.name = '93 дня до конца нашего лета — бытовые системы';

	project.itemDefinitions = [
		...project.itemDefinitions,
		{
			id: everydaySystemsIds.items.heavyMealDefinition,
			name: 'Плотный перекус',
			description:
				'Простой сытный перекус у вокзальной площади. После него нужно немного времени, прежде чем снова бежать в полную силу.',
			tags: ['food', 'heavy-meal', 'day-one'],
			carry: {
				weightKg: 0.35,
				volumeUnits: 1.5,
				sizeClass: 'small'
			},
			food: {
				satietyGain: 0.55,
				digestionMinutes: 30
			}
		}
	];

	project.itemInstances = [
		...project.itemInstances,
		{
			id: everydaySystemsIds.items.heavyMeal,
			definitionId: everydaySystemsIds.items.heavyMealDefinition,
			placement: {
				type: 'location',
				locationId: arrivalCorridorIds.locations.foodPoint
			}
		}
	];

	project.economy = {
		currency: {
			code: 'RUB',
			label: 'руб.',
			minorUnitsPerMajor: 100
		},
		initialCashByCharacter: {
			[arrivalCorridorIds.characters.player]: 12000
		},
		purchaseOffers: [
			{
				id: everydaySystemsIds.offers.heavyMeal,
				label: 'Купить плотный перекус',
				locationId: arrivalCorridorIds.locations.foodPoint,
				itemInstanceId: everydaySystemsIds.items.heavyMeal,
				priceMinorUnits: 1800
			}
		]
	};

	project.travelRoutes = (project.travelRoutes ?? []).map(route => {
		switch (route.id) {
			case arrivalCorridorIds.routes.stopToTowerRouteTaxi:
				return {...route, fareMinorUnits: 1200};
			case arrivalCorridorIds.routes.stopToTowerCityBus:
				return {...route, fareMinorUnits: 600};
			case arrivalCorridorIds.routes.stopToDormCityBus:
				return {...route, fareMinorUnits: 800};
			default:
				return route;
		}
	});

	return project;
}
