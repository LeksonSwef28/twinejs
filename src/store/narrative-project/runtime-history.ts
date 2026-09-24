import {NarrativeProject} from '../../domain/narrative/project';
import {NarrativeProjectHistoryState} from './reducer';

/**
 * Copies only live/runtime state from a playtest result onto the current authoring
 * aggregate. This makes the boundary physical: a runtime service cannot change
 * authored Story/editor data merely by returning a full NarrativeProject object.
 */
export function projectNarrativeRuntimeOntoAuthoring(
	authoredProject: NarrativeProject,
	runtimeSource: NarrativeProject
): NarrativeProject {
	return {
		...authoredProject,
		memories: runtimeSource.memories,
		relationships: runtimeSource.relationships,
		pendingReactions: runtimeSource.pendingReactions,
		mindStates: runtimeSource.mindStates,
		injuriesByCharacter: runtimeSource.injuriesByCharacter,
		itemPlacementOverrides: runtimeSource.itemPlacementOverrides,
		storyNodeStateOverrides: runtimeSource.storyNodeStateOverrides,
		runtimeOccurrences: runtimeSource.runtimeOccurrences,
		activeStoryExecutions: runtimeSource.activeStoryExecutions,
		simulation: runtimeSource.simulation
	};
}

/**
 * Runtime stepping changes only the current project. It deliberately does not
 * create an authoring undo entry and does not invalidate authored redo history.
 */
export function replaceRuntimeProjectInHistory(
	state: NarrativeProjectHistoryState,
	runtimeSource: NarrativeProject
): NarrativeProjectHistoryState {
	const present = projectNarrativeRuntimeOntoAuthoring(state.present, runtimeSource);
	return {...state, present};
}

/**
 * When authoring Undo/Redo restores an older authored snapshot, retain the live
 * playtest runtime. View/editor preservation remains the reducer's concern.
 */
export function keepCurrentRuntime(
	authoredSnapshot: NarrativeProject,
	current: NarrativeProject
): NarrativeProject {
	return projectNarrativeRuntimeOntoAuthoring(authoredSnapshot, current);
}
