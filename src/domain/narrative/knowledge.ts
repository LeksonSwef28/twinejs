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
