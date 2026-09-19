import {
	NarrativeCharacterReferenceDefinition,
	NarrativeConditionDefinition,
	NarrativeMoveDefinition
} from './interaction';
import {
	StoryConnectionDefinition,
	StoryNodeDefinition,
	storyConnectionMode
} from './story';

export type StoryBrainEntityKind =
	| 'story-node'
	| 'move'
	| 'claim'
	| 'character'
	| 'item';

export interface StoryBrainEntityRef {
	kind: StoryBrainEntityKind;
	id: string;
}

export type StoryBrainRelationKind =
	| 'story-reference'
	| 'story-executable'
	| 'owns-move'
	| 'move-actor'
	| 'move-target'
	| 'communicates-claim'
	| 'guard-depends-on'
	| 'resolution-depends-on'
	| 'outcome-continues-to'
	| 'knowledge-effect-claim'
	| 'knowledge-effect-recipient'
	| 'relationship-effect-character'
	| 'mood-effect-character'
	| 'item-effect-item'
	| 'item-effect-character'
	| 'story-state-effect-node';

/**
 * Impact direction is intentionally separate from visual/semantic relation.
 * A reference Story edge can be useful for Focus while having no causal impact.
 */
export type StoryBrainImpactFlow = 'forward' | 'reverse' | 'both' | 'none';

export interface StoryBrainRelation {
	from: StoryBrainEntityRef;
	to: StoryBrainEntityRef;
	kind: StoryBrainRelationKind;
	impactFlow: StoryBrainImpactFlow;
}

export interface StoryBrainIndex {
	relations: StoryBrainRelation[];
}

export interface StoryBrainFocusResult {
	focus: StoryBrainEntityRef;
	entities: StoryBrainEntityRef[];
	relationCount: number;
}

export interface StoryBrainImpactHit {
	entity: StoryBrainEntityRef;
	depth: number;
	via: StoryBrainRelationKind;
}

export interface StoryBrainImpactResult {
	focus: StoryBrainEntityRef;
	hits: StoryBrainImpactHit[];
}

function entityKey(entity: StoryBrainEntityRef) {
	return `${entity.kind}:${entity.id}`;
}

function conditionReferences(
	condition: NarrativeConditionDefinition
): StoryBrainEntityRef[] {
	switch (condition.type) {
		case 'character-knows-claim':
			return [
				{kind: 'character', id: condition.characterId},
				{kind: 'claim', id: condition.claimId}
			];
		case 'character-has-item':
			return [
				{kind: 'character', id: condition.characterId},
				{kind: 'item', id: condition.itemInstanceId}
			];
		case 'relationship-at-least':
			return [
				{kind: 'character', id: condition.fromCharacterId},
				{kind: 'character', id: condition.toCharacterId}
			];
		case 'story-node-state':
			return [{kind: 'story-node', id: condition.storyNodeId}];
		case 'characters-share-location':
			return condition.characterIds.map(id => ({kind: 'character', id}));
	}
}

function resolveCharacterReference(
	move: NarrativeMoveDefinition,
	reference: NarrativeCharacterReferenceDefinition
): StoryBrainEntityRef | undefined {
	switch (reference.type) {
		case 'character':
			return {kind: 'character', id: reference.characterId};
		case 'move-actor':
			return move.actorCharacterId
				? {kind: 'character', id: move.actorCharacterId}
				: undefined;
		case 'move-target': {
			const target = move.targetCharacterIds[reference.targetIndex];
			return target ? {kind: 'character', id: target} : undefined;
		}
	}
}

function pushEffectRelation(
	relations: StoryBrainRelation[],
	moveRef: StoryBrainEntityRef,
	to: StoryBrainEntityRef | undefined,
	kind: StoryBrainRelationKind
) {
	if (!to) {
		return;
	}
	relations.push({from: moveRef, to, kind, impactFlow: 'both'});
}

/**
 * Builds a derived semantic index. It contains no editor state and never mutates
 * authored/runtime data. The index deliberately records reference edges for
 * Focus but excludes them from Impact propagation.
 */
export function buildStoryBrainIndex(
	nodes: StoryNodeDefinition[],
	connections: StoryConnectionDefinition[],
	moves: NarrativeMoveDefinition[]
): StoryBrainIndex {
	const nodeIds = new Set(nodes.map(node => node.id));
	const relations: StoryBrainRelation[] = [];

	for (const connection of connections) {
		if (
			!nodeIds.has(connection.sourceNodeId) ||
			!nodeIds.has(connection.targetNodeId)
		) {
			continue;
		}
		const executable = storyConnectionMode(connection) === 'executable';
		relations.push({
			from: {kind: 'story-node', id: connection.sourceNodeId},
			to: {kind: 'story-node', id: connection.targetNodeId},
			kind: executable ? 'story-executable' : 'story-reference',
			impactFlow: executable ? 'forward' : 'none'
		});
	}

	for (const move of moves) {
		const moveRef: StoryBrainEntityRef = {kind: 'move', id: move.id};
		relations.push({
			from: {kind: 'story-node', id: move.storyNodeId},
			to: moveRef,
			kind: 'owns-move',
			impactFlow: 'forward'
		});

		if (move.actorCharacterId) {
			relations.push({
				from: moveRef,
				to: {kind: 'character', id: move.actorCharacterId},
				kind: 'move-actor',
				impactFlow: 'reverse'
			});
		}
		for (const targetCharacterId of move.targetCharacterIds) {
			relations.push({
				from: moveRef,
				to: {kind: 'character', id: targetCharacterId},
				kind: 'move-target',
				impactFlow: 'reverse'
			});
		}
		if (move.communicatedClaimId) {
			relations.push({
				from: moveRef,
				to: {kind: 'claim', id: move.communicatedClaimId},
				kind: 'communicates-claim',
				impactFlow: 'reverse'
			});
		}

		for (const guard of move.guards) {
			for (const reference of conditionReferences(guard.condition)) {
				relations.push({
					from: moveRef,
					to: reference,
					kind: 'guard-depends-on',
					impactFlow: 'reverse'
				});
			}
		}

		if (move.resolution.type === 'condition') {
			for (const reference of conditionReferences(move.resolution.condition)) {
				relations.push({
					from: moveRef,
					to: reference,
					kind: 'resolution-depends-on',
					impactFlow: 'reverse'
				});
			}
		}

		for (const outcome of move.outcomes) {
			for (const storyNodeId of outcome.effectStoryNodeIds) {
				relations.push({
					from: moveRef,
					to: {kind: 'story-node', id: storyNodeId},
					kind: 'outcome-continues-to',
					impactFlow: 'forward'
				});
			}
			for (const effect of outcome.effects ?? []) {
				switch (effect.type) {
					case 'character-learns-claim':
						if (effect.claim.type === 'claim') {
							pushEffectRelation(
								relations,
								moveRef,
								{kind: 'claim', id: effect.claim.claimId},
								'knowledge-effect-claim'
							);
						}
						if (effect.recipient.type === 'character') {
							pushEffectRelation(
								relations,
								moveRef,
								{kind: 'character', id: effect.recipient.characterId},
								'knowledge-effect-recipient'
							);
						} else {
							const targetCharacterId =
								move.targetCharacterIds[effect.recipient.targetIndex];
							pushEffectRelation(
								relations,
								moveRef,
								targetCharacterId
									? {kind: 'character', id: targetCharacterId}
									: undefined,
								'knowledge-effect-recipient'
							);
						}
						break;
					case 'relationship-adjust':
						pushEffectRelation(
							relations,
							moveRef,
							resolveCharacterReference(move, effect.from),
							'relationship-effect-character'
						);
						pushEffectRelation(
							relations,
							moveRef,
							resolveCharacterReference(move, effect.to),
							'relationship-effect-character'
						);
						break;
					case 'character-mood-set':
						pushEffectRelation(
							relations,
							moveRef,
							resolveCharacterReference(move, effect.character),
							'mood-effect-character'
						);
						break;
					case 'item-set-placement':
						pushEffectRelation(
							relations,
							moveRef,
							{kind: 'item', id: effect.itemInstanceId},
							'item-effect-item'
						);
						if (effect.placement.type === 'character') {
							pushEffectRelation(
								relations,
								moveRef,
								resolveCharacterReference(move, effect.placement.character),
								'item-effect-character'
							);
						}
						break;
					case 'story-node-set-state':
						pushEffectRelation(
							relations,
							moveRef,
							{kind: 'story-node', id: effect.storyNodeId},
							'story-state-effect-node'
						);
						break;
				}
			}
		}
	}

	return {relations};
}

/**
 * Focus is semantic context, so traversal is undirected and includes reference
 * edges. Depth is bounded to stop a shared character/claim from lighting the
 * entire project at once.
 */
export function queryStoryBrainFocus(
	index: StoryBrainIndex,
	focus: StoryBrainEntityRef,
	maxDepth = 2
): StoryBrainFocusResult {
	const visited = new Map<string, StoryBrainEntityRef>([[entityKey(focus), focus]]);
	const queue: Array<{entity: StoryBrainEntityRef; depth: number}> = [
		{entity: focus, depth: 0}
	];
	let relationCount = 0;

	while (queue.length > 0) {
		const current = queue.shift()!;
		if (current.depth >= maxDepth) {
			continue;
		}
		for (const relation of index.relations) {
			let neighbor: StoryBrainEntityRef | undefined;
			if (entityKey(relation.from) === entityKey(current.entity)) {
				neighbor = relation.to;
			} else if (entityKey(relation.to) === entityKey(current.entity)) {
				neighbor = relation.from;
			}
			if (!neighbor) {
				continue;
			}
			relationCount += 1;
			const key = entityKey(neighbor);
			if (!visited.has(key)) {
				visited.set(key, neighbor);
				queue.push({entity: neighbor, depth: current.depth + 1});
			}
		}
	}

	return {focus, entities: [...visited.values()], relationCount};
}

function impactNeighbor(
	relation: StoryBrainRelation,
	current: StoryBrainEntityRef
): StoryBrainEntityRef | undefined {
	const currentKey = entityKey(current);
	const fromMatches = entityKey(relation.from) === currentKey;
	const toMatches = entityKey(relation.to) === currentKey;

	switch (relation.impactFlow) {
		case 'forward':
			return fromMatches ? relation.to : undefined;
		case 'reverse':
			return toMatches ? relation.from : undefined;
		case 'both':
			return fromMatches ? relation.to : toMatches ? relation.from : undefined;
		case 'none':
			return undefined;
	}
}

/**
 * Impact follows only explicit dependency/causal directions. In particular,
 * reference Story edges never make a downstream branch look causally affected.
 */
export function queryStoryBrainImpact(
	index: StoryBrainIndex,
	focus: StoryBrainEntityRef,
	maxDepth = 12
): StoryBrainImpactResult {
	const visited = new Set<string>([entityKey(focus)]);
	const queue: Array<{entity: StoryBrainEntityRef; depth: number}> = [
		{entity: focus, depth: 0}
	];
	const hits: StoryBrainImpactHit[] = [];

	while (queue.length > 0) {
		const current = queue.shift()!;
		if (current.depth >= maxDepth) {
			continue;
		}
		for (const relation of index.relations) {
			const neighbor = impactNeighbor(relation, current.entity);
			if (!neighbor) {
				continue;
			}
			const key = entityKey(neighbor);
			if (visited.has(key)) {
				continue;
			}
			visited.add(key);
			hits.push({
				entity: neighbor,
				depth: current.depth + 1,
				via: relation.kind
			});
			queue.push({entity: neighbor, depth: current.depth + 1});
		}
	}

	return {focus, hits};
}
