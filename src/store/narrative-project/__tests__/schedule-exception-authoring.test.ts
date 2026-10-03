import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ScheduleException} from '../../../domain/narrative/schedule';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	ScheduleExceptionAuthoringCandidate,
	applyScheduleExceptionAuthoringCommand,
	resolveScheduleExceptionForAuthoring,
	scheduleExceptionAuthoringEquals,
	validateScheduleExceptionCandidate
} from '../schedule-exception-authoring';
import {narrativeProjectAuthoringReducer} from '../routine-authoring';

function projectFixture() {
	const project = createNarrativeProject(
		'story-a67-d3-schedule-exception',
		'A67-D3 Schedule Exception',
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
	project.behaviorProfiles.push(
		{
			id: 'katya-profile',
			characterId: 'katya',
			name: 'Обычная жизнь'
		},
		{
			id: 'misha-profile',
			characterId: 'misha',
			name: 'Обычная жизнь'
		}
	);
	project.routineRules.push({
		id: 'routine-sentinel',
		characterId: 'katya',
		behaviorProfileId: 'katya-profile',
		activeRange: {fromDay: 1},
		recurrence: {type: 'everyDay'},
		timeWindow: {type: 'period', periodId: 'morning'},
		targetLocationId: 'home'
	});
	return project;
}

function locationCandidate(
	overrides: Partial<ScheduleExceptionAuthoringCandidate> = {}
): ScheduleExceptionAuthoringCandidate {
	return {
		id: 'exception-1',
		characterId: 'katya',
		activeRange: {fromDay: 2, toDay: 2},
		timeWindow: {type: 'period', periodId: 'morning'},
		intent: {type: 'location', locationId: 'home'},
		priority: 50,
		reason: ' appointment ',
		...overrides
	};
}

function absentCandidate(
	overrides: Partial<ScheduleExceptionAuthoringCandidate> = {}
): ScheduleExceptionAuthoringCandidate {
	return {
		...locationCandidate(),
		intent: {type: 'absent'},
		...overrides
	};
}

describe('schedule exception authoring core', () => {
	test('resolves modern, legacy and imported anomaly states without mutating', () => {
		const project = projectFixture();
		const legacy: ScheduleException = {
			id: 'legacy',
			characterId: 'katya',
			activeRange: {fromDay: 3},
			periodId: 'morning',
			targetLocationId: 'missing-location',
			priority: 10
		};
		project.scheduleExceptions.push(legacy);

		const resolved = resolveScheduleExceptionForAuthoring(project, legacy);
		expect(resolved.character.status).toBe('resolved');
		expect(resolved.activeRange).toEqual({
			status: 'valid',
			mode: 'through-project-end',
			fromDay: 3
		});
		expect(resolved.window).toEqual({
			status: 'resolved',
			source: 'legacy-period',
			value: {type: 'period', periodId: 'morning'}
		});
		expect(resolved.intent).toEqual({
			status: 'location-unresolved',
			locationId: 'missing-location'
		});
		expect(project.scheduleExceptions[0]).toBe(legacy);
	});

	test('modern timeWindow shadows legacy period residue and conflicting intent remains explicit', () => {
		const project = projectFixture();
		const raw: ScheduleException = {
			id: 'conflict',
			characterId: 'katya',
			activeRange: {fromDay: 1, toDay: 4},
			timeWindow: {type: 'period', periodId: 'morning'},
			periodId: 'missing-period',
			targetLocationId: 'home',
			absent: true,
			priority: 5
		};
		const resolved = resolveScheduleExceptionForAuthoring(project, raw);
		expect(resolved.window).toEqual({
			status: 'resolved',
			source: 'modern',
			value: {type: 'period', periodId: 'morning'}
		});
		expect(resolved.intent).toEqual({
			status: 'conflicting',
			locationId: 'home',
			location: expect.objectContaining({id: 'home'})
		});
	});

	test('normalizes omitted cross-midnight offsets using current executable semantics', () => {
		const project = projectFixture();
		const raw: ScheduleException = {
			id: 'night',
			characterId: 'katya',
			activeRange: {fromDay: 2, toDay: 2},
			timeWindow: {
				type: 'exact',
				startMinute: 23 * 60,
				endMinute: 60
			},
			absent: true,
			priority: 1
		};
		const resolved = resolveScheduleExceptionForAuthoring(project, raw);
		expect(resolved.window).toEqual({
			status: 'resolved',
			source: 'modern',
			value: {
				type: 'exact',
				startMinute: 23 * 60,
				endMinute: 60,
				endDayOffset: 1
			}
		});
	});

	test('validates strict exact intervals and finite priority', () => {
		const project = projectFixture();
		expect(
			validateScheduleExceptionCandidate(project, {
				...absentCandidate(),
				timeWindow: {
					type: 'exact',
					startMinute: 600,
					endMinute: 600,
					endDayOffset: 1
				}
			})
		).toEqual({status: 'valid'});
		expect(
			validateScheduleExceptionCandidate(project, {
				...absentCandidate(),
				timeWindow: {
					type: 'exact',
					startMinute: 600,
					endMinute: 600,
					endDayOffset: 0
				}
			})
		).toEqual({status: 'invalid-time-window'});
		expect(
			validateScheduleExceptionCandidate(project, {
				...absentCandidate(),
				priority: Number.POSITIVE_INFINITY
			})
		).toEqual({status: 'invalid-priority'});
		expect(
			validateScheduleExceptionCandidate(project, {
				...absentCandidate(),
				priority: 0
			})
		).toEqual({status: 'valid'});
	});

	test('reports missing Character, Location, period and invalid ranges precisely', () => {
		const project = projectFixture();
		expect(
			validateScheduleExceptionCandidate(project, {
				...locationCandidate(),
				characterId: 'missing'
			})
		).toEqual({status: 'missing-character', characterId: 'missing'});
		expect(
			validateScheduleExceptionCandidate(project, {
				...locationCandidate(),
				intent: {type: 'location', locationId: 'missing'}
			})
		).toEqual({status: 'missing-location', locationId: 'missing'});
		expect(
			validateScheduleExceptionCandidate(project, {
				...locationCandidate(),
				timeWindow: {type: 'period', periodId: 'missing'}
			})
		).toEqual({status: 'missing-period', periodId: 'missing'});
		expect(
			validateScheduleExceptionCandidate(project, {
				...locationCandidate(),
				activeRange: {fromDay: 20, toDay: 10}
			})
		).toEqual({status: 'invalid-active-range'});
	});

	test('treats legacy period and modern period as semantically equal', () => {
		const project = projectFixture();
		const raw: ScheduleException = {
			id: 'exception-1',
			characterId: 'katya',
			activeRange: {fromDay: 2, toDay: 2},
			periodId: 'morning',
			targetLocationId: 'home',
			priority: 50,
			reason: 'appointment'
		};
		expect(
			scheduleExceptionAuthoringEquals(project, raw, locationCandidate())
		).toBe(true);
	});

	test('treats inferred exact offset as equal but preserves open-ended range intent', () => {
		const project = projectFixture();
		const raw: ScheduleException = {
			id: 'exception-1',
			characterId: 'katya',
			activeRange: {fromDay: 2},
			timeWindow: {
				type: 'exact',
				startMinute: 1380,
				endMinute: 60
			},
			absent: true,
			priority: 50
		};
		const exactCandidate = absentCandidate({
			activeRange: {fromDay: 2},
			timeWindow: {
				type: 'exact',
				startMinute: 1380,
				endMinute: 60,
				endDayOffset: 1
			},
			reason: undefined
		});
		expect(
			scheduleExceptionAuthoringEquals(project, raw, exactCandidate)
		).toBe(true);
		expect(
			scheduleExceptionAuthoringEquals(project, raw, {
				...exactCandidate,
				activeRange: {fromDay: 2, toDay: project.template.dayCount}
			})
		).toBe(false);
	});

	test('adds modern canonical records and leaves Routine Rules untouched', () => {
		const project = projectFixture();
		const routineRules = project.routineRules;
		const next = applyScheduleExceptionAuthoringCommand(project, {
			type: 'scheduleException/add',
			candidate: locationCandidate()
		});
		expect(next).not.toBe(project);
		expect(next.routineRules).toBe(routineRules);
		expect(next.scheduleExceptions).toEqual([
			{
				id: 'exception-1',
				characterId: 'katya',
				activeRange: {fromDay: 2, toDay: 2},
				timeWindow: {type: 'period', periodId: 'morning'},
				targetLocationId: 'home',
				priority: 50,
				reason: 'appointment'
			}
		]);
	});

	test('returns exact project for duplicate, invalid and same-semantic requests', () => {
		const project = projectFixture();
		project.scheduleExceptions.push({
			id: 'exception-1',
			characterId: 'katya',
			activeRange: {fromDay: 2, toDay: 2},
			periodId: 'morning',
			targetLocationId: 'home',
			priority: 50,
			reason: 'appointment'
		});
		expect(
			applyScheduleExceptionAuthoringCommand(project, {
				type: 'scheduleException/add',
				candidate: locationCandidate()
			})
		).toBe(project);
		expect(
			applyScheduleExceptionAuthoringCommand(project, {
				type: 'scheduleException/update',
				candidate: locationCandidate({characterId: 'missing'})
			})
		).toBe(project);
		expect(
			applyScheduleExceptionAuthoringCommand(project, {
				type: 'scheduleException/update',
				candidate: locationCandidate()
			})
		).toBe(project);
	});

	test('meaningful legacy edit modernizes only the edited record', () => {
		const project = projectFixture();
		project.scheduleExceptions.push(
			{
				id: 'exception-1',
				characterId: 'katya',
				activeRange: {fromDay: 2, toDay: 2},
				periodId: 'morning',
				targetLocationId: 'home',
				priority: 50
			},
			{
				id: 'legacy-sibling',
				characterId: 'misha',
				activeRange: {fromDay: 4},
				periodId: 'morning',
				absent: true,
				priority: 5
			}
		);
		const sibling = project.scheduleExceptions[1];
		const next = applyScheduleExceptionAuthoringCommand(project, {
			type: 'scheduleException/update',
			candidate: locationCandidate({priority: 100, reason: undefined})
		});
		expect(next.scheduleExceptions[0]).toEqual({
			id: 'exception-1',
			characterId: 'katya',
			activeRange: {fromDay: 2, toDay: 2},
			timeWindow: {type: 'period', periodId: 'morning'},
			targetLocationId: 'home',
			priority: 100
		});
		expect(next.scheduleExceptions[1]).toBe(sibling);
		expect(next.scheduleExceptions[1].periodId).toBe('morning');
	});

	test('removes malformed raw records by id and missing remove is exact no-op', () => {
		const project = projectFixture();
		project.scheduleExceptions.push({
			id: 'broken',
			characterId: 'missing-character',
			activeRange: {fromDay: 99, toDay: 1},
			periodId: 'missing-period',
			targetLocationId: 'missing-location',
			absent: true,
			priority: Number.NaN
		});
		const removed = applyScheduleExceptionAuthoringCommand(project, {
			type: 'scheduleException/remove',
			id: 'broken'
		});
		expect(removed.scheduleExceptions).toEqual([]);
		expect(
			applyScheduleExceptionAuthoringCommand(removed, {
				type: 'scheduleException/remove',
				id: 'broken'
			})
		).toBe(removed);
	});
});

describe('schedule exception authored history routing', () => {
	test('adds one history step, supports undo/redo and preserves no-op Redo', () => {
		const project = projectFixture();
		let state = {past: [], present: project, future: []};

		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'scheduleException/add',
				candidate: locationCandidate()
			}
		});
		expect(state.past).toHaveLength(1);
		expect(state.present.scheduleExceptions).toHaveLength(1);

		state = narrativeProjectAuthoringReducer(state, {type: 'undo'});
		expect(state.present.scheduleExceptions).toEqual([]);
		expect(state.future).toHaveLength(1);

		const beforeNoop = state;
		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'scheduleException/remove',
				id: 'missing'
			}
		});
		expect(state).toBe(beforeNoop);
		expect(state.future).toHaveLength(1);

		state = narrativeProjectAuthoringReducer(state, {type: 'redo'});
		expect(state.present.scheduleExceptions).toHaveLength(1);
	});

	test('same-semantic update is exact history no-op', () => {
		const project = projectFixture();
		project.scheduleExceptions.push({
			id: 'exception-1',
			characterId: 'katya',
			activeRange: {fromDay: 2, toDay: 2},
			periodId: 'morning',
			targetLocationId: 'home',
			priority: 50,
			reason: 'appointment'
		});
		const state = {past: [], present: project, future: []};
		const next = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'scheduleException/update',
				candidate: locationCandidate()
			}
		});
		expect(next).toBe(state);
	});
});
