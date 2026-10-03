import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ScheduleException} from '../../../domain/narrative/schedule';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	applyScheduleExceptionAuthoringCommand,
	resolveScheduleExceptionForAuthoring
} from '../schedule-exception-authoring';
import {createLocalStorageNarrativeProjectRepository} from '../repository';

function fixture(hostStoryId: string) {
	const project = createNarrativeProject(
		hostStoryId,
		'A67-D3 persistence',
		ninetyThreeDaysTemplate
	);
	project.locations.push(
		{id: 'home', name: 'Дом'},
		{id: 'cafe', name: 'Кафе'}
	);
	project.characters.push(
		{
			id: 'katya',
			name: 'Катя',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'katya-profile'
		},
		{
			id: 'misha',
			name: 'Миша',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'misha-profile'
		}
	);
	return project;
}

describe('schedule exception authoring persistence boundary', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('persists modern Location and Absent authoring independently from runtime presence', () => {
		const hostStoryId = 'a67-d3-modern-persistence';
		let project = fixture(hostStoryId);
		project = applyScheduleExceptionAuthoringCommand(project, {
			type: 'scheduleException/add',
			candidate: {
				id: 'location-exception',
				characterId: 'katya',
				activeRange: {fromDay: 3, toDay: 3},
				timeWindow: {type: 'period', periodId: 'day'},
				intent: {type: 'location', locationId: 'cafe'},
				priority: 10
			}
		});
		project = applyScheduleExceptionAuthoringCommand(project, {
			type: 'scheduleException/add',
			candidate: {
				id: 'absent-exception',
				characterId: 'misha',
				activeRange: {fromDay: 4},
				timeWindow: {
					type: 'exact',
					startMinute: 23 * 60,
					endMinute: 60,
					endDayOffset: 1
				},
				intent: {type: 'absent'},
				priority: 20
			}
		});
		project = {
			...project,
			simulation: {
				...project.simulation,
				day: 8,
				minuteOfDay: 765,
				actualLocationByCharacter: {katya: 'home', misha: 'cafe'}
			}
		};

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'A67-D3 persistence',
			ninetyThreeDaysTemplate
		);
		repository.save(project);
		const restored = repository.load();

		expect(restored.scheduleExceptions).toEqual(project.scheduleExceptions);
		expect(restored.scheduleExceptions[0]).toEqual(
			expect.objectContaining({
				timeWindow: {type: 'period', periodId: 'day'},
				targetLocationId: 'cafe'
			})
		);
		expect(restored.scheduleExceptions[1]).toEqual(
			expect.objectContaining({
				activeRange: {fromDay: 4},
				absent: true
			})
		);
		expect(restored.simulation).toEqual(
			expect.objectContaining({
				day: 8,
				minuteOfDay: 765,
				actualLocationByCharacter: {katya: 'home', misha: 'cafe'}
			})
		);
	});

	test('loads legacy records without read-time modernization and modernizes only the edited record', () => {
		const hostStoryId = 'a67-d3-legacy-persistence';
		const project = fixture(hostStoryId);
		const editedLegacy: ScheduleException = {
			id: 'edited-legacy',
			characterId: 'katya',
			activeRange: {fromDay: 5, toDay: 5},
			periodId: 'morning',
			targetLocationId: 'home',
			priority: 1
		};
		const siblingLegacy: ScheduleException = {
			id: 'sibling-legacy',
			characterId: 'misha',
			activeRange: {fromDay: 6},
			periodId: 'evening',
			absent: true,
			priority: 2
		};
		project.scheduleExceptions.push(editedLegacy, siblingLegacy);

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'A67-D3 persistence',
			ninetyThreeDaysTemplate
		);
		repository.save(project);
		const loaded = repository.load();

		expect(loaded.scheduleExceptions[0].periodId).toBe('morning');
		expect(loaded.scheduleExceptions[0].timeWindow).toBeUndefined();
		const beforeRead = JSON.stringify(loaded.scheduleExceptions);
		expect(
			resolveScheduleExceptionForAuthoring(
				loaded,
				loaded.scheduleExceptions[0]
			).window
		).toEqual({
			status: 'resolved',
			source: 'legacy-period',
			value: {type: 'period', periodId: 'morning'}
		});
		expect(JSON.stringify(loaded.scheduleExceptions)).toBe(beforeRead);

		const modernized = applyScheduleExceptionAuthoringCommand(loaded, {
			type: 'scheduleException/update',
			candidate: {
				id: 'edited-legacy',
				characterId: 'katya',
				activeRange: {fromDay: 5, toDay: 5},
				timeWindow: {type: 'period', periodId: 'morning'},
				intent: {type: 'location', locationId: 'home'},
				priority: 3
			}
		});
		expect(modernized.scheduleExceptions[0].periodId).toBeUndefined();
		expect(modernized.scheduleExceptions[0].timeWindow).toEqual({
			type: 'period',
			periodId: 'morning'
		});
		expect(modernized.scheduleExceptions[1]).toBe(
			loaded.scheduleExceptions[1]
		);
		expect(modernized.scheduleExceptions[1].periodId).toBe('evening');

		repository.save(modernized);
		const reopened = repository.load();
		expect(reopened.scheduleExceptions[0]).toEqual(
			modernized.scheduleExceptions[0]
		);
		expect(reopened.scheduleExceptions[0].periodId).toBeUndefined();
		expect(reopened.scheduleExceptions[1].periodId).toBe('evening');
		expect(reopened.scheduleExceptions[1].timeWindow).toBeUndefined();
	});
});
