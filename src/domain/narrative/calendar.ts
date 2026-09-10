import {Weekday} from './schedule';

export const minutesPerDay = 24 * 60;

const weekdays: Weekday[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday'
];

export function weekdayForDay(dayNumber: number, day1Weekday: Weekday): Weekday {
	if (!Number.isInteger(dayNumber) || dayNumber < 1) {
		throw new Error('dayNumber must be a positive integer');
	}

	const firstIndex = weekdays.indexOf(day1Weekday);
	return weekdays[(firstIndex + dayNumber - 1) % weekdays.length];
}

export function clampDay(dayNumber: number, dayCount: number) {
	return Math.max(1, Math.min(dayCount, Math.round(dayNumber)));
}

export function clampMinuteOfDay(minuteOfDay: number) {
	return Math.max(0, Math.min(minutesPerDay - 1, Math.round(minuteOfDay)));
}

export function formatMinuteOfDay(minuteOfDay: number) {
	const minute = clampMinuteOfDay(minuteOfDay);
	const hours = Math.floor(minute / 60);
	const minutes = minute % 60;
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
