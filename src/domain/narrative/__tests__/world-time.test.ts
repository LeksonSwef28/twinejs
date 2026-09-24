import {ninetyThreeDaysTemplate} from '../templates/93-days';
import {
	routineWindowForDay,
	timelineTickStepMinutes,
	visibleAbsoluteMinuteRange
} from '../world-time';

const everyDayRule = {
	id: 'rule-1',
	characterId: 'katya',
	behaviorProfileId: 'profile-katya',
	activeRange: {fromDay: 1, toDay: 93},
	recurrence: {type: 'everyDay' as const},
	targetLocationId: 'home'
};

describe('world-time projection', () => {
	test('fits the whole project when the viewport is wider than the current scale', () => {
		const totalMinutes = 93 * 24 * 60;
		const range = visibleAbsoluteMinuteRange(360, 0.35, 1000, totalMinutes);

		expect(range).toEqual({start: 0, end: totalMinutes});
	});

	test('keeps a zoomed viewport inside the project bounds', () => {
		const totalMinutes = 93 * 24 * 60;
		const range = visibleAbsoluteMinuteRange(0, 60, 600, totalMinutes);

		expect(range.start).toBe(0);
		expect(range.end).toBe(600);
	});

	test('resolves an explicit overnight window into the next day', () => {
		const window = routineWindowForDay(
			{
				...everyDayRule,
				timeWindow: {
					type: 'exact' as const,
					startMinute: 23 * 60,
					endMinute: 7 * 60,
					endDayOffset: 1 as const
				}
			},
			4,
			ninetyThreeDaysTemplate.periods,
			ninetyThreeDaysTemplate.day1Weekday
		);

		expect(window).toEqual({
			start: 3 * 24 * 60 + 23 * 60,
			end: 4 * 24 * 60 + 7 * 60
		});
	});

	test('resolves the wrapped Night period across midnight', () => {
		const window = routineWindowForDay(
			{
				...everyDayRule,
				timeWindow: {type: 'period' as const, periodId: 'night'}
			},
			2,
			ninetyThreeDaysTemplate.periods,
			ninetyThreeDaysTemplate.day1Weekday
		);

		expect(window).toEqual({
			start: 24 * 60 + 22 * 60,
			end: 2 * 24 * 60 + 6 * 60
		});
	});

	test('increases tick detail as the author zooms in', () => {
		expect(timelineTickStepMinutes(0.5)).toBe(7 * 24 * 60);
		expect(timelineTickStepMinutes(2)).toBe(24 * 60);
		expect(timelineTickStepMinutes(20)).toBe(60);
		expect(timelineTickStepMinutes(400)).toBe(5);
	});
});
