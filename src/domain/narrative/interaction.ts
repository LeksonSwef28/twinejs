import {EntityId} from './entities';
import {StoryNodeActivationState} from './story';

/**
 * A move describes what an actor is trying to do in a narrative interaction.
 * It does not prescribe how that move is resolved: ordinary lines, conditions
 * and later skill checks all share the same move/outcome structure.
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
 * Speaker intent is deliberately separate from Claim truth. A character may
 * sincerely repeat a false Claim or deliberately deceive with a true fragment.
 */
export type CommunicationIntent =
	| 'inform'
	| 'deceive'
	| 'persuade'
	| 'accuse'
	| 'speculate'
	| 'conceal'
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
 * Skill-check resolution is intentionally not part of A20. It will extend this
 * union in A21 without changing NarrativeMove or NarrativeOutcome.
 */
export type NarrativeResolutionDefinition =
	| {type: 'automatic'; outcomeId: EntityId}
	| {
			type: 'condition';
			condition: NarrativeConditionDefinition;
			trueOutcomeId: EntityId;
			falseOutcomeId: EntityId;
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

	if (move.resolution.type === 'automatic') {
		return outcomeIds.has(move.resolution.outcomeId);
	}

	return (
		outcomeIds.has(move.resolution.trueOutcomeId) &&
		outcomeIds.has(move.resolution.falseOutcomeId)
	);
}
