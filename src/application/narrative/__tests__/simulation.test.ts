import {createHeavyMealBodyEffect, evaluateBodyAction} from '../../../domain/narrative/body';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	advanceNarrativeProjectSimulation,
	applyNarrativeProjectBodyEffect
} from '../simulation';

describe('A37/A38 project simulation orchestration', () => {
	test('advances runtime while leaving authored and editor state untouched', () => {
		const project = createNarrativeProject(
			'story-simulation',
			'Project simulation',
			ninetyThreeDaysTemplate
		);
		project.updatedAt = '2026-09-13T00:00:00.000Z';
		project.editor.selectedDay = 20;
		project.storyNodes = [
			{
				id: 'meeting',
				kind: 'event',
				title: 'Встреча',
				participantIds: ['katya'],
				placement: {day: 1, minuteOfDay: 10, locationId: 'station'},
				activationState: 'available'
			}
		];
		project.simulation.actualLocationByCharacter = {katya: 'park'};
		const authoredBefore = JSON.stringify(project.storyNodes);
		const editorBefore = JSON.stringify(project.editor);

		const result = advanceNarrativeProjectSimulation(project, 15);

		expect(result.project.simulation.minuteOfDay).toBe(
			ninetyThreeDaysTemplate.periods[0].startMinute + 15
		);
		expect(JSON.stringify(result.project.storyNodes)).toBe(authoredBefore);
		expect(JSON.stringify(result.project.editor)).toBe(editorBefore);
		expect(result.project.updatedAt).toBe('2026-09-13T00:00:00.000Z');
		expect(result.project.simulation.actualLocationByCharacter.katya).toBe('park');
	});

	test('surfaces authored Story work and custom work without executing either', () => {
		const project = createNarrativeProject(
			'story-simulation-work',
			'Project simulation work',
			ninetyThreeDaysTemplate
		);
		const start = project.simulation.minuteOfDay;
		project.storyNodes = [
			{
				id: 'story-b',
				kind: 'event',
				title: 'B',
				participantIds: [],
				placement: {day: 1, minuteOfDay: start + 5},
				activationState: 'available'
			}
		];

		const result = advanceNarrativeProjectSimulation(project, 10, [
			{
				id: 'custom-a',
				moment: {day: 1, minuteOfDay: start + 5},
				kind: 'body-update'
			}
		]);

		expect(result.dueWork.map(item => item.id)).toEqual([
			'custom-a',
			'story-node:story-b'
		]);
		expect(project.storyNodes[0].activationState).toBe('available');
		expect(result.project.storyNodes[0].activationState).toBe('available');
	});

	test('advances body state on the exact minutes applied by the playhead', () => {
		const project = createNarrativeProject(
			'body-simulation',
			'Body simulation',
			ninetyThreeDaysTemplate
		);
		project.characters = [
			{
				id: 'player',
				name: 'Player',
				cognitionTier: 'full',
				defaultBehaviorProfileId: 'player-default'
			}
		];

		const afterMeal = applyNarrativeProjectBodyEffect(
			project,
			createHeavyMealBodyEffect('meal', 'player')
		).project;
		expect(
			evaluateBodyAction(afterMeal.simulation.bodyByCharacter.player, 'fast-run')
				.allowed
		).toBe(false);

		const after29 = advanceNarrativeProjectSimulation(afterMeal, 29);
		expect(after29.bodyTraces).toHaveLength(1);
		expect(
			after29.project.simulation.bodyByCharacter.player
				.digestionRemainingMinutes
		).toBe(1);

		const after30 = advanceNarrativeProjectSimulation(after29.project, 1);
		expect(
			evaluateBodyAction(after30.project.simulation.bodyByCharacter.player, 'fast-run')
				.allowed
		).toBe(true);
	});

	test('does not advance body beyond the project-end clamp', () => {
		const project = createNarrativeProject(
			'body-end-clamp',
			'Body end clamp',
			ninetyThreeDaysTemplate
		);
		project.characters = [
			{
				id: 'player',
				name: 'Player',
				cognitionTier: 'full',
				defaultBehaviorProfileId: 'player-default'
			}
		];
		project.simulation.day = ninetyThreeDaysTemplate.dayCount;
		project.simulation.minuteOfDay = 24 * 60 - 2;

		const result = advanceNarrativeProjectSimulation(project, 60);
		expect(result.trace.appliedMinutes).toBe(1);
		expect(result.bodyTraces[0].elapsedMinutes).toBe(1);
	});
});
