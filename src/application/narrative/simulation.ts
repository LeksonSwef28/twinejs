import {
	advanceBodyStateMap,
	applyBodyStateEffect,
	BodyAdvanceTrace,
	BodyEffectTrace,
	BodyStateEffect,
	createCharacterBodyState
} from '../../domain/narrative/body';
import {
	advanceInjuryStateMap,
	applyInjuryEffect,
	InjuryAdvanceTrace,
	InjuryEffect,
	InjuryEffectTrace
} from '../../domain/narrative/injury';
import {NarrativeProject} from '../../domain/narrative/project';
import {
	advanceActiveStoryExecutions,
	StoryExecutionCompletionTrace
} from '../../domain/narrative/runtime-execution';
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
	injuryTraces: InjuryAdvanceTrace[];
	/** A42 only completes work that was explicitly started before the clock step. */
	storyExecutionTraces: StoryExecutionCompletionTrace[];
}

export interface NarrativeProjectBodyEffectResult {
	project: NarrativeProject;
	trace: BodyEffectTrace;
}

export interface NarrativeProjectInjuryEffectResult {
	project: NarrativeProject;
	trace: InjuryEffectTrace;
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

function injuryRuntimeForCharacters(project: NarrativeProject) {
	const result = Object.fromEntries(
		Object.entries(project.injuriesByCharacter).map(([characterId, injuries]) => [
			characterId,
			[...injuries]
		])
	);
	for (const character of [...project.characters].sort((a, b) =>
		a.id.localeCompare(b.id)
	)) {
		result[character.id] ??= [];
	}
	return result;
}

/**
 * Project-level A37-A42 orchestrator. Exact authored Story placements become
 * declarative due-work. The clock never starts Story work; A42 only completes
 * executions that were explicitly started beforehand. Needs and injuries use
 * the same applied Simulation Playhead minutes.
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
	const sleepMinutesByCharacter = Object.fromEntries(
		bodyAdvance.traces.map(trace => [trace.characterId, trace.sleptMinutes])
	);
	const injuryAdvance = advanceInjuryStateMap(
		injuryRuntimeForCharacters(project),
		step.trace.appliedMinutes,
		sleepMinutesByCharacter
	);
	const storyExecutionAdvance = advanceActiveStoryExecutions(
		project.activeStoryExecutions,
		project.runtimeOccurrences,
		project.storyNodeStateOverrides,
		step.trace.to
	);

	return {
		project: {
			...project,
			injuriesByCharacter: injuryAdvance.states,
			activeStoryExecutions: storyExecutionAdvance.activeExecutions,
			runtimeOccurrences: storyExecutionAdvance.runtimeOccurrences,
			storyNodeStateOverrides: storyExecutionAdvance.storyNodeStateOverrides,
			simulation: {
				...step.state,
				bodyByCharacter: bodyAdvance.states
			}
		},
		dueWork: step.dueWork,
		trace: step.trace,
		bodyTraces: bodyAdvance.traces,
		injuryTraces: injuryAdvance.traces,
		storyExecutionTraces: storyExecutionAdvance.completionTraces
	};
}

/**
 * Applies one explicit needs effect without advancing time. Effects never
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

export function applyNarrativeProjectInjuryEffect(
	project: NarrativeProject,
	effect: InjuryEffect
): NarrativeProjectInjuryEffectResult {
	const characterId = effect.type === 'add' ? effect.injury.characterId : effect.characterId;
	if (!project.characters.some(character => character.id === characterId)) {
		throw new Error(`Unknown injury-effect character: ${characterId}`);
	}
	const injuriesByCharacter = injuryRuntimeForCharacters(project);
	const applied = applyInjuryEffect(injuriesByCharacter[characterId] ?? [], effect);
	return {
		project: {
			...project,
			injuriesByCharacter: {
				...injuriesByCharacter,
				[characterId]: applied.injuries
			}
		},
		trace: applied.trace
	};
}
