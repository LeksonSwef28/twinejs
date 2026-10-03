import {itemFoodPropertiesAreValid} from '../../domain/narrative/items';
import {NarrativeProject} from '../../domain/narrative/project';
import {applyNarrativeItemRuntimePlacement} from './physical';
import {narrativeRuntimeItemInstances} from './living-simulation';
import {applyNarrativeProjectBodyEffect} from './simulation';

export type NarrativeFoodConsumptionRejectionReason =
	| 'unknown-character'
	| 'unknown-item'
	| 'not-food'
	| 'not-carried'
	| 'placement-blocked';

export type NarrativeFoodConsumptionResult =
	| {
			status: 'applied';
			project: NarrativeProject;
			itemInstanceId: string;
			characterId: string;
			satietyGain: number;
			digestionMinutes: number;
	  }
	| {
			status: 'rejected';
			project: NarrativeProject;
			itemInstanceId: string;
			reason: NarrativeFoodConsumptionRejectionReason;
			summary: string;
	  };

/**
 * Canonical A58 concrete-food use.
 *
 * The item must already resolve to this character through the existing runtime
 * possession projection. Successful use consumes only runtime placement and
 * delegates all needs semantics to the canonical body effect.
 */
export function consumeNarrativeFoodItem(
	project: NarrativeProject,
	itemInstanceId: string,
	characterId: string
): NarrativeFoodConsumptionResult {
	if (!project.characters.some(character => character.id === characterId)) {
		return {
			status: 'rejected',
			project,
			itemInstanceId,
			reason: 'unknown-character',
			summary: 'Персонаж для еды не найден.'
		};
	}
	const item = project.itemInstances.find(
		instance => instance.id === itemInstanceId
	);
	if (!item) {
		return {
			status: 'rejected',
			project,
			itemInstanceId,
			reason: 'unknown-item',
			summary: 'Предмет не найден.'
		};
	}
	const definition = project.itemDefinitions.find(
		candidate => candidate.id === item.definitionId
	);
	if (!definition?.food || !itemFoodPropertiesAreValid(definition.food)) {
		return {
			status: 'rejected',
			project,
			itemInstanceId,
			reason: 'not-food',
			summary: 'Этот предмет нельзя съесть.'
		};
	}
	const runtimeItem = narrativeRuntimeItemInstances(project).find(
		instance => instance.id === itemInstanceId
	);
	if (
		!runtimeItem ||
		runtimeItem.placement.type !== 'character' ||
		runtimeItem.placement.characterId !== characterId
	) {
		return {
			status: 'rejected',
			project,
			itemInstanceId,
			reason: 'not-carried',
			summary: 'Чтобы съесть предмет, он должен быть у персонажа.'
		};
	}

	const consumedPlacement = applyNarrativeItemRuntimePlacement(
		project,
		itemInstanceId,
		{type: 'unplaced'}
	);
	if (!consumedPlacement.applied) {
		return {
			status: 'rejected',
			project,
			itemInstanceId,
			reason: 'placement-blocked',
			summary: consumedPlacement.blockers.join(' ')
		};
	}
	const body = applyNarrativeProjectBodyEffect(consumedPlacement.project, {
		id: `eat:${itemInstanceId}:${project.simulation.day}:${project.simulation.minuteOfDay}`,
		type: 'eat',
		characterId,
		satietyGain: definition.food.satietyGain,
		digestionMinutes: definition.food.digestionMinutes
	});

	return {
		status: 'applied',
		project: body.project,
		itemInstanceId,
		characterId,
		satietyGain: definition.food.satietyGain,
		digestionMinutes: definition.food.digestionMinutes
	};
}
