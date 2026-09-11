import {CanvasPoint, CanvasViewport} from '../../domain/narrative/editor';
import {CognitionTier} from '../../domain/narrative/entities';
import {NarrativeWorkspaceMode} from '../../domain/narrative/project';
import {StoryConnectionKind, StoryNodeKind} from '../../domain/narrative/story';

export type NarrativeProjectCommand =
	| {type: 'project/rename'; name: string}
	| {type: 'location/add'; id: string; name: string}
	| {type: 'character/add'; id: string; profileId: string; name: string; cognitionTier: CognitionTier}
	| {
			type: 'story/addDraftNode';
			id: string;
			canvasNodeId: string;
			kind: StoryNodeKind;
			title: string;
			position: CanvasPoint;
	  }
	| {type: 'story/removeNode'; id: string}
	| {type: 'story/updateNodeTitle'; id: string; title: string}
	| {
			type: 'story/connect';
			id: string;
			sourceNodeId: string;
			targetNodeId: string;
			kind: StoryConnectionKind;
			sourcePortId?: string;
			targetPortId?: string;
	  }
	| {type: 'editor/selectDay'; day: number}
	| {type: 'editor/selectPeriod'; periodId: string}
	| {type: 'editor/selectMoment'; day: number; minuteOfDay: number}
	| {type: 'editor/selectWorkspace'; workspace: NarrativeWorkspaceMode}
	| {type: 'editor/moveCanvasNode'; canvasNodeId: string; position: CanvasPoint}
	| {type: 'editor/setStoryViewport'; viewport: CanvasViewport}
	| {
			type: 'editor/setWorldTimeViewport';
			centerAbsoluteMinute: number;
			pixelsPerHour: number;
			scrollY?: number;
			viewportWidth?: number;
			viewportHeight?: number;
	  };
