import {CharacterMindState, MemorySource, MemoryTrace, RelationshipState} from './cognition';
import {EntityId} from './entities';
import {
	NarrativeCharacterReferenceDefinition,
	NarrativeEffectDefinition,
	NarrativeMemoryEffectDefinition,
	NarrativeMoveDefinition,
	NarrativeOutcomeDefinition
} from './interaction';
import {
	applyNarrativeOutcomeKnowledgeEffects,
	NarrativeKnowledgeEffectRuntimeContext
} from './interaction-runtime';
import {ItemInstance, ItemPlacement} from './items';
import {CharacterKnowledgeState} from './knowledge';
import {createOrReinforceMemory} from './memory';
import {StoryNodeDefinition} from './story';

export interface NarrativeOutcomeRuntimeState {
	characterKnowledge: CharacterKnowledgeState[];
	relationships: RelationshipState[];
	mindStates: CharacterMindState[];
	itemInstances: ItemInstance[];
	storyNodes: StoryNodeDefinition[];
	/** Optional only so pre-A31 callers remain source-compatible. */
	memories?: MemoryTrace[];
}

export interface NarrativeOutcomeEffectTrace {
	effectId: EntityId;
	type: NarrativeEffectDefinition['type'];
	summary: string;
}

export interface NarrativeOutcomeEffectApplication {
	state: NarrativeOutcomeRuntimeState;
	traces: NarrativeOutcomeEffectTrace[];
}

function resolveCharacterReference(
	move: NarrativeMoveDefinition,
	reference: NarrativeCharacterReferenceDefinition
): EntityId {
	switch (reference.type) {
		case 'character':
			return reference.characterId;
		case 'move-actor':
			if (!move.actorCharacterId) {
				throw new Error('Outcome effect requires a move actor.');
			}
			return move.actorCharacterId;
		case 'move-target': {
			const target = move.targetCharacterIds[reference.targetIndex];
			if (!target) {
				throw new Error('Outcome effect points to a missing move target.');
			}
			return target;
		}
	}
}

function resolveItemPlacement(
	move: NarrativeMoveDefinition,
	effect: Extract<NarrativeEffectDefinition, {type: 'item-set-placement'}>
): ItemPlacement {
	switch (effect.placement.type) {
		case 'unplaced':
			return {type: 'unplaced'};
		case 'location':
			return {type: 'location', locationId: effect.placement.locationId};
		case 'character':
			return {
				type: 'character',
				characterId: resolveCharacterReference(move, effect.placement.character)
			};
	}
}

function resolveMemorySource(
	move: NarrativeMoveDefinition,
	outcome: NarrativeOutcomeDefinition,
	effect: NarrativeMemoryEffectDefinition
): {source: MemorySource; relatedEntityIds: EntityId[]} {
	switch (effect.source.type) {
		case 'current-move':
			return {
				source: {type: 'narrative-move', moveId: move.id, outcomeId: outcome.id},
				relatedEntityIds: [
					move.id,
					move.storyNodeId,
					...(move.communicatedClaimId ? [move.communicatedClaimId] : [])
				]
			};
		case 'owning-story-node':
			return {
				source: {type: 'story-node', storyNodeId: move.storyNodeId},
				relatedEntityIds: [move.storyNodeId]
			};
		case 'communicated-claim':
			if (!move.communicatedClaimId) {
				throw new Error('Memory effect requires a communicated Claim on the move.');
			}
			return {
				source: {type: 'claim', claimId: move.communicatedClaimId},
				relatedEntityIds: [move.communicatedClaimId, move.storyNodeId]
			};
	}
}

/**
 * A29/A31 runtime projection for typed Outcome effects. It is intentionally pure:
 * authored Move/Outcome definitions are never mutated and random/selection
 * decisions happen before this function is called.
 */
export function applyNarrativeOutcomeEffects(
	move: NarrativeMoveDefinition,
	outcome: NarrativeOutcomeDefinition,
	input: NarrativeOutcomeRuntimeState,
	context: NarrativeKnowledgeEffectRuntimeContext = {}
): NarrativeOutcomeEffectApplication {
	let state: NarrativeOutcomeRuntimeState = {
		characterKnowledge: [...input.characterKnowledge],
		relationships: input.relationships.map(relationship => ({
			...relationship,
			values: {...relationship.values}
		})),
		mindStates: input.mindStates.map(mind => ({...mind})),
		itemInstances: input.itemInstances.map(item => ({...item, placement: {...item.placement}})),
		storyNodes: input.storyNodes.map(node => ({...node})),
		memories: (input.memories ?? []).map(memory => ({
			...memory,
			tags: [...memory.tags],
			relatedEntityIds: [...memory.relatedEntityIds]
		}))
	};
	const traces: NarrativeOutcomeEffectTrace[] = [];

	for (const effect of outcome.effects ?? []) {
		switch (effect.type) {
			case 'character-learns-claim': {
				const knowledge = applyNarrativeOutcomeKnowledgeEffects(
					move,
					{...outcome, effects: [effect]},
					state.characterKnowledge,
					context
				);
				state = {...state, characterKnowledge: knowledge.characterKnowledge};
				const trace = knowledge.traces[0];
				traces.push({
					effectId: effect.id,
					type: effect.type,
					summary: trace
						? `Character ${trace.characterId} получил/усилил Claim ${trace.claimId}.`
						: 'Knowledge effect не изменил состояние.'
				});
				break;
			}
			case 'relationship-adjust': {
				const fromCharacterId = resolveCharacterReference(move, effect.from);
				const toCharacterId = resolveCharacterReference(move, effect.to);
				const index = state.relationships.findIndex(
					relationship =>
						relationship.fromCharacterId === fromCharacterId &&
						relationship.toCharacterId === toCharacterId
				);
				const previous = index >= 0 ? state.relationships[index] : undefined;
				const previousValue = previous?.values[effect.axis] ?? 0;
				const next: RelationshipState = {
					fromCharacterId,
					toCharacterId,
					values: {...previous?.values, [effect.axis]: previousValue + effect.delta}
				};
				state = {
					...state,
					relationships:
						index >= 0
							? state.relationships.map((relationship, relationshipIndex) =>
									relationshipIndex === index ? next : relationship
							  )
							: [...state.relationships, next]
				};
				traces.push({
					effectId: effect.id,
					type: effect.type,
					summary: `${effect.axis}: ${previousValue} → ${previousValue + effect.delta}.`
				});
				break;
			}
			case 'character-mood-set': {
				const characterId = resolveCharacterReference(move, effect.character);
				const index = state.mindStates.findIndex(
					mind => mind.characterId === characterId
				);
				const previous = index >= 0 ? state.mindStates[index] : undefined;
				const next: CharacterMindState = previous
					? {...previous, mood: effect.mood}
					: {
							characterId,
							mood: effect.mood,
							activeMemoryIds: [],
							pendingReactionIds: []
					  };
				state = {
					...state,
					mindStates:
						index >= 0
							? state.mindStates.map((mind, mindIndex) =>
									mindIndex === index ? next : mind
							  )
							: [...state.mindStates, next]
				};
				traces.push({
					effectId: effect.id,
					type: effect.type,
					summary: `Mood Character ${characterId}: ${previous?.mood ?? '—'} → ${effect.mood}.`
				});
				break;
			}
			case 'item-set-placement': {
				const placement = resolveItemPlacement(move, effect);
				const itemIndex = state.itemInstances.findIndex(
					item => item.id === effect.itemInstanceId
				);
				if (itemIndex < 0) {
					throw new Error('Outcome effect points to a missing ItemInstance.');
				}
				state = {
					...state,
					itemInstances: state.itemInstances.map((item, index) =>
						index === itemIndex ? {...item, placement} : item
					)
				};
				traces.push({
					effectId: effect.id,
					type: effect.type,
					summary: `Item ${effect.itemInstanceId} перемещён: ${placement.type}.`
				});
				break;
			}
			case 'story-node-set-state': {
				const nodeIndex = state.storyNodes.findIndex(
					node => node.id === effect.storyNodeId
				);
				if (nodeIndex < 0) {
					throw new Error('Outcome effect points to a missing Story node.');
				}
				const previousState = state.storyNodes[nodeIndex].activationState;
				state = {
					...state,
					storyNodes: state.storyNodes.map((node, index) =>
						index === nodeIndex ? {...node, activationState: effect.state} : node
					)
				};
				traces.push({
					effectId: effect.id,
					type: effect.type,
					summary: `Story ${effect.storyNodeId}: ${previousState} → ${effect.state}.`
				});
				break;
			}
			case 'character-remembers': {
				if (!context.moment) {
					throw new Error('Memory Outcome effect requires an exact runtime moment.');
				}
				const characterId = resolveCharacterReference(move, effect.character);
				const provenance = resolveMemorySource(move, outcome, effect);
				const memoryId = `${effect.id}:${characterId}`;
				const write = createOrReinforceMemory(state.memories ?? [], {
					id: memoryId,
					characterId,
					summary: effect.summary,
					importance: effect.importance,
					baseStrength: effect.baseStrength,
					tags: effect.tags,
					relatedEntityIds: provenance.relatedEntityIds,
					source: provenance.source,
					moment: context.moment
				});
				state = {...state, memories: write.memories};
				traces.push({
					effectId: effect.id,
					type: effect.type,
					summary: write.created
						? `Character ${characterId} сформировал Memory ${memoryId}.`
						: `Memory ${memoryId} усилена; reinforcement ${write.memory.reinforcementCount ?? 0}.`
				});
				break;
			}
		}
	}

	return {state, traces};
}
