import {clampDay, weekdayForDay} from '../calendar';

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
});
