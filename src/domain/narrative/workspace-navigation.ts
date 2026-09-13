import {minutesPerDay} from './calendar';
import {CanvasPoint, CanvasViewport, NarrativeWorkspaceMode} from './editor';
import {EntityId} from './entities';
import {NarrativeMoveDefinition} from './interaction';
import {StoryNodeDefinition} from './story';

export interface NarrativeWorkspacePanels {
	showStory: boolean;
	showWorldTime: boolean;
}

export interface NavigationSimulationMoment {
	day: number;
	minuteOfDay: number;
}

export type StoryParticipantPresenceRelation =
	| 'same-location'
	| 'different-location'
	| 'unknown-location'
	| 'different-moment'
	| 'no-authored-location';

export interface StoryParticipantWorldContext {
	characterId: EntityId;
	actualLocationId?: EntityId;
	presenceRelation: StoryParticipantPresenceRelation;
}

export interface StoryWorldNavigationContext {
	storyNodeId: EntityId;
	absoluteMinute?: number;
	authoredLocationId?: EntityId;
	moveIds: EntityId[];
	participantIds: EntityId[];
	/** Actual presence is always read from the Simulation Playhead, never from the View Cursor. */
	simulationAbsoluteMinute: number;
	actualPresenceComparableToStoryMoment: boolean;
	participants: StoryParticipantWorldContext[];
}

/**
 * Split View is a lens over the two canonical workspaces, never a third mode.
 */
export function workspacePanelsForMode(
	mode: NarrativeWorkspaceMode,
	splitView: boolean
): NarrativeWorkspacePanels {
	if (splitView) {
		return {showStory: true, showWorldTime: true};
	}
	return {
		showStory: mode === 'story',
		showWorldTime: mode === 'world-time'
	};
}

export function storyNodeAbsoluteMinute(node: StoryNodeDefinition) {
	const placement = node.placement;
	if (placement?.day === undefined || placement.minuteOfDay === undefined) {
		return undefined;
	}
	return (placement.day - 1) * minutesPerDay + placement.minuteOfDay;
}

export function simulationMomentAbsoluteMinute(moment: NavigationSimulationMoment) {
	return (moment.day - 1) * minutesPerDay + moment.minuteOfDay;
}

export function storyCanvasViewportForNode(
	position: CanvasPoint,
	currentZoom = 1,
	targetScreen: CanvasPoint = {x: 380, y: 240}
): CanvasViewport {
	const zoom = Math.max(0.8, currentZoom);
	return {
		x: targetScreen.x - position.x * zoom,
		y: targetScreen.y - position.y * zoom,
		zoom
	};
}

export function worldTimeViewportForStoryNode(
	node: StoryNodeDefinition,
	currentPixelsPerHour = 12
) {
	const centerAbsoluteMinute = storyNodeAbsoluteMinute(node);
	if (centerAbsoluteMinute === undefined) {
		return undefined;
	}
	return {
		centerAbsoluteMinute,
		pixelsPerHour: Math.max(12, currentPixelsPerHour)
	};
}

export function storyMovesForNode(
	nodeId: EntityId,
	moves: NarrativeMoveDefinition[]
) {
	return moves.filter(move => move.storyNodeId === nodeId);
}

/**
 * Characters relevant to a Story node include explicit node participants plus
 * actors/targets of the node's authored Narrative Moves. The result is stable
 * and deduplicated in authoring order.
 */
export function storyParticipantIds(
	node: StoryNodeDefinition,
	moves: NarrativeMoveDefinition[]
) {
	const ids: EntityId[] = [];
	const seen = new Set<EntityId>();
	const add = (id?: EntityId) => {
		if (id && !seen.has(id)) {
			seen.add(id);
			ids.push(id);
		}
	};

	add(node.primaryCharacterId);
	node.participantIds.forEach(add);
	for (const move of storyMovesForNode(node.id, moves)) {
		add(move.actorCharacterId);
		move.targetCharacterIds.forEach(add);
	}
	return ids;
}

export function storyNodesForLocation(
	nodes: StoryNodeDefinition[],
	locationId: EntityId
) {
	return nodes.filter(node => node.placement?.locationId === locationId);
}

export function storyNodesForCharacter(
	nodes: StoryNodeDefinition[],
	moves: NarrativeMoveDefinition[],
	characterId: EntityId
) {
	return nodes.filter(node => storyParticipantIds(node, moves).includes(characterId));
}

/**
 * A34 semantic bridge between Story and World/Time. Authored placement and
 * runtime actual presence are deliberately reported as separate fields.
 * Actual presence can only be compared to Story placement when the Story node
 * is placed at the current Simulation Playhead moment.
 */
export function storyWorldNavigationContext(
	node: StoryNodeDefinition,
	moves: NarrativeMoveDefinition[],
	actualLocationByCharacter: Record<string, EntityId | undefined>,
	simulationMoment: NavigationSimulationMoment
): StoryWorldNavigationContext {
	const absoluteMinute = storyNodeAbsoluteMinute(node);
	const simulationAbsoluteMinute = simulationMomentAbsoluteMinute(simulationMoment);
	const authoredLocationId = node.placement?.locationId;
	const actualPresenceComparableToStoryMoment =
		absoluteMinute !== undefined && absoluteMinute === simulationAbsoluteMinute;
	const participantIds = storyParticipantIds(node, moves);
	const nodeMoves = storyMovesForNode(node.id, moves);

	return {
		storyNodeId: node.id,
		absoluteMinute,
		authoredLocationId,
		moveIds: nodeMoves.map(move => move.id),
		participantIds,
		simulationAbsoluteMinute,
		actualPresenceComparableToStoryMoment,
		participants: participantIds.map(characterId => {
			const actualLocationId = actualLocationByCharacter[characterId];
			let presenceRelation: StoryParticipantPresenceRelation;
			if (!authoredLocationId) {
				presenceRelation = 'no-authored-location';
			} else if (!actualPresenceComparableToStoryMoment) {
				presenceRelation = 'different-moment';
			} else if (!actualLocationId) {
				presenceRelation = 'unknown-location';
			} else {
				presenceRelation =
					actualLocationId === authoredLocationId
						? 'same-location'
						: 'different-location';
			}
			return {characterId, actualLocationId, presenceRelation};
		})
	};
}
