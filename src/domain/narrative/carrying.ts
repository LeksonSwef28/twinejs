import {EntityId} from './entities';
import {
	ItemCarryProperties,
	ItemDefinition,
	ItemInstance,
	ItemRuntimePlacement,
	ItemSizeClass
} from './items';
import {PhysicalActionKind} from './injury';

export interface PocketCarryPolicy {
	capacityVolumeUnits: number;
	maxContentsWeightKg: number;
	maxItemSize: ItemSizeClass;
}

export interface CarryEffortPolicy {
	comfortableWeightKg: number;
	effortMultiplierPerExcessKg: number;
	oneHandClimbMultiplier: number;
}

export const defaultPocketCarryPolicy: PocketCarryPolicy = {
	capacityVolumeUnits: 3,
	maxContentsWeightKg: 2,
	maxItemSize: 'small'
};

export const defaultCarryEffortPolicy: CarryEffortPolicy = {
	comfortableWeightKg: 6,
	effortMultiplierPerExcessKg: 0.04,
	oneHandClimbMultiplier: 1.25
};

export const defaultItemCarryProperties: ItemCarryProperties = {
	weightKg: 0.1,
	volumeUnits: 1,
	sizeClass: 'tiny',
	handsRequiredWhenLoose: 0
};

export type PackingBlockerCode =
	| 'unknown-item'
	| 'unknown-container'
	| 'not-a-container'
	| 'container-cycle'
	| 'item-too-large'
	| 'volume-capacity'
	| 'weight-capacity';

export interface PackingBlocker {
	code: PackingBlockerCode;
	message: string;
}

export interface PackingEvaluation {
	allowed: boolean;
	blockers: PackingBlocker[];
	projectedVolumeUnits: number;
	capacityVolumeUnits: number;
	projectedContentsWeightKg: number;
	maxContentsWeightKg: number;
}

export interface CharacterCarryLoad {
	characterId: EntityId;
	totalWeightKg: number;
	handsOccupied: number;
	topLevelItemIds: EntityId[];
	containedItemIds: EntityId[];
	containerClimbEffortMultiplier: number;
}

export interface CarryActionBlocker {
	code: 'hands-occupied';
	message: string;
}

export interface CarryActionModifier {
	code: 'carried-weight' | 'one-hand-busy' | 'container-climb-penalty';
	multiplier: number;
	message: string;
}

export interface CarryActionEvaluation {
	action: PhysicalActionKind;
	allowed: boolean;
	blockers: CarryActionBlocker[];
	modifiers: CarryActionModifier[];
	effortCostMultiplier: number;
	load: CharacterCarryLoad;
}

const sizeOrder: ItemSizeClass[] = ['tiny', 'small', 'medium', 'large', 'bulky'];

function nonNegative(value: number, fallback: number) {
	return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

export function carryPropertiesForDefinition(
	definition: ItemDefinition
): ItemCarryProperties {
	const carry = definition.carry;
	return {
		weightKg: nonNegative(carry?.weightKg ?? defaultItemCarryProperties.weightKg, 0),
		volumeUnits: nonNegative(
			carry?.volumeUnits ?? defaultItemCarryProperties.volumeUnits,
			0
		),
		sizeClass: carry?.sizeClass ?? defaultItemCarryProperties.sizeClass,
		handsRequiredWhenLoose:
			carry?.handsRequiredWhenLoose ??
			(carry?.sizeClass === 'bulky' ? 2 : carry?.sizeClass === 'large' ? 1 : 0)
	};
}

export function effectiveItemPlacement(
	instance: ItemInstance,
	overrides: Record<string, ItemRuntimePlacement>
): ItemRuntimePlacement {
	return overrides[instance.id] ?? instance.placement;
}

function definitionForInstance(
	instance: ItemInstance,
	definitionsById: Map<string, ItemDefinition>
) {
	return definitionsById.get(instance.definitionId);
}

function sizeFits(itemSize: ItemSizeClass, maximumSize: ItemSizeClass) {
	return sizeOrder.indexOf(itemSize) <= sizeOrder.indexOf(maximumSize);
}

function packingEvaluation(
	item: ItemInstance | undefined,
	itemDefinition: ItemDefinition | undefined,
	contents: ItemInstance[],
	definitionsById: Map<string, ItemDefinition>,
	capacityVolumeUnits: number,
	maxContentsWeightKg: number,
	maxItemSize: ItemSizeClass,
	extraBlockers: PackingBlocker[] = []
): PackingEvaluation {
	const blockers = [...extraBlockers];
	if (!item || !itemDefinition) {
		blockers.push({code: 'unknown-item', message: 'Предмет не найден.'});
		return {
			allowed: false,
			blockers,
			projectedVolumeUnits: 0,
			capacityVolumeUnits,
			projectedContentsWeightKg: 0,
			maxContentsWeightKg
		};
	}
	const itemCarry = carryPropertiesForDefinition(itemDefinition);
	const existing = contents.filter(candidate => candidate.id !== item.id);
	const existingCarry = existing.flatMap(candidate => {
		const definition = definitionForInstance(candidate, definitionsById);
		return definition ? [carryPropertiesForDefinition(definition)] : [];
	});
	const projectedVolumeUnits =
		existingCarry.reduce((sum, carry) => sum + carry.volumeUnits, 0) +
		itemCarry.volumeUnits;
	const projectedContentsWeightKg =
		existingCarry.reduce((sum, carry) => sum + carry.weightKg, 0) +
		itemCarry.weightKg;

	if (!sizeFits(itemCarry.sizeClass, maxItemSize)) {
		blockers.push({
			code: 'item-too-large',
			message: `Размер ${itemCarry.sizeClass} превышает допустимый ${maxItemSize}.`
		});
	}
	if (projectedVolumeUnits > capacityVolumeUnits) {
		blockers.push({
			code: 'volume-capacity',
			message: `Нужно ${projectedVolumeUnits.toFixed(1)} ед. места из ${capacityVolumeUnits.toFixed(1)}.`
		});
	}
	if (projectedContentsWeightKg > maxContentsWeightKg) {
		blockers.push({
			code: 'weight-capacity',
			message: `Вес содержимого ${projectedContentsWeightKg.toFixed(1)} кг превышает предел ${maxContentsWeightKg.toFixed(1)} кг.`
		});
	}
	return {
		allowed: blockers.length === 0,
		blockers,
		projectedVolumeUnits,
		capacityVolumeUnits,
		projectedContentsWeightKg,
		maxContentsWeightKg
	};
}

function createsContainerCycle(
	itemInstanceId: EntityId,
	containerInstanceId: EntityId,
	instancesById: Map<string, ItemInstance>,
	overrides: Record<string, ItemRuntimePlacement>
) {
	let cursor: EntityId | undefined = containerInstanceId;
	const visited = new Set<EntityId>();
	while (cursor) {
		if (cursor === itemInstanceId) {
			return true;
		}
		if (visited.has(cursor)) {
			return true;
		}
		visited.add(cursor);
		const instance = instancesById.get(cursor);
		if (!instance) {
			return false;
		}
		const placement = effectiveItemPlacement(instance, overrides);
		cursor = placement.type === 'container' ? placement.containerInstanceId : undefined;
	}
	return false;
}

export function evaluatePackIntoContainer(
	itemInstanceId: EntityId,
	containerInstanceId: EntityId,
	definitions: ItemDefinition[],
	instances: ItemInstance[],
	overrides: Record<string, ItemRuntimePlacement>
): PackingEvaluation {
	const definitionsById = new Map(definitions.map(definition => [definition.id, definition]));
	const instancesById = new Map(instances.map(instance => [instance.id, instance]));
	const item = instancesById.get(itemInstanceId);
	const container = instancesById.get(containerInstanceId);
	const containerDefinition = container
		? definitionForInstance(container, definitionsById)
		: undefined;
	const containerProperties = containerDefinition?.container;
	const blockers: PackingBlocker[] = [];
	if (!container) {
		blockers.push({code: 'unknown-container', message: 'Контейнер не найден.'});
	} else if (!containerProperties) {
		blockers.push({code: 'not-a-container', message: 'Этот предмет не является сумкой или контейнером.'});
	}
	if (
		container &&
		createsContainerCycle(itemInstanceId, containerInstanceId, instancesById, overrides)
	) {
		blockers.push({
			code: 'container-cycle',
			message: 'Нельзя вложить контейнер в самого себя или создать цикл вложенности.'
		});
	}
	const contents = instances.filter(instance => {
		const placement = effectiveItemPlacement(instance, overrides);
		return (
			placement.type === 'container' &&
			placement.containerInstanceId === containerInstanceId
		);
	});
	const capacity = containerProperties ?? {
		capacityVolumeUnits: 0,
		maxContentsWeightKg: 0,
		maxItemSize: 'tiny' as ItemSizeClass,
		carryStyle: 'hand' as const,
		handsRequired: 0 as const
	};
	return packingEvaluation(
		item,
		item ? definitionForInstance(item, definitionsById) : undefined,
		contents,
		definitionsById,
		capacity.capacityVolumeUnits,
		capacity.maxContentsWeightKg,
		capacity.maxItemSize,
		blockers
	);
}

export function evaluatePackIntoPockets(
	itemInstanceId: EntityId,
	characterId: EntityId,
	definitions: ItemDefinition[],
	instances: ItemInstance[],
	overrides: Record<string, ItemRuntimePlacement>,
	policy: PocketCarryPolicy = defaultPocketCarryPolicy
): PackingEvaluation {
	const definitionsById = new Map(definitions.map(definition => [definition.id, definition]));
	const item = instances.find(instance => instance.id === itemInstanceId);
	const contents = instances.filter(instance => {
		const placement = effectiveItemPlacement(instance, overrides);
		return placement.type === 'pockets' && placement.characterId === characterId;
	});
	return packingEvaluation(
		item,
		item ? definitionForInstance(item, definitionsById) : undefined,
		contents,
		definitionsById,
		policy.capacityVolumeUnits,
		policy.maxContentsWeightKg,
		policy.maxItemSize
	);
}

export function applyItemRuntimePlacement(
	overrides: Record<string, ItemRuntimePlacement>,
	itemInstanceId: EntityId,
	placement: ItemRuntimePlacement
) {
	return {...overrides, [itemInstanceId]: placement};
}

function containerContents(
	containerInstanceId: EntityId,
	instances: ItemInstance[],
	overrides: Record<string, ItemRuntimePlacement>
) {
	return instances.filter(instance => {
		const placement = effectiveItemPlacement(instance, overrides);
		return (
			placement.type === 'container' &&
			placement.containerInstanceId === containerInstanceId
		);
	});
}

export function resolveCharacterCarryLoad(
	characterId: EntityId,
	definitions: ItemDefinition[],
	instances: ItemInstance[],
	overrides: Record<string, ItemRuntimePlacement>
): CharacterCarryLoad {
	const definitionsById = new Map(definitions.map(definition => [definition.id, definition]));
	const visited = new Set<EntityId>();
	const containedItemIds: EntityId[] = [];
	let totalWeightKg = 0;
	let handsOccupied = 0;
	let containerClimbEffortMultiplier = 1;

	const addItemAndContents = (instance: ItemInstance, topLevel: boolean) => {
		if (visited.has(instance.id)) {
			return;
		}
		visited.add(instance.id);
		const definition = definitionForInstance(instance, definitionsById);
		if (!definition) {
			return;
		}
		const carry = carryPropertiesForDefinition(definition);
		totalWeightKg += carry.weightKg;
		if (!topLevel) {
			containedItemIds.push(instance.id);
		}
		if (topLevel) {
			const container = definition.container;
			if (container) {
				handsOccupied += container.handsRequired;
				containerClimbEffortMultiplier *= Math.max(
					1,
					container.climbEffortMultiplier ?? 1
				);
			} else {
				handsOccupied += carry.handsRequiredWhenLoose ?? 0;
			}
		}
		for (const child of containerContents(instance.id, instances, overrides)) {
			addItemAndContents(child, false);
		}
	};

	const topLevelItems = instances
		.filter(instance => {
			const placement = effectiveItemPlacement(instance, overrides);
			return (
				(placement.type === 'character' || placement.type === 'pockets') &&
				placement.characterId === characterId
			);
		})
		.sort((a, b) => a.id.localeCompare(b.id));
	for (const instance of topLevelItems) {
		const placement = effectiveItemPlacement(instance, overrides);
		const directCarry = placement.type === 'character';
		addItemAndContents(instance, directCarry);
	}

	return {
		characterId,
		totalWeightKg,
		handsOccupied: Math.min(2, handsOccupied),
		topLevelItemIds: topLevelItems.map(item => item.id),
		containedItemIds: [...new Set(containedItemIds)].sort(),
		containerClimbEffortMultiplier
	};
}

export function evaluateCarryingAction(
	load: CharacterCarryLoad,
	action: PhysicalActionKind,
	policy: CarryEffortPolicy = defaultCarryEffortPolicy
): CarryActionEvaluation {
	const blockers: CarryActionBlocker[] = [];
	const modifiers: CarryActionModifier[] = [];
	let effortCostMultiplier = 1;
	const weightSensitive =
		action === 'walk' ||
		action === 'run' ||
		action === 'fast-run' ||
		action === 'climb' ||
		action === 'carry-heavy';
	const excessWeight = Math.max(0, load.totalWeightKg - policy.comfortableWeightKg);
	if (weightSensitive && excessWeight > 0) {
		const multiplier =
			1 + excessWeight * Math.max(0, policy.effortMultiplierPerExcessKg);
		effortCostMultiplier *= multiplier;
		modifiers.push({
			code: 'carried-weight',
			multiplier,
			message: `Лишние ${excessWeight.toFixed(1)} кг ускоряют накопление усталости.`
		});
	}
	if (action === 'climb') {
		if (load.handsOccupied >= 2) {
			blockers.push({
				code: 'hands-occupied',
				message: 'Обе руки заняты переносимыми вещами — безопасно лазать нельзя.'
			});
		} else if (load.handsOccupied === 1) {
			effortCostMultiplier *= policy.oneHandClimbMultiplier;
			modifiers.push({
				code: 'one-hand-busy',
				multiplier: policy.oneHandClimbMultiplier,
				message: 'Одна рука занята, поэтому лазание заметно сложнее.'
			});
		}
		if (load.containerClimbEffortMultiplier > 1) {
			effortCostMultiplier *= load.containerClimbEffortMultiplier;
			modifiers.push({
				code: 'container-climb-penalty',
				multiplier: load.containerClimbEffortMultiplier,
				message: 'Форма переносимой сумки мешает лазанию.'
			});
		}
	}
	if (action === 'carry-heavy' && load.handsOccupied > 0) {
		blockers.push({
			code: 'hands-occupied',
			message: 'Для тяжёлого предмета сначала нужно освободить руки.'
		});
	}
	return {
		action,
		allowed: blockers.length === 0,
		blockers,
		modifiers,
		effortCostMultiplier,
		load
	};
}
