import {RelationshipState} from './cognition';
import {EntityId} from './entities';
import {
	NarrativeConditionDefinition,
	NarrativeGuardDefinition,
	NarrativeKnowledgeEffectDefinition,
	NarrativeMoveDefinition,
	NarrativeOutcomeDefinition
} from './interaction';
import {ItemInstance} from './items';
import {
	CharacterKnowledgeState,
	characterKnowledgeStateId,
	KnowledgeMoment,
	KnowledgeSource
} from './knowledge';
import {StoryNodeDefinition} from './story';

export type NarrativeConditionStatus = 'met' | 'unmet' | 'unknown';

export interface NarrativeRuntimeEvaluationContext {
	characterKnowledge: CharacterKnowledgeState[];
	itemInstances: ItemInstance[];
	relationships: RelationshipState[];
	storyNodes: StoryNodeDefinition[];
	actualLocationByCharacter: Record<string, string | undefined>;
}

export interface NarrativeConditionTrace {
	condition: NarrativeConditionDefinition;
	status: NarrativeConditionStatus;
	summary: string;
}

export interface NarrativeGuardTrace extends NarrativeConditionTrace {
	guardId: EntityId;
	label?: string;
	negated: boolean;
}

export interface NarrativeGuardEvaluation {
	available: boolean;
	traces: NarrativeGuardTrace[];
}

function flipStatus(status: NarrativeConditionStatus): NarrativeConditionStatus {
	if (status === 'met') {
		return 'unmet';
	}
	if (status === 'unmet') {
		return 'met';
	}
	return 'unknown';
}

/**
 * Runtime awareness is represented by the existence of a per-character Claim
 * state. A character may know that a Claim exists while doubting or rejecting
 * it, so attitude is intentionally not checked here.
 */
export function characterIsAwareOfClaim(
	knowledge: CharacterKnowledgeState[],
	characterId: EntityId,
	claimId: EntityId
) {
	return knowledge.some(
		state => state.characterId === characterId && state.claimId === claimId
	);
}

export function evaluateNarrativeCondition(
	condition: NarrativeConditionDefinition,
	context: NarrativeRuntimeEvaluationContext
): NarrativeConditionTrace {
	switch (condition.type) {
		case 'character-knows-claim': {
			const met = characterIsAwareOfClaim(
				context.characterKnowledge,
				condition.characterId,
				condition.claimId
			);
			return {
				condition,
				status: met ? 'met' : 'unmet',
				summary: met
					? 'У персонажа есть состояние знания для этого Claim.'
					: 'У персонажа нет состояния знания для этого Claim.'
			};
		}
		case 'character-has-item': {
			const item = context.itemInstances.find(
				candidate => candidate.id === condition.itemInstanceId
			);
			if (!item) {
				return {
					condition,
					status: 'unknown',
					summary: 'Экземпляр предмета не найден в runtime-контексте.'
				};
			}
			const met =
				item.placement.type === 'character' &&
				item.placement.characterId === condition.characterId;
			return {
				condition,
				status: met ? 'met' : 'unmet',
				summary: met
					? 'Предмет находится у персонажа.'
					: 'Предмет не находится у персонажа.'
			};
		}
		case 'relationship-at-least': {
			const relationship = context.relationships.find(
				candidate =>
					candidate.fromCharacterId === condition.fromCharacterId &&
					candidate.toCharacterId === condition.toCharacterId
			);
			const value = relationship?.values[condition.axis];
			if (value === undefined) {
				return {
					condition,
					status: 'unknown',
					summary: `Нет значения отношения по оси «${condition.axis}».`
				};
			}
			const met = value >= condition.value;
			return {
				condition,
				status: met ? 'met' : 'unmet',
				summary: `${condition.axis}: ${value}; требуется не меньше ${condition.value}.`
			};
		}
		case 'story-node-state': {
			const node = context.storyNodes.find(
				candidate => candidate.id === condition.storyNodeId
			);
			if (!node) {
				return {
					condition,
					status: 'unknown',
					summary: 'Story node не найден в runtime-контексте.'
				};
			}
			const met = node.activationState === condition.state;
			return {
				condition,
				status: met ? 'met' : 'unmet',
				summary: `Состояние Story node: ${node.activationState}; требуется ${condition.state}.`
			};
		}
		case 'characters-share-location': {
			const locations = condition.characterIds.map(
				id => context.actualLocationByCharacter[id]
			);
			if (locations.some(locationId => !locationId)) {
				return {
					condition,
					status: 'unknown',
					summary: 'Не для всех персонажей известна фактическая локация.'
				};
			}
			const [first, ...rest] = locations;
			const met = rest.every(locationId => locationId === first);
			return {
				condition,
				status: met ? 'met' : 'unmet',
				summary: met
					? 'Персонажи находятся в одной локации.'
					: 'Персонажи находятся в разных локациях.'
			};
		}
	}
}

export function evaluateNarrativeGuards(
	guards: NarrativeGuardDefinition[],
	context: NarrativeRuntimeEvaluationContext
): NarrativeGuardEvaluation {
	const traces = guards.map(guard => {
		const result = evaluateNarrativeCondition(guard.condition, context);
		return {
			...result,
			guardId: guard.id,
			label: guard.label,
			negated: Boolean(guard.negated),
			status: guard.negated ? flipStatus(result.status) : result.status
		};
	});

	return {
		available: traces.every(trace => trace.status === 'met'),
		traces
	};
}

export interface NarrativeKnowledgeEffectRuntimeContext {
	moment?: KnowledgeMoment;
	sourceEventId?: EntityId;
}

export interface NarrativeKnowledgeEffectTrace {
	effectId: EntityId;
	characterId: EntityId;
	claimId: EntityId;
	previousState?: CharacterKnowledgeState;
	nextState: CharacterKnowledgeState;
}

export interface NarrativeKnowledgeEffectApplication {
	characterKnowledge: CharacterKnowledgeState[];
	traces: NarrativeKnowledgeEffectTrace[];
}

function resolveKnowledgeEffectCharacter(
	move: NarrativeMoveDefinition,
	effect: NarrativeKnowledgeEffectDefinition
): EntityId {
	if (effect.recipient.type === 'character') {
		return effect.recipient.characterId;
	}
	const target = move.targetCharacterIds[effect.recipient.targetIndex];
	if (!target) {
		throw new Error('Narrative knowledge effect points to a missing move target.');
	}
	return target;
}

function resolveKnowledgeEffectClaim(
	move: NarrativeMoveDefinition,
	effect: NarrativeKnowledgeEffectDefinition
): EntityId {
	if (effect.claim.type === 'claim') {
		return effect.claim.claimId;
	}
	if (!move.communicatedClaimId) {
		throw new Error(
			'Narrative knowledge effect requires a communicated Claim on the move.'
		);
	}
	return move.communicatedClaimId;
}

function resolveKnowledgeEffectSource(
	move: NarrativeMoveDefinition,
	effect: NarrativeKnowledgeEffectDefinition,
	context: NarrativeKnowledgeEffectRuntimeContext
): KnowledgeSource {
	switch (effect.source.type) {
		case 'authored':
			return {type: 'authored'};
		case 'move-actor':
			if (!move.actorCharacterId) {
				throw new Error(
					'Narrative knowledge effect requires an actor to be used as the source.'
				);
			}
			return {
				type: 'told',
				sourceCharacterId: move.actorCharacterId,
				sourceEventId: context.sourceEventId
			};
		case 'observed':
			return {type: 'observed', sourceEventId: context.sourceEventId};
		case 'inferred':
			return {type: 'inferred', sourceEventId: context.sourceEventId};
	}
}

/**
 * Applies only knowledge effects from a resolved Outcome. It is pure: authored
 * Move/Outcome definitions and the input runtime array are never mutated.
 */
export function applyNarrativeOutcomeKnowledgeEffects(
	move: NarrativeMoveDefinition,
	outcome: NarrativeOutcomeDefinition,
	currentKnowledge: CharacterKnowledgeState[],
	context: NarrativeKnowledgeEffectRuntimeContext = {}
): NarrativeKnowledgeEffectApplication {
	let characterKnowledge = [...currentKnowledge];
	const traces: NarrativeKnowledgeEffectTrace[] = [];

	for (const effect of outcome.effects ?? []) {
		if (effect.type !== 'character-learns-claim') {
			continue;
		}

		const characterId = resolveKnowledgeEffectCharacter(move, effect);
		const claimId = resolveKnowledgeEffectClaim(move, effect);
		const source = resolveKnowledgeEffectSource(move, effect, context);
		const index = characterKnowledge.findIndex(
			state => state.characterId === characterId && state.claimId === claimId
		);
		const previousState = index >= 0 ? characterKnowledge[index] : undefined;
		const nextState: CharacterKnowledgeState = previousState
			? {
					...previousState,
					attitude: effect.attitude,
					confidence: effect.confidence,
					source,
					lastReinforcedAt: context.moment ?? previousState.lastReinforcedAt,
					timesHeard: previousState.timesHeard + 1
			  }
			: {
					id: characterKnowledgeStateId(characterId, claimId),
					characterId,
					claimId,
					attitude: effect.attitude,
					confidence: effect.confidence,
					source,
					learnedAt: context.moment,
					timesHeard: 1
			  };

		if (index >= 0) {
			characterKnowledge = characterKnowledge.map((state, stateIndex) =>
				stateIndex === index ? nextState : state
			);
		} else {
			characterKnowledge = [...characterKnowledge, nextState];
		}

		traces.push({
			effectId: effect.id,
			characterId,
			claimId,
			previousState,
			nextState
		});
	}

	return {characterKnowledge, traces};
}
