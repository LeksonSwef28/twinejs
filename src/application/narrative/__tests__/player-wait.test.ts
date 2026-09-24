import {
	arrivalCorridorIds,
	create93DaysArrivalCorridorProject
} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {materializeNarrativePlayerSession} from '../player-runtime';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {executeNarrativePlayerWait} from '../player-wait';

function session() {
	const project = create93DaysArrivalCorridorProject();
	const startMinute = project.simulation.minuteOfDay;
	project.storyNodes = [
		...project.storyNodes,
		{
			id: 'wait-due-work',
			kind: 'event',
			title: 'Событие во время ожидания',
			participantIds: [],
			placement: {day: 1, minuteOfDay: startMinute + 3},
			activationState: 'available'
		}
	];
	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected wait fixture to compile.');
	}
	const materialized = materializeNarrativePlayerSession(compiled.artifact);
	if (materialized.status !== 'ready') {
		throw new Error('Expected wait fixture to materialize.');
	}
	const started = bootstrapNarrativePlayerWorldStart(materialized.session);
	if (started.status !== 'applied') {
		throw new Error('Expected wait fixture to start at the bus station.');
	}
	return started.session;
}

describe('A56 Player wait command', () => {
	test('delegates elapsed time to canonical simulation without moving Actual Presence', () => {
		const initial = session();
		const beforeLocation =
			initial.currentProject.simulation.actualLocationByCharacter.player;
		const beforeMinute = initial.currentProject.simulation.minuteOfDay;

		const result = executeNarrativePlayerWait(initial, 5);

		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error('Expected wait to apply.');
		}
		expect(result.session.currentProject.simulation.minuteOfDay).toBe(
			beforeMinute + 5
		);
		expect(
			result.session.currentProject.simulation.actualLocationByCharacter.player
		).toBe(beforeLocation);
		expect(beforeLocation).toBe(arrivalCorridorIds.locations.busStation);
		expect(result.dueWorkIds).toContain('story-node:wait-due-work');
		expect(result.session.currentProject.simulation.bodyByCharacter.player).toBeDefined();
	});

	test('rejects invalid and project-end waits atomically', () => {
		const initial = session();
		expect(executeNarrativePlayerWait(initial, 0)).toMatchObject({
			status: 'rejected',
			reason: 'invalid-duration',
			session: initial
		});

		const nearEnd = {
			...initial,
			currentProject: {
				...initial.currentProject,
				simulation: {
					...initial.currentProject.simulation,
					day: 93,
					minuteOfDay: 24 * 60 - 2
				}
			}
		};
		expect(executeNarrativePlayerWait(nearEnd, 5)).toMatchObject({
			status: 'rejected',
			reason: 'project-end',
			session: nearEnd
		});
	});
});
