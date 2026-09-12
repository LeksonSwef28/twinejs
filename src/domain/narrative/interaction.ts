import {EntityId} from './entities';
import {StoryNodeActivationState} from './story';

/**
 * A move describes what an actor is trying to do in a narrative interaction.
 * It does not prescribe how that move is resolved: ordinary lines, conditions
 * and skill checks all share the same move/outcome structure.
 */
export type NarrativeMoveKind =
	| 'ask'
	| 'inform'
	| 'persuade'
	| 'deceive'
	| 'threaten'
	| 'accuse'
	| 'investigate'
	| 'observe'
	| 'joke'
	| 'flirt'
	| 'refuse'
	| 'give-item'
	| 'take-item'
	| 'leave'
	| 'custom';

/**
 * Speaker intent is deliberately separate from Claim truth and from the kind
 * of move. "Persuade" or "accuse" describes the action; this field describes
 * the speaker's epistemic/communication stance while doing it.
 */
export type CommunicationIntent =
	| 'honest'
	| 'deceptive'
	| 'mistaken'
	| 'uncertain'
	| 'withholding'
	| 'other';

export type NarrativeConditionDefinition =
	| {
			type: 'character-knows-claim';
			characterId: EntityId;
			claimId: EntityId;
	  }
	| {
			type: 'character-has-item';
			characterId: EntityId;
			itemInstanceId: EntityId;
	  }
	| {
			type: 'relationship-at-least';
			fromCharacterId: EntityId;
			toCharacterId: EntityId;
			axis: string;
			value: number;
	  }
	| {
			type: 'story-node-state';
			storyNodeId: EntityId;
			state: StoryNodeActivationState;
	  }
	| {
			type: 'characters-share-location';
			characterIds: EntityId[];
	  };

export interface NarrativeGuardDefinition {
	id: EntityId;
	label?: string;
	condition: NarrativeConditionDefinition;
	negated?: boolean;
}

export interface NarrativeOutcomeDefinition {
	id: EntityId;
	/** Stable semantic key such as continue/success/failure. */
	key: string;
	label: string;
	/** Story effects/continuations remain canonical Story nodes, not duplicated here. */
	effectStoryNodeIds: EntityId[];
}

/**
 * A21 keeps the roll rule tagged instead of baking one concrete dice system
 * into Story. More resolver families can extend this union later.
 */
export interface NarrativeDiceRollRuleDefinition {
	type: 'dice';
	diceCount: number;
	dieSides: number;
}

export interface NarrativeSkillCheckModifierDefinition {
	id: EntityId;
	label: string;
	value: number;
}

export type NarrativeSkillCheckRetryPolicy = 'never' | 'once' | 'repeatable';

export interface NarrativeSkillCheckDefinition {
	/**
	 * Stable authoring key for a skill/stat. Canonical reusable SkillDefinition
	 * entities may replace/resolve this key later without changing the resolver.
	 */
	skillKey: string;
	difficulty: number;
	rollRule: NarrativeDiceRollRuleDefinition;
	modifiers: NarrativeSkillCheckModifierDefinition[];
	successOutcomeId: EntityId;
	failureOutcomeId: EntityId;
	retryPolicy?: NarrativeSkillCheckRetryPolicy;
}

export type NarrativeResolutionDefinition =
	| {type: 'automatic'; outcomeId: EntityId}
	| {
			type: 'condition';
			condition: NarrativeConditionDefinition;
			trueOutcomeId: EntityId;
			falseOutcomeId: EntityId;
	  }
	| {
			type: 'skill-check';
			check: NarrativeSkillCheckDefinition;
	  };

export interface NarrativeMoveDefinition {
	id: EntityId;
	/** Story node that owns/authors this interaction move. */
	storyNodeId: EntityId;
	kind: NarrativeMoveKind;
	label: string;
	actorCharacterId?: EntityId;
	targetCharacterIds: EntityId[];
	communicatedClaimId?: EntityId;
	communicationIntent?: CommunicationIntent;
	guards: NarrativeGuardDefinition[];
	resolution: NarrativeResolutionDefinition;
	outcomes: NarrativeOutcomeDefinition[];
}

export interface NarrativeSkillCheckResolutionInput {
	/** Current runtime value of the referenced skill/stat. */
	skillValue: number;
	/** Dice result supplied by runtime/random adapter. The domain never rolls itself. */
	rollTotal: number;
}

export interface NarrativeSkillCheckResolutionTrace {
	skillKey: string;
	difficulty: number;
	rollTotal: number;
	skillValue: number;
	modifierTotal: number;
	total: number;
	succeeded: boolean;
	outcomeId: EntityId;
}

export function createDefaultNarrativeOutcome(
	moveId: EntityId
): NarrativeOutcomeDefinition {
	return {
		id: `${moveId}:outcome:continue`,
		key: 'continue',
		label: 'Продолжить',
		effectStoryNodeIds: []
	};
}

export function createDefaultSkillCheckOutcomes(
	moveId: EntityId
): [NarrativeOutcomeDefinition, NarrativeOutcomeDefinition] {
	return [
		{
			id: `${moveId}:outcome:success`,
			key: 'success',
			label: 'Успех',
			effectStoryNodeIds: []
		},
		{
			id: `${moveId}:outcome:failure`,
			key: 'failure',
			label: 'Провал',
			effectStoryNodeIds: []
		}
	];
}

function skillCheckIsStructurallyValid(
	check: NarrativeSkillCheckDefinition,
	outcomeIds: Set<string>
): boolean {
	if (
		!check.skillKey.trim() ||
		!Number.isFinite(check.difficulty) ||
		!Number.isInteger(check.rollRule.diceCount) ||
		check.rollRule.diceCount < 1 ||
		!Number.isInteger(check.rollRule.dieSides) ||
		check.rollRule.dieSides < 2 ||
		check.successOutcomeId === check.failureOutcomeId ||
		!outcomeIds.has(check.successOutcomeId) ||
		!outcomeIds.has(check.failureOutcomeId)
	) {
		return false;
	}

	const modifierIds = new Set<string>();
	for (const modifier of check.modifiers) {
		if (
			!modifier.id ||
			!modifier.label.trim() ||
			!Number.isFinite(modifier.value) ||
			modifierIds.has(modifier.id)
		) {
			return false;
		}
		modifierIds.add(modifier.id);
	}

	return true;
}

/**
 * Checks only the self-contained shape of a move. References to project
 * characters/claims/items/story nodes are validated at the application/store
 * boundary where the whole NarrativeProject is available.
 */
export function narrativeMoveIsStructurallyValid(
	move: NarrativeMoveDefinition
): boolean {
	if (!move.label.trim() || move.outcomes.length === 0) {
		return false;
	}

	const outcomeIds = new Set<string>();
	const outcomeKeys = new Set<string>();
	for (const outcome of move.outcomes) {
		if (
			!outcome.id ||
			!outcome.key.trim() ||
			!outcome.label.trim() ||
			outcomeIds.has(outcome.id) ||
			outcomeKeys.has(outcome.key)
		) {
			return false;
		}
		outcomeIds.add(outcome.id);
		outcomeKeys.add(outcome.key);
	}

	const guardIds = new Set<string>();
	for (const guard of move.guards) {
		if (!guard.id || guardIds.has(guard.id)) {
			return false;
		}
		guardIds.add(guard.id);
	}

	switch (move.resolution.type) {
		case 'automatic':
			return outcomeIds.has(move.resolution.outcomeId);
		case 'condition':
			return (
				outcomeIds.has(move.resolution.trueOutcomeId) &&
				outcomeIds.has(move.resolution.falseOutcomeId)
			);
		case 'skill-check':
			return skillCheckIsStructurallyValid(move.resolution.check, outcomeIds);
	}
}

/**
 * Deterministic A21 resolver. Runtime supplies a concrete roll and the current
 * skill value; this function only evaluates authored rules and returns a trace.
 */
export function resolveNarrativeSkillCheck(
	resolution: Extract<NarrativeResolutionDefinition, {type: 'skill-check'}>,
	input: NarrativeSkillCheckResolutionInput
): NarrativeSkillCheckResolutionTrace {
	const {check} = resolution;
	const minimumRoll = check.rollRule.diceCount;
	const maximumRoll = check.rollRule.diceCount * check.rollRule.dieSides;

	if (
		!Number.isFinite(input.skillValue) ||
		!Number.isInteger(input.rollTotal) ||
		input.rollTotal < minimumRoll ||
		input.rollTotal > maximumRoll
	) {
		throw new RangeError('Skill check input is outside the authored roll rule.');
	}

	const modifierTotal = check.modifiers.reduce(
		(total, modifier) => total + modifier.value,
		0
	);
	const total = input.rollTotal + input.skillValue + modifierTotal;
	const succeeded = total >= check.difficulty;

	return {
		skillKey: check.skillKey,
		difficulty: check.difficulty,
		rollTotal: input.rollTotal,
		skillValue: input.skillValue,
		modifierTotal,
		total,
		succeeded,
		outcomeId: succeeded ? check.successOutcomeId : check.failureOutcomeId
	};
}
