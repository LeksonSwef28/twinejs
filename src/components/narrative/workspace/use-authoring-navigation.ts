import * as React from 'react';
import {AuthorFocus} from '../../../application/narrative/author-focus';
import {
	AuthoringNavigationIntent,
	NavigationProjectionStatus,
	planAuthoringNavigation
} from '../../../application/narrative/authoring-navigation';
import {useNarrativeProject} from '../../../store/narrative-project';
import {useAuthoringSessionFocus} from './authoring-session-focus';

export interface AuthoringNavigationResult {
	focus?: AuthorFocus;
	projection: NavigationProjectionStatus;
}

export interface AuthoringNavigationActions {
	navigate(intent: AuthoringNavigationIntent): AuthoringNavigationResult;
}

export function useAuthoringNavigation({
	splitView
}: {
	splitView: boolean;
}): AuthoringNavigationActions {
	const {project, execute} = useNarrativeProject();
	const {setFocus} = useAuthoringSessionFocus();

	const navigate = React.useCallback(
		(intent: AuthoringNavigationIntent): AuthoringNavigationResult => {
			const plan = planAuthoringNavigation(project, intent, {splitView});
			if (plan.projection.status === 'missing-target') {
				return {projection: plan.projection};
			}

			if (plan.focusTransition) {
				const focusResult = setFocus(plan.focusTransition);
				if (focusResult.status === 'invalid-target') {
					return {projection: {status: 'missing-target'}};
				}
			}

			for (const command of plan.commands) {
				execute(command);
			}

			return {
				focus: plan.focusTransition,
				projection: plan.projection
			};
		},
		[execute, project, setFocus, splitView]
	);

	return React.useMemo(() => ({navigate}), [navigate]);
}
