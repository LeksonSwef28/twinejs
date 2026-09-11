import * as React from 'react';
import {NarrativeProjectCommand} from '../../application/narrative/commands';
import {NarrativeProject} from '../../domain/narrative/project';
import {createNarrativeId} from '../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../domain/narrative/templates/93-days';
import {
	NarrativeProjectHistoryState,
	narrativeProjectHistoryReducer
} from './reducer';
import {createLocalStorageNarrativeProjectRepository} from './repository';

export type NarrativeSaveStatus = 'saved' | 'saving' | 'error';

export interface NarrativeProjectContextValue {
	project: NarrativeProject;
	execute(command: NarrativeProjectCommand): void;
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
	const [state, dispatch] = React.useReducer(
		narrativeProjectHistoryReducer,
		initialState
	);
	const [saveStatus, setSaveStatus] =
		React.useState<NarrativeSaveStatus>('saved');

	React.useEffect(() => {
		setSaveStatus('saving');
		// Pan/zoom can dispatch many lightweight editor-state updates. A slightly
		// longer debounce avoids serializing the whole project for every mouse move.
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

	const execute = React.useCallback(
		(command: NarrativeProjectCommand) =>
			dispatch({type: 'execute', command}),
		[]
	);
	const undo = React.useCallback(() => dispatch({type: 'undo'}), []);
	const redo = React.useCallback(() => dispatch({type: 'redo'}), []);

	const value = React.useMemo<NarrativeProjectContextValue>(
		() => ({
			project: state.present,
			execute,
			undo,
			redo,
			canUndo: state.past.length > 0,
			canRedo: state.future.length > 0,
			saveStatus,
			createId: createNarrativeId
		}),
		[state, execute, undo, redo, saveStatus]
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
