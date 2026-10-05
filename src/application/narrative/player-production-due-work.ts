import {NarrativeProject} from '../../domain/narrative/project';
import {SimulationScheduledWork} from '../../domain/narrative/simulation-kernel';
import {
	deliverA63NpcSocialDueWork,
	playerNpcSocialDeliveryIsEnabled
} from './player-npc-social-delivery';
import {
	deliverA67FirstWeekDueWork,
	firstWeekDueWorkIsEnabled
} from './player-first-week-due-work';
import {
	computerClubDueWorkIsEnabled,
	deliverA68ComputerClubDueWork
} from './player-computer-club-due-work';
import {NarrativePlayerTimeDueWorkHandlingResult} from './player-time';

export function narrativeProductionDueWorkIsEnabled(projectId: string) {
	return (
		playerNpcSocialDeliveryIsEnabled(projectId) ||
		firstWeekDueWorkIsEnabled(projectId) ||
		computerClubDueWorkIsEnabled(projectId)
	);
}

/**
 * One Player-time orchestration boundary for production-specific authored work.
 * Each milestone handler remains independently opt-in and owns only its exact
 * Story work ids.
 */
export function deliverNarrativeProductionDueWork(
	project: NarrativeProject,
	dueWork: SimulationScheduledWork[]
): NarrativePlayerTimeDueWorkHandlingResult {
	const a63 = deliverA63NpcSocialDueWork(project, dueWork);
	const a67 = deliverA67FirstWeekDueWork(a63.project, dueWork);
	const a68 = deliverA68ComputerClubDueWork(a67.project, dueWork);
	return {
		project: a68.project,
		handledWorkIds: [
			...new Set([
				...a63.handledWorkIds,
				...a67.handledWorkIds,
				...a68.handledWorkIds
			])
		]
	};
}
