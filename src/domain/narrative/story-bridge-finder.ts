import {NarrativeMoveDefinition, NarrativeConditionDefinition} from './interaction';
import {ItemInstance} from './items';
import {InitialKnowledgeSeed} from './knowledge';
import {
	StoryConnectionDefinition,
	StoryNodeDefinition,
	storyConnectionMode
} from './story';

export type StoryBridgeReasonKind =
	| 'reference-edge'
	| 'shared-character'
	| 'shared-claim'
	| 'shared-item'
	| 'shared-location'
	| 'nearby-future-time'
	| 'candidate-knows-claim'
	| 'flexible-placement'
	| 'dormant-material';

export interface StoryBridgeReason {
	kind: StoryBridgeReasonKind;
	weight: number;
	summary: string;
}

export interface StoryBridgeCandidate {
	storyNodeId: string;
	score: number;
	reasons: StoryBridgeReason[];
}

export interface StoryBridgeFinderResult {
	sourceStoryNodeIds: string[];
	candidates: StoryBridgeCandidate[];
}

export interface StoryBridgeFinderInput {
	nodes: StoryNodeDefinition[];
	connections: StoryConnectionDefinition[];
	moves: NarrativeMoveDefinition[];
	initialKnowledge: InitialKnowledgeSeed[];
	itemInstances: ItemInstance[];
}

interface StoryNodeSignals {
	characters: Set<string>;
	claims: Set<string>;
	items: Set<string>;
	locationId?: string;
	day?: number;
}

function conditionSignals(
	condition: NarrativeConditionDefinition,
	characters: Set<string>,
	claims: Set<string>,
	items: Set<string>
) {
	switch (condition.type) {
		case 'character-knows-claim':
			characters.add(condition.characterId);
			claims.add(condition.claimId);
			break;
		case 'character-has-item':
			characters.add(condition.characterId);
			items.add(condition.itemInstanceId);
			break;
		case 'relationship-at-least':
			characters.add(condition.fromCharacterId);
			characters.add(condition.toCharacterId);
			break;
		case 'characters-share-location':
			for (const characterId of condition.characterIds) {
				characters.add(characterId);
			}
			break;
		case 'story-node-state':
			break;
	}
}

function signalsForNode(
	node: StoryNodeDefinition,
	moves: NarrativeMoveDefinition[]
): StoryNodeSignals {
	const characters = new Set<string>();
	const claims = new Set<string>();
	const items = new Set<string>();
	if (node.primaryCharacterId) {
		characters.add(node.primaryCharacterId);
	}
	for (const participantId of node.participantIds) {
		characters.add(participantId);
	}

	for (const move of moves) {
		if (move.storyNodeId !== node.id) {
			continue;
		}
		if (move.actorCharacterId) {
			characters.add(move.actorCharacterId);
		}
		for (const targetCharacterId of move.targetCharacterIds) {
			characters.add(targetCharacterId);
		}
		if (move.communicatedClaimId) {
			claims.add(move.communicatedClaimId);
		}
		for (const guard of move.guards) {
			conditionSignals(guard.condition, characters, claims, items);
		}
		if (move.resolution.type === 'condition') {
			conditionSignals(move.resolution.condition, characters, claims, items);
		}
		for (const outcome of move.outcomes) {
			for (const effect of outcome.effects ?? []) {
				if (effect.type !== 'character-learns-claim') {
					continue;
				}
				if (effect.claim.type === 'claim') {
					claims.add(effect.claim.claimId);
				}
				if (effect.recipient.type === 'character') {
					characters.add(effect.recipient.characterId);
				} else {
					const target = move.targetCharacterIds[effect.recipient.targetIndex];
					if (target) {
						characters.add(target);
					}
				}
			}
		}
	}

	return {
		characters,
		claims,
		items,
		locationId: node.placement?.locationId,
		day: node.placement?.day
	};
}

function intersect(a: Set<string>, b: Set<string>) {
	return [...a].filter(value => b.has(value));
}

function unionSignals(signals: StoryNodeSignals[]): StoryNodeSignals {
	const characters = new Set<string>();
	const claims = new Set<string>();
	const items = new Set<string>();
	for (const signal of signals) {
		for (const value of signal.characters) {
			characters.add(value);
		}
		for (const value of signal.claims) {
			claims.add(value);
		}
		for (const value of signal.items) {
			items.add(value);
		}
	}
	const placedDays = signals
		.map(signal => signal.day)
		.filter((day): day is number => day !== undefined);
	const locations = signals
		.map(signal => signal.locationId)
		.filter((locationId): locationId is string => locationId !== undefined);
	return {
		characters,
		claims,
		items,
		day: placedDays.length > 0 ? Math.max(...placedDays) : undefined,
		locationId:
			locations.length > 0 && locations.every(locationId => locationId === locations[0])
				? locations[0]
				: undefined
	};
}

function hasDirectReferenceEdge(
	connections: StoryConnectionDefinition[],
	sourceIds: Set<string>,
	candidateId: string
) {
	return connections.some(
		connection =>
			storyConnectionMode(connection) === 'reference' &&
			((sourceIds.has(connection.sourceNodeId) &&
				connection.targetNodeId === candidateId) ||
				(sourceIds.has(connection.targetNodeId) &&
					connection.sourceNodeId === candidateId))
	);
}

function isDirectExecutableContinuation(
	connections: StoryConnectionDefinition[],
	moves: NarrativeMoveDefinition[],
	sourceIds: Set<string>,
	candidateId: string
) {
	if (
		connections.some(
			connection =>
				storyConnectionMode(connection) === 'executable' &&
				sourceIds.has(connection.sourceNodeId) &&
				connection.targetNodeId === candidateId
		)
	) {
		return true;
	}
	return moves.some(
		move =>
			sourceIds.has(move.storyNodeId) &&
			move.outcomes.some(outcome => outcome.effectStoryNodeIds.includes(candidateId))
	);
}

/**
 * A26 proposes only already-authored Story material. Ranking is deterministic
 * and every score contribution produces an explanation. It never creates nodes,
 * edges or runtime events and therefore always requires explicit author action.
 */
export function findStoryBridgeCandidates(
	input: StoryBridgeFinderInput,
	sourceStoryNodeIds: string[],
	limit = 8
): StoryBridgeFinderResult {
	const sourceIds = new Set(sourceStoryNodeIds);
	const nodesById = new Map(input.nodes.map(node => [node.id, node]));
	const sourceNodes = sourceStoryNodeIds
		.map(id => nodesById.get(id))
		.filter((node): node is StoryNodeDefinition => Boolean(node));
	const sourceSignals = unionSignals(
		sourceNodes.map(node => signalsForNode(node, input.moves))
	);
	const candidates: StoryBridgeCandidate[] = [];

	for (const candidate of input.nodes) {
		if (
			sourceIds.has(candidate.id) ||
			isDirectExecutableContinuation(
				input.connections,
				input.moves,
				sourceIds,
				candidate.id
			)
		) {
			continue;
		}

		const candidateSignals = signalsForNode(candidate, input.moves);
		const reasons: StoryBridgeReason[] = [];
		let score = 0;
		let semanticAnchor = false;

		if (hasDirectReferenceEdge(input.connections, sourceIds, candidate.id)) {
			reasons.push({
				kind: 'reference-edge',
				weight: 4,
				summary: 'Уже существует смысловая/reference-связь с текущим фронтиром.'
			});
			score += 4;
			semanticAnchor = true;
		}

		const sharedCharacters = intersect(
			sourceSignals.characters,
			candidateSignals.characters
		);
		if (sharedCharacters.length > 0) {
			const weight = Math.min(4, 2 + sharedCharacters.length - 1);
			reasons.push({
				kind: 'shared-character',
				weight,
				summary: `Общие персонажи: ${sharedCharacters.length}.`
			});
			score += weight;
			semanticAnchor = true;
		}

		const sharedClaims = intersect(sourceSignals.claims, candidateSignals.claims);
		if (sharedClaims.length > 0) {
			const weight = Math.min(5, 3 + sharedClaims.length - 1);
			reasons.push({
				kind: 'shared-claim',
				weight,
				summary: `Используются связанные Claims: ${sharedClaims.length}.`
			});
			score += weight;
			semanticAnchor = true;
		}

		const sharedItems = intersect(sourceSignals.items, candidateSignals.items);
		if (sharedItems.length > 0) {
			const weight = Math.min(4, 2 + sharedItems.length - 1);
			reasons.push({
				kind: 'shared-item',
				weight,
				summary: `Общие предметы/Item guards: ${sharedItems.length}.`
			});
			score += weight;
			semanticAnchor = true;
		}

		if (
			sourceSignals.locationId &&
			candidateSignals.locationId === sourceSignals.locationId
		) {
			reasons.push({
				kind: 'shared-location',
				weight: 2,
				summary: 'Story material привязан к той же локации.'
			});
			score += 2;
			semanticAnchor = true;
		}

		const candidateKnowledgeMatches = input.initialKnowledge.filter(
			seed =>
				candidateSignals.characters.has(seed.characterId) &&
				sourceSignals.claims.has(seed.claimId)
		);
		if (candidateKnowledgeMatches.length > 0) {
			const weight = Math.min(5, 3 + candidateKnowledgeMatches.length - 1);
			reasons.push({
				kind: 'candidate-knows-claim',
				weight,
				summary: `Персонажи кандидата уже имеют стартовое знание связанных Claims: ${candidateKnowledgeMatches.length}.`
			});
			score += weight;
			semanticAnchor = true;
		}

		if (
			sourceSignals.day !== undefined &&
			candidateSignals.day !== undefined &&
			candidateSignals.day >= sourceSignals.day &&
			candidateSignals.day - sourceSignals.day <= 7
		) {
			reasons.push({
				kind: 'nearby-future-time',
				weight: 2,
				summary: `Размещено рядом по времени: Day ${candidateSignals.day}.`
			});
			score += 2;
			semanticAnchor = true;
		}

		if (candidate.placement?.day === undefined) {
			reasons.push({
				kind: 'flexible-placement',
				weight: 1,
				summary: 'Материал ещё не привязан ко времени и его легко использовать как мост.'
			});
			score += 1;
		}
		if (candidate.activationState === 'dormant' || candidate.activationState === 'draft') {
			reasons.push({
				kind: 'dormant-material',
				weight: 1,
				summary: 'Это dormant/draft материал, который ещё не закреплён в активной ветке.'
			});
			score += 1;
		}

		if (!semanticAnchor || score < 2) {
			continue;
		}
		candidates.push({storyNodeId: candidate.id, score, reasons});
	}

	candidates.sort(
		(a, b) => b.score - a.score || a.storyNodeId.localeCompare(b.storyNodeId)
	);

	return {
		sourceStoryNodeIds: sourceNodes.map(node => node.id),
		candidates: candidates.slice(0, Math.max(0, limit))
	};
}
