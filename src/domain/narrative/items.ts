import {EntityId} from './entities';

export interface ItemDefinition {
	id: EntityId;
	name: string;
	description?: string;
	tags: string[];
}

/**
 * ItemDefinition describes a kind of object. ItemInstance is one physical
 * object in the authored world. Two identical keys therefore remain two
 * independently placeable instances.
 */
export type ItemPlacement =
	| {type: 'unplaced'}
	| {type: 'location'; locationId: EntityId}
	| {type: 'character'; characterId: EntityId};

export interface ItemInstance {
	id: EntityId;
	definitionId: EntityId;
	nameOverride?: string;
	placement: ItemPlacement;
}
