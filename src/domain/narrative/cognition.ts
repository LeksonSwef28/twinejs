import {EntityId} from './entities';

export type MemorySource =
	| {type: 'story-node'; storyNodeId: EntityId}
	| {type: 'narrative-move'; moveId: EntityId; outcomeId?: EntityId}
	| {type: 'claim'; claimId: EntityId}
	| {type: 'authored'};

export interface MemoryTrace {
	id: EntityId;
	characterId: EntityId;
	summary: string;
	createdAtDay: number;
	createdAtMinute: number;
	importance: number;
	baseStrength: number;
	tags: string[];
	relatedEntityIds: EntityId[];
	/** A31 provenance. Optional only for backward compatibility with old v2 data. */
	source?: MemorySource;
	/** Number of later reinforcements after the original creation. */
	reinforcementCount?: number;
	lastReinforcedAtDay?: number;
	lastReinforcedAtMinute?: number;
}

export interface RelationshipState {
	fromCharacterId: EntityId;
	toCharacterId: EntityId;
	values: Record<string, number>;
}

export interface PendingReaction {
	id: EntityId;
	characterId: EntityId;
	reactionType: string;
	priority: number;
	createdFromEventId?: EntityId;
	conditions: string[];
}

export interface CharacterMindState {
	characterId: EntityId;
	mood?: string;
	activeMemoryIds: EntityId[];
	pendingReactionIds: EntityId[];
}
