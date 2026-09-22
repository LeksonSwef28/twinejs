import {NarrativeProject} from '../../domain/narrative/project';
import {
	createNarrativeReactionDecisionOpportunity,
	executeNarrativeNpcDecision
} from './npc-decision';
import {
	resolveAndApplyNarrativeProjectMove,
	resolveNarrativeProjectMove
} from './living-simulation';
import {
	effectiveStoryNodeActivationState
} from '../../domain/narrative/runtime-story';
import {storyWorkWasConsumed} from '../../domain/narrative/runtime-execution';
import {SimulationScheduledWork} from '../../domain/narrative/simulation-kernel';
import {consumeNarrativeStoryWork} from './story-execution';
import {arrivalCorridorIds} from '../../domain/narrative/content/93-days-arrival-corridor';
import {dayOneNarrativeIds} from '../../domain/narrative/content/93-days-day-one-day-two';
import {
	playerNpcSocialDeliveryProjectId
} from '../../domain/narrative/content/93-days-player-npc-social-delivery';
import {
	rumorSocialEchoIds
} from '../../domain/narrative/content/93-days-rumor-social-echo';
import {NarrativePlayerTimeDueWorkHandlingResult} from './player-time';

const reportStoryId = rumorSocialEchoIds.story.contactReportsToDormDuty;
const reportWorkId = 'story-node:' + reportStoryId;
const reportMoves: string[] = [
	rumorSocialEchoIds.moves.reportKept,
	rumorSocialEchoIds.moves.reportMissed,
	rumorSocialEchoIds.moves.reportDeclined
];

/**
 * A63 explicitly opts in one authored NPC-only report work item. All other
 * Project identities and due work remain declarative. In particular, merely
 * crossing an A61 due moment does not teleport or auto-reason about NPCs.
 */
export function deliverA63NpcSocialDueWork(
	project: NarrativeProject,
	dueWork: SimulationScheduledWork[]
): NarrativePlayerTimeDueWorkHandlingResult {
	if (project.projectId !== playerNpcSocialDeliveryProjectId) {
		return {project, handledWorkIds: []};
	}
	let current = project;
	const handledWorkIds: string[] = [];

	for (const work of dueWork) {
		if (work.id !== reportWorkId) {
			continue;
		}
		const node = current.storyNodes.find(item => item.id === reportStoryId);
		if (!node || node.participantIds.includes(arrivalCorridorIds.characters.player)) {
			throw new Error('A63 NPC report must be an authored NPC-only Story node.');
		}
		if (
			node.placement?.day !== current.simulation.day ||
			node.placement.minuteOfDay !== current.simulation.minuteOfDay ||
			work.moment.day !== current.simulation.day ||
			work.moment.minuteOfDay !== current.simulation.minuteOfDay
		) {
			throw new Error('A63 report must resolve at its exact authored due moment.');
		}
		if (
			effectiveStoryNodeActivationState(node, current.storyNodeStateOverrides) !==
				'available' ||
			storyWorkWasConsumed(current.runtimeOccurrences, reportWorkId)
		) {
			continue;
		}

		const contactPlace =
			current.simulation.actualLocationByCharacter[
				dayOneNarrativeIds.characters.localContact
			];
		const listenerPlace =
			current.simulation.actualLocationByCharacter[
				arrivalCorridorIds.characters.dormDuty
			];
		const everyoneAtAuthoredLocation =
			Boolean(node.placement.locationId) &&
			contactPlace === node.placement.locationId &&
			listenerPlace === node.placement.locationId;
		const choices = everyoneAtAuthoredLocation
			? reportMoves.filter(
					moveId => resolveNarrativeProjectMove(current, moveId).status === 'resolved'
			  )
			: [];

		if (choices.length > 1) {
			throw new Error('A63 report must select exactly one history-consistent Move.');
		}
		if (choices.length === 0) {
			const missed = consumeNarrativeStoryWork(current, reportWorkId, {
				decision: 'miss'
			});
			if (missed.trace.status !== 'missed') {
				throw new Error('A63 could not record the unavailable NPC encounter.');
			}
			current = missed.project;
			handledWorkIds.push(work.id);
			continue;
		}

		const reported = resolveAndApplyNarrativeProjectMove(current, choices[0]);
		if (reported.resolution.status !== 'resolved') {
			throw new Error('A63 selected report stopped resolving between preflight and execution.');
		}
		const recorded = consumeNarrativeStoryWork(reported.project, reportWorkId, {
			decision: 'execute'
		});
		if (recorded.trace.status !== 'completed') {
			throw new Error('A63 executed report could not record its one-shot Story work.');
		}
		current = recorded.project;
		handledWorkIds.push(work.id);

		const assessmentStory = current.storyNodes.find(
			item => item.id === rumorSocialEchoIds.story.dormDutyAssessesReport
		);
		if (
			assessmentStory &&
			effectiveStoryNodeActivationState(
				assessmentStory,
				current.storyNodeStateOverrides
			) === 'available'
		) {
			const opportunity = createNarrativeReactionDecisionOpportunity(
				current,
				rumorSocialEchoIds.reactionSets.dormDutyAssessesReport,
				'a63-opportunity:dorm-duty-assesses-report',
				0
			);
			const assessed = executeNarrativeNpcDecision(current, [opportunity]);
			if (assessed.trace.status !== 'executed') {
				throw new Error(
					'A63 newly delivered report did not yield an unambiguous NPC assessment.'
				);
			}
			current = assessed.project;
		}
	}

	return {project: current, handledWorkIds};
}
