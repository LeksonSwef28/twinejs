import {minutesPerDay, weekdayForDay} from './calendar';
import {DayPeriodDefinition, RecurrencePattern, RoutineRule, Weekday} from './schedule';

export interface AbsoluteMinuteRange {
	start: number;
	end: number;
}

export interface AbsoluteRoutineWindow {
	start: number;
	end: number;
}

export function clampWorldTimeScale(pixelsPerHour: number) {
	return Math.max(0.35, Math.min(480, pixelsPerHour));
}

export function visibleAbsoluteMinuteRange(
	centerAbsoluteMinute: number,
	pixelsPerHour: number,
	viewportWidth: number,
	totalMinutes: number
): AbsoluteMinuteRange {
	const safeScale = clampWorldTimeScale(pixelsPerHour);
	const safeWidth = Math.max(1, viewportWidth);
	const visibleMinutes = (safeWidth * 60) / safeScale;

	if (visibleMinutes >= totalMinutes) {
		return {start: 0, end: totalMinutes};
	}

	const maximumStart = totalMinutes - visibleMinutes;
	const start = Math.max(
		0,
		Math.min(maximumStart, centerAbsoluteMinute - visibleMinutes / 2)
	);

	return {start, end: start + visibleMinutes};
}

export function recurrenceMatchesDay(
	recurrence: RecurrencePattern,
	day: number,
	day1Weekday: Weekday
) {
	switch (recurrence.type) {
		case 'everyDay':
			return true;
		case 'weekly':
			return recurrence.weekdays.includes(weekdayForDay(day, day1Weekday));
		case 'everyNDays':
			return (
			recurrence.every > 0 &&
			(day - recurrence.anchorDay) % recurrence.every === 0
		);
		case 'explicitDays':
			return recurrence.days.includes(day);
	}
}

function periodWindow(period: DayPeriodDefinition, day: number): AbsoluteRoutineWindow {
	const dayStart = (day - 1) * minutesPerDay;
	const endDayOffset = period.endMinute <= period.startMinute ? 1 : 0;

	return {
		start: dayStart + period.startMinute,
		end: dayStart + endDayOffset * minutesPerDay + period.endMinute
	};
}

export function routineWindowForDay(
	rule: RoutineRule,
	day: number,
	periods: DayPeriodDefinition[],
	day1Weekday: Weekday
): AbsoluteRoutineWindow | undefined {
	if (
		day < rule.activeRange.fromDay ||
		(rule.activeRange.toDay !== undefined && day > rule.activeRange.toDay) ||
		!recurrenceMatchesDay(rule.recurrence, day, day1Weekday)
	) {
		return undefined;
	}

	const window = rule.timeWindow;
	if (window?.type === 'exact') {
		const dayStart = (day - 1) * minutesPerDay;
		const inferredOffset = window.endMinute < window.startMinute ? 1 : 0;
		const endDayOffset = window.endDayOffset ?? inferredOffset;
		return {
			start: dayStart + window.startMinute,
			end: dayStart + endDayOffset * minutesPerDay + window.endMinute
		};
	}

	const periodId = window?.type === 'period' ? window.periodId : rule.periodId;
	if (!periodId) {
		return undefined;
	}

	const period = periods.find(candidate => candidate.id === periodId);
	return period ? periodWindow(period, day) : undefined;
}

export function timelineTickStepMinutes(pixelsPerHour: number) {
	if (pixelsPerHour < 1) {
		return 7 * minutesPerDay;
	}
	if (pixelsPerHour < 3) {
		return minutesPerDay;
	}
	if (pixelsPerHour < 12) {
		return 6 * 60;
	}
	if (pixelsPerHour < 40) {
		return 60;
	}
	if (pixelsPerHour < 120) {
		return 30;
	}
	if (pixelsPerHour < 300) {
		return 15;
	}
	return 5;
}
