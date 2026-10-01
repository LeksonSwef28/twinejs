import * as React from 'react';
import {
	AuthorFocus,
	validateAuthorFocus
} from '../../../application/narrative/author-focus';
import {useNarrativeProject} from '../../../store/narrative-project';

export type FocusSetResult =
	| {status: 'focused'; focus: AuthorFocus}
	| {status: 'invalid-target'};

export interface AuthoringSessionFocusValue {
	focus?: AuthorFocus;
	setFocus(next: AuthorFocus): FocusSetResult;
	clearFocus(): void;
}

interface StoredAuthorFocus {
	projectId: string;
	focus: AuthorFocus;
}

const AuthoringSessionFocusContext = React.createContext<
	AuthoringSessionFocusValue | undefined
>(undefined);

export const AuthoringSessionFocusProvider: React.FC = props => {
	const {project} = useNarrativeProject();
	const [storedFocus, setStoredFocus] = React.useState<StoredAuthorFocus>();
	const focus =
		storedFocus?.projectId === project.projectId
			? validateAuthorFocus(project, storedFocus.focus)
			: undefined;

	React.useEffect(() => {
		if (
			storedFocus &&
			(storedFocus.projectId !== project.projectId || !focus)
		) {
			setStoredFocus(undefined);
		}
	}, [focus, project.projectId, storedFocus]);

	const setFocus = React.useCallback(
		(next: AuthorFocus): FocusSetResult => {
			const validated = validateAuthorFocus(project, next);
			if (!validated) {
				return {status: 'invalid-target'};
			}
			setStoredFocus({projectId: project.projectId, focus: validated});
			return {status: 'focused', focus: validated};
		},
		[project]
	);

	const clearFocus = React.useCallback(() => setStoredFocus(undefined), []);

	const value = React.useMemo<AuthoringSessionFocusValue>(
		() => ({focus, setFocus, clearFocus}),
		[clearFocus, focus, setFocus]
	);

	return (
		<AuthoringSessionFocusContext.Provider value={value}>
			{props.children}
		</AuthoringSessionFocusContext.Provider>
	);
};

export function useAuthoringSessionFocus() {
	const context = React.useContext(AuthoringSessionFocusContext);
	if (!context) {
		throw new Error(
			'useAuthoringSessionFocus must be used inside AuthoringSessionFocusProvider'
		);
	}
	return context;
}
