import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	executeNarrativeCashSpend,
	executeNarrativePurchase
} from '../economy';

function purchaseProject() {
	const project = createNarrativeProject(
		'a58-economy-story',
		'A58 economy',
		ninetyThreeDaysTemplate
	);
	project.characters = [
		{
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.locations = [{id: 'kiosk', name: 'Киоск'}];
	project.itemDefinitions = [
		{
			id: 'food',
			name: 'Перекус',
			tags: ['food'],
			carry: {weightKg: 0.2, volumeUnits: 1, sizeClass: 'small'}
		}
	];
	project.itemInstances = [
		{
			id: 'food-1',
			definitionId: 'food',
			placement: {type: 'location', locationId: 'kiosk'}
		}
	];
	project.economy = {
		currency: {code: 'RUB', label: 'руб.', minorUnitsPerMajor: 100},
		initialCashByCharacter: {player: 1000},
		purchaseOffers: [
			{
				id: 'offer-food',
				label: 'Купить перекус',
				locationId: 'kiosk',
				itemInstanceId: 'food-1',
				priceMinorUnits: 250
			}
		]
	};
	project.cashByCharacter = {player: 1000};
	project.simulation.actualLocationByCharacter.player = 'kiosk';
	return project;
}

describe('A58 canonical economy application', () => {
	test('purchases one concrete item and preserves authored placement', () => {
		const project = purchaseProject();
		const authoredBefore = JSON.stringify(project.itemInstances);

		const result = executeNarrativePurchase(project, 'offer-food', 'player');

		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error(result.summary);
		}
		expect(result.project.cashByCharacter.player).toBe(750);
		expect(result.project.itemPlacementOverrides['food-1']).toEqual({
			type: 'character',
			characterId: 'player'
		});
		expect(JSON.stringify(result.project.itemInstances)).toBe(authoredBefore);

		const repeated = executeNarrativePurchase(
			result.project,
			'offer-food',
			'player'
		);
		expect(repeated).toMatchObject({
			status: 'rejected',
			reason: 'item-unavailable'
		});
		expect(repeated.project).toBe(result.project);
		expect(result.project.cashByCharacter.player).toBe(750);
	});

	test('rejects insufficient funds and wrong location atomically', () => {
		const poor = purchaseProject();
		poor.cashByCharacter = {player: 100};
		const poorResult = executeNarrativePurchase(
			poor,
			'offer-food',
			'player'
		);
		expect(poorResult).toMatchObject({
			status: 'rejected',
			reason: 'insufficient-funds'
		});
		expect(poorResult.project).toBe(poor);
		expect(poor.itemPlacementOverrides).toEqual({});
		expect(poor.cashByCharacter.player).toBe(100);

		const elsewhere = purchaseProject();
		elsewhere.simulation.actualLocationByCharacter.player = undefined;
		const elsewhereResult = executeNarrativePurchase(
			elsewhere,
			'offer-food',
			'player'
		);
		expect(elsewhereResult).toMatchObject({
			status: 'rejected',
			reason: 'wrong-location'
		});
		expect(elsewhereResult.project).toBe(elsewhere);
	});

	test('spend boundary rejects malformed requests without changing the project', () => {
		const project = purchaseProject();
		expect(executeNarrativeCashSpend(project, 'missing', 10)).toMatchObject({
			status: 'rejected',
			reason: 'unknown-character',
			project
		});
		expect(executeNarrativeCashSpend(project, 'player', 0)).toMatchObject({
			status: 'rejected',
			reason: 'invalid-amount',
			project
		});
		expect(executeNarrativeCashSpend(project, 'player', 1001)).toMatchObject({
			status: 'rejected',
			reason: 'insufficient-funds',
			project
		});
	});
});
