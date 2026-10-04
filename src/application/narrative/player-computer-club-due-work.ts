import {
	computerClubCycleIds,
	computerClubCycleProjectId
} from '../../domain/narrative/content/93-days-computer-club-cycle';
import {NarrativeProject} from '../../domain/narrative/project';
import {storyWorkWasConsumed} from '../../domain/narrative/runtime-execution';
import {effectiveStoryNodeActivationState} from '../../domain/narrative/runtime-story';
import {SimulationScheduledWork} from '../../domain/narrative/simulation-kernel';
import {setNarrativeCharacterActualLocation} from './living-simulation';
import {NarrativePlayerTimeDueWorkHandlingResult} from './player-time';
import {consumeNarrativeStoryWork} from './story-execution';

const ids = computerClubCycleIds;
const arrivalCharacterAndLocationByWorkId: Record<
	string,
	{characterId: string; locationId: string}
> = {
	[`story-node:${ids.story.workerArrival}`]: {
		characterId: ids.characters.clubWorker,
		locationId: ids.locations.computerClub
	},
	[`story-node:${ids.story.regularArrival}`]: {
		characterId: ids.characters.clubRegular,
		locationId: ids.locations.computerClub
	}
};

export function computerClubDueWorkIsEnabled(projectId: string) {
	return projectId === computerClubCycleProjectId;
}

function workCanRun(
	project: NarrativeProject,
	work: SimulationScheduledWork,
	characterId: string
) {
	const node = work.sourceEntityId
		? project.storyNodes.find(candidate => candidate.id === work.sourceEntityId)
		: undefined;
	if (
		!node ||
		node.participantIds.length !== 1 ||
		node.participantIds[0] !== characterId ||
		node.placement?.day !== project.simulation.day ||
		node.placement.minuteOfDay !== project.simulation.minuteOfDay ||
		work.moment.day !== project.simulation.day ||
		work.moment.minuteOfDay !== project.simulation.minuteOfDay ||
		effectiveStoryNodeActivationState(
			node,
			project.storyNodeStateOverrides
		) !== 'available' ||
		storyWorkWasConsumed(project.runtimeOccurrences, work.id)
	) {
		return false;
	}
	return true;
}

/**
 * A68-C1 deterministic authored arrivals only.
 *
 * Routine Rules remain Scheduled Presence. These two exact NPC-only Story work
 * items are the explicit bridge into Actual Presence for the first club entry.
 * This is deliberately not a generic NPC scheduler.
 */
export function deliverA68ComputerClubDueWork(
	project: NarrativeProject,
	dueWork: SimulationScheduledWork[]
): NarrativePlayerTimeDueWorkHandlingResult {
	if (!computerClubDueWorkIsEnabled(project.projectId)) {
		return {project, handledWorkIds: []};
	}

	let current = project;
	const handledWorkIds: string[] = [];

	for (const work of dueWork) {
		const arrival = arrivalCharacterAndLocationByWorkId[work.id];
		if (!arrival || !workCanRun(current, work, arrival.characterId)) {
			continue;
		}
		const recorded = consumeNarrativeStoryWork(current, work.id, {
			decision: 'execute'
		});
		if (recorded.trace.status !== 'completed') {
			throw new Error(
				'A68 authored Computer Club arrival could not be recorded canonically.'
			);
		}
		current = setNarrativeCharacterActualLocation(
			recorded.project,
			arrival.characterId,
			arrival.locationId
		);
		handledWorkIds.push(work.id);
	}

	return {project: current, handledWorkIds};
}
