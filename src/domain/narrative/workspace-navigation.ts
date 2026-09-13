import {CanvasPoint, CanvasViewport, NarrativeWorkspaceMode} from './editor';
import {StoryNodeDefinition} from './story';
import {minutesPerDay} from './calendar';

export interface NarrativeWorkspacePanels {
	showStory: boolean;
	showWorldTime: boolean;
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
