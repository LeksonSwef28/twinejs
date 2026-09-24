import {createCharacterBodyState} from '../../../domain/narrative/body';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {create93DaysDayOneDayTwoProject} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {setNarrativeCharacterActualLocation} from '../living-simulation';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {materializeNarrativePlayerSession, replaceNarrativePlayerSessionProject} from '../player-runtime';
import {executeNarrativePlayerSleep} from '../player-sleep';

function dormSession() {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysDayOneDayTwoProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A57 project to compile.');
	}
	const materialized = materializeNarrativePlayerSession(compiled.artifact);
	if (materialized.status !== 'ready') {
		throw new Error('Expected A57 project to materialize.');
	}
	const started = bootstrapNarrativePlayerWorldStart(materialized.session);
	if (started.status === 'rejected') {
		throw new Error('Expected A57 world start.');
	}
	let project = setNarrativeCharacterActualLocation(
		started.session.currentProject,
		arrivalCorridorIds.characters.player,
		arrivalCorridorIds.locations.studentDormitory
	);
	project = {
		...project,
		simulation: {
			...project.simulation,
			minuteOfDay: 22 * 60 + 30,
			bodyByCharacter: {
				...project.simulation.bodyByCharacter,
				player: createCharacterBodyState('player', {
					fatigue: 1,
					sleepDebtMinutes: 40
				})
			}
		}
	};
	const replaced = replaceNarrativePlayerSessionProject(started.session, project);
	if (replaced.status !== 'updated') {
		throw new Error('Expected dorm setup replacement.');
	}
	return replaced.session;
}

describe('A57 authored player sleep', () => {
	test('crosses into Day Two through canonical body and simulation time', () => {
		const session = dormSession();
		const result = executeNarrativePlayerSleep(
			session,
			'day1-dorm-overnight-sleep',
			'player'
		);
		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error('Expected sleep to apply.');
		}
		expect(result.durationMinutes).toBe(9 * 60);
		expect(result.session.currentProject.simulation).toMatchObject({
			day: 2,
			minuteOfDay: 7 * 60 + 30
		});
		const body = result.session.currentProject.simulation.bodyByCharacter.player;
		expect(body.sleepRemainingMinutes).toBe(0);
		expect(body.fatigue).toBe(0);
		expect(body.sleepDebtMinutes).toBe(0);
	});

	test('rejects too-early sleep atomically', () => {
		const session = dormSession();
		const project = {
			...session.currentProject,
			simulation: {...session.currentProject.simulation, minuteOfDay: 20 * 60}
		};
		const replaced = replaceNarrativePlayerSessionProject(session, project);
		if (replaced.status !== 'updated') {
			throw new Error('Expected early setup replacement.');
		}
		const before = JSON.stringify(replaced.session.currentProject);
		const result = executeNarrativePlayerSleep(
			replaced.session,
			'day1-dorm-overnight-sleep',
			'player'
		);
		expect(result).toMatchObject({status: 'rejected', reason: 'too-early'});
		expect(JSON.stringify(result.session.currentProject)).toBe(before);
	});

	test('rejects project-end sleep atomically', () => {
		const session = dormSession();
		const project = {
			...session.currentProject,
			simulation: {
				...session.currentProject.simulation,
				day: session.currentProject.template.dayCount,
				minuteOfDay: 23 * 60
			}
		};
		const replaced = replaceNarrativePlayerSessionProject(session, project);
		if (replaced.status !== 'updated') {
			throw new Error('Expected project-end setup replacement.');
		}
		const before = JSON.stringify(replaced.session.currentProject);
		const result = executeNarrativePlayerSleep(
			replaced.session,
			'day1-dorm-overnight-sleep',
			'player'
		);
		expect(result).toMatchObject({status: 'rejected', reason: 'project-end'});
		expect(JSON.stringify(result.session.currentProject)).toBe(before);
	});
});
