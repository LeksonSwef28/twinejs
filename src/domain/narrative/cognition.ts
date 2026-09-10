import {EntityId} from './entities';

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
