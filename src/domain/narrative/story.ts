import {EntityId} from './entities';

export type StoryNodeKind =
	| 'beat'
	| 'event'
	| 'dialogue'
	| 'condition'
	| 'effect';

export type StoryNodeActivationState =
	| 'draft'
	| 'dormant'
	| 'available'
	| 'active'
	| 'blocked'
	| 'completed';

/**
 * Placement is intentionally optional. Authors can draft story material before
 * deciding when or where it belongs in the 93-day world.
 */
export interface StoryPlacement {
	day?: number;
	minuteOfDay?: number;
	locationId?: EntityId;
}

export interface StoryNodeDefinition {
	id: EntityId;
	kind: StoryNodeKind;
	title: string;
	description?: string;
	primaryCharacterId?: EntityId;
	participantIds: EntityId[];
	placement?: StoryPlacement;
	activationState: StoryNodeActivationState;
}

export type StoryConnectionKind =
	| 'flow'
	| 'semantic'
	| 'condition-true'
	| 'condition-false'
	| 'effect'
	| 'knowledge'
	| 'relationship';

/**
 * Ports are explicit because executable logic must not be inferred from a
 * decorative line. A future graph UI can expose typed TRUE/FALSE/effect/etc.
 * ports without changing the persisted story model.
 */
export interface StoryConnectionDefinition {
	id: EntityId;
	sourceNodeId: EntityId;
	targetNodeId: EntityId;
	sourcePortId?: string;
	targetPortId?: string;
	kind: StoryConnectionKind;
}
