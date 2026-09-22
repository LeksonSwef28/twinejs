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

export interface NarrativePlayerTimeAdvanceResult {
	project: NarrativeProject;
	dueWork: SimulationScheduledWork[];
	segments: NarrativePlayerTimeSegmentTrace[];
	appliedMinutes: number;
	clampedAtProjectEnd: boolean;
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
	deltaMinutes: number
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
		const applied = advanced.trace.appliedMinutes;
		dueWork.push(...advanced.dueWork);
		segments.push({
			from: advanced.trace.from,
			to: advanced.trace.to,
			appliedMinutes: applied,
			dueWorkIds: advanced.dueWork.map(item => item.id)
		});
		currentProject = advanced.project;
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
		clampedAtProjectEnd
	};
}
