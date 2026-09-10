import {NarrativeProjectCommand} from '../../application/narrative/commands';
import {clampDay} from '../../domain/narrative/calendar';
import {NarrativeProject} from '../../domain/narrative/project';

export interface NarrativeProjectHistoryState {
	past: NarrativeProject[];
	present: NarrativeProject;
	future: NarrativeProject[];
}

export type NarrativeProjectHistoryAction =
	| {type: 'execute'; command: NarrativeProjectCommand}
	| {type: 'undo'}
	| {type: 'redo'};

function touched(project: NarrativeProject): NarrativeProject {
	return {...project, updatedAt: new Date().toISOString()};
}

export function applyNarrativeProjectCommand(
	project: NarrativeProject,
	command: NarrativeProjectCommand
): NarrativeProject {
	switch (command.type) {
		case 'project/rename':
			return touched({...project, name: command.name.trim() || project.name});
		case 'location/add':
			return touched({
				...project,
				locations: [...project.locations, {id: command.id, name: command.name}]
			});
		case 'character/add':
			return touched({
				...project,
				characters: [
					...project.characters,
					{
						id: command.id,
						name: command.name,
						cognitionTier: command.cognitionTier,
						defaultBehaviorProfileId: command.profileId
					}
				],
				behaviorProfiles: [
					...project.behaviorProfiles,
					{
						id: command.profileId,
						characterId: command.id,
						name: 'Обычная жизнь'
					}
				]
			});
		case 'editor/selectDay':
			return {
				...project,
				editor: {
					...project.editor,
					selectedDay: clampDay(command.day, project.template.dayCount)
				}
			};
		case 'editor/selectPeriod':
			if (!project.template.periods.some(period => period.id === command.periodId)) {
				return project;
			}
			return {
				...project,
				editor: {...project.editor, selectedPeriodId: command.periodId}
			};
	}
}

function isEditorNavigation(command: NarrativeProjectCommand) {
	return command.type === 'editor/selectDay' || command.type === 'editor/selectPeriod';
}

export function narrativeProjectHistoryReducer(
	state: NarrativeProjectHistoryState,
	action: NarrativeProjectHistoryAction
): NarrativeProjectHistoryState {
	if (action.type === 'undo') {
		const previous = state.past[state.past.length - 1];
		if (!previous) {
			return state;
		}

		return {
			past: state.past.slice(0, -1),
			present: previous,
			future: [state.present, ...state.future]
		};
	}

	if (action.type === 'redo') {
		const next = state.future[0];
		if (!next) {
			return state;
		}

		return {
			past: [...state.past, state.present],
			present: next,
			future: state.future.slice(1)
		};
	}

	const nextProject = applyNarrativeProjectCommand(state.present, action.command);
	if (nextProject === state.present) {
		return state;
	}

	if (isEditorNavigation(action.command)) {
		return {...state, present: nextProject};
	}

	return {
		past: [...state.past, state.present],
		present: nextProject,
		future: []
	};
}
