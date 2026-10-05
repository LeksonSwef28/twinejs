export type EntityId = string;

export interface NarrativeLocation {
	id: EntityId;
	name: string;
}

export interface NarrativeScene {
	id: EntityId;
	locationId: EntityId;
	name: string;
}

export type CognitionTier = 'full' | 'light' | 'background';

export interface NarrativeCharacter {
	id: EntityId;
	name: string;
	cognitionTier: CognitionTier;
	defaultBehaviorProfileId: EntityId;
}
