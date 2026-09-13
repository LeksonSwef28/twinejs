import * as React from 'react';
import {NarrativeProject} from '../../domain/narrative/project';
import {createNarrativeId} from '../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../domain/narrative/templates/93-days';
import {
	EditorAuthoringCommand,
	editorAuthoringReducer
} from './editor-authoring';
import {NarrativeProjectHistoryState} from './reducer';
import {createLocalStorageNarrativeProjectRepository} from './repository';
import {
	keepCurrentRuntime,
	replaceRuntimeProjectInHistory
} from './runtime-history';

export type NarrativeSaveStatus = 'saved' | 'saving' | 'error';

export interface NarrativeProjectContextValue {
	project: NarrativeProject;
	execute(command: EditorAuthoringCommand): void;
	/**
	 * Replaces only the current runtime aggregate from an explicit simulation
	 * operation. Runtime updates are persisted, but never become authoring undo
	 * entries and never update authored `updatedAt` by themselves.
	 */
	replaceRuntimeProject(project: NarrativeProject): void;
	undo(): void;
	redo(): void;
	canUndo: boolean;
	canRedo: boolean;
	saveStatus: NarrativeSaveStatus;
	createId(prefix: string): string;
}

const NarrativeProjectContext = React.createContext<
	NarrativeProjectContextValue | undefined
>(undefined);

export interface NarrativeProjectProviderProps {
	hostStoryId: string;
	projectName: string;
}

export const NarrativeProjectProvider: React.FC<
	NarrativeProjectProviderProps
> = props => {
	const repository = React.useMemo(
		() =>
			createLocalStorageNarrativeProjectRepository(
				props.hostStoryId,
				props.projectName,
				ninetyThreeDaysTemplate
			),
		[props.hostStoryId, props.projectName]
	);
	const initialState = React.useMemo<NarrativeProjectHistoryState>(
		() => ({past: [], present: repository.load(), future: []}),
		[repository]
	);
	const [state, setState] = React.useState(initialState);
	const [saveStatus, setSaveStatus] =
		React.useState<NarrativeSaveStatus>('saved');

	React.useEffect(() => {
		setState({past: [], present: repository.load(), future: []});
	}, [repository]);

	React.useEffect(() => {
		setSaveStatus('saving');
		// Pan/zoom and playtest stepping can dispatch many lightweight updates. A
		// debounce avoids serializing the whole project for every small change.
		const timeout = window.setTimeout(() => {
			try {
				repository.save(state.present);
				setSaveStatus('saved');
			} catch {
				setSaveStatus('error');
			}
		}, 500);

		return () => window.clearTimeout(timeout);
	}, [repository, state.present]);

	const execute = React.useCallback((command: EditorAuthoringCommand) => {
		setState(current =>
			editorAuthoringReducer(current, {type: 'execute', command})
		);
	}, []);
	const replaceRuntimeProject = React.useCallback((project: NarrativeProject) => {
		setState(current => replaceRuntimeProjectInHistory(current, project));
	}, []);
	const undo = React.useCallback(() => {
		setState(current => {
			const restored = editorAuthoringReducer(current, {type: 'undo'});
			return restored === current
				? current
				: {
						...restored,
						present: keepCurrentRuntime(restored.present, current.present)
				  };
		});
	}, []);
	const redo = React.useCallback(() => {
		setState(current => {
			const restored = editorAuthoringReducer(current, {type: 'redo'});
			return restored === current
				? current
				: {
						...restored,
						present: keepCurrentRuntime(restored.present, current.present)
				  };
		});
	}, []);

	const value = React.useMemo<NarrativeProjectContextValue>(
		() => ({
			project: state.present,
			execute,
			replaceRuntimeProject,
			undo,
			redo,
			canUndo: state.past.length > 0,
			canRedo: state.future.length > 0,
			saveStatus,
			createId: createNarrativeId
		}),
		[state, execute, replaceRuntimeProject, undo, redo, saveStatus]
	);

	return (
		<NarrativeProjectContext.Provider value={value}>
			{props.children}
		</NarrativeProjectContext.Provider>
	);
};

export function useNarrativeProject() {
	const context = React.useContext(NarrativeProjectContext);
	if (!context) {
		throw new Error(
			'useNarrativeProject must be used inside NarrativeProjectProvider'
		);
	}

	return context;
}
