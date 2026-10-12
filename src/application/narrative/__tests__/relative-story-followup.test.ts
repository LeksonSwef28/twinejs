import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {createDefaultNarrativeOutcome} from '../../../domain/narrative/interaction';
import {scheduledStoryWork} from '../../../domain/narrative/simulation-kernel';
import {narrativeProjectHistoryReducer} from '../../../store/narrative-project/reducer';
import {planRelativeStoryFollowup} from '../relative-story-followup';

function fixture() {
	const project = createNarrativeProject('a83-host', 'Relative followups', ninetyThreeDaysTemplate);
	project.storyNodes = [
		{
			id: 'origin',
			kind: 'dialogue',
			title: 'Встреча',
			participantIds: [],
			placement: {day: 5, minuteOfDay: 600},
			activationState: 'available'
		},
		{
			id: 'followup',
			kind: 'dialogue',
			title: 'Ответ',
			participantIds: [],
			placement: {locationId: 'courtyard'},
			activationState: 'dormant'
		}
	];
	return project;
}

describe('A83 calendar-only relative Story planning', () => {
	test('uses exact authored origin moment and leaves runtime and other source data untouched', () => {
		const project = fixture();
		const initial = JSON.stringify(project);
		const result = planRelativeStoryFollowup(project, 'origin', 'followup', 2);
		expect(result).toEqual({
			status: 'ready',
			placement: {locationId: 'courtyard', day: 7, minuteOfDay: 600},
			plannedDay: 7,
			plannedMinuteOfDay: 600,
			hasExplicitOutcomeUnlock: false
		});
		expect(JSON.stringify(project)).toBe(initial);
		if (result.status !== 'ready') {
			throw new Error(result.reason);
		}
		let history = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{type: 'execute', command: {
				type: 'story/setPlacement', id: 'followup', placement: result.placement
			}}
		);
		expect(history.present.storyNodes[1].placement).toEqual(result.placement);
		expect(history.present.simulation).toEqual(project.simulation);
		expect(scheduledStoryWork(history.present.storyNodes)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'story-node:followup',
					moment: {day: 7, minuteOfDay: 600}
				})
			])
		);
		history = narrativeProjectHistoryReducer(history, {type: 'undo'});
		expect(history.present.storyNodes[1].placement).toEqual({locationId: 'courtyard'});
	});

	test('observes an explicit authored Outcome unlock but does not execute or delay it', () => {
		const project = fixture();
		const outcome = createDefaultNarrativeOutcome('tell');
		outcome.effects = [
			{
				id: 'unlock',
				type: 'story-node-set-state',
				storyNodeId: 'followup',
				state: 'available'
			}
		];
		project.narrativeMoves.push({
			id: 'tell',
			storyNodeId: 'origin',
			kind: 'inform',
			label: 'Передать слух',
			targetCharacterIds: [],
			guards: [],
			outcomes: [outcome],
			resolution: {type: 'automatic', outcomeId: outcome.id}
		});
		const result = planRelativeStoryFollowup(project, 'origin', 'followup', 2);
		expect(result.status).toBe('ready');
		if (result.status === 'ready') {
			expect(result.hasExplicitOutcomeUnlock).toBe(true);
		}
		expect(project.storyNodeStateOverrides).toEqual({});
		expect(project.runtimeOccurrences).toEqual([]);
	});

	test('refuses accidental overwrites, invalid offsets and missing placement', () => {
		const project = fixture();
		for (const invalid of [0, -1, 1.25, Number.NaN, 999]) {
			expect(planRelativeStoryFollowup(project, 'origin', 'followup', invalid).status)
				.toBe('blocked');
		}
		expect(planRelativeStoryFollowup(project, 'origin', 'origin', 1).status)
			.toBe('blocked');
		expect(planRelativeStoryFollowup(project, 'unknown', 'followup', 1).status)
			.toBe('blocked');
		project.storyNodes[0].placement = {day: 5};
		expect(planRelativeStoryFollowup(project, 'origin', 'followup', 2))
			.toEqual(expect.objectContaining({status: 'blocked', reason: expect.stringMatching(/время/)}));
		project.storyNodes[0].placement = {day: 5, minuteOfDay: 600};
		project.storyNodes[1].placement = {day: 7, minuteOfDay: 600};
		expect(planRelativeStoryFollowup(project, 'origin', 'followup', 2))
			.toEqual(expect.objectContaining({status: 'blocked', reason: expect.stringMatching(/перезаписи/)}));
	});

	test('will never clamp a planned continuation beyond day 93', () => {
		const project = fixture();
		project.storyNodes[0].placement = {day: 92, minuteOfDay: 500};
		const result = planRelativeStoryFollowup(project, 'origin', 'followup', 2);
		expect(result).toEqual(expect.objectContaining({
			status: 'blocked',
			reason: expect.stringMatching(/94/)
		}));
		expect(project.storyNodes[1].placement).toEqual({locationId: 'courtyard'});
	});
});
