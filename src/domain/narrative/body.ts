import {EntityId} from './entities';

export interface CharacterBodyState {
	characterId: EntityId;
	/** 0 = fresh, 1 = exhausted. */
	fatigue: number;
	/** Extra recovery minutes accumulated by pushing beyond exhaustion. */
	sleepDebtMinutes: number;
	/** 0 = empty/hungry, 1 = full. */
	satiety: number;
	/** While > 0 a heavy meal can constrain high-intensity actions. */
	digestionRemainingMinutes: number;
	/** Planned sleep still remaining. Zero means awake. */
	sleepRemainingMinutes: number;
}

export interface BodyNeedsPolicy {
	awakeMinutesFromFreshToExhausted: number;
	sleepMinutesFromExhaustedToFresh: number;
	sleepDebtPerExhaustedAwakeMinute: number;
	awakeMinutesFromFullToEmpty: number;
	sleepSatietyRateMultiplier: number;
	wellRestedFatigueThreshold: number;
	wellRestedEffortMultiplier: number;
	hungrySatietyThreshold: number;
	hungryEffortMultiplier: number;
}

export const defaultBodyNeedsPolicy: BodyNeedsPolicy = {
	awakeMinutesFromFreshToExhausted: 16 * 60,
	sleepMinutesFromExhaustedToFresh: 8 * 60,
	sleepDebtPerExhaustedAwakeMinute: 0.5,
	awakeMinutesFromFullToEmpty: 7 * 60,
	sleepSatietyRateMultiplier: 0.5,
	wellRestedFatigueThreshold: 0.1,
	wellRestedEffortMultiplier: 0.9,
	hungrySatietyThreshold: 0.2,
	hungryEffortMultiplier: 1.15
};

export type BodyStateEffect =
	| {
			id: EntityId;
			type: 'eat';
			characterId: EntityId;
			satietyGain: number;
			digestionMinutes: number;
	  }
	| {
			id: EntityId;
			type: 'sleep';
			characterId: EntityId;
			durationMinutes: number;
	  }
	| {id: EntityId; type: 'wake'; characterId: EntityId}
	| {
			id: EntityId;
			type: 'exert';
			characterId: EntityId;
			fatigueGain: number;
	  };

export interface BodyAdvanceTrace {
	characterId: EntityId;
	elapsedMinutes: number;
	sleptMinutes: number;
	awakeMinutes: number;
	fatigueBefore: number;
	fatigueAfter: number;
	sleepDebtBefore: number;
	sleepDebtAfter: number;
	satietyBefore: number;
	satietyAfter: number;
	digestionBefore: number;
	digestionAfter: number;
}

export interface BodyEffectTrace {
	effectId: EntityId;
	characterId: EntityId;
	type: BodyStateEffect['type'];
	summary: string;
}

export interface BodyEffectApplication {
	state: CharacterBodyState;
	trace: BodyEffectTrace;
}

export type BodyActionKind = 'normal' | 'run' | 'fast-run';

export interface BodyActionBlocker {
	code: 'sleeping' | 'digesting-heavy-meal';
	message: string;
}

export interface BodyActionModifier {
	code: 'well-rested' | 'fatigue' | 'sleep-debt' | 'hungry';
	multiplier: number;
	message: string;
}

export interface BodyActionEvaluation {
	action: BodyActionKind;
	allowed: boolean;
	blockers: BodyActionBlocker[];
	modifiers: BodyActionModifier[];
	effortCostMultiplier: number;
	wellRested: boolean;
}

function clamp01(value: number) {
	return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function nonNegative(value: number) {
	return Math.max(0, Number.isFinite(value) ? value : 0);
}

export function createCharacterBodyState(
	characterId: EntityId,
	patch: Partial<Omit<CharacterBodyState, 'characterId'>> = {}
): CharacterBodyState {
	return {
		characterId,
		fatigue: clamp01(patch.fatigue ?? 0.05),
		sleepDebtMinutes: nonNegative(patch.sleepDebtMinutes ?? 0),
		satiety: clamp01(patch.satiety ?? 0.75),
		digestionRemainingMinutes: nonNegative(
			patch.digestionRemainingMinutes ?? 0
		),
		sleepRemainingMinutes: nonNegative(patch.sleepRemainingMinutes ?? 0)
	};
}

export function bodyStateIsValid(value: unknown): value is CharacterBodyState {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const candidate = value as Partial<CharacterBodyState>;
	return (
		typeof candidate.characterId === 'string' &&
		typeof candidate.fatigue === 'number' &&
		Number.isFinite(candidate.fatigue) &&
		candidate.fatigue >= 0 &&
		candidate.fatigue <= 1 &&
		typeof candidate.sleepDebtMinutes === 'number' &&
		Number.isFinite(candidate.sleepDebtMinutes) &&
		candidate.sleepDebtMinutes >= 0 &&
		typeof candidate.satiety === 'number' &&
		Number.isFinite(candidate.satiety) &&
		candidate.satiety >= 0 &&
		candidate.satiety <= 1 &&
		typeof candidate.digestionRemainingMinutes === 'number' &&
		Number.isFinite(candidate.digestionRemainingMinutes) &&
		candidate.digestionRemainingMinutes >= 0 &&
		typeof candidate.sleepRemainingMinutes === 'number' &&
		Number.isFinite(candidate.sleepRemainingMinutes) &&
		candidate.sleepRemainingMinutes >= 0
	);
}

export function bodyIsWellRested(
	state: CharacterBodyState,
	policy: BodyNeedsPolicy = defaultBodyNeedsPolicy
) {
	return (
		state.sleepRemainingMinutes <= 0 &&
		state.fatigue <= policy.wellRestedFatigueThreshold &&
		state.sleepDebtMinutes <= 0
	);
}

function recoverDuringSleep(
	fatigue: number,
	sleepDebtMinutes: number,
	sleepMinutes: number,
	policy: BodyNeedsPolicy
) {
	const recoveryWindow = Math.max(1, policy.sleepMinutesFromExhaustedToFresh);
	const fatigueRecoveryNeeded = clamp01(fatigue) * recoveryWindow;
	const fatigueRecoveryMinutes = Math.min(sleepMinutes, fatigueRecoveryNeeded);
	const nextFatigue = clamp01(fatigue - fatigueRecoveryMinutes / recoveryWindow);
	const debtRecoveryMinutes = Math.max(0, sleepMinutes - fatigueRecoveryMinutes);
	return {
		fatigue: nextFatigue,
		sleepDebtMinutes: Math.max(0, sleepDebtMinutes - debtRecoveryMinutes)
	};
}

function accumulateWhileAwake(
	fatigue: number,
	sleepDebtMinutes: number,
	awakeMinutes: number,
	policy: BodyNeedsPolicy
) {
	const fatigueWindow = Math.max(1, policy.awakeMinutesFromFreshToExhausted);
	const minutesUntilExhausted = (1 - clamp01(fatigue)) * fatigueWindow;
	const ordinaryAwakeMinutes = Math.min(awakeMinutes, minutesUntilExhausted);
	const exhaustedAwakeMinutes = Math.max(0, awakeMinutes - ordinaryAwakeMinutes);
	return {
		fatigue: clamp01(fatigue + ordinaryAwakeMinutes / fatigueWindow),
		sleepDebtMinutes:
			sleepDebtMinutes +
			exhaustedAwakeMinutes *
				Math.max(0, policy.sleepDebtPerExhaustedAwakeMinute)
	};
}

/**
 * Advances one character's body by elapsed simulation time. If a planned sleep
 * ends inside the interval, the remainder of the same interval is processed as
 * awake time. Digestion always advances with the clock.
 */
export function advanceCharacterBodyState(
	state: CharacterBodyState,
	elapsedMinutes: number,
	policy: BodyNeedsPolicy = defaultBodyNeedsPolicy
): {state: CharacterBodyState; trace: BodyAdvanceTrace} {
	if (!Number.isInteger(elapsedMinutes) || elapsedMinutes < 0) {
		throw new RangeError('elapsedMinutes must be a non-negative integer.');
	}
	const sleepMinutes = Math.min(elapsedMinutes, state.sleepRemainingMinutes);
	const awakeMinutes = elapsedMinutes - sleepMinutes;
	const afterSleep = recoverDuringSleep(
		state.fatigue,
		state.sleepDebtMinutes,
		sleepMinutes,
		policy
	);
	const afterAwake = accumulateWhileAwake(
		afterSleep.fatigue,
		afterSleep.sleepDebtMinutes,
		awakeMinutes,
		policy
	);
	const awakeSatietyDrop =
		awakeMinutes / Math.max(1, policy.awakeMinutesFromFullToEmpty);
	const sleepSatietyDrop =
		(sleepMinutes / Math.max(1, policy.awakeMinutesFromFullToEmpty)) *
		Math.max(0, policy.sleepSatietyRateMultiplier);
	const next: CharacterBodyState = {
		...state,
		fatigue: afterAwake.fatigue,
		sleepDebtMinutes: afterAwake.sleepDebtMinutes,
		satiety: clamp01(state.satiety - awakeSatietyDrop - sleepSatietyDrop),
		digestionRemainingMinutes: Math.max(
			0,
			state.digestionRemainingMinutes - elapsedMinutes
		),
		sleepRemainingMinutes: Math.max(0, state.sleepRemainingMinutes - elapsedMinutes)
	};

	return {
		state: next,
		trace: {
			characterId: state.characterId,
			elapsedMinutes,
			sleptMinutes: sleepMinutes,
			awakeMinutes,
			fatigueBefore: state.fatigue,
			fatigueAfter: next.fatigue,
			sleepDebtBefore: state.sleepDebtMinutes,
			sleepDebtAfter: next.sleepDebtMinutes,
			satietyBefore: state.satiety,
			satietyAfter: next.satiety,
			digestionBefore: state.digestionRemainingMinutes,
			digestionAfter: next.digestionRemainingMinutes
		}
	};
}

export function advanceBodyStateMap(
	bodyByCharacter: Record<string, CharacterBodyState>,
	elapsedMinutes: number,
	policy: BodyNeedsPolicy = defaultBodyNeedsPolicy
) {
	const states: Record<string, CharacterBodyState> = {};
	const traces: BodyAdvanceTrace[] = [];
	for (const characterId of Object.keys(bodyByCharacter).sort()) {
		const result = advanceCharacterBodyState(
			bodyByCharacter[characterId],
			elapsedMinutes,
			policy
		);
		states[characterId] = result.state;
		traces.push(result.trace);
	}
	return {states, traces};
}

export function createHeavyMealBodyEffect(
	id: EntityId,
	characterId: EntityId,
	satietyGain = 0.55,
	digestionMinutes = 30
): BodyStateEffect {
	return {
		id,
		type: 'eat',
		characterId,
		satietyGain,
		digestionMinutes
	};
}

export function applyBodyStateEffect(
	state: CharacterBodyState,
	effect: BodyStateEffect
): BodyEffectApplication {
	if (effect.characterId !== state.characterId) {
		throw new Error('Body effect character must match the body state character.');
	}
	let next = state;
	let summary = '';
	if (effect.type === 'eat') {
		next = {
			...state,
			satiety: clamp01(state.satiety + effect.satietyGain),
			digestionRemainingMinutes: Math.max(
				state.digestionRemainingMinutes,
				nonNegative(effect.digestionMinutes)
			)
		};
		summary = `Satiety ${state.satiety.toFixed(2)} → ${next.satiety.toFixed(2)}; digestion ${next.digestionRemainingMinutes} min.`;
	} else if (effect.type === 'sleep') {
		if (!Number.isInteger(effect.durationMinutes) || effect.durationMinutes < 1) {
			throw new RangeError('Sleep duration must be a positive integer.');
		}
		next = {
			...state,
			sleepRemainingMinutes: Math.max(
				state.sleepRemainingMinutes,
				effect.durationMinutes
			)
		};
		summary = `Planned sleep: ${next.sleepRemainingMinutes} min.`;
	} else if (effect.type === 'wake') {
		next = {...state, sleepRemainingMinutes: 0};
		summary = 'Character woke up.';
	} else {
		next = {...state, fatigue: clamp01(state.fatigue + effect.fatigueGain)};
		summary = `Fatigue ${state.fatigue.toFixed(2)} → ${next.fatigue.toFixed(2)}.`;
	}

	return {
		state: next,
		trace: {
			effectId: effect.id,
			characterId: effect.characterId,
			type: effect.type,
			summary
		}
	};
}

/**
 * Explains whether the body currently permits an action and which physical
 * state modifiers would change its effort cost. The function never executes
 * the action itself.
 */
export function evaluateBodyAction(
	state: CharacterBodyState,
	action: BodyActionKind,
	policy: BodyNeedsPolicy = defaultBodyNeedsPolicy
): BodyActionEvaluation {
	const blockers: BodyActionBlocker[] = [];
	const modifiers: BodyActionModifier[] = [];
	if (state.sleepRemainingMinutes > 0) {
		blockers.push({code: 'sleeping', message: 'Персонаж сейчас спит.'});
	}
	if (action === 'fast-run' && state.digestionRemainingMinutes > 0) {
		blockers.push({
			code: 'digesting-heavy-meal',
			message: `После плотной еды быстрый бег недоступен ещё ${Math.ceil(
				state.digestionRemainingMinutes
			)} мин.`
		});
	}

	let effortCostMultiplier = 1;
	const wellRested = bodyIsWellRested(state, policy);
	if (wellRested) {
		effortCostMultiplier *= policy.wellRestedEffortMultiplier;
		modifiers.push({
			code: 'well-rested',
			multiplier: policy.wellRestedEffortMultiplier,
			message: 'Персонаж выспался: физические усилия обходятся дешевле.'
		});
	}
	if (state.fatigue >= 0.75) {
		const multiplier = 1 + state.fatigue * 0.5;
		effortCostMultiplier *= multiplier;
		modifiers.push({
			code: 'fatigue',
			multiplier,
			message: 'Высокая усталость увеличивает стоимость физического усилия.'
		});
	}
	if (state.sleepDebtMinutes > 0) {
		const multiplier = 1 + Math.min(0.5, state.sleepDebtMinutes / (8 * 60) / 2);
		effortCostMultiplier *= multiplier;
		modifiers.push({
			code: 'sleep-debt',
			multiplier,
			message: 'Накопленный недосып дополнительно снижает выносливость.'
		});
	}
	if (state.satiety <= policy.hungrySatietyThreshold) {
		effortCostMultiplier *= policy.hungryEffortMultiplier;
		modifiers.push({
			code: 'hungry',
			multiplier: policy.hungryEffortMultiplier,
			message: 'Голод увеличивает стоимость физического усилия.'
		});
	}

	return {
		action,
		allowed: blockers.length === 0,
		blockers,
		modifiers,
		effortCostMultiplier,
		wellRested
	};
}
