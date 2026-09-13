import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {advanceNarrativeProjectSimulation} from '../simulation';

describe('A37 project simulation orchestration', () => {
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
});
