import {minutesPerDay} from './calendar';
import {EntityId} from './entities';
import {NarrativeSimulationState} from './project';
import {StoryNodeDefinition} from './story';

export interface SimulationMoment {
	day: number;
	minuteOfDay: number;
}

/**
 * Declarative work that becomes due when the Simulation Playhead crosses its
 * moment. The kernel never executes the work: orchestration/runtime systems own
 * that decision so clock progression cannot secretly become NPC behavior.
 */
export interface SimulationScheduledWork {
	id: EntityId;
	moment: SimulationMoment;
	kind: string;
	sourceEntityId?: EntityId;
}

export interface SimulationStepTrace {
	from: SimulationMoment;
	to: SimulationMoment;
	requestedMinutes: number;
	appliedMinutes: number;
	clampedAtProjectEnd: boolean;
	dueWorkIds: EntityId[];
	/** Scheduled work is observational here; actual presence is not projected from it. */
	actualPresenceChanged: false;
}

export interface SimulationStepResult {
	state: NarrativeSimulationState;
	dueWork: SimulationScheduledWork[];
	trace: SimulationStepTrace;
}

function momentIsValid(moment: SimulationMoment) {
	return (
		Number.isInteger(moment.day) &&
		moment.day >= 1 &&
		Number.isInteger(moment.minuteOfDay) &&
		moment.minuteOfDay >= 0 &&
		moment.minuteOfDay < minutesPerDay
	);
}

export function simulationKernelAbsoluteMinute(moment: SimulationMoment) {
	if (!momentIsValid(moment)) {
		throw new RangeError('Simulation moment must use day >= 1 and minute 0..1439.');
	}
	return (moment.day - 1) * minutesPerDay + moment.minuteOfDay;
}

export function simulationKernelMomentFromAbsoluteMinute(
	absoluteMinute: number
): SimulationMoment {
	if (!Number.isInteger(absoluteMinute) || absoluteMinute < 0) {
		throw new RangeError('absoluteMinute must be a non-negative integer.');
	}
	return {
		day: Math.floor(absoluteMinute / minutesPerDay) + 1,
		minuteOfDay: absoluteMinute % minutesPerDay
	};
}

/**
 * Converts exact authored Story placements into declarative scheduled work.
 * Location/participants stay authored metadata; this helper never writes
 * actualLocationByCharacter or activates a Story node.
 */
export function scheduledStoryWork(
	storyNodes: StoryNodeDefinition[]
): SimulationScheduledWork[] {
	return storyNodes.flatMap(node => {
		const placement = node.placement;
		if (
			placement?.day === undefined ||
			placement.minuteOfDay === undefined ||
			!momentIsValid({day: placement.day, minuteOfDay: placement.minuteOfDay})
		) {
			return [];
		}
		return [
			{
				id: `story-node:${node.id}`,
				moment: {day: placement.day, minuteOfDay: placement.minuteOfDay},
				kind: 'story-node',
				sourceEntityId: node.id
			}
		];
	});
}

function dueWorkForInterval(
	work: SimulationScheduledWork[],
	fromAbsoluteMinute: number,
	toAbsoluteMinute: number,
	maximumAbsoluteMinute: number
) {
	return work
		.flatMap(item => {
			if (!momentIsValid(item.moment)) {
				return [];
			}
			const absoluteMinute = simulationKernelAbsoluteMinute(item.moment);
			return absoluteMinute > fromAbsoluteMinute &&
				absoluteMinute <= toAbsoluteMinute &&
				absoluteMinute <= maximumAbsoluteMinute
				? [{item, absoluteMinute}]
				: [];
		})
		.sort(
			(a, b) =>
				a.absoluteMinute - b.absoluteMinute || a.item.id.localeCompare(b.item.id)
		)
		.map(result => result.item);
}

/**
 * A37 deterministic Simulation Playhead step.
 *
 * This function advances only canonical simulation time. Scheduled work is
 * returned in stable order but is not executed. In particular, authored
 * schedules never overwrite actual presence here and no Reaction/NPC choice is
 * selected by the clock.
 */
export function stepNarrativeSimulation(
	state: NarrativeSimulationState,
	deltaMinutes: number,
	dayCount: number,
	scheduledWork: SimulationScheduledWork[] = []
): SimulationStepResult {
	if (!Number.isInteger(deltaMinutes) || deltaMinutes < 0) {
		throw new RangeError('deltaMinutes must be a non-negative integer.');
	}
	if (!Number.isInteger(dayCount) || dayCount < 1) {
		throw new RangeError('dayCount must be a positive integer.');
	}

	const from = {day: state.day, minuteOfDay: state.minuteOfDay};
	const fromAbsoluteMinute = simulationKernelAbsoluteMinute(from);
	const maximumAbsoluteMinute = dayCount * minutesPerDay - 1;
	if (fromAbsoluteMinute > maximumAbsoluteMinute) {
		throw new RangeError('Simulation Playhead is outside the project day range.');
	}

	const requestedAbsoluteMinute = fromAbsoluteMinute + deltaMinutes;
	const toAbsoluteMinute = Math.min(maximumAbsoluteMinute, requestedAbsoluteMinute);
	const to = simulationKernelMomentFromAbsoluteMinute(toAbsoluteMinute);
	const dueWork = dueWorkForInterval(
		scheduledWork,
		fromAbsoluteMinute,
		toAbsoluteMinute,
		maximumAbsoluteMinute
	);

	return {
		state: {...state, day: to.day, minuteOfDay: to.minuteOfDay},
		dueWork,
		trace: {
			from,
			to,
			requestedMinutes: deltaMinutes,
			appliedMinutes: toAbsoluteMinute - fromAbsoluteMinute,
			clampedAtProjectEnd: requestedAbsoluteMinute > maximumAbsoluteMinute,
			dueWorkIds: dueWork.map(item => item.id),
			actualPresenceChanged: false
		}
	};
}

export function tickNarrativeSimulation(
	state: NarrativeSimulationState,
	dayCount: number,
	scheduledWork: SimulationScheduledWork[] = []
) {
	return stepNarrativeSimulation(state, 1, dayCount, scheduledWork);
}
