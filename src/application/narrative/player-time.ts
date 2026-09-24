import {NarrativeProject} from '../../domain/narrative/project';
import {
	scheduledStoryWork,
	simulationKernelAbsoluteMinute,
	SimulationScheduledWork
} from '../../domain/narrative/simulation-kernel';
import {
	advanceNarrativeProjectSimulation,
	NarrativeProjectSimulationStepResult
} from './simulation';

export interface NarrativePlayerTimeSegmentTrace {
	from: {day: number; minuteOfDay: number};
	to: {day: number; minuteOfDay: number};
	appliedMinutes: number;
	dueWorkIds: string[];
}

export interface NarrativePlayerTimeDueWorkHandlingResult {
	project: NarrativeProject;
	handledWorkIds: string[];
}

export type NarrativePlayerTimeDueWorkHandler = (
	project: NarrativeProject,
	dueWork: SimulationScheduledWork[]
) => NarrativePlayerTimeDueWorkHandlingResult;

export interface NarrativePlayerTimeAdvanceResult {
	project: NarrativeProject;
	dueWork: SimulationScheduledWork[];
	segments: NarrativePlayerTimeSegmentTrace[];
	appliedMinutes: number;
	clampedAtProjectEnd: boolean;
	handledWorkIds: string[];
	/** Canonical kernel advances underlying the segments (for typed adapters). */
	stepResults: NarrativeProjectSimulationStepResult[];
}

function uniqueDueWork(work: SimulationScheduledWork[]) {
	const byId = new Map<string, SimulationScheduledWork>();
	for (const item of work) {
		byId.set(item.id, item);
	}
	return [...byId.values()].sort(
		(a, b) =>
			simulationKernelAbsoluteMinute(a.moment) -
				simulationKernelAbsoluteMinute(b.moment) ||
			a.id.localeCompare(b.id)
	);
}

function nextScheduledAbsoluteMinute(
	project: NarrativeProject,
	currentAbsoluteMinute: number,
	targetAbsoluteMinute: number
) {
	let next: number | undefined;
	for (const item of scheduledStoryWork(project.storyNodes)) {
		const absolute = simulationKernelAbsoluteMinute(item.moment);
		if (absolute <= currentAbsoluteMinute || absolute > targetAbsoluteMinute) {
			continue;
		}
		if (next === undefined || absolute < next) {
			next = absolute;
		}
	}
	return next;
}

/**
 * A63 exact-time Player clock segmentation.
 *
 * This function deliberately owns no Story/NPC execution. It only partitions a
 * requested canonical simulation advance at exact authored Story due moments,
 * preserving the existing simulation orchestrator as the sole owner of clock,
 * body, injury and active-Story progression.
 *
 * A later A63 layer may process eligible NPC work *between* returned segments.
 */
export function advanceNarrativePlayerTimeSegmented(
	project: NarrativeProject,
	deltaMinutes: number,
	dueWorkHandler?: NarrativePlayerTimeDueWorkHandler
): NarrativePlayerTimeAdvanceResult {
	if (!Number.isInteger(deltaMinutes) || deltaMinutes < 0) {
		throw new RangeError('deltaMinutes must be a non-negative integer.');
	}

	let currentProject = project;
	let remaining = deltaMinutes;
	let appliedMinutes = 0;
	let clampedAtProjectEnd = false;
	const dueWork: SimulationScheduledWork[] = [];
	const segments: NarrativePlayerTimeSegmentTrace[] = [];
	const handledWorkIds: string[] = [];
	const stepResults: NarrativeProjectSimulationStepResult[] = [];

	while (remaining > 0) {
		const currentAbsolute = simulationKernelAbsoluteMinute(
			currentProject.simulation
		);
		const requestedTarget = currentAbsolute + remaining;
		const nextDue = nextScheduledAbsoluteMinute(
			currentProject,
			currentAbsolute,
			requestedTarget
		);
		const requestedStepMinutes =
			nextDue === undefined ? remaining : nextDue - currentAbsolute;

		const advanced: NarrativeProjectSimulationStepResult =
			advanceNarrativeProjectSimulation(
				currentProject,
				requestedStepMinutes
			);
		stepResults.push(advanced);
		const applied = advanced.trace.appliedMinutes;
		dueWork.push(...advanced.dueWork);
		segments.push({
			from: advanced.trace.from,
			to: advanced.trace.to,
			appliedMinutes: applied,
			dueWorkIds: advanced.dueWork.map(item => item.id)
		});
		currentProject = advanced.project;
		if (dueWorkHandler && advanced.dueWork.length > 0) {
			const handled = dueWorkHandler(currentProject, advanced.dueWork);
			currentProject = handled.project;
			handledWorkIds.push(...handled.handledWorkIds);
		}
		appliedMinutes += applied;
		remaining -= applied;
		clampedAtProjectEnd ||= advanced.trace.clampedAtProjectEnd;

		if (applied < requestedStepMinutes || applied === 0) {
			break;
		}
	}

	return {
		project: currentProject,
		dueWork: uniqueDueWork(dueWork),
		segments,
		appliedMinutes,
		clampedAtProjectEnd,
		handledWorkIds,
		stepResults
	};
}

/**
 * Preserve the project-level simulation result contract for existing callers
 * (notably the travel executor) while delivering A63 work between exact steps.
 * Detailed body/injury/story traces remain the unmodified canonical step traces.
 */
export function advanceNarrativePlayerTimeAsSimulation(
	project: NarrativeProject,
	deltaMinutes: number,
	dueWorkHandler: NarrativePlayerTimeDueWorkHandler
): NarrativeProjectSimulationStepResult {
	const advanced = advanceNarrativePlayerTimeSegmented(
		project,
		deltaMinutes,
		dueWorkHandler
	);
	return {
		project: advanced.project,
		dueWork: advanced.dueWork,
		trace: {
			from: {
				day: project.simulation.day,
				minuteOfDay: project.simulation.minuteOfDay
			},
			to: {
				day: advanced.project.simulation.day,
				minuteOfDay: advanced.project.simulation.minuteOfDay
			},
			requestedMinutes: deltaMinutes,
			appliedMinutes: advanced.appliedMinutes,
			clampedAtProjectEnd: advanced.clampedAtProjectEnd,
			dueWorkIds: advanced.dueWork.map(work => work.id),
			actualPresenceChanged: false
		},
		bodyTraces: advanced.stepResults.flatMap(step => step.bodyTraces),
		injuryTraces: advanced.stepResults.flatMap(step => step.injuryTraces),
		storyExecutionTraces: advanced.stepResults.flatMap(
			step => step.storyExecutionTraces
		)
	};
}

