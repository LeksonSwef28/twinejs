import {BodyStateEffect} from '../../../domain/narrative/body';
import {InjuryEffect} from '../../../domain/narrative/injury';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	advanceNarrativeProjectSimulation,
	applyNarrativeProjectBodyEffect,
	applyNarrativeProjectInjuryEffect
} from '../simulation';

function projectWithPlayer() {
	const project = createNarrativeProject(
		'a39-injury-simulation',
		'Injury simulation',
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
	return project;
}

function addAnkleInjury(recoveryRemainingMinutes: number): InjuryEffect {
	return {
		id: 'add-ankle',
		type: 'add',
		injury: {
			id: 'ankle',
			characterId: 'player',
			kind: 'ankle-sprain',
			region: 'ankle',
			pain: 'painful',
			recoveryRemainingMinutes,
			treatment: 'self-care'
		}
	};
}

describe('A39 injury integration with the Simulation Playhead', () => {
	test('sleep time from body state accelerates injury recovery on the same simulation step', () => {
		let project = projectWithPlayer();
		project = applyNarrativeProjectInjuryEffect(
			project,
			addAnkleInjury(180)
		).project;
		const sleep: BodyStateEffect = {
			id: 'sleep-hour',
			type: 'sleep',
			characterId: 'player',
			durationMinutes: 60
		};
		project = applyNarrativeProjectBodyEffect(project, sleep).project;

		const result = advanceNarrativeProjectSimulation(project, 60);

		expect(result.bodyTraces[0].sleptMinutes).toBe(60);
		expect(result.injuryTraces[0]).toMatchObject({
			injuryId: 'ankle',
			elapsedMinutes: 60,
			sleepMinutes: 60,
			recoveryAppliedMinutes: 90,
			recoveryBefore: 180,
			recoveryAfter: 90
		});
		expect(
			result.project.injuriesByCharacter.player[0].recoveryRemainingMinutes
		).toBe(90);
	});

	test('project-end clamping also clamps injury recovery time', () => {
		let project = projectWithPlayer();
		project = applyNarrativeProjectInjuryEffect(
			project,
			addAnkleInjury(120)
		).project;
		project.simulation.day = ninetyThreeDaysTemplate.dayCount;
		project.simulation.minuteOfDay = 24 * 60 - 2;

		const result = advanceNarrativeProjectSimulation(project, 60);

		expect(result.trace.appliedMinutes).toBe(1);
		expect(result.injuryTraces[0].elapsedMinutes).toBe(1);
		expect(
			result.project.injuriesByCharacter.player[0].recoveryRemainingMinutes
		).toBe(119);
	});
});
