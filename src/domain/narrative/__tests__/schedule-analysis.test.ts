import {createNarrativeProject} from '../project-factory';
import {analyzeNarrativeScheduleConflicts} from '../schedule-analysis';
import {NarrativeProjectTemplate} from '../template';

const template: NarrativeProjectTemplate = {
	id: 'schedule-analysis-test',
	displayName: 'Schedule analysis',
	dayCount: 4,
	day1Weekday: 'monday',
	periods: [
		{id: 'day', label: 'День', startMinute: 480, endMinute: 1200},
		{id: 'night', label: 'Ночь', startMinute: 1320, endMinute: 360}
	],
	presenceTransition: {
		defaultTransitionWindowMinutes: 15,
		allowFinishCurrentInteraction: true,
		allowTravelWithPlayer: true
	},
	enabledModules: []
};

function project() {
	const value = createNarrativeProject('story-1', 'Schedule analysis', template);
	value.characters = [
		{
			id: 'character-1',
			name: 'Лена',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'profile-1'
		},
		{
			id: 'character-2',
			name: 'Саша',
			cognitionTier: 'light',
			defaultBehaviorProfileId: 'profile-2'
		}
	];
	value.behaviorProfiles = [
		{id: 'profile-1', characterId: 'character-1', name: 'Лена'},
		{id: 'profile-2', characterId: 'character-2', name: 'Саша'}
	];
	value.locations = [
		{id: 'home', name: 'Дом'},
		{id: 'school', name: 'Школа'}
	];
	return value;
}

describe('analyzeNarrativeScheduleConflicts', () => {
	it('does not flag adjacent windows or windows owned by different characters', () => {
		const value = project();
		value.routineRules = [
			{
				id: 'morning',
				characterId: 'character-1',
				behaviorProfileId: 'profile-1',
				activeRange: {fromDay: 1, toDay: 1},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'exact', startMinute: 480, endMinute: 600},
				targetLocationId: 'home'
			},
			{
				id: 'after-morning',
				characterId: 'character-1',
				behaviorProfileId: 'profile-1',
				activeRange: {fromDay: 1, toDay: 1},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'exact', startMinute: 600, endMinute: 720},
				targetLocationId: 'school'
			},
			{
				id: 'someone-else',
				characterId: 'character-2',
				behaviorProfileId: 'profile-2',
				activeRange: {fromDay: 1, toDay: 1},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'exact', startMinute: 540, endMinute: 660},
				targetLocationId: 'school'
			}
		];

		expect(analyzeNarrativeScheduleConflicts(value).findings).toEqual([]);
	});

	it('reports overlapping rules for the same character', () => {
		const value = project();
		value.routineRules = [
			{
				id: 'home-rule',
				characterId: 'character-1',
				behaviorProfileId: 'profile-1',
				activeRange: {fromDay: 1, toDay: 1},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'exact', startMinute: 480, endMinute: 660},
				targetLocationId: 'home'
			},
			{
				id: 'school-rule',
				characterId: 'character-1',
				behaviorProfileId: 'profile-1',
				activeRange: {fromDay: 1, toDay: 1},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'exact', startMinute: 600, endMinute: 720},
				targetLocationId: 'school'
			}
		];

		expect(analyzeNarrativeScheduleConflicts(value).findings).toEqual([
			expect.objectContaining({
				kind: 'routine-overlap',
				characterId: 'character-1',
				ruleIds: ['home-rule', 'school-rule'],
				authoredDays: [1, 1],
				overlap: {start: 600, end: 660}
			})
		]);
	});

	it('detects a cross-midnight overlap with the next authored day', () => {
		const value = project();
		value.routineRules = [
			{
				id: 'night-rule',
				characterId: 'character-1',
				behaviorProfileId: 'profile-1',
				activeRange: {fromDay: 1, toDay: 1},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'period', periodId: 'night'},
				targetLocationId: 'home'
			},
			{
				id: 'early-rule',
				characterId: 'character-1',
				behaviorProfileId: 'profile-1',
				activeRange: {fromDay: 2, toDay: 2},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'exact', startMinute: 300, endMinute: 420},
				targetLocationId: 'school'
			}
		];

		const findings = analyzeNarrativeScheduleConflicts(value).findings;
		expect(findings).toHaveLength(1);
		expect(findings[0]).toEqual(
			expect.objectContaining({
				authoredDays: [1, 2],
				overlap: {start: 1740, end: 1800}
			})
		);
	});

	it('honors recurrence and active day ranges', () => {
		const value = project();
		value.routineRules = [
			{
				id: 'mondays',
				characterId: 'character-1',
				behaviorProfileId: 'profile-1',
				activeRange: {fromDay: 1, toDay: 4},
				recurrence: {type: 'weekly', weekdays: ['monday']},
				timeWindow: {type: 'exact', startMinute: 480, endMinute: 660},
				targetLocationId: 'home'
			},
			{
				id: 'tuesday-only',
				characterId: 'character-1',
				behaviorProfileId: 'profile-1',
				activeRange: {fromDay: 2, toDay: 2},
				recurrence: {type: 'explicitDays', days: [2]},
				timeWindow: {type: 'exact', startMinute: 540, endMinute: 600},
				targetLocationId: 'school'
			}
		];

		expect(analyzeNarrativeScheduleConflicts(value).findings).toEqual([]);
	});
});
