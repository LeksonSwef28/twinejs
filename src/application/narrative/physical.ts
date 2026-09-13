import {
	createCharacterBodyState,
	evaluateBodyAction
} from '../../domain/narrative/body';
import {
	applyItemRuntimePlacement,
	evaluateCarryingAction,
	evaluatePackIntoContainer,
	evaluatePackIntoPockets,
	PackingEvaluation,
	resolveCharacterCarryLoad
} from '../../domain/narrative/carrying';
import {
	evaluateInjuryAction,
	PhysicalActionKind
} from '../../domain/narrative/injury';
import {ItemRuntimePlacement} from '../../domain/narrative/items';
import {NarrativeProject} from '../../domain/narrative/project';

export interface NarrativePhysicalActionReason {
	source: 'body' | 'injury' | 'carrying';
	code: string;
	message: string;
	multiplier?: number;
}

export interface NarrativePhysicalActionEvaluation {
	characterId: string;
	action: PhysicalActionKind;
	allowed: boolean;
	blockers: NarrativePhysicalActionReason[];
	modifiers: NarrativePhysicalActionReason[];
	effortCostMultiplier: number;
}

export interface NarrativeItemPlacementResult {
	project: NarrativeProject;
	applied: boolean;
	blockers: string[];
	packing?: PackingEvaluation;
}

function characterExists(project: NarrativeProject, characterId: string) {
	return project.characters.some(character => character.id === characterId);
}

/**
 * One explainable read-side for physical availability. It combines needs,
 * concrete injuries and carried equipment without executing the action.
 */
export function evaluateNarrativePhysicalAction(
	project: NarrativeProject,
	characterId: string,
	action: PhysicalActionKind
): NarrativePhysicalActionEvaluation {
	if (!characterExists(project, characterId)) {
		throw new Error(`Unknown physical-action character: ${characterId}`);
	}
	const body =
		project.simulation.bodyByCharacter[characterId] ??
		createCharacterBodyState(characterId);
	const bodyAction =
		action === 'run' ? 'run' : action === 'fast-run' ? 'fast-run' : 'normal';
	const bodyEvaluation = evaluateBodyAction(body, bodyAction);
	const injuryEvaluation = evaluateInjuryAction(
		project.simulation.injuriesByCharacter[characterId] ?? [],
		action
	);
	const carryEvaluation = evaluateCarryingAction(
		resolveCharacterCarryLoad(
			characterId,
			project.itemDefinitions,
			project.itemInstances,
			project.simulation.itemPlacementOverrides
		),
		action
	);
	const blockers: NarrativePhysicalActionReason[] = [
		...bodyEvaluation.blockers.map(blocker => ({
			source: 'body' as const,
			code: blocker.code,
			message: blocker.message
		})),
		...injuryEvaluation.blockers.map(blocker => ({
			source: 'injury' as const,
			code: blocker.code,
			message: blocker.message
		})),
		...carryEvaluation.blockers.map(blocker => ({
			source: 'carrying' as const,
			code: blocker.code,
			message: blocker.message
		}))
	];
	const modifiers: NarrativePhysicalActionReason[] = [
		...bodyEvaluation.modifiers.map(modifier => ({
			source: 'body' as const,
			code: modifier.code,
			message: modifier.message,
			multiplier: modifier.multiplier
		})),
		...injuryEvaluation.modifiers.map(modifier => ({
			source: 'injury' as const,
			code: modifier.code,
			message: modifier.message,
			multiplier: modifier.multiplier
		})),
		...carryEvaluation.modifiers.map(modifier => ({
			source: 'carrying' as const,
			code: modifier.code,
			message: modifier.message,
			multiplier: modifier.multiplier
		}))
	];
	return {
		characterId,
		action,
		allowed: blockers.length === 0,
		blockers,
		modifiers,
		effortCostMultiplier:
			bodyEvaluation.effortCostMultiplier *
			injuryEvaluation.effortCostMultiplier *
			carryEvaluation.effortCostMultiplier
	};
}

/**
 * Applies a runtime placement overlay. Authored ItemInstance placement remains
 * the simulation-start source and is never rewritten by play.
 */
export function applyNarrativeItemRuntimePlacement(
	project: NarrativeProject,
	itemInstanceId: string,
	placement: ItemRuntimePlacement
): NarrativeItemPlacementResult {
	const item = project.itemInstances.find(instance => instance.id === itemInstanceId);
	if (!item) {
		return {project, applied: false, blockers: ['Предмет не найден.']};
	}
	let packing: PackingEvaluation | undefined;
	const blockers: string[] = [];
	if (placement.type === 'character' || placement.type === 'pockets') {
		if (!characterExists(project, placement.characterId)) {
			blockers.push('Персонаж для переноса предмета не найден.');
		}
	}
	if (
		placement.type === 'location' &&
		!project.locations.some(location => location.id === placement.locationId)
	) {
		blockers.push('Локация для предмета не найдена.');
	}
	if (placement.type === 'pockets' && blockers.length === 0) {
		packing = evaluatePackIntoPockets(
			itemInstanceId,
			placement.characterId,
			project.itemDefinitions,
			project.itemInstances,
			project.simulation.itemPlacementOverrides
		);
		blockers.push(...packing.blockers.map(blocker => blocker.message));
	}
	if (placement.type === 'container') {
		packing = evaluatePackIntoContainer(
			itemInstanceId,
			placement.containerInstanceId,
			project.itemDefinitions,
			project.itemInstances,
			project.simulation.itemPlacementOverrides
		);
		blockers.push(...packing.blockers.map(blocker => blocker.message));
	}
	if (blockers.length > 0) {
		return {project, applied: false, blockers, packing};
	}
	return {
		project: {
			...project,
			simulation: {
				...project.simulation,
				itemPlacementOverrides: applyItemRuntimePlacement(
					project.simulation.itemPlacementOverrides,
					itemInstanceId,
					placement
				)
			}
		},
		applied: true,
		blockers: [],
		packing
	};
}
