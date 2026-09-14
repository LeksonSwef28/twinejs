import {
	advanceCharacterBodyState,
	applyBodyStateEffect,
	bodyIsWellRested,
	createCharacterBodyState,
	createHeavyMealBodyEffect,
	evaluateBodyAction
} from '../body';

describe('body needs foundation', () => {
	it('blocks fast running for the full heavy-meal digestion window', () => {
		const initial = createCharacterBodyState('player', {satiety: 0.4});
		const eaten = applyBodyStateEffect(
			initial,
			createHeavyMealBodyEffect('meal-1', 'player')
		).state;

		expect(eaten.digestionRemainingMinutes).toBe(30);
		expect(evaluateBodyAction(eaten, 'fast-run')).toMatchObject({
			allowed: false,
			blockers: [{code: 'digesting-heavy-meal'}]
		});

		const after29 = advanceCharacterBodyState(eaten, 29).state;
		expect(evaluateBodyAction(after29, 'fast-run').allowed).toBe(false);
		const after30 = advanceCharacterBodyState(eaten, 30).state;
		expect(after30.digestionRemainingMinutes).toBe(0);
		expect(evaluateBodyAction(after30, 'fast-run').allowed).toBe(true);
	});

	it('turns pushing beyond exhaustion into sleep debt', () => {
		const initial = createCharacterBodyState('player', {fatigue: 0.95});
		const advanced = advanceCharacterBodyState(initial, 120);

		expect(advanced.state.fatigue).toBe(1);
		expect(advanced.state.sleepDebtMinutes).toBeCloseTo(36);
		expect(advanced.trace.awakeMinutes).toBe(120);
		expect(advanced.trace.sleepDebtAfter).toBeCloseTo(36);
	});

	it('requires extra sleep to clear debt after ordinary fatigue recovery', () => {
		const exhausted = createCharacterBodyState('player', {
			fatigue: 1,
			sleepDebtMinutes: 120,
			sleepRemainingMinutes: 600
		});

		const afterEightHours = advanceCharacterBodyState(exhausted, 480).state;
		expect(afterEightHours.fatigue).toBe(0);
		expect(afterEightHours.sleepDebtMinutes).toBe(120);
		expect(bodyIsWellRested(afterEightHours)).toBe(false);

		const fullyRecovered = advanceCharacterBodyState(afterEightHours, 120).state;
		expect(fullyRecovered.sleepDebtMinutes).toBe(0);
		expect(fullyRecovered.sleepRemainingMinutes).toBe(0);
		expect(bodyIsWellRested(fullyRecovered)).toBe(true);
	});

	it('makes being well rested a meaningful effort benefit', () => {
		const rested = createCharacterBodyState('player', {
			fatigue: 0,
			sleepDebtMinutes: 0,
			satiety: 0.7
		});
		const evaluation = evaluateBodyAction(rested, 'run');

		expect(evaluation.allowed).toBe(true);
		expect(evaluation.wellRested).toBe(true);
		expect(evaluation.effortCostMultiplier).toBeLessThan(1);
		expect(evaluation.modifiers.some(modifier => modifier.code === 'well-rested')).toBe(
			true
		);
	});
});
