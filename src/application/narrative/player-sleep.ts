import {applyNarrativeProjectBodyEffect, advanceNarrativeProjectSimulation} from './simulation';
import {
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from './player-runtime';
import {narrativeSleepOptionIsStructurallyValid} from '../../domain/narrative/sleep';

export type NarrativePlayerSleepResult =
	| {
			status: 'applied';
			session: NarrativePlayerSession;
			optionId: string;
			label: string;
			durationMinutes: number;
			wakeDay: number;
			wakeMinuteOfDay: number;
	  }
	| {
			status: 'rejected';
			session: NarrativePlayerSession;
			optionId: string;
		reason:
				| 'unknown-option'
				| 'invalid-option'
				| 'unknown-character'
				| 'wrong-location'
				| 'too-early'
				| 'project-end'
				| 'session-replacement';
			summary: string;
	  };

/**
 * Authored overnight choice over the canonical body + simulation systems.
 * Rejected paths return the original player session unchanged.
 */
export function executeNarrativePlayerSleep(
	session: NarrativePlayerSession,
	optionId: string,
	playerCharacterId: string
): NarrativePlayerSleepResult {
	const option = (session.currentProject.sleepOptions ?? []).find(
		candidate => candidate.id === optionId
	);
	if (!option) {
		return {
			status: 'rejected',
			session,
			optionId,
			reason: 'unknown-option',
			summary: 'Вариант сна не найден в текущем Narrative Project.'
		};
	}
	if (
		!narrativeSleepOptionIsStructurallyValid(option) ||
		!session.currentProject.locations.some(
			location => location.id === option.locationId
		)
	) {
		return {
			status: 'rejected',
			session,
			optionId,
			reason: 'invalid-option',
			summary: 'Authored вариант сна содержит недействительные данные.'
		};
	}
	if (
		!session.currentProject.characters.some(
			character => character.id === playerCharacterId
		)
	) {
		return {
			status: 'rejected',
			session,
			optionId,
			reason: 'unknown-character',
			summary: 'Игровой персонаж не найден.'
		};
	}
	if (
		session.currentProject.simulation.actualLocationByCharacter[
			playerCharacterId
		] !== option.locationId
	) {
		return {
			status: 'rejected',
			session,
			optionId,
			reason: 'wrong-location',
			summary: 'Спать здесь нельзя: персонаж находится в другой локации.'
		};
	}
	const now = session.currentProject.simulation;
	if (now.minuteOfDay < option.earliestStartMinuteOfDay) {
		return {
			status: 'rejected',
			session,
			optionId,
			reason: 'too-early',
			summary: 'Для этого варианта сна ещё слишком рано.'
		};
	}
	if (now.day >= session.currentProject.template.dayCount) {
		return {
			status: 'rejected',
			session,
			optionId,
			reason: 'project-end',
			summary: 'После конца проекта нельзя перейти к следующему утру.'
		};
	}

	const durationMinutes =
		24 * 60 - now.minuteOfDay + option.wakeMinuteOfDay;
	const sleeping = applyNarrativeProjectBodyEffect(session.currentProject, {
		id: `sleep:${option.id}:${now.day}:${now.minuteOfDay}`,
		type: 'sleep',
		characterId: playerCharacterId,
		durationMinutes
	});
	const advanced = advanceNarrativeProjectSimulation(
		sleeping.project,
		durationMinutes
	);
	if (
		advanced.trace.appliedMinutes !== durationMinutes ||
		advanced.project.simulation.day !== now.day + 1 ||
		advanced.project.simulation.minuteOfDay !== option.wakeMinuteOfDay
	) {
		return {
			status: 'rejected',
			session,
			optionId,
			reason: 'project-end',
			summary: 'Недостаточно simulation time для полного сна до следующего утра.'
		};
	}

	const replacement = replaceNarrativePlayerSessionProject(
		session,
		advanced.project
	);
	if (replacement.status !== 'updated') {
		return {
			status: 'rejected',
			session,
			optionId,
			reason: 'session-replacement',
			summary: 'Player session rejected the canonical sleep result.'
		};
	}
	return {
		status: 'applied',
		session: replacement.session,
		optionId,
		label: option.label,
		durationMinutes,
		wakeDay: now.day + 1,
		wakeMinuteOfDay: option.wakeMinuteOfDay
	};
}
