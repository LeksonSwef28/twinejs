import {clampDay, clampMinuteOfDay, formatMinuteOfDay, weekdayForDay} from '../calendar';

describe('narrative calendar', () => {
	test('maps repeating weekdays from the configured first day', () => {
		expect(weekdayForDay(1, 'monday')).toBe('monday');
		expect(weekdayForDay(2, 'monday')).toBe('tuesday');
		expect(weekdayForDay(8, 'monday')).toBe('monday');
	});

	test('clamps navigation to the project day range', () => {
		expect(clampDay(0, 93)).toBe(1);
		expect(clampDay(94, 93)).toBe(93);
	});

	test('clamps exact time to a single day', () => {
		expect(clampMinuteOfDay(-1)).toBe(0);
		expect(clampMinuteOfDay(24 * 60)).toBe(24 * 60 - 1);
	});

	test('formats exact time as HH:MM', () => {
		expect(formatMinuteOfDay(0)).toBe('00:00');
		expect(formatMinuteOfDay(6 * 60)).toBe('06:00');
		expect(formatMinuteOfDay(19 * 60 + 35)).toBe('19:35');
	});
});
