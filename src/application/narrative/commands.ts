import {
	CanvasEntityReference,
	CanvasPoint,
	CanvasViewport
} from '../../domain/narrative/editor';
import {CognitionTier} from '../../domain/narrative/entities';
import {ItemPlacement} from '../../domain/narrative/items';
import {ClaimTruthStance} from '../../domain/narrative/knowledge';
import {NarrativeWorkspaceMode} from '../../domain/narrative/project';
import {
	StoryConnectionKind,
	StoryEdgeMode,
	StoryNodeKind,
	StoryPlacement
} from '../../domain/narrative/story';

export type NarrativeProjectCommand =
	| {type: 'project/rename'; name: string}
	| {type: 'location/add'; id: string; name: string}
	| {type: 'character/add'; id: string; profileId: string; name: string; cognitionTier: CognitionTier}
	| {type: 'item/addDefinition'; id: string; name: string}
	| {
			type: 'item/addInstance';
			id: string;
			definitionId: string;
			placement?: ItemPlacement;
	  }
	| {type: 'fact/add'; id: string; title: string; description?: string}
	| {
			type: 'claim/add';
			id: string;
			text: string;
			aboutFactId?: string;
			stance?: ClaimTruthStance;
	  }
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
	| {type: 'story/setPlacement'; id: string; placement?: StoryPlacement}
	| {
			type: 'story/connect';
			id: string;
			sourceNodeId: string;
			targetNodeId: string;
			kind: StoryConnectionKind;
			mode?: StoryEdgeMode;
			sourcePortId?: string;
			targetPortId?: string;
	  }
	| {type: 'story/setConnectionMode'; id: string; mode: StoryEdgeMode}
	| {type: 'editor/selectDay'; day: number}
	| {type: 'editor/selectPeriod'; periodId: string}
	| {type: 'editor/selectMoment'; day: number; minuteOfDay: number}
	| {type: 'editor/selectWorkspace'; workspace: NarrativeWorkspaceMode}
	| {
			type: 'editor/addCanvasReference';
			canvasNodeId: string;
			entityRef: CanvasEntityReference;
			position: CanvasPoint;
	  }
	| {type: 'editor/removeCanvasNode'; canvasNodeId: string}
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
