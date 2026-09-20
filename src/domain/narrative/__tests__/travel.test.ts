import {
	narrativeTravelRouteIsStructurallyValid,
	NarrativeTravelRouteDefinition
} from '../travel';

describe('Narrative travel route contract', () => {
	const route: NarrativeTravelRouteDefinition = {
		id: 'route-a',
		label: 'Идти дальше',
		originLocationId: 'a',
		destinationLocationId: 'b',
		durationMinutes: 5,
		mode: 'walk',
		physicalAction: 'walk'
	};

	test('accepts typed positive-duration directed routes', () => {
		expect(narrativeTravelRouteIsStructurallyValid(route)).toBe(true);
	});

	test('rejects zero duration, self-routes and unknown physical actions', () => {
		expect(
			narrativeTravelRouteIsStructurallyValid({...route, durationMinutes: 0})
		).toBe(false);
		expect(
			narrativeTravelRouteIsStructurallyValid({
				...route,
				destinationLocationId: route.originLocationId
			})
		).toBe(false);
		expect(
			narrativeTravelRouteIsStructurallyValid({
				...route,
				physicalAction: 'teleport'
			})
		).toBe(false);
	});
});
