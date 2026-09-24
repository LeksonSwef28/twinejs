import {create93DaysFirsthandSocialRepairProject} from '../../../domain/narrative/content/93-days-firsthand-social-repair';
import {rumorSocialEchoIds} from '../../../domain/narrative/content/93-days-rumor-social-echo';
import {simulationKernelAbsoluteMinute} from '../../../domain/narrative/simulation-kernel';
import {advanceNarrativeProjectSimulation} from '../simulation';
import {advanceNarrativePlayerTimeSegmented} from '../player-time';

describe('A63 S1 segmented Player time', () => {
	test('segments exactly at authored due moments while preserving canonical final runtime', () => {
		const project = create93DaysFirsthandSocialRepairProject();
		const current = simulationKernelAbsoluteMinute(project.simulation);
		const target = (3 - 1) * 1440 + 10 * 60;
		const delta = target - current;

		const monolithic = advanceNarrativeProjectSimulation(project, delta);
		const segmented = advanceNarrativePlayerTimeSegmented(project, delta);

		expect(segmented.appliedMinutes).toBe(delta);
		expect(segmented.clampedAtProjectEnd).toBe(false);
		expect(segmented.project.simulation).toEqual(monolithic.project.simulation);
		expect(segmented.project.injuriesByCharacter).toEqual(
			monolithic.project.injuriesByCharacter
		);
		expect(segmented.project.activeStoryExecutions).toEqual(
			monolithic.project.activeStoryExecutions
		);
		expect(segmented.project.runtimeOccurrences).toEqual(
			monolithic.project.runtimeOccurrences
		);
		expect(segmented.project.storyNodeStateOverrides).toEqual(
			monolithic.project.storyNodeStateOverrides
		);
		expect(segmented.dueWork.map(item => item.id)).toEqual(
			monolithic.dueWork.map(item => item.id)
		);

		const rumorWorkId =
			'story-node:' + rumorSocialEchoIds.story.contactReportsToDormDuty;
		const rumorSegment = segmented.segments.find(segment =>
			segment.dueWorkIds.includes(rumorWorkId)
		);
		expect(rumorSegment).toMatchObject({
			to: {day: 3, minuteOfDay: 8 * 60 + 15},
			dueWorkIds: [rumorWorkId]
		});
	});

	test('a split advance and one long advance produce the same final canonical runtime', () => {
		const project = create93DaysFirsthandSocialRepairProject();
		const current = simulationKernelAbsoluteMinute(project.simulation);
		const midpoint = (2 - 1) * 1440 + 18 * 60;
		const target = (3 - 1) * 1440 + 10 * 60;

		const first = advanceNarrativePlayerTimeSegmented(
			project,
			midpoint - current
		);
		const second = advanceNarrativePlayerTimeSegmented(
			first.project,
			target - midpoint
		);
		const long = advanceNarrativePlayerTimeSegmented(project, target - current);

		expect(second.project.simulation).toEqual(long.project.simulation);
		expect(second.project.injuriesByCharacter).toEqual(
			long.project.injuriesByCharacter
		);
		expect(second.project.runtimeOccurrences).toEqual(
			long.project.runtimeOccurrences
		);
		expect(second.project.storyNodeStateOverrides).toEqual(
			long.project.storyNodeStateOverrides
		);
		expect([
			...first.dueWork.map(item => item.id),
			...second.dueWork.map(item => item.id)
		]).toEqual(long.dueWork.map(item => item.id));
	});

	test('project-end clamp remains canonical', () => {
		const project = create93DaysFirsthandSocialRepairProject();
		const segmented = advanceNarrativePlayerTimeSegmented(
			project,
			project.template.dayCount * 1440 * 2
		);

		expect(segmented.clampedAtProjectEnd).toBe(true);
		expect(segmented.project.simulation).toEqual({
			...segmented.project.simulation,
			day: project.template.dayCount,
			minuteOfDay: 1439
		});
		expect(segmented.appliedMinutes).toBe(
			project.template.dayCount * 1440 -
				1 -
				simulationKernelAbsoluteMinute(project.simulation)
		);
	});
});
