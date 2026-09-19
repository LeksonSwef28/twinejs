import {EntityId} from './entities';

/** Objective world truth. Characters may know nothing about it or believe the opposite. */
export interface ObjectiveFactDefinition {
	id: EntityId;
	title: string;
	description?: string;
	tags: string[];
}

/**
 * A statement that can be observed, told, inferred, believed, doubted or repeated.
 * Linking it to a fact never makes the statement true by itself.
 */
export type ClaimTruthStance = 'supports' | 'contradicts' | 'unresolved';

export interface ClaimDefinition {
	id: EntityId;
	text: string;
	aboutFactId?: EntityId;
	stance: ClaimTruthStance;
	tags: string[];
}

export type KnowledgeAttitude = 'knows' | 'believes' | 'doubts' | 'disbelieves';

export type KnowledgeSource =
	| {type: 'observed'; sourceEventId?: EntityId}
	| {
			type: 'told';
			sourceCharacterId?: EntityId;
			sourceEventId?: EntityId;
	  }
	| {type: 'inferred'; sourceEventId?: EntityId}
	| {type: 'authored'};

export interface KnowledgeMoment {
	day: number;
	minuteOfDay: number;
}

/**
 * Authored baseline cognition for a character at simulation start.
 * This is deliberately separate from live CharacterKnowledgeState so editing
 * the project never pretends that a preview/runtime event already happened.
 */
export interface InitialKnowledgeSeed {
	id: EntityId;
	characterId: EntityId;
	claimId: EntityId;
	attitude: KnowledgeAttitude;
	confidence: number;
	source: KnowledgeSource;
}

/** Runtime cognition state. This is not an objective fact and is not a MemoryTrace. */
export interface CharacterKnowledgeState {
	id: EntityId;
	characterId: EntityId;
	claimId: EntityId;
	attitude: KnowledgeAttitude;
	/** 0..1 subjective confidence. High confidence still does not make a claim true. */
	confidence: number;
	source: KnowledgeSource;
	learnedAt?: KnowledgeMoment;
	lastReinforcedAt?: KnowledgeMoment;
	timesHeard: number;
}

export function characterKnowledgeStateId(characterId: EntityId, claimId: EntityId) {
	return `knowledge:${characterId}:${claimId}`;
}

export function knowledgeConfidenceIsValid(confidence: number) {
	return Number.isFinite(confidence) && confidence >= 0 && confidence <= 1;
}

/**
 * Materializes authored baseline knowledge into a fresh runtime state. Calling
 * this function is an explicit simulation/preview initialization step; merely
 * authoring a seed never mutates runtime state.
 */
export function createCharacterKnowledgeStateFromSeed(
	seed: InitialKnowledgeSeed
): CharacterKnowledgeState {
	if (!knowledgeConfidenceIsValid(seed.confidence)) {
		throw new RangeError('Knowledge confidence must be between 0 and 1.');
	}

	return {
		id: characterKnowledgeStateId(seed.characterId, seed.claimId),
		characterId: seed.characterId,
		claimId: seed.claimId,
		attitude: seed.attitude,
		confidence: seed.confidence,
		source: seed.source,
		timesHeard: 1
	};
}

export function initializeCharacterKnowledge(
	seeds: InitialKnowledgeSeed[]
): CharacterKnowledgeState[] {
	const byCharacterAndClaim = new Map<string, CharacterKnowledgeState>();
	for (const seed of seeds) {
		const state = createCharacterKnowledgeStateFromSeed(seed);
		byCharacterAndClaim.set(`${seed.characterId}:${seed.claimId}`, state);
	}
	return [...byCharacterAndClaim.values()];
}
