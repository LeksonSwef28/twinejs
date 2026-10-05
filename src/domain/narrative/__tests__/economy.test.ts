import {
	applyNarrativeCashSpend,
	evaluateNarrativeCashSpend,
	narrativeEconomyIsStructurallyValid
} from '../economy';
import {narrativeTravelRouteIsStructurallyValid} from '../travel';

describe('A58 economy primitives', () => {
	test('accepts deterministic integer-minor-unit economy data', () => {
		expect(
			narrativeEconomyIsStructurallyValid({
				currency: {code: 'RUB', label: 'руб.', minorUnitsPerMajor: 100},
				initialCashByCharacter: {player: 12500},
				purchaseOffers: [
					{
						id: 'offer-food',
						label: 'Купить перекус',
						locationId: 'kiosk',
						itemInstanceId: 'food-1',
						priceMinorUnits: 750
					}
				]
			})
		).toBe(true);
	});

	test('rejects malformed money and spends without allowing a negative balance', () => {
		const invalid = evaluateNarrativeCashSpend({player: 100}, 'player', -1);
		expect(invalid).toMatchObject({allowed: false, reason: 'invalid-amount'});

		const insufficient = evaluateNarrativeCashSpend(
			{player: 100},
			'player',
			101
		);
		expect(insufficient).toMatchObject({
			allowed: false,
			reason: 'insufficient-funds'
		});

		const allowed = evaluateNarrativeCashSpend({player: 100}, 'player', 40);
		expect(allowed.allowed).toBe(true);
		if (!allowed.allowed) {
			throw new Error('Expected spend to be allowed.');
		}
		expect(applyNarrativeCashSpend({player: 100}, allowed)).toEqual({
			player: 60
		});
	});

	test('treats a fare as an optional positive integer minor-unit amount', () => {
		const base = {
			id: 'route',
			label: 'Route',
			originLocationId: 'a',
			destinationLocationId: 'b',
			durationMinutes: 10,
			mode: 'city-bus' as const
		};
		expect(narrativeTravelRouteIsStructurallyValid(base)).toBe(true);
		expect(
			narrativeTravelRouteIsStructurallyValid({...base, fareMinorUnits: 250})
		).toBe(true);
		expect(
			narrativeTravelRouteIsStructurallyValid({...base, fareMinorUnits: 0})
		).toBe(false);
		expect(
			narrativeTravelRouteIsStructurallyValid({...base, fareMinorUnits: 1.5})
		).toBe(false);
	});
});
