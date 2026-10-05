import {
	advanceInjuryState,
	applyInjuryEffect,
	evaluateInjuryAction,
	InjuryState
} from '../injury';

function ankle(patch: Partial<InjuryState> = {}): InjuryState {
	return {
		id: 'injury-ankle',
		characterId: 'player',
		kind: 'ankle-sprain',
		region: 'ankle',
		pain: 'painful',
		recoveryRemainingMinutes: 8 * 60,
		treatment: 'self-care',
		...patch
	};
}

describe('A39 injuries', () => {
	test('pain changes movement availability without collapsing injury into HP', () => {
		const injury = ankle();

		const walk = evaluateInjuryAction([injury], 'walk');
		const run = evaluateInjuryAction([injury], 'run');
		const fastRun = evaluateInjuryAction([injury], 'fast-run');

		expect(walk.allowed).toBe(true);
		expect(walk.effortCostMultiplier).toBeCloseTo(1.25);
		expect(run.allowed).toBe(true);
		expect(run.effortCostMultiplier).toBeCloseTo(1.6);
		expect(fastRun.allowed).toBe(false);
		expect(fastRun.blockers[0]).toMatchObject({
			injuryId: 'injury-ankle',
			code: 'injury-blocks-action'
		});
	});

	test('serious injuries pause recovery until medical care and sleep accelerates recovery', () => {
		const serious: InjuryState = {
			id: 'injury-serious',
			characterId: 'player',
			kind: 'serious',
			region: 'general',
			pain: 'severe',
			recoveryRemainingMinutes: 300,
			treatment: 'untreated'
		};

		const untreated = advanceInjuryState(serious, 60, 60);
		expect(untreated.injury?.recoveryRemainingMinutes).toBe(300);
		expect(untreated.trace.pausedForMedicalCare).toBe(true);
		expect(untreated.trace.recoveryAppliedMinutes).toBe(0);

		const treated = applyInjuryEffect([serious], {
			id: 'treat-serious',
			type: 'treat',
			characterId: 'player',
			injuryId: 'injury-serious',
			treatment: 'medical-care',
			painReductionSteps: 1
		}).injuries[0];
		const sleeping = advanceInjuryState(treated, 60, 60);
		expect(sleeping.trace.pausedForMedicalCare).toBe(false);
		expect(sleeping.trace.recoveryAppliedMinutes).toBe(90);
		expect(sleeping.injury?.recoveryRemainingMinutes).toBe(210);
	});

	test('treatment never downgrades and worsening extends recovery deterministically', () => {
		const selfCared = ankle({pain: 'aching'});
		const attemptedDowngrade = applyInjuryEffect([selfCared], {
			id: 'downgrade',
			type: 'treat',
			characterId: 'player',
			injuryId: selfCared.id,
			treatment: 'untreated'
		}).injuries[0];
		expect(attemptedDowngrade.treatment).toBe('self-care');

		const worsened = applyInjuryEffect([attemptedDowngrade], {
			id: 'worsen',
			type: 'worsen',
			characterId: 'player',
			injuryId: selfCared.id,
			additionalRecoveryMinutes: 45,
			painIncreaseSteps: 2
		}).injuries[0];
		expect(worsened.recoveryRemainingMinutes).toBe(8 * 60 + 45);
		expect(worsened.pain).toBe('severe');
	});

	test('completed recovery removes the active injury but keeps an explainable trace', () => {
		const result = advanceInjuryState(
			ankle({recoveryRemainingMinutes: 30, pain: 'aching'}),
			30
		);
		expect(result.injury).toBeUndefined();
		expect(result.trace).toMatchObject({
			injuryId: 'injury-ankle',
			recoveryBefore: 30,
			recoveryAfter: 0,
			recovered: true
		});
	});
});
