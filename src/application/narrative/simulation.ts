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
}

/**
 * Project-level A37 orchestrator. It feeds exact authored Story placements into
 * the pure clock kernel, but only writes the returned runtime simulation state.
 * Authoring/editor data and authored `updatedAt` remain untouched by time flow.
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

	return {
		project: {...project, simulation: step.state},
		dueWork: step.dueWork,
		trace: step.trace
	};
}
