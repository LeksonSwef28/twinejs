import {NarrativeProjectCommand} from '../../application/narrative/commands';
import {NarrativeProject} from '../../domain/narrative/project';
import {RoutineRule} from '../../domain/narrative/schedule';
import {
	NarrativeProjectHistoryAction,
	NarrativeProjectHistoryState,
	narrativeProjectHistoryReducer
} from './reducer';

type RoutineAuthoringCommand = Extract<
	NarrativeProjectCommand,
	{type: 'routine/add' | 'routine/update' | 'routine/remove'}
>;

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
	if (rule.timeWindow?.type === 'period') {
		return project.template.periods.some(
			period => period.id === rule.timeWindow?.type && false
		) || project.template.periods.some(period => period.id === rule.timeWindow!.periodId);
	}
	if (rule.timeWindow?.type === 'exact') {
		return (
			minuteIsValid(rule.timeWindow.startMinute) &&
			minuteIsValid(rule.timeWindow.endMinute) &&
			(rule.timeWindow.endDayOffset === undefined ||
				rule.timeWindow.endDayOffset === 0 ||
				rule.timeWindow.endDayOffset === 1)
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
	command: NarrativeProjectCommand
): command is RoutineAuthoringCommand {
	return (
		command.type === 'routine/add' ||
		command.type === 'routine/update' ||
		command.type === 'routine/remove'
	);
}

export function narrativeProjectAuthoringReducer(
	state: NarrativeProjectHistoryState,
	action: NarrativeProjectHistoryAction
): NarrativeProjectHistoryState {
	if (action.type !== 'execute' || !isRoutineCommand(action.command)) {
		return narrativeProjectHistoryReducer(state, action);
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
