import {
	BulkStoryAuthoringCommand,
	applyBulkStoryAuthoringCommand,
	isBulkStoryAuthoringCommand
} from './bulk-authoring';
import {
	CanonicalEntityAuthoringCommand,
	applyCanonicalEntityAuthoringCommand,
	isCanonicalEntityAuthoringCommand
} from './canonical-entity-authoring';
import {NarrativeProjectHistoryState} from './reducer';
import {
	NarrativeAuthoringCommand,
	narrativeProjectAuthoringReducer
} from './routine-authoring';

export type EditorAuthoringCommand =
	| NarrativeAuthoringCommand
	| CanonicalEntityAuthoringCommand
	| BulkStoryAuthoringCommand;

export type EditorAuthoringAction =
	| {type: 'execute'; command: EditorAuthoringCommand}
	| {type: 'undo'}
	| {type: 'redo'};

function commitAuthoringProject(
	state: NarrativeProjectHistoryState,
	present: NarrativeProjectHistoryState['present']
) {
	if (present === state.present) {
		return state;
	}
	return {
		past: [...state.past, state.present],
		present,
		future: []
	};
}

export function editorAuthoringReducer(
	state: NarrativeProjectHistoryState,
	action: EditorAuthoringAction
): NarrativeProjectHistoryState {
	if (action.type === 'undo' || action.type === 'redo') {
		return narrativeProjectAuthoringReducer(state, action);
	}
	if (isBulkStoryAuthoringCommand(action.command)) {
		return commitAuthoringProject(
			state,
			applyBulkStoryAuthoringCommand(state.present, action.command)
		);
	}
	if (!isCanonicalEntityAuthoringCommand(action.command)) {
		return narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: action.command
		});
	}
	return commitAuthoringProject(
		state,
		applyCanonicalEntityAuthoringCommand(state.present, action.command)
	);
}
