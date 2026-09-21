import {
	arrivalCorridorIds,
	create93DaysArrivalCorridorProject
} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {create93DaysDayOneDayTwoProject, dayOneNarrativeIds} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {materializeNarrativePlayerSession} from '../player-runtime';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';

function freshArrivalSession() {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysArrivalCorridorProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected Arrival Corridor to compile.');
	}
	expect(compiled.artifact.initialRuntime.simulation.actualLocationByCharacter).toEqual(
		{}
	);
	const materialized = materializeNarrativePlayerSession(compiled.artifact);
	if (materialized.status !== 'ready') {
		throw new Error('Expected Arrival Corridor to materialize.');
	}
	return materialized.session;
}

describe('A56 explicit player world start', () => {
	test('applies authored start only after fresh artifact materialization', () => {
		const session = freshArrivalSession();
		expect(
			session.currentProject.simulation.actualLocationByCharacter.player
		).toBeUndefined();

		const started = bootstrapNarrativePlayerWorldStart(session);

		expect(started.status).toBe('applied');
		expect(
			started.session.currentProject.simulation.actualLocationByCharacter.player
		).toBe(arrivalCorridorIds.locations.busStation);
	});

	test('never teleports an already located player back to the authored start', () => {
		const session = freshArrivalSession();
		const started = bootstrapNarrativePlayerWorldStart(session);
		if (started.status !== 'applied') {
			throw new Error('Expected first world start.');
		}
		const progressed = {
			...started.session,
			currentProject: {
				...started.session.currentProject,
				simulation: {
					...started.session.currentProject.simulation,
					actualLocationByCharacter: {
						...started.session.currentProject.simulation.actualLocationByCharacter,
						player: arrivalCorridorIds.locations.transportSquare
					}
				}
			}
		};

		const repeated = bootstrapNarrativePlayerWorldStart(progressed);

		expect(repeated.status).toBe('skipped');
		expect(
			repeated.session.currentProject.simulation.actualLocationByCharacter.player
		).toBe(arrivalCorridorIds.locations.transportSquare);
	});

	test('applies explicitly authored opening NPC presence without touching A52 fresh runtime', () => {
		const compiled = compileNarrativeRuntimeArtifact(
			create93DaysDayOneDayTwoProject()
		);
		if (compiled.status !== 'compiled') {
			throw new Error('Expected A57 project to compile.');
		}
		expect(
			compiled.artifact.initialRuntime.simulation.actualLocationByCharacter
		).toEqual({});
		const materialized = materializeNarrativePlayerSession(compiled.artifact);
		if (materialized.status !== 'ready') {
			throw new Error('Expected A57 project to materialize.');
		}

		const started = bootstrapNarrativePlayerWorldStart(materialized.session);

		expect(started.status).toBe('applied');
		expect(
			started.session.currentProject.simulation.actualLocationByCharacter
		).toMatchObject({
			player: arrivalCorridorIds.locations.busStation,
			[arrivalCorridorIds.characters.stationClerk]:
				arrivalCorridorIds.locations.busStation,
			[arrivalCorridorIds.characters.dormDuty]:
				arrivalCorridorIds.locations.studentDormitory,
			[dayOneNarrativeIds.characters.dormResident]:
				arrivalCorridorIds.locations.studentDormitory
		});
	});

	test('validates all authored start placements before changing any presence', () => {
		const session = freshArrivalSession();
		const broken = {
			...session,
			currentProject: {
				...session.currentProject,
				playerStart: {
					...session.currentProject.playerStart!,
					initialActualPresenceByCharacter: {
						ghost: 'missing-location'
					}
				}
			}
		};
		const result = bootstrapNarrativePlayerWorldStart(broken);
		expect(result.status).toBe('rejected');
		expect(result.session).toBe(broken);
		expect(
			result.session.currentProject.simulation.actualLocationByCharacter
		).toEqual({});
	});

	test('skips projects that do not author a player start', () => {
		const project = create93DaysArrivalCorridorProject();
		delete project.playerStart;
		const compiled = compileNarrativeRuntimeArtifact(project);
		if (compiled.status !== 'compiled') {
			throw new Error('Expected no-start project to compile.');
		}
		const materialized = materializeNarrativePlayerSession(compiled.artifact);
		if (materialized.status !== 'ready') {
			throw new Error('Expected no-start project to materialize.');
		}

		const result = bootstrapNarrativePlayerWorldStart(materialized.session);

		expect(result.status).toBe('skipped');
		expect(
			result.session.currentProject.simulation.actualLocationByCharacter
		).toEqual({});
	});
});
