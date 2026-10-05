import {EntityId} from './entities';

export type InjuryKind =
	| 'abrasion'
	| 'bruise'
	| 'cut'
	| 'ankle-sprain'
	| 'hand-injury'
	| 'back-pain'
	| 'headache'
	| 'serious';

export type InjuryBodyRegion =
	| 'general'
	| 'leg'
	| 'ankle'
	| 'hand'
	| 'back'
	| 'head';

export type PainLevel = 'none' | 'aching' | 'painful' | 'severe';
export type InjuryTreatmentState = 'untreated' | 'self-care' | 'medical-care';

export type PhysicalActionKind =
	| 'normal'
	| 'walk'
	| 'run'
	| 'fast-run'
	| 'climb'
	| 'carry-heavy'
	| 'use-tool'
	| 'focus'
	| 'sleep';

export interface InjuryState {
	id: EntityId;
	characterId: EntityId;
	kind: InjuryKind;
	region: InjuryBodyRegion;
	pain: PainLevel;
	/** Current recovery work remaining. Current condition, not historical HP. */
	recoveryRemainingMinutes: number;
	treatment: InjuryTreatmentState;
	/** Rare narrative injuries can leave a permanent visible trace after recovery. */
	leavesScar?: boolean;
}

export type InjuryEffect =
	| {id: EntityId; type: 'add'; injury: InjuryState}
	| {
			id: EntityId;
			type: 'treat';
			characterId: EntityId;
			injuryId: EntityId;
			treatment: InjuryTreatmentState;
			painReductionSteps?: number;
	  }
	| {
			id: EntityId;
			type: 'worsen';
			characterId: EntityId;
			injuryId: EntityId;
			additionalRecoveryMinutes: number;
			painIncreaseSteps?: number;
	  };

export interface InjuryActionBlocker {
	injuryId: EntityId;
	code: 'injury-blocks-action' | 'medical-care-required';
	message: string;
}

export interface InjuryActionModifier {
	injuryId: EntityId;
	code: 'injury-pain';
	multiplier: number;
	message: string;
}

export interface InjuryActionEvaluation {
	action: PhysicalActionKind;
	allowed: boolean;
	blockers: InjuryActionBlocker[];
	modifiers: InjuryActionModifier[];
	effortCostMultiplier: number;
}

export interface InjuryAdvanceTrace {
	injuryId: EntityId;
	characterId: EntityId;
	kind: InjuryKind;
	elapsedMinutes: number;
	sleepMinutes: number;
	recoveryAppliedMinutes: number;
	recoveryBefore: number;
	recoveryAfter: number;
	recovered: boolean;
	pausedForMedicalCare: boolean;
}

export interface InjuryEffectTrace {
	effectId: EntityId;
	characterId: EntityId;
	injuryId: EntityId;
	type: InjuryEffect['type'];
	summary: string;
}

export interface InjuryRecoveryPolicy {
	sleepRecoveryMultiplier: number;
}

export const defaultInjuryRecoveryPolicy: InjuryRecoveryPolicy = {
	sleepRecoveryMultiplier: 1.5
};

interface InjuryActionRule {
	action: PhysicalActionKind;
	minimumPain?: PainLevel;
	block?: boolean;
	multiplier?: number;
	message: string;
}

interface InjuryProfile {
	requiresMedicalCare: boolean;
	rules: InjuryActionRule[];
}

const painOrder: PainLevel[] = ['none', 'aching', 'painful', 'severe'];

const injuryProfiles: Record<InjuryKind, InjuryProfile> = {
	abrasion: {requiresMedicalCare: false, rules: []},
	bruise: {
		requiresMedicalCare: false,
		rules: [
			{
				action: 'sleep',
				minimumPain: 'painful',
				multiplier: 1.1,
				message: 'Ушиб мешает удобно устроиться и ухудшает восстановительный отдых.'
			}
		]
	},
	cut: {
		requiresMedicalCare: false,
		rules: [
			{
				action: 'use-tool',
				minimumPain: 'painful',
				multiplier: 1.15,
				message: 'Болезненный порез мешает точной физической работе.'
			}
		]
	},
	'ankle-sprain': {
		requiresMedicalCare: false,
		rules: [
			{
				action: 'walk',
				minimumPain: 'aching',
				multiplier: 1.25,
				message: 'Подвёрнутая лодыжка ускоряет утомление при ходьбе.'
			},
			{
				action: 'run',
				minimumPain: 'aching',
				multiplier: 1.6,
				message: 'Бег с травмированной лодыжкой требует гораздо больше усилий.'
			},
			{
				action: 'run',
				minimumPain: 'severe',
				block: true,
				message: 'Сильная боль в лодыжке не позволяет нормально бежать.'
			},
			{
				action: 'fast-run',
				minimumPain: 'painful',
				block: true,
				message: 'Быстрый бег недоступен из-за травмы лодыжки.'
			},
			{
				action: 'climb',
				minimumPain: 'aching',
				multiplier: 1.5,
				message: 'Подъёмы и лестницы тяжелее из-за травмированной ноги.'
			}
		]
	},
	'hand-injury': {
		requiresMedicalCare: false,
		rules: [
			{
				action: 'carry-heavy',
				minimumPain: 'painful',
				block: true,
				message: 'Повреждённая кисть не позволяет безопасно нести тяжёлый предмет.'
			},
			{
				action: 'climb',
				minimumPain: 'aching',
				multiplier: 1.4,
				message: 'Травма руки мешает уверенно держаться при лазании.'
			},
			{
				action: 'use-tool',
				minimumPain: 'aching',
				multiplier: 1.5,
				message: 'Травма кисти затрудняет работу инструментом.'
			}
		]
	},
	'back-pain': {
		requiresMedicalCare: false,
		rules: [
			{
				action: 'carry-heavy',
				minimumPain: 'painful',
				block: true,
				message: 'Боль в спине не позволяет безопасно нести тяжёлый груз.'
			},
			{
				action: 'walk',
				minimumPain: 'aching',
				multiplier: 1.15,
				message: 'Боль в спине делает долгую ходьбу тяжелее.'
			},
			{
				action: 'run',
				minimumPain: 'aching',
				multiplier: 1.3,
				message: 'Бег усиливает нагрузку на больную спину.'
			},
			{
				action: 'climb',
				minimumPain: 'painful',
				multiplier: 1.4,
				message: 'Подъём с больной спиной требует заметно больше усилий.'
			}
		]
	},
	headache: {
		requiresMedicalCare: false,
		rules: [
			{
				action: 'focus',
				minimumPain: 'aching',
				multiplier: 1.35,
				message: 'Головная боль мешает сосредоточиться.'
			}
		]
	},
	serious: {
		requiresMedicalCare: true,
		rules: [
			{
				action: 'walk',
				minimumPain: 'painful',
				multiplier: 1.5,
				message: 'Серьёзная травма заметно ограничивает движение.'
			},
			{
				action: 'walk',
				minimumPain: 'severe',
				block: true,
				message: 'При такой боли обычная ходьба небезопасна.'
			},
			{
				action: 'run',
				minimumPain: 'aching',
				block: true,
				message: 'Серьёзная травма исключает бег.'
			},
			{
				action: 'fast-run',
				minimumPain: 'aching',
				block: true,
				message: 'Серьёзная травма исключает быстрый бег.'
			},
			{
				action: 'climb',
				minimumPain: 'aching',
				block: true,
				message: 'Серьёзная травма не позволяет безопасно лазать.'
			},
			{
				action: 'carry-heavy',
				minimumPain: 'aching',
				block: true,
				message: 'Серьёзная травма исключает перенос тяжестей.'
			},
			{
				action: 'focus',
				minimumPain: 'painful',
				multiplier: 1.25,
				message: 'Сильная боль затрудняет концентрацию.'
			}
		]
	}
};

function painRank(pain: PainLevel) {
	return painOrder.indexOf(pain);
}

function treatmentRank(treatment: InjuryTreatmentState) {
	return ['untreated', 'self-care', 'medical-care'].indexOf(treatment);
}

function painWithDelta(pain: PainLevel, delta: number) {
	const index = Math.max(0, Math.min(painOrder.length - 1, painRank(pain) + delta));
	return painOrder[index];
}

export function injuryStateIsValid(value: unknown): value is InjuryState {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const candidate = value as Partial<InjuryState>;
	return (
		typeof candidate.id === 'string' &&
		typeof candidate.characterId === 'string' &&
		candidate.kind !== undefined &&
		candidate.kind in injuryProfiles &&
		(candidate.region === 'general' ||
			candidate.region === 'leg' ||
			candidate.region === 'ankle' ||
			candidate.region === 'hand' ||
			candidate.region === 'back' ||
			candidate.region === 'head') &&
		candidate.pain !== undefined &&
		painOrder.includes(candidate.pain) &&
		typeof candidate.recoveryRemainingMinutes === 'number' &&
		Number.isFinite(candidate.recoveryRemainingMinutes) &&
		candidate.recoveryRemainingMinutes >= 0 &&
		(candidate.treatment === 'untreated' ||
			candidate.treatment === 'self-care' ||
			candidate.treatment === 'medical-care') &&
		(candidate.leavesScar === undefined || typeof candidate.leavesScar === 'boolean')
	);
}

export function injuryRequiresMedicalCare(injury: InjuryState) {
	return injuryProfiles[injury.kind].requiresMedicalCare;
}

export function evaluateInjuryAction(
	injuries: InjuryState[],
	action: PhysicalActionKind
): InjuryActionEvaluation {
	const blockers: InjuryActionBlocker[] = [];
	const modifiers: InjuryActionModifier[] = [];
	let effortCostMultiplier = 1;

	for (const injury of [...injuries].sort((a, b) => a.id.localeCompare(b.id))) {
		const profile = injuryProfiles[injury.kind];
		for (const rule of profile.rules) {
			if (
				rule.action !== action ||
				(rule.minimumPain !== undefined &&
					painRank(injury.pain) < painRank(rule.minimumPain))
			) {
				continue;
			}
			if (rule.block) {
				blockers.push({
					injuryId: injury.id,
					code: 'injury-blocks-action',
					message: rule.message
				});
			} else if (rule.multiplier !== undefined && rule.multiplier > 0) {
				effortCostMultiplier *= rule.multiplier;
				modifiers.push({
					injuryId: injury.id,
					code: 'injury-pain',
					multiplier: rule.multiplier,
					message: rule.message
				});
			}
		}
	}

	return {
		action,
		allowed: blockers.length === 0,
		blockers,
		modifiers,
		effortCostMultiplier
	};
}

export function advanceInjuryState(
	injury: InjuryState,
	elapsedMinutes: number,
	sleepMinutes = 0,
	policy: InjuryRecoveryPolicy = defaultInjuryRecoveryPolicy
): {injury?: InjuryState; trace: InjuryAdvanceTrace} {
	if (!Number.isInteger(elapsedMinutes) || elapsedMinutes < 0) {
		throw new RangeError('elapsedMinutes must be a non-negative integer.');
	}
	if (!Number.isInteger(sleepMinutes) || sleepMinutes < 0 || sleepMinutes > elapsedMinutes) {
		throw new RangeError('sleepMinutes must be within the elapsed interval.');
	}
	const profile = injuryProfiles[injury.kind];
	const pausedForMedicalCare =
		profile.requiresMedicalCare && injury.treatment !== 'medical-care';
	const awakeMinutes = elapsedMinutes - sleepMinutes;
	const recoveryAppliedMinutes = pausedForMedicalCare
		? 0
		: awakeMinutes +
		  sleepMinutes * Math.max(1, policy.sleepRecoveryMultiplier);
	const recoveryAfter = Math.max(
		0,
		injury.recoveryRemainingMinutes - recoveryAppliedMinutes
	);
	const recovered = recoveryAfter <= 0;

	return {
		injury: recovered ? undefined : {...injury, recoveryRemainingMinutes: recoveryAfter},
		trace: {
			injuryId: injury.id,
			characterId: injury.characterId,
			kind: injury.kind,
			elapsedMinutes,
			sleepMinutes,
			recoveryAppliedMinutes,
			recoveryBefore: injury.recoveryRemainingMinutes,
			recoveryAfter,
			recovered,
			pausedForMedicalCare
		}
	};
}

export function advanceInjuryStateMap(
	injuriesByCharacter: Record<string, InjuryState[]>,
	elapsedMinutes: number,
	sleepMinutesByCharacter: Record<string, number> = {},
	policy: InjuryRecoveryPolicy = defaultInjuryRecoveryPolicy
) {
	const states: Record<string, InjuryState[]> = {};
	const traces: InjuryAdvanceTrace[] = [];
	for (const characterId of Object.keys(injuriesByCharacter).sort()) {
		const next: InjuryState[] = [];
		for (const injury of [...injuriesByCharacter[characterId]].sort((a, b) =>
			a.id.localeCompare(b.id)
		)) {
			const advanced = advanceInjuryState(
				injury,
				elapsedMinutes,
				Math.min(elapsedMinutes, sleepMinutesByCharacter[characterId] ?? 0),
				policy
			);
			if (advanced.injury) {
				next.push(advanced.injury);
			}
			traces.push(advanced.trace);
		}
		states[characterId] = next;
	}
	return {states, traces};
}

export function applyInjuryEffect(
	injuries: InjuryState[],
	effect: InjuryEffect
): {injuries: InjuryState[]; trace: InjuryEffectTrace} {
	if (effect.type === 'add') {
		if (!injuryStateIsValid(effect.injury)) {
			throw new Error('Invalid injury state.');
		}
		if (injuries.some(injury => injury.id === effect.injury.id)) {
			throw new Error(`Injury already exists: ${effect.injury.id}`);
		}
		return {
			injuries: [...injuries, effect.injury],
			trace: {
				effectId: effect.id,
				characterId: effect.injury.characterId,
				injuryId: effect.injury.id,
				type: effect.type,
				summary: `Added ${effect.injury.kind} (${effect.injury.pain}).`
			}
		};
	}

	const index = injuries.findIndex(
		injury => injury.id === effect.injuryId && injury.characterId === effect.characterId
	);
	if (index < 0) {
		throw new Error(`Unknown injury: ${effect.injuryId}`);
	}
	const current = injuries[index];
	let next = current;
	let summary = '';
	if (effect.type === 'treat') {
		const treatment =
			treatmentRank(effect.treatment) > treatmentRank(current.treatment)
				? effect.treatment
				: current.treatment;
		next = {
			...current,
			treatment,
			pain: painWithDelta(current.pain, -Math.max(0, effect.painReductionSteps ?? 0))
		};
		summary = `Treatment ${current.treatment} → ${next.treatment}; pain ${current.pain} → ${next.pain}.`;
	} else {
		next = {
			...current,
			recoveryRemainingMinutes:
				current.recoveryRemainingMinutes +
				Math.max(0, effect.additionalRecoveryMinutes),
			pain: painWithDelta(current.pain, Math.max(0, effect.painIncreaseSteps ?? 0))
		};
		summary = `Injury worsened; recovery ${next.recoveryRemainingMinutes} min, pain ${next.pain}.`;
	}

	return {
		injuries: injuries.map((injury, injuryIndex) =>
			injuryIndex === index ? next : injury
		),
		trace: {
			effectId: effect.id,
			characterId: effect.characterId,
			injuryId: effect.injuryId,
			type: effect.type,
			summary
		}
	};
}
