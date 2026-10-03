import {
	NarrativeCharacter,
	NarrativeLocation
} from '../../domain/narrative/entities';
import {NarrativeProject} from '../../domain/narrative/project';
import {
	RoutineTimeWindow,
	ScheduleException
} from '../../domain/narrative/schedule';

export type NormalizedScheduleExceptionWindow =
	| {type: 'period'; periodId: string}
	| {
			type: 'exact';
			startMinute: number;
			endMinute: number;
			endDayOffset: 0 | 1;
	  };

export type ScheduleExceptionAuthoringIntent =
	| {type: 'location'; locationId: string}
	| {type: 'absent'};

export interface ScheduleExceptionAuthoringCandidate {
	id: string;
	characterId: string;
	activeRange: {
		fromDay: number;
		toDay?: number;
	};
	timeWindow: NormalizedScheduleExceptionWindow;
	intent: ScheduleExceptionAuthoringIntent;
	priority: number;
	reason?: string;
}

export type ScheduleExceptionAuthoringCommand =
	| {
			type: 'scheduleException/add';
			candidate: ScheduleExceptionAuthoringCandidate;
	  }
	| {
			type: 'scheduleException/update';
			candidate: ScheduleExceptionAuthoringCandidate;
	  }
	| {type: 'scheduleException/remove'; id: string};

export type ResolvedScheduleExceptionCharacter =
	| {
			status: 'resolved';
			characterId: string;
			character: NarrativeCharacter;
	  }
	| {status: 'unresolved'; characterId: string};

export type ResolvedScheduleExceptionRange =
	| {
			status: 'valid';
			mode: 'one-day';
			fromDay: number;
			toDay: number;
	  }
	| {
			status: 'valid';
			mode: 'bounded';
			fromDay: number;
			toDay: number;
	  }
	| {
			status: 'valid';
			mode: 'through-project-end';
			fromDay: number;
	  }
	| {
			status: 'invalid';
			fromDay: number;
			toDay?: number;
	  };

export type ResolvedScheduleExceptionWindow =
	| {
			status: 'resolved';
			source: 'modern';
			value: NormalizedScheduleExceptionWindow;
	  }
	| {
			status: 'resolved';
			source: 'legacy-period';
			value: {type: 'period'; periodId: string};
	  }
	| {
			status: 'unresolved-period';
			source: 'modern' | 'legacy-period';
			periodId: string;
	  }
	| {
			status: 'invalid-exact';
			startMinute: number;
			endMinute: number;
			endDayOffset?: number;
	  }
	| {status: 'missing'};

export type ResolvedScheduleExceptionIntent =
	| {
			status: 'location-resolved';
			locationId: string;
			location: NarrativeLocation;
	  }
	| {status: 'location-unresolved'; locationId: string}
	| {status: 'absent'}
	| {
			status: 'conflicting';
			locationId: string;
			location?: NarrativeLocation;
	  }
	| {status: 'unspecified'};

export interface ResolvedScheduleExceptionForAuthoring {
	exception: ScheduleException;
	character: ResolvedScheduleExceptionCharacter;
	activeRange: ResolvedScheduleExceptionRange;
	window: ResolvedScheduleExceptionWindow;
	intent: ResolvedScheduleExceptionIntent;
	priorityStatus: 'valid' | 'invalid';
}

export type ScheduleExceptionCandidateValidation =
	| {status: 'valid'}
	| {status: 'invalid-id'}
	| {status: 'missing-character'; characterId: string}
	| {status: 'invalid-active-range'}
	| {status: 'missing-period'; periodId: string}
	| {status: 'invalid-time-window'}
	| {status: 'missing-location'; locationId: string}
	| {status: 'invalid-priority'};

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

function normalizedExactOffset(
	startMinute: number,
	endMinute: number,
	endDayOffset: number | undefined
): 0 | 1 | undefined {
	if (endDayOffset === 0 || endDayOffset === 1) {
		return endDayOffset;
	}
	if (endDayOffset === undefined) {
		return endMinute < startMinute ? 1 : 0;
	}
	return undefined;
}

function exactWindowIsValid(
	startMinute: number,
	endMinute: number,
	endDayOffset: number
) {
	return (
		minuteIsValid(startMinute) &&
		minuteIsValid(endMinute) &&
		(endDayOffset === 0 || endDayOffset === 1) &&
		endMinute + endDayOffset * 24 * 60 > startMinute
	);
}

function normalizeReason(reason: string | undefined) {
	const trimmed = reason?.trim();
	return trimmed ? trimmed : undefined;
}

function resolveRange(
	project: NarrativeProject,
	exception: ScheduleException
): ResolvedScheduleExceptionRange {
	const {fromDay, toDay} = exception.activeRange;
	if (
		!dayIsValid(project, fromDay) ||
		(toDay !== undefined &&
			(!dayIsValid(project, toDay) || toDay < fromDay))
	) {
		return {status: 'invalid', fromDay, toDay};
	}
	if (toDay === undefined) {
		return {status: 'valid', mode: 'through-project-end', fromDay};
	}
	if (toDay === fromDay) {
		return {status: 'valid', mode: 'one-day', fromDay, toDay};
	}
	return {status: 'valid', mode: 'bounded', fromDay, toDay};
}

function resolvePeriodWindow(
	project: NarrativeProject,
	periodId: string,
	source: 'modern' | 'legacy-period'
): ResolvedScheduleExceptionWindow {
	return project.template.periods.some(period => period.id === periodId)
		? {
				status: 'resolved',
				source,
				value: {type: 'period', periodId}
			}
		: {status: 'unresolved-period', source, periodId};
}

function resolveWindow(
	project: NarrativeProject,
	exception: ScheduleException
): ResolvedScheduleExceptionWindow {
	const window = exception.timeWindow;
	if (window?.type === 'period') {
		return resolvePeriodWindow(project, window.periodId, 'modern');
	}
	if (window?.type === 'exact') {
		const rawOffset = window.endDayOffset as number | undefined;
		const endDayOffset = normalizedExactOffset(
			window.startMinute,
			window.endMinute,
			rawOffset
		);
		if (
			endDayOffset === undefined ||
			!exactWindowIsValid(
				window.startMinute,
				window.endMinute,
				endDayOffset
			)
		) {
			return {
				status: 'invalid-exact',
				startMinute: window.startMinute,
				endMinute: window.endMinute,
				endDayOffset: rawOffset
			};
		}
		return {
			status: 'resolved',
			source: 'modern',
			value: {
				type: 'exact',
				startMinute: window.startMinute,
				endMinute: window.endMinute,
				endDayOffset
			}
		};
	}
	if (exception.periodId) {
		return resolvePeriodWindow(project, exception.periodId, 'legacy-period');
	}
	return {status: 'missing'};
}

function resolveIntent(
	project: NarrativeProject,
	exception: ScheduleException
): ResolvedScheduleExceptionIntent {
	const locationId = exception.targetLocationId;
	const location = locationId
		? project.locations.find(candidate => candidate.id === locationId)
		: undefined;
	if (exception.absent === true && locationId) {
		return {status: 'conflicting', locationId, location};
	}
	if (exception.absent === true) {
		return {status: 'absent'};
	}
	if (locationId) {
		return location
			? {status: 'location-resolved', locationId, location}
			: {status: 'location-unresolved', locationId};
	}
	return {status: 'unspecified'};
}

export function resolveScheduleExceptionForAuthoring(
	project: NarrativeProject,
	exception: ScheduleException
): ResolvedScheduleExceptionForAuthoring {
	const character = project.characters.find(
		candidate => candidate.id === exception.characterId
	);
	return {
		exception,
		character: character
			? {
					status: 'resolved',
					characterId: exception.characterId,
					character
				}
			: {status: 'unresolved', characterId: exception.characterId},
		activeRange: resolveRange(project, exception),
		window: resolveWindow(project, exception),
		intent: resolveIntent(project, exception),
		priorityStatus: Number.isFinite(exception.priority) ? 'valid' : 'invalid'
	};
}

export function validateScheduleExceptionCandidate(
	project: NarrativeProject,
	candidate: ScheduleExceptionAuthoringCandidate
): ScheduleExceptionCandidateValidation {
	if (!candidate.id.trim()) {
		return {status: 'invalid-id'};
	}
	if (
		!project.characters.some(
			character => character.id === candidate.characterId
		)
	) {
		return {status: 'missing-character', characterId: candidate.characterId};
	}
	if (
		!dayIsValid(project, candidate.activeRange.fromDay) ||
		(candidate.activeRange.toDay !== undefined &&
			(!dayIsValid(project, candidate.activeRange.toDay) ||
				candidate.activeRange.toDay < candidate.activeRange.fromDay))
	) {
		return {status: 'invalid-active-range'};
	}
	if (candidate.timeWindow.type === 'period') {
		if (
			!project.template.periods.some(
				period => period.id === candidate.timeWindow.periodId
			)
		) {
			return {
				status: 'missing-period',
				periodId: candidate.timeWindow.periodId
			};
		}
	} else if (
		!exactWindowIsValid(
			candidate.timeWindow.startMinute,
			candidate.timeWindow.endMinute,
			candidate.timeWindow.endDayOffset
		)
	) {
		return {status: 'invalid-time-window'};
	}
	if (
		candidate.intent.type === 'location' &&
		!project.locations.some(
			location => location.id === candidate.intent.locationId
		)
	) {
		return {
			status: 'missing-location',
			locationId: candidate.intent.locationId
		};
	}
	if (!Number.isFinite(candidate.priority)) {
		return {status: 'invalid-priority'};
	}
	return {status: 'valid'};
}

function rangesEqual(
	current: ResolvedScheduleExceptionRange,
	candidate: ScheduleExceptionAuthoringCandidate['activeRange']
) {
	if (current.status !== 'valid') {
		return false;
	}
	if (candidate.toDay === undefined) {
		return (
			current.mode === 'through-project-end' &&
			current.fromDay === candidate.fromDay
		);
	}
	return (
		current.mode !== 'through-project-end' &&
		current.fromDay === candidate.fromDay &&
		current.toDay === candidate.toDay
	);
}

function windowsEqual(
	current: ResolvedScheduleExceptionWindow,
	candidate: NormalizedScheduleExceptionWindow
) {
	if (current.status !== 'resolved' || current.value.type !== candidate.type) {
		return false;
	}
	if (current.value.type === 'period' && candidate.type === 'period') {
		return current.value.periodId === candidate.periodId;
	}
	if (current.value.type === 'exact' && candidate.type === 'exact') {
		return (
			current.value.startMinute === candidate.startMinute &&
			current.value.endMinute === candidate.endMinute &&
			current.value.endDayOffset === candidate.endDayOffset
		);
	}
	return false;
}

function intentsEqual(
	current: ResolvedScheduleExceptionIntent,
	candidate: ScheduleExceptionAuthoringIntent
) {
	if (candidate.type === 'absent') {
		return current.status === 'absent';
	}
	return (
		current.status === 'location-resolved' &&
		current.locationId === candidate.locationId
	);
}

export function scheduleExceptionAuthoringEquals(
	project: NarrativeProject,
	current: ScheduleException,
	candidate: ScheduleExceptionAuthoringCandidate
): boolean {
	if (validateScheduleExceptionCandidate(project, candidate).status !== 'valid') {
		return false;
	}
	const resolved = resolveScheduleExceptionForAuthoring(project, current);
	return (
		current.id === candidate.id &&
		resolved.character.status === 'resolved' &&
		resolved.character.characterId === candidate.characterId &&
		rangesEqual(resolved.activeRange, candidate.activeRange) &&
		windowsEqual(resolved.window, candidate.timeWindow) &&
		intentsEqual(resolved.intent, candidate.intent) &&
		resolved.priorityStatus === 'valid' &&
		current.priority === candidate.priority &&
		normalizeReason(current.reason) === normalizeReason(candidate.reason)
	);
}

function serializeScheduleExceptionCandidate(
	candidate: ScheduleExceptionAuthoringCandidate
): ScheduleException {
	const timeWindow: RoutineTimeWindow =
		candidate.timeWindow.type === 'period'
			? {
					type: 'period',
					periodId: candidate.timeWindow.periodId
				}
			: {
					type: 'exact',
					startMinute: candidate.timeWindow.startMinute,
					endMinute: candidate.timeWindow.endMinute,
					endDayOffset: candidate.timeWindow.endDayOffset
				};
	const reason = normalizeReason(candidate.reason);
	return {
		id: candidate.id,
		characterId: candidate.characterId,
		activeRange: {...candidate.activeRange},
		timeWindow,
		...(candidate.intent.type === 'location'
			? {targetLocationId: candidate.intent.locationId}
			: {absent: true}),
		priority: candidate.priority,
		...(reason ? {reason} : {})
	};
}

function touched(project: NarrativeProject): NarrativeProject {
	return {...project, updatedAt: new Date().toISOString()};
}

export function applyScheduleExceptionAuthoringCommand(
	project: NarrativeProject,
	command: ScheduleExceptionAuthoringCommand
): NarrativeProject {
	if (command.type === 'scheduleException/remove') {
		if (
			!project.scheduleExceptions.some(
				exception => exception.id === command.id
			)
		) {
			return project;
		}
		return touched({
			...project,
			scheduleExceptions: project.scheduleExceptions.filter(
				exception => exception.id !== command.id
			)
		});
	}

	if (
		validateScheduleExceptionCandidate(project, command.candidate).status !==
		'valid'
	) {
		return project;
	}

	if (command.type === 'scheduleException/add') {
		if (
			project.scheduleExceptions.some(
				exception => exception.id === command.candidate.id
			)
		) {
			return project;
		}
		return touched({
			...project,
			scheduleExceptions: [
				...project.scheduleExceptions,
				serializeScheduleExceptionCandidate(command.candidate)
			]
		});
	}

	const current = project.scheduleExceptions.find(
		exception => exception.id === command.candidate.id
	);
	if (!current) {
		return project;
	}
	if (scheduleExceptionAuthoringEquals(project, current, command.candidate)) {
		return project;
	}
	const replacement = serializeScheduleExceptionCandidate(command.candidate);
	return touched({
		...project,
		scheduleExceptions: project.scheduleExceptions.map(exception =>
			exception.id === command.candidate.id ? replacement : exception
		)
	});
}

export function isScheduleExceptionAuthoringCommand(
	command: {type: string}
): command is ScheduleExceptionAuthoringCommand {
	return (
		command.type === 'scheduleException/add' ||
		command.type === 'scheduleException/update' ||
		command.type === 'scheduleException/remove'
	);
}
