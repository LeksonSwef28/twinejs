import {
	applyItemRuntimePlacement,
	evaluateCarryingAction,
	evaluatePackIntoContainer,
	evaluatePackIntoPockets,
	resolveCharacterCarryLoad
} from '../carrying';
import {ItemDefinition, ItemInstance} from '../items';

const definitions: ItemDefinition[] = [
	{
		id: 'portfolio',
		name: 'Портфель',
		tags: ['bag'],
		carry: {weightKg: 1, volumeUnits: 5, sizeClass: 'medium'},
		container: {
			capacityVolumeUnits: 8,
			maxContentsWeightKg: 5,
			maxItemSize: 'medium',
			carryStyle: 'hand',
			handsRequired: 1,
			climbEffortMultiplier: 1.15
		}
	},
	{
		id: 'small-bag',
		name: 'Маленькая сумочка',
		tags: ['bag'],
		carry: {weightKg: 0.4, volumeUnits: 3, sizeClass: 'small'},
		container: {
			capacityVolumeUnits: 3,
			maxContentsWeightKg: 1,
			maxItemSize: 'small',
			carryStyle: 'shoulder',
			handsRequired: 0
		}
	},
	{
		id: 'thermos',
		name: 'Термос',
		tags: ['drink'],
		carry: {weightKg: 0.8, volumeUnits: 3, sizeClass: 'medium'}
	},
	{
		id: 'passport',
		name: 'Паспорт',
		tags: ['document'],
		carry: {weightKg: 0.05, volumeUnits: 0.5, sizeClass: 'tiny'}
	},
	{
		id: 'heavy-box',
		name: 'Тяжёлая коробка',
		tags: ['heavy'],
		carry: {
			weightKg: 9,
			volumeUnits: 10,
			sizeClass: 'bulky',
			handsRequiredWhenLoose: 2
		}
	}
];

const instances: ItemInstance[] = [
	{
		id: 'portfolio-1',
		definitionId: 'portfolio',
		placement: {type: 'character', characterId: 'player'}
	},
	{
		id: 'small-bag-1',
		definitionId: 'small-bag',
		placement: {type: 'location', locationId: 'home'}
	},
	{
		id: 'thermos-1',
		definitionId: 'thermos',
		placement: {type: 'location', locationId: 'home'}
	},
	{
		id: 'passport-1',
		definitionId: 'passport',
		placement: {type: 'location', locationId: 'home'}
	},
	{
		id: 'heavy-box-1',
		definitionId: 'heavy-box',
		placement: {type: 'location', locationId: 'home'}
	}
];

describe('A39 carrying and containers', () => {
	test('portfolio accepts a thermos while the small bag and pockets reject it by size', () => {
		const portfolio = evaluatePackIntoContainer(
			'thermos-1',
			'portfolio-1',
			definitions,
			instances,
			{}
		);
		const smallBag = evaluatePackIntoContainer(
			'thermos-1',
			'small-bag-1',
			definitions,
			instances,
			{}
		);
		const pockets = evaluatePackIntoPockets(
			'thermos-1',
			'player',
			definitions,
			instances,
			{}
		);

		expect(portfolio.allowed).toBe(true);
		expect(smallBag.allowed).toBe(false);
		expect(smallBag.blockers.map(blocker => blocker.code)).toContain('item-too-large');
		expect(pockets.allowed).toBe(false);
		expect(pockets.blockers.map(blocker => blocker.code)).toContain('item-too-large');
	});

	test('runtime packing preserves item identity and contributes contents to carried load', () => {
		const overrides = applyItemRuntimePlacement({}, 'thermos-1', {
			type: 'container',
			containerInstanceId: 'portfolio-1'
		});
		const load = resolveCharacterCarryLoad(
			'player',
			definitions,
			instances,
			overrides
		);

		expect(load.topLevelItemIds).toEqual(['portfolio-1']);
		expect(load.containedItemIds).toEqual(['thermos-1']);
		expect(load.totalWeightKg).toBeCloseTo(1.8);
		expect(load.handsOccupied).toBe(1);
		expect(load.containerClimbEffortMultiplier).toBeCloseTo(1.15);
	});

	test('capacity is data-driven and rejects excess volume or weight', () => {
		const withPassport = applyItemRuntimePlacement({}, 'passport-1', {
			type: 'container',
			containerInstanceId: 'small-bag-1'
		});
		const heavy = evaluatePackIntoContainer(
			'heavy-box-1',
			'small-bag-1',
			definitions,
			instances,
			withPassport
		);

		expect(heavy.allowed).toBe(false);
		expect(heavy.blockers.map(blocker => blocker.code)).toEqual(
			expect.arrayContaining(['item-too-large', 'volume-capacity', 'weight-capacity'])
		);
	});

	test('container cycles are rejected explicitly', () => {
		const evaluation = evaluatePackIntoContainer(
			'portfolio-1',
			'portfolio-1',
			definitions,
			instances,
			{}
		);
		expect(evaluation.allowed).toBe(false);
		expect(evaluation.blockers.map(blocker => blocker.code)).toContain(
			'container-cycle'
		);
	});

	test('weight and occupied hands explain action penalties', () => {
		const overrides = applyItemRuntimePlacement({}, 'heavy-box-1', {
			type: 'character',
			characterId: 'player'
		});
		const load = resolveCharacterCarryLoad(
			'player',
			definitions,
			instances,
			overrides
		);
		const climb = evaluateCarryingAction(load, 'climb');

		expect(load.handsOccupied).toBe(2);
		expect(load.totalWeightKg).toBeCloseTo(10);
		expect(climb.allowed).toBe(false);
		expect(climb.blockers.map(blocker => blocker.code)).toContain('hands-occupied');
		expect(climb.modifiers.map(modifier => modifier.code)).toContain('carried-weight');
	});
});
