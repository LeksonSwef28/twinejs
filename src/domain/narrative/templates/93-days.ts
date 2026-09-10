import {NarrativeProjectTemplate} from '../template';

export const ninetyThreeDaysTemplate: NarrativeProjectTemplate = {
	id: '93-days',
	displayName: '93 Days',
	dayCount: 93,
	day1Weekday: 'monday',
	periods: [
		{id: 'morning', label: 'Утро', startMinute: 6 * 60, endMinute: 12 * 60},
		{id: 'day', label: 'День', startMinute: 12 * 60, endMinute: 18 * 60},
		{id: 'evening', label: 'Вечер', startMinute: 18 * 60, endMinute: 24 * 60},
		{id: 'night', label: 'Ночь', startMinute: 0, endMinute: 6 * 60}
	],
	presenceTransition: {
		defaultTransitionWindowMinutes: 5,
		allowFinishCurrentInteraction: true,
		allowTravelWithPlayer: true
	},
	enabledModules: [
		'calendar',
		'characters',
		'schedules',
		'presenceTransitions',
		'scenes',
		'dialogue',
		'events',
		'knowledge',
		'cognition'
	]
};
