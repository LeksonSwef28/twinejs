import {createCharacterBodyState, CharacterBodyState} from '../../domain/narrative/body';
import {resolveCharacterCarryLoad, CharacterCarryLoad} from '../../domain/narrative/carrying';
import {
	NarrativeCharacter,
	NarrativeLocation,
	NarrativeScene
} from '../../domain/narrative/entities';
import {NarrativeMoveKind} from '../../domain/narrative/interaction';
import {NarrativeProject} from '../../domain/narrative/project';
import {
	normalizedStoryRuntimePolicy,
	runtimeExecutionAbsoluteMinute,
	storyRuntimePolicyIsValid,
	storyWorkWasConsumed
} from '../../domain/narrative/runtime-execution';
import {scheduledStoryWork} from '../../domain/narrative/simulation-kernel';
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

export interface NarrativePlayerStoryOpportunity {
	id: string;
	storyNodeId: string;
	title: string;
	scheduledDay: number;
	scheduledMinuteOfDay: number;
	locationName?: string;
	state: 'ready' | 'wrong-location' | 'expired';
	summary: string;
}

export interface NarrativePlayerSleepOption {
	id: string;
	label: string;
	wakeMinuteOfDay: number;
}

export interface NarrativePlayerSleepWait {
	durationMinutes: number;
	targetMinuteOfDay: number;
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
	storyOpportunities: NarrativePlayerStoryOpportunity[];
	sleepOptions: NarrativePlayerSleepOption[];
	sleepWait?: NarrativePlayerSleepWait;
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

function storyPlacementIsDue(
	project: NarrativeProject,
	node: NarrativeProject['storyNodes'][number]
) {
	const day = node.placement?.day;
	if (day === undefined) {
		return true;
	}
	if (project.simulation.day !== day) {
		return project.simulation.day > day;
	}
	const minuteOfDay = node.placement?.minuteOfDay;
	return minuteOfDay === undefined || project.simulation.minuteOfDay >= minuteOfDay;
}

function playerStoryOpportunities(
	project: NarrativeProject,
	playerCharacterId: string,
	locationId: string | undefined
): NarrativePlayerStoryOpportunity[] {
	const runtimeNodes = narrativeRuntimeStoryNodes(project);
	const nodesById = new Map(runtimeNodes.map(node => [node.id, node]));
	const activeWorkIds = new Set(
		project.activeStoryExecutions.map(execution => execution.workId)
	);
	const nowAbsolute = runtimeExecutionAbsoluteMinute(project.simulation);

	return scheduledStoryWork(project.storyNodes)
		.flatMap(work => {
			const node = work.sourceEntityId
				? nodesById.get(work.sourceEntityId)
				: undefined;
			if (
				!node ||
				!node.runtimePolicy ||
				!node.participantIds.includes(playerCharacterId) ||
				(node.activationState !== 'available' &&
					node.activationState !== 'active') ||
				!storyRuntimePolicyIsValid(node.runtimePolicy) ||
				activeWorkIds.has(work.id)
			) {
				return [];
			}
			const policy = normalizedStoryRuntimePolicy(node);
			if (
				policy.occurrenceMode === 'one-shot' &&
				storyWorkWasConsumed(project.runtimeOccurrences, work.id)
			) {
				return [];
			}
			const scheduledAbsolute = runtimeExecutionAbsoluteMinute(work.moment);
			if (nowAbsolute < scheduledAbsolute) {
				return [];
			}
			const expired =
				policy.missAfterMinutes !== undefined &&
				nowAbsolute > scheduledAbsolute + policy.missAfterMinutes;
			const requiredLocationId = node.placement?.locationId;
			const locationName = requiredLocationId
				? project.locations.find(location => location.id === requiredLocationId)?.name
				: undefined;
			const atRequiredLocation =
				!requiredLocationId || requiredLocationId === locationId;
			const state = expired
				? ('expired' as const)
				: atRequiredLocation
					? ('ready' as const)
					: ('wrong-location' as const);
			return [
				{
					id: work.id,
					storyNodeId: node.id,
					title: node.title,
					scheduledDay: work.moment.day,
					scheduledMinuteOfDay: work.moment.minuteOfDay,
					locationName,
					state,
					summary:
						state === 'expired'
							? 'Окно этой возможности уже закрылось; пропуск можно зафиксировать в истории.'
							: state === 'wrong-location'
								? `Для участия нужно быть в локации «${locationName ?? requiredLocationId}».`
								: 'Возможность доступна сейчас.'
				}
			];
		})
		.sort(
			(a, b) =>
				a.scheduledDay - b.scheduledDay ||
				a.scheduledMinuteOfDay - b.scheduledMinuteOfDay ||
				a.title.localeCompare(b.title) ||
				a.id.localeCompare(b.id)
		);
}

function playerSleepPresentation(
	project: NarrativeProject,
	locationId: string | undefined
): {options: NarrativePlayerSleepOption[]; wait?: NarrativePlayerSleepWait} {
	if (!locationId || project.simulation.day >= project.template.dayCount) {
		return {options: []};
	}
	const localOptions = (project.sleepOptions ?? [])
		.filter(option => option.locationId === locationId)
		.sort(
			(a, b) =>
				a.earliestStartMinuteOfDay - b.earliestStartMinuteOfDay ||
				a.label.localeCompare(b.label) ||
				a.id.localeCompare(b.id)
		);
	const options = localOptions
		.filter(
			option =>
				project.simulation.minuteOfDay >= option.earliestStartMinuteOfDay
		)
		.map(option => ({
			id: option.id,
			label: option.label,
			wakeMinuteOfDay: option.wakeMinuteOfDay
		}));
	if (options.length > 0) {
		return {options};
	}
	const next = localOptions.find(
		option =>
			project.simulation.minuteOfDay < option.earliestStartMinuteOfDay
	);
	return next
		? {
				options,
				wait: {
					durationMinutes:
						next.earliestStartMinuteOfDay - project.simulation.minuteOfDay,
					targetMinuteOfDay: next.earliestStartMinuteOfDay
				}
			}
		: {options};
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
				!storyPlacementIsDue(project, node) ||
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
		storyOpportunities: [],
		sleepOptions: [],
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
	const storyOpportunities = playerStoryOpportunities(
		project,
		characterId,
		locationId
	);
	const sleep = playerSleepPresentation(project, locationId);
	const playerBase = {
		...base,
		actions,
		travelOptions,
		storyOpportunities,
		sleepOptions: sleep.options,
		sleepWait: sleep.wait
	};

	if (!locationId) {
		return {
			...playerBase,
			body,
			carryLoad,
			inventoryItems: inventoryItems(project, carryLoad)
		};
	}

	const location = project.locations.find(candidate => candidate.id === locationId);
	if (!location) {
		return {
			...playerBase,
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
		...playerBase,
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
