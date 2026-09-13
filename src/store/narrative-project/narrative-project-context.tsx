import * as React from 'react';
import {NarrativeProject} from '../../domain/narrative/project';
import {createNarrativeId} from '../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../domain/narrative/templates/93-days';
import {
	EditorAuthoringCommand,
	editorAuthoringReducer
} from './editor-authoring';
import {
	createRecoverableLocalStorageNarrativeProjectRepository,
	NarrativeProjectLoadResult
} from './recoverable-repository';
import {NarrativeProjectHistoryState} from './reducer';
import {
	keepCurrentRuntime,
	replaceRuntimeProjectInHistory
} from './runtime-history';

export type NarrativeSaveStatus = 'saved' | 'saving' | 'error' | 'recovery';

export interface NarrativeRecoveryState {
	backupKeys: string[];
}

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
	recovery?: NarrativeRecoveryState;
	startFreshAfterRecovery(): void;
	createId(prefix: string): string;
}

const NarrativeProjectContext = React.createContext<
	NarrativeProjectContextValue | undefined
>(undefined);

export interface NarrativeProjectProviderProps {
	hostStoryId: string;
	projectName: string;
}

function recoveryStateFromLoad(
	result: NarrativeProjectLoadResult
): NarrativeRecoveryState | undefined {
	return result.status === 'recovery'
		? {backupKeys: result.recoveryBackupKeys}
		: undefined;
}

export const NarrativeProjectProvider: React.FC<
	NarrativeProjectProviderProps
> = props => {
	const repository = React.useMemo(
		() =>
			createRecoverableLocalStorageNarrativeProjectRepository(
				props.hostStoryId,
				props.projectName,
				ninetyThreeDaysTemplate
			),
		[props.hostStoryId, props.projectName]
	);
	const initialLoadResult = React.useMemo(
		() => repository.loadResult(),
		[repository]
	);
	const initialState = React.useMemo<NarrativeProjectHistoryState>(
		() => ({past: [], present: initialLoadResult.project, future: []}),
		[initialLoadResult]
	);
	const [state, setState] = React.useState(initialState);
	const [recovery, setRecovery] = React.useState<NarrativeRecoveryState | undefined>(
		() => recoveryStateFromLoad(initialLoadResult)
	);
	const [saveStatus, setSaveStatus] = React.useState<NarrativeSaveStatus>(() =>
		initialLoadResult.status === 'recovery' ? 'recovery' : 'saved'
	);

	React.useEffect(() => {
		const loaded = repository.loadResult();
		setState({past: [], present: loaded.project, future: []});
		const nextRecovery = recoveryStateFromLoad(loaded);
		setRecovery(nextRecovery);
		setSaveStatus(nextRecovery ? 'recovery' : 'saved');
	}, [repository]);

	React.useEffect(() => {
		if (recovery) {
			setSaveStatus('recovery');
			return;
		}
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
	}, [recovery, repository, state.present]);

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
	const startFreshAfterRecovery = React.useCallback(() => {
		repository.acknowledgeRecoveryReset();
		setRecovery(undefined);
	}, [repository]);

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
			recovery,
			startFreshAfterRecovery,
			createId: createNarrativeId
		}),
		[
			state,
			execute,
			replaceRuntimeProject,
			undo,
			redo,
			saveStatus,
			recovery,
			startFreshAfterRecovery
		]
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
