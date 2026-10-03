import {createNarrativeProject} from '../project-factory';
import {analyzeNarrativeScheduleConflicts} from '../schedule-analysis';
import {NarrativeProjectTemplate} from '../template';
import {applyScheduleExceptionAuthoringCommand} from '../../../store/narrative-project/schedule-exception-authoring';

const template: NarrativeProjectTemplate = {
	id: 'schedule-exception-analysis-test',
	displayName: 'Schedule exception analysis',
	dayCount: 2,
	day1Weekday: 'monday',
	periods: [{id: 'day', label: 'День', startMinute: 480, endMinute: 1200}],
	presenceTransition: {
		defaultTransitionWindowMinutes: 15,
		allowFinishCurrentInteraction: true,
		allowTravelWithPlayer: true
	},
	enabledModules: []
};

function project() {
	const value = createNarrativeProject(
		'schedule-exception-story',
		'Schedule exception analysis',
		template
	);
	value.characters = [
		{
			id: 'hero',
			name: 'Герой',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'hero-profile'
		}
	];
	return value;
}

describe('ScheduleException ambiguity diagnostics', () => {
	it('reports overlapping maximum-priority exceptions for the same character', () => {
		const value = project();
		value.scheduleExceptions = [
			{
				id: 'stay-home',
				characterId: 'hero',
				activeRange: {fromDay: 1, toDay: 1},
				timeWindow: {type: 'exact', startMinute: 540, endMinute: 660},
				targetLocationId: 'home',
				priority: 100
			},
			{
				id: 'go-school',
				characterId: 'hero',
				activeRange: {fromDay: 1, toDay: 1},
				timeWindow: {type: 'exact', startMinute: 600, endMinute: 720},
				targetLocationId: 'school',
				priority: 100
			}
		];

		expect(analyzeNarrativeScheduleConflicts(value).findings).toEqual([
			expect.objectContaining({
				kind: 'schedule-exception-ambiguity',
				characterId: 'hero',
				ruleIds: ['go-school', 'stay-home'],
				authoredDays: [1, 1],
				overlap: {start: 600, end: 660}
			})
		]);
	});

	it('does not report a priority tie while a higher-priority exception wins the whole overlap', () => {
		const value = project();
		value.scheduleExceptions = [
			{
				id: 'stay-home',
				characterId: 'hero',
				activeRange: {fromDay: 1, toDay: 1},
				timeWindow: {type: 'exact', startMinute: 540, endMinute: 660},
				priority: 100
			},
			{
				id: 'go-school',
				characterId: 'hero',
				activeRange: {fromDay: 1, toDay: 1},
				timeWindow: {type: 'exact', startMinute: 600, endMinute: 720},
				priority: 100
			},
			{
				id: 'emergency',
				characterId: 'hero',
				activeRange: {fromDay: 1, toDay: 1},
				timeWindow: {type: 'exact', startMinute: 600, endMinute: 660},
				absent: true,
				priority: 200
			}
		];

		expect(
			analyzeNarrativeScheduleConflicts(value).findings.filter(
				finding => finding.kind === 'schedule-exception-ambiguity'
			)
		).toEqual([]);
	});

	it('derives ambiguity from command-produced records and priority updates', () => {
		let value = project();
		value = applyScheduleExceptionAuthoringCommand(value, {
			type: 'scheduleException/add',
			candidate: {
				id: 'first',
				characterId: 'hero',
				activeRange: {fromDay: 1, toDay: 1},
				timeWindow: {
					type: 'exact',
					startMinute: 540,
					endMinute: 660,
					endDayOffset: 0
				},
				intent: {type: 'absent'},
				priority: 100
			}
		});
		value = applyScheduleExceptionAuthoringCommand(value, {
			type: 'scheduleException/add',
			candidate: {
				id: 'second',
				characterId: 'hero',
				activeRange: {fromDay: 1, toDay: 1},
				timeWindow: {
					type: 'exact',
					startMinute: 600,
					endMinute: 720,
					endDayOffset: 0
				},
				intent: {type: 'absent'},
				priority: 50
			}
		});

		expect(
			analyzeNarrativeScheduleConflicts(value).findings.filter(
				finding => finding.kind === 'schedule-exception-ambiguity'
			)
		).toEqual([]);

		value = applyScheduleExceptionAuthoringCommand(value, {
			type: 'scheduleException/update',
			candidate: {
				id: 'second',
				characterId: 'hero',
				activeRange: {fromDay: 1, toDay: 1},
				timeWindow: {
					type: 'exact',
					startMinute: 600,
					endMinute: 720,
					endDayOffset: 0
				},
				intent: {type: 'absent'},
				priority: 100
			}
		});
		expect(
			analyzeNarrativeScheduleConflicts(value).findings
		).toContainEqual(
			expect.objectContaining({
				kind: 'schedule-exception-ambiguity',
				ruleIds: ['first', 'second'],
				overlap: {start: 600, end: 660}
			})
		);
	});

});
