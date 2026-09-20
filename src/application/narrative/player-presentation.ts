import {createCharacterBodyState, CharacterBodyState} from '../../domain/narrative/body';
import {resolveCharacterCarryLoad, CharacterCarryLoad} from '../../domain/narrative/carrying';
import {
	NarrativeCharacter,
	NarrativeLocation,
	NarrativeScene
} from '../../domain/narrative/entities';
import {NarrativeMoveKind} from '../../domain/narrative/interaction';
import {NarrativeProject} from '../../domain/narrative/project';
import {NarrativeTravelMode} from '../../domain/narrative/travel';
import {evaluateNarrativePhysicalAction} from './physical';
import {
	narrativeRuntimeStoryNodes,
	resolveNarrativeProjectMove
} from './living-simulation';

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

export type NarrativePlayerActionState =
	| 'ready'
	| 'blocked'
	| 'unknown'
	| 'input-required';

export interface NarrativePlayerTravelOption {
	id: string;
	label: string;
	destinationLocationId: string;
	destinationName: string;
	durationMinutes: number;
	mode: NarrativeTravelMode;
	state: 'ready' | 'blocked';
	summary: string;
}

export interface NarrativePlayerAction {
	id: string;
	label: string;
	kind: NarrativeMoveKind;
	storyNodeId: string;
	storyTitle: string;
	dialogue: boolean;
	state: NarrativePlayerActionState;
	summary: string;
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
	actions: NarrativePlayerAction[];
	travelOptions: NarrativePlayerTravelOption[];
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

	const actuallyPresent = project.characters.filter(character =>
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

function actionState(
	status: ReturnType<typeof resolveNarrativeProjectMove>['status']
): NarrativePlayerActionState {
	return status === 'resolved' ? 'ready' : status;
}

function playerTravelOptions(
	project: NarrativeProject,
	playerCharacterId: string,
	locationId: string | undefined
): NarrativePlayerTravelOption[] {
	if (!locationId) {
		return [];
	}
	return (project.travelRoutes ?? [])
		.filter(route => route.originLocationId === locationId)
		.flatMap(route => {
			const destination = project.locations.find(
				location => location.id === route.destinationLocationId
			);
			if (!destination) {
				return [];
			}
			const physical = route.physicalAction
				? evaluateNarrativePhysicalAction(
						project,
						playerCharacterId,
						route.physicalAction
					)
				: undefined;
			return [
				{
					id: route.id,
					label: route.label,
					destinationLocationId: destination.id,
					destinationName: destination.name,
					durationMinutes: route.durationMinutes,
					mode: route.mode,
					state: physical && !physical.allowed ? ('blocked' as const) : ('ready' as const),
					summary:
						physical && !physical.allowed
							? physical.blockers.map(blocker => blocker.message).join(' ')
							: `${route.durationMinutes} мин.`
				}
			];
		})
		.sort(
			(a, b) =>
				a.durationMinutes - b.durationMinutes ||
				a.label.localeCompare(b.label) ||
				a.id.localeCompare(b.id)
		);
}

function playerActions(
	project: NarrativeProject,
	playerCharacterId: string,
	locationId: string | undefined
): NarrativePlayerAction[] {
	const runtimeNodes = narrativeRuntimeStoryNodes(project);
	const nodesById = new Map(runtimeNodes.map(node => [node.id, node]));

	return project.narrativeMoves
		.filter(move => move.actorCharacterId === playerCharacterId)
		.flatMap(move => {
			const node = nodesById.get(move.storyNodeId);
			if (
				!node ||
				(node.activationState !== 'available' &&
					node.activationState !== 'active') ||
				(node.placement?.locationId &&
					node.placement.locationId !== locationId)
			) {
				return [];
			}
			const resolution = resolveNarrativeProjectMove(project, move.id);
			return [
				{
					id: move.id,
					label: move.label,
					kind: move.kind,
					storyNodeId: node.id,
					storyTitle: node.title,
					dialogue: node.kind === 'dialogue',
					state: actionState(resolution.status),
					summary: resolution.resolutionSummary
				}
			];
		})
		.sort((a, b) => {
			const byStory = a.storyTitle.localeCompare(b.storyTitle);
			if (byStory !== 0) {
				return byStory;
			}
			const byLabel = a.label.localeCompare(b.label);
			return byLabel !== 0 ? byLabel : a.id.localeCompare(b.id);
		});
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
		actions: [],
		travelOptions: [],
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
	const actions = playerActions(project, characterId, locationId);
	const travelOptions = playerTravelOptions(project, characterId, locationId);

	if (!locationId) {
		return {
			...base,
			actions,
			travelOptions,
			body,
			carryLoad,
			inventoryItems: inventoryItems(project, carryLoad)
		};
	}

	const location = project.locations.find(candidate => candidate.id === locationId);
	if (!location) {
		return {
			...base,
			actions,
			travelOptions,
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
		actions,
		travelOptions,
		body,
		carryLoad,
		inventoryItems: inventoryItems(project, carryLoad)
	};
}
