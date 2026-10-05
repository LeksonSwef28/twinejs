import {EntityId} from './entities';

export type ItemSizeClass = 'tiny' | 'small' | 'medium' | 'large' | 'bulky';

export interface ItemCarryProperties {
	/** Physical mass used by carrying/effort calculations. */
	weightKg: number;
	/** Abstract but data-driven space consumed inside a container. */
	volumeUnits: number;
	sizeClass: ItemSizeClass;
	/** Hands needed when the item is carried loose rather than packed. */
	handsRequiredWhenLoose?: 0 | 1 | 2;
}

export type ItemContainerCarryStyle = 'hand' | 'shoulder' | 'back';

export interface ItemContainerProperties {
	capacityVolumeUnits: number;
	maxContentsWeightKg: number;
	maxItemSize: ItemSizeClass;
	carryStyle: ItemContainerCarryStyle;
	/** A portfolio can occupy one hand; a backpack normally occupies none. */
	handsRequired: 0 | 1 | 2;
	/** Optional form-factor penalty, independent of the carried mass. */
	climbEffortMultiplier?: number;
}

export interface ItemFoodProperties {
	/** Canonical body satiety gain applied when this concrete item is consumed. */
	satietyGain: number;
	/** Canonical body digestion window in simulation minutes. */
	digestionMinutes: number;
}

export interface ItemDefinition {
	id: EntityId;
	name: string;
	description?: string;
	tags: string[];
	/** Optional for schema-v2 compatibility; defaults are supplied at runtime. */
	carry?: ItemCarryProperties;
	/** Present only when this item can contain other item instances. */
	container?: ItemContainerProperties;
	/** Optional A58 food-use properties; body.ts remains the mechanics owner. */
	food?: ItemFoodProperties;
}

export function itemFoodPropertiesAreValid(
	value: unknown
): value is ItemFoodProperties {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const food = value as Partial<ItemFoodProperties>;
	return (
		typeof food.satietyGain === 'number' &&
		Number.isFinite(food.satietyGain) &&
		food.satietyGain > 0 &&
		typeof food.digestionMinutes === 'number' &&
		Number.isInteger(food.digestionMinutes) &&
		food.digestionMinutes >= 0
	);
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

/**
 * Runtime placement is an overlay on the authored initial placement. Packing
 * into a concrete container preserves physical identity instead of turning the
 * inventory into a bag of abstract item counts.
 */
export type ItemRuntimePlacement =
	| ItemPlacement
	| {type: 'pockets'; characterId: EntityId}
	| {type: 'container'; containerInstanceId: EntityId};

export interface ItemInstance {
	id: EntityId;
	definitionId: EntityId;
	nameOverride?: string;
	placement: ItemPlacement;
}

export function itemRuntimePlacementIsValid(
	value: unknown
): value is ItemRuntimePlacement {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const candidate = value as Partial<ItemRuntimePlacement> & {
		locationId?: unknown;
		characterId?: unknown;
		containerInstanceId?: unknown;
	};
	switch (candidate.type) {
		case 'unplaced':
			return true;
		case 'location':
			return typeof candidate.locationId === 'string';
		case 'character':
		case 'pockets':
			return typeof candidate.characterId === 'string';
		case 'container':
			return typeof candidate.containerInstanceId === 'string';
		default:
			return false;
	}
}
