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
	| CanonicalEntityAuthoringCommand;

export type EditorAuthoringAction =
	| {type: 'execute'; command: EditorAuthoringCommand}
	| {type: 'undo'}
	| {type: 'redo'};

export function editorAuthoringReducer(
	state: NarrativeProjectHistoryState,
	action: EditorAuthoringAction
): NarrativeProjectHistoryState {
	if (action.type === 'undo' || action.type === 'redo') {
		return narrativeProjectAuthoringReducer(state, action);
	}
	if (!isCanonicalEntityAuthoringCommand(action.command)) {
		return narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: action.command
		});
	}
	const nextProject = applyCanonicalEntityAuthoringCommand(
		state.present,
		action.command
	);
	if (nextProject === state.present) {
		return state;
	}
	return {
		past: [...state.past, state.present],
		present: nextProject,
		future: []
	};
}
