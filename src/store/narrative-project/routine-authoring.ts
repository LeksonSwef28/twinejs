import {NarrativeProjectCommand} from '../../application/narrative/commands';
import {NarrativeProject} from '../../domain/narrative/project';
import {RoutineRule} from '../../domain/narrative/schedule';
import {
	NarrativeProjectHistoryState,
	narrativeProjectHistoryReducer
} from './reducer';

export type RoutineAuthoringCommand =
	| {type: 'routine/add'; rule: RoutineRule}
	| {type: 'routine/update'; rule: RoutineRule}
	| {type: 'routine/remove'; id: string};

export type NarrativeAuthoringCommand =
	| NarrativeProjectCommand
	| RoutineAuthoringCommand;

export type NarrativeProjectAuthoringAction =
	| {type: 'execute'; command: NarrativeAuthoringCommand}
	| {type: 'undo'}
	| {type: 'redo'};

function dayIsValid(project: NarrativeProject, day: number) {
	return (
		Number.isInteger(day) &&
		day >= 1 &&
		day <= project.template.dayCount
	);
}

function minuteIsValid(minute: number) {
	return Number.isInteger(minute) && minute >= 0 && minute < 24 * 60;
}

function recurrenceIsValid(project: NarrativeProject, rule: RoutineRule) {
	switch (rule.recurrence.type) {
		case 'everyDay':
			return true;
		case 'weekly':
			return rule.recurrence.weekdays.length > 0;
		case 'everyNDays':
			return (
				Number.isInteger(rule.recurrence.every) &&
				rule.recurrence.every >= 1 &&
				dayIsValid(project, rule.recurrence.anchorDay)
			);
		case 'explicitDays':
			return (
				rule.recurrence.days.length > 0 &&
				rule.recurrence.days.every(day => dayIsValid(project, day))
			);
	}
}

function timeWindowIsValid(project: NarrativeProject, rule: RoutineRule) {
	const window = rule.timeWindow;
	if (window?.type === 'period') {
		return project.template.periods.some(period => period.id === window.periodId);
	}
	if (window?.type === 'exact') {
		return (
			minuteIsValid(window.startMinute) &&
			minuteIsValid(window.endMinute) &&
			(window.endDayOffset === undefined ||
				window.endDayOffset === 0 ||
				window.endDayOffset === 1)
		);
	}
	if (rule.periodId) {
		return project.template.periods.some(period => period.id === rule.periodId);
	}
	return false;
}

export function routineRuleIsAuthoringValid(
	project: NarrativeProject,
	rule: RoutineRule
) {
	const character = project.characters.find(
		candidate => candidate.id === rule.characterId
	);
	const profile = project.behaviorProfiles.find(
		candidate => candidate.id === rule.behaviorProfileId
	);
	if (!character || !profile || profile.characterId !== character.id) {
		return false;
	}
	if (
		!dayIsValid(project, rule.activeRange.fromDay) ||
		(rule.activeRange.toDay !== undefined &&
			(!dayIsValid(project, rule.activeRange.toDay) ||
				rule.activeRange.toDay < rule.activeRange.fromDay))
	) {
		return false;
	}
	if (!recurrenceIsValid(project, rule) || !timeWindowIsValid(project, rule)) {
		return false;
	}
	if (rule.absent) {
		return true;
	}
	return Boolean(
		rule.targetLocationId &&
			project.locations.some(location => location.id === rule.targetLocationId)
	);
}

function touched(project: NarrativeProject): NarrativeProject {
	return {...project, updatedAt: new Date().toISOString()};
}

function applyRoutineCommand(
	project: NarrativeProject,
	command: RoutineAuthoringCommand
): NarrativeProject {
	switch (command.type) {
		case 'routine/add':
			if (
				project.routineRules.some(rule => rule.id === command.rule.id) ||
				!routineRuleIsAuthoringValid(project, command.rule)
			) {
				return project;
			}
			return touched({
				...project,
				routineRules: [...project.routineRules, command.rule]
			});
		case 'routine/update':
			if (
				!project.routineRules.some(rule => rule.id === command.rule.id) ||
				!routineRuleIsAuthoringValid(project, command.rule)
			) {
				return project;
			}
			return touched({
				...project,
				routineRules: project.routineRules.map(rule =>
					rule.id === command.rule.id ? command.rule : rule
				)
			});
		case 'routine/remove':
			if (!project.routineRules.some(rule => rule.id === command.id)) {
				return project;
			}
			return touched({
				...project,
				routineRules: project.routineRules.filter(rule => rule.id !== command.id)
			});
	}
}

function isRoutineCommand(
	command: NarrativeAuthoringCommand
): command is RoutineAuthoringCommand {
	return (
		command.type === 'routine/add' ||
		command.type === 'routine/update' ||
		command.type === 'routine/remove'
	);
}

export function narrativeProjectAuthoringReducer(
	state: NarrativeProjectHistoryState,
	action: NarrativeProjectAuthoringAction
): NarrativeProjectHistoryState {
	if (action.type === 'undo' || action.type === 'redo') {
		return narrativeProjectHistoryReducer(state, action);
	}
	if (!isRoutineCommand(action.command)) {
		return narrativeProjectHistoryReducer(state, {
			type: 'execute',
			command: action.command
		});
	}

	const nextProject = applyRoutineCommand(state.present, action.command);
	if (nextProject === state.present) {
		return state;
	}

	return {
		past: [...state.past, state.present],
		present: nextProject,
		future: []
	};
}
