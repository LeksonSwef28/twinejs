import {
	advanceBodyStateMap,
	applyBodyStateEffect,
	BodyAdvanceTrace,
	BodyEffectTrace,
	BodyStateEffect,
	createCharacterBodyState
} from '../../domain/narrative/body';
import {NarrativeProject} from '../../domain/narrative/project';
import {
	scheduledStoryWork,
	SimulationScheduledWork,
	SimulationStepTrace,
	stepNarrativeSimulation
} from '../../domain/narrative/simulation-kernel';

export interface NarrativeProjectSimulationStepResult {
	project: NarrativeProject;
	dueWork: SimulationScheduledWork[];
	trace: SimulationStepTrace;
	bodyTraces: BodyAdvanceTrace[];
}

export interface NarrativeProjectBodyEffectResult {
	project: NarrativeProject;
	trace: BodyEffectTrace;
}

function bodyRuntimeForCharacters(project: NarrativeProject) {
	const result = {...project.simulation.bodyByCharacter};
	for (const character of [...project.characters].sort((a, b) =>
		a.id.localeCompare(b.id)
	)) {
		if (!result[character.id]) {
			result[character.id] = createCharacterBodyState(character.id);
		}
	}
	return result;
}

/**
 * Project-level A37/A38 orchestrator. Exact authored Story placements become
 * declarative due-work, while body state advances by the minutes actually
 * applied by the Simulation Playhead. Authoring/editor data and authored
 * `updatedAt` remain untouched by runtime time flow.
 */
export function advanceNarrativeProjectSimulation(
	project: NarrativeProject,
	deltaMinutes: number,
	extraScheduledWork: SimulationScheduledWork[] = []
): NarrativeProjectSimulationStepResult {
	const scheduledWork = [
		...scheduledStoryWork(project.storyNodes),
		...extraScheduledWork
	];
	const step = stepNarrativeSimulation(
		project.simulation,
		deltaMinutes,
		project.template.dayCount,
		scheduledWork
	);
	const bodyAdvance = advanceBodyStateMap(
		bodyRuntimeForCharacters(project),
		step.trace.appliedMinutes
	);

	return {
		project: {
			...project,
			simulation: {...step.state, bodyByCharacter: bodyAdvance.states}
		},
		dueWork: step.dueWork,
		trace: step.trace,
		bodyTraces: bodyAdvance.traces
	};
}

/**
 * Applies one explicit physical effect without advancing time. Effects never
 * create unknown characters and never mutate authored/editor state.
 */
export function applyNarrativeProjectBodyEffect(
	project: NarrativeProject,
	effect: BodyStateEffect
): NarrativeProjectBodyEffectResult {
	if (!project.characters.some(character => character.id === effect.characterId)) {
		throw new Error(`Unknown body-effect character: ${effect.characterId}`);
	}
	const bodyByCharacter = bodyRuntimeForCharacters(project);
	const current = bodyByCharacter[effect.characterId];
	const applied = applyBodyStateEffect(current, effect);

	return {
		project: {
			...project,
			simulation: {
				...project.simulation,
				bodyByCharacter: {
					...bodyByCharacter,
					[effect.characterId]: applied.state
				}
			}
		},
		trace: applied.trace
	};
}
