import {NarrativeProject} from '../project';
import {create93DaysFirsthandSocialRepairProject} from './93-days-firsthand-social-repair';
import {rumorSocialEchoIds} from './93-days-rumor-social-echo';
import {arrivalCorridorIds} from './93-days-arrival-corridor';
import {dayOneNarrativeIds} from './93-days-day-one-day-two';
import {phoneSocialLoopIds} from './93-days-phone-social-loop';

/**
 * A63 explicitly opts the existing A61 report into Player-time NPC delivery.
 *
 * This does not alter A61/A62 authored truth. The A63 Player-time application
 * adapter recognizes this project identity; other artifacts keep their existing
 * declarative due-work semantics. No initial NPC Actual Presence is invented.
 */
export const playerNpcSocialDeliveryProjectId =
	'93-days-player-npc-social-delivery-v1';

/** Explicit A63-only authored movement: courtyard at 08:00 -> dorm after 15 min. */
export const a63ContactArrivalStoryId = 'a63-day3-contact-walks-to-dorm';
export const a63ContactTravelLocationId = 'a63-path-from-courtyard-to-dorm';

export function create93DaysPlayerNpcSocialDeliveryProject(): NarrativeProject {
	const project = create93DaysFirsthandSocialRepairProject();
	project.projectId = playerNpcSocialDeliveryProjectId;
	project.name = '93 дня до конца нашего лета — встречи, слухи и последствия';
	project.locations = [
		...project.locations,
		{id: a63ContactTravelLocationId, name: 'Дорожка от двора к вахте'}
	];
	project.scenes = [
		...project.scenes,
		{
			id: 'a63-contact-path-scene',
			locationId: a63ContactTravelLocationId,
			name: 'Дорожка от двора к вахте'
		}
	];
	project.playerStart = {
		...project.playerStart!,
		initialActualPresenceByCharacter: {
			...project.playerStart?.initialActualPresenceByCharacter,
			[dayOneNarrativeIds.characters.localContact]:
				phoneSocialLoopIds.locations.dormCourtyard
		}
	};

	project.storyNodes = [
		...project.storyNodes.map(node =>
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
		),
		{
			id: a63ContactArrivalStoryId,
			kind: 'event',
			title: 'Знакомый идёт от двора к вахте',
			description: 'В 08:00 знакомый отправляется из двора общежития к вахте. Его путь занимает 15 минут; прибытие возможно только если он действительно вышел из двора.',
			primaryCharacterId: dayOneNarrativeIds.characters.localContact,
			participantIds: [dayOneNarrativeIds.characters.localContact],
			placement: {
				day: 3,
				minuteOfDay: 8 * 60,
				locationId: phoneSocialLoopIds.locations.dormCourtyard
			},
			activationState: 'available',
			runtimePolicy: {
				occurrenceMode: 'one-shot',
				durationMinutes: 15,
				missAfterMinutes: 0
			}
		}
	];

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
