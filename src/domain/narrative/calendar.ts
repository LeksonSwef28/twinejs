import {Weekday} from './schedule';

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
