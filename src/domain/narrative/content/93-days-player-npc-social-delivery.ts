import {NarrativeProject} from '../project';
import {create93DaysFirsthandSocialRepairProject} from './93-days-firsthand-social-repair';
import {rumorSocialEchoIds} from './93-days-rumor-social-echo';

/**
 * A63 explicitly opts the existing A61 report into Player-time NPC delivery.
 *
 * This does not alter A61/A62 authored truth. The A63 Player-time application
 * adapter recognizes this project identity; other artifacts keep their existing
 * declarative due-work semantics. No initial NPC Actual Presence is invented.
 */
export const playerNpcSocialDeliveryProjectId =
	'93-days-player-npc-social-delivery-v1';

export function create93DaysPlayerNpcSocialDeliveryProject(): NarrativeProject {
	const project = create93DaysFirsthandSocialRepairProject();
	project.projectId = playerNpcSocialDeliveryProjectId;
	project.name = '93 дня до конца нашего лета — встречи, слухи и последствия';

	project.storyNodes = project.storyNodes.map(node =>
		node.id === rumorSocialEchoIds.story.contactReportsToDormDuty
			? {
					...node,
					runtimePolicy: {
						occurrenceMode: 'one-shot' as const,
						durationMinutes: 0,
						missAfterMinutes: 0
					}
				}
			: node
	);

	const reportMoves = new Set<string>([
		rumorSocialEchoIds.moves.reportKept,
		rumorSocialEchoIds.moves.reportMissed,
		rumorSocialEchoIds.moves.reportDeclined
	]);
	project.narrativeMoves = project.narrativeMoves.map(move =>
		reportMoves.has(move.id)
			? {
					...move,
					guards: [
						...move.guards,
						{
							id: move.id + ':a63-report-available',
							condition: {
								type: 'story-node-state' as const,
								storyNodeId:
									rumorSocialEchoIds.story.contactReportsToDormDuty,
								state: 'available' as const
							}
						}
					]
				}
			: move
	);
	return project;
}
