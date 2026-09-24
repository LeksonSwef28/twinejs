import {EntityId} from './entities';

export type NarrativeWorkspaceMode = 'story' | 'world-time';

export interface CanvasPoint {
	x: number;
	y: number;
}

export interface CanvasSize {
	width: number;
	height: number;
}

export interface CanvasViewport {
	x: number;
	y: number;
	zoom: number;
}

export type StoryCanvasEntityType =
	| 'character'
	| 'storyNode'
	| 'scene'
	| 'event'
	| 'dialogue'
	| 'choice'
	| 'condition'
	| 'effect'
	| 'fact'
	| 'statement'
	| 'item';

export interface CanvasEntityReference {
	type: StoryCanvasEntityType;
	id: EntityId;
}

/**
 * A canvas node is a visual instance, not the domain entity itself.
 * The same Character/Event/etc. may appear on several canvases without being duplicated in the world model.
 */
export interface CanvasNodeInstance {
	id: EntityId;
	kind: 'entity' | 'note' | 'group';
	entityRef?: CanvasEntityReference;
	title?: string;
	position: CanvasPoint;
	size?: CanvasSize;
	parentNodeId?: EntityId;
}

export interface StoryCanvasEditorState {
	activeCanvasId: string;
	viewport: CanvasViewport;
	nodes: CanvasNodeInstance[];
}

/**
 * Camera state for the temporal/spatial workspace. It is intentionally editor metadata:
 * moving or zooming this viewport must never advance game time.
 */
export interface WorldTimeViewportState {
	centerAbsoluteMinute: number;
	pixelsPerHour: number;
	scrollY: number;
	viewportWidth?: number;
	viewportHeight?: number;
}

export interface NarrativeEditorState {
	/** View cursor only. This is not the simulation playhead. */
	selectedDay: number;
	selectedPeriodId: string;
	/** View cursor only. */
	selectedMinuteOfDay?: number;
	workspaceMode?: NarrativeWorkspaceMode;
	storyCanvas?: StoryCanvasEditorState;
	worldTimeViewport?: WorldTimeViewportState;
}
