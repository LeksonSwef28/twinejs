import {NarrativeProject} from '../../domain/narrative/project';
import {
	firstWeekIds,
	firstWeekProjectId
} from '../../domain/narrative/content/93-days-first-week';
import {effectiveStoryNodeActivationState} from '../../domain/narrative/runtime-story';
import {storyWorkWasConsumed} from '../../domain/narrative/runtime-execution';
import {SimulationScheduledWork} from '../../domain/narrative/simulation-kernel';
import {
	resolveAndApplyNarrativeProjectMove,
	setNarrativeCharacterActualLocation
} from './living-simulation';
import {NarrativePlayerTimeDueWorkHandlingResult} from './player-time';
import {consumeNarrativeStoryWork} from './story-execution';

const ids = firstWeekIds;
const cameraId = ids.characters.cameraStudent;

const arrivalWorkById: Record<string, string> = {
	[`story-node:${ids.story.dayFiveCameraArrival}`]: ids.locations.oldMarket,
	[`story-node:${ids.story.daySixCameraArrival}`]: ids.locations.oldCinema,
	[`story-node:${ids.story.daySevenCameraArrival}`]: ids.locations.oldMarket
};
const aftermathWorkId = `story-node:${ids.story.daySixCinemaAftermath}`;

export function firstWeekDueWorkIsEnabled(projectId: string) {
	return projectId === firstWeekProjectId;
}

function workCanRun(
	project: NarrativeProject,
	work: SimulationScheduledWork
) {
	const node = work.sourceEntityId
		? project.storyNodes.find(candidate => candidate.id === work.sourceEntityId)
		: undefined;
	if (
		!node ||
		node.placement?.day !== project.simulation.day ||
		node.placement.minuteOfDay !== project.simulation.minuteOfDay ||
		work.moment.day !== project.simulation.day ||
		work.moment.minuteOfDay !== project.simulation.minuteOfDay
	) {
		return undefined;
	}
	if (
		effectiveStoryNodeActivationState(
			node,
			project.storyNodeStateOverrides
		) !== 'available' ||
		storyWorkWasConsumed(project.runtimeOccurrences, work.id)
	) {
		return undefined;
	}
	return node;
}

/**
 * A67 first-week deterministic Player-time orchestration.
 *
 * Routine Rules remain Scheduled Presence only. These explicit authored Story
 * work items are the only W3 bridge that changes the camera student's Actual
 * Presence. The aftermath is likewise one authored NPC-only occurrence, not a
 * city-wide autonomous scheduler.
 */
export function deliverA67FirstWeekDueWork(
	project: NarrativeProject,
	dueWork: SimulationScheduledWork[]
): NarrativePlayerTimeDueWorkHandlingResult {
	if (!firstWeekDueWorkIsEnabled(project.projectId)) {
		return {project, handledWorkIds: []};
	}

	let current = project;
	const handledWorkIds: string[] = [];

	for (const work of dueWork) {
		const arrivalLocationId = arrivalWorkById[work.id];
		if (arrivalLocationId) {
			const node = workCanRun(current, work);
			if (!node || node.participantIds.length !== 1 || node.participantIds[0] !== cameraId) {
				continue;
			}
			const recorded = consumeNarrativeStoryWork(current, work.id, {
				decision: 'execute'
			});
			if (recorded.trace.status !== 'completed') {
				throw new Error(
					'A67 authored NPC arrival could not be recorded canonically.'
				);
			}
			current = setNarrativeCharacterActualLocation(
				recorded.project,
				cameraId,
				arrivalLocationId
			);
			handledWorkIds.push(work.id);
			continue;
		}

		if (work.id !== aftermathWorkId) {
			continue;
		}
		const node = workCanRun(current, work);
		if (!node || node.participantIds.length !== 1 || node.participantIds[0] !== cameraId) {
			continue;
		}
		if (
			current.simulation.actualLocationByCharacter[cameraId] !==
			ids.locations.oldCinema
		) {
			const missed = consumeNarrativeStoryWork(current, work.id, {
				decision: 'miss'
			});
			if (missed.trace.status !== 'missed') {
				throw new Error('A67 offscreen aftermath miss could not be recorded.');
			}
			current = missed.project;
			handledWorkIds.push(work.id);
			continue;
		}

		const aftermath = resolveAndApplyNarrativeProjectMove(
			current,
			ids.moves.cameraCinemaAftermath
		);
		if (aftermath.resolution.status !== 'resolved') {
			throw new Error(
				'A67 offscreen aftermath Move did not resolve at its authored due moment.'
			);
		}
		const recorded = consumeNarrativeStoryWork(
			aftermath.project,
			work.id,
			{decision: 'execute'}
		);
		if (recorded.trace.status !== 'completed') {
			throw new Error(
				'A67 offscreen aftermath could not record its Story occurrence.'
			);
		}
		current = recorded.project;
		handledWorkIds.push(work.id);
	}

	return {project: current, handledWorkIds};
}
