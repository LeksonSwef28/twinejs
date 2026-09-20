import {createCharacterBodyState, CharacterBodyState} from '../../domain/narrative/body';
import {resolveCharacterCarryLoad, CharacterCarryLoad} from '../../domain/narrative/carrying';
import {
	NarrativeCharacter,
	NarrativeLocation,
	NarrativeScene
} from '../../domain/narrative/entities';
import {NarrativeProject} from '../../domain/narrative/project';

export type NarrativePlayerPerspectiveResolution =
	| {
			status: 'resolved';
			source:
				| 'explicit-player-id'
				| 'single-full-cognition'
				| 'single-actual-presence';
			character: NarrativeCharacter;
	  }
	| {
			status: 'unresolved';
			reason: 'no-characters' | 'ambiguous-characters';
			summary: string;
	  };

export interface NarrativePlayerInventoryItem {
	id: string;
	name: string;
	placement: 'top-level' | 'contained';
}

export interface NarrativePlayerPresentationModel {
	perspective: NarrativePlayerPerspectiveResolution;
	day: number;
	minuteOfDay: number;
	location?: NarrativeLocation;
	locationState: 'resolved' | 'missing-actual-presence' | 'unknown-location';
	scene?: NarrativeScene;
	sceneState: 'resolved' | 'none' | 'ambiguous';
	localCharacters: NarrativeCharacter[];
	body?: CharacterBodyState;
	carryLoad?: CharacterCarryLoad;
	inventoryItems: NarrativePlayerInventoryItem[];
	economy: {
		status: 'unavailable';
		summary: string;
	};
}

function sortedCharacters(characters: NarrativeCharacter[]) {
	return [...characters].sort((a, b) => {
		const byName = a.name.localeCompare(b.name);
		return byName !== 0 ? byName : a.id.localeCompare(b.id);
	});
}

export function resolveNarrativePlayerPerspective(
	project: NarrativeProject
): NarrativePlayerPerspectiveResolution {
	if (project.characters.length === 0) {
		return {
			status: 'unresolved',
			reason: 'no-characters',
			summary: 'Игровой персонаж не определён: в проекте пока нет персонажей.'
		};
	}

	const explicitPlayer = project.characters.find(
		character => character.id === 'player'
	);
	if (explicitPlayer) {
		return {
			status: 'resolved',
			source: 'explicit-player-id',
			character: explicitPlayer
		};
	}

	const fullCognition = project.characters.filter(
		character => character.cognitionTier === 'full'
	);
	if (fullCognition.length === 1) {
		return {
			status: 'resolved',
			source: 'single-full-cognition',
			character: fullCognition[0]
		};
	}

	const actuallyPresent = project.characters.filter(
		character =>
			Boolean(project.simulation.actualLocationByCharacter[character.id])
	);
	if (actuallyPresent.length === 1) {
		return {
			status: 'resolved',
			source: 'single-actual-presence',
			character: actuallyPresent[0]
		};
	}

	return {
		status: 'unresolved',
		reason: 'ambiguous-characters',
		summary:
			'Игровой персонаж не определён однозначно. A55 не выбирает протагониста автоматически.'
	};
}

function itemName(project: NarrativeProject, itemInstanceId: string) {
	const instance = project.itemInstances.find(item => item.id === itemInstanceId);
	if (!instance) {
		return itemInstanceId;
	}
	const definition = project.itemDefinitions.find(
		candidate => candidate.id === instance.definitionId
	);
	return instance.nameOverride?.trim() || definition?.name || itemInstanceId;
}

function inventoryItems(
	project: NarrativeProject,
	load: CharacterCarryLoad
): NarrativePlayerInventoryItem[] {
	const topLevelIds = new Set(load.topLevelItemIds);
	const orderedIds = [
		...load.topLevelItemIds,
		...load.containedItemIds.filter(id => !topLevelIds.has(id))
	];

	return orderedIds.map(id => ({
		id,
		name: itemName(project, id),
		placement: topLevelIds.has(id) ? 'top-level' : 'contained'
	}));
}

export function deriveNarrativePlayerPresentation(
	project: NarrativeProject
): NarrativePlayerPresentationModel {
	const perspective = resolveNarrativePlayerPerspective(project);
	const base: NarrativePlayerPresentationModel = {
		perspective,
		day: project.simulation.day,
		minuteOfDay: project.simulation.minuteOfDay,
		locationState: 'missing-actual-presence',
		sceneState: 'none',
		localCharacters: [],
		inventoryItems: [],
		economy: {
			status: 'unavailable',
			summary: 'Деньги и экономика будут подключены отдельным каноническим контрактом.'
		}
	};

	if (perspective.status !== 'resolved') {
		return base;
	}

	const characterId = perspective.character.id;
	const locationId = project.simulation.actualLocationByCharacter[characterId];
	const body =
		project.simulation.bodyByCharacter[characterId] ??
		createCharacterBodyState(characterId);
	const carryLoad = resolveCharacterCarryLoad(
		characterId,
		project.itemDefinitions,
		project.itemInstances,
		project.itemPlacementOverrides
	);

	if (!locationId) {
		return {
			...base,
			body,
			carryLoad,
			inventoryItems: inventoryItems(project, carryLoad)
		};
	}

	const location = project.locations.find(candidate => candidate.id === locationId);
	if (!location) {
		return {
			...base,
			locationState: 'unknown-location',
			body,
			carryLoad,
			inventoryItems: inventoryItems(project, carryLoad)
		};
	}

	const scenes = [...project.scenes]
		.filter(scene => scene.locationId === location.id)
		.sort((a, b) => a.id.localeCompare(b.id));
	const scene = scenes.length === 1 ? scenes[0] : undefined;
	const localCharacters = sortedCharacters(
		project.characters.filter(
			character =>
				character.id !== characterId &&
				project.simulation.actualLocationByCharacter[character.id] ===
					location.id
		)
	);

	return {
		...base,
		location,
		locationState: 'resolved',
		scene,
		sceneState:
			scenes.length === 1
				? 'resolved'
				: scenes.length === 0
					? 'none'
					: 'ambiguous',
		localCharacters,
		body,
		carryLoad,
		inventoryItems: inventoryItems(project, carryLoad)
	};
}
