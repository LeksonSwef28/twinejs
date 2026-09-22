import {NarrativeMoveDefinition} from '../interaction';
import {NarrativeProject} from '../project';
import {arrivalCorridorIds} from './93-days-arrival-corridor';
import {dayOneNarrativeIds} from './93-days-day-one-day-two';
import {
	create93DaysPhoneSocialLoopProject,
	phoneSocialLoopIds
} from './93-days-phone-social-loop';

export const rumorSocialEchoIds = {
	claims: {
		keptMeeting: 'a61-claim-player-kept-meeting',
		missedMeeting: 'a61-claim-player-missed-meeting',
		declinedMeeting: 'a61-claim-player-declined-meeting'
	},
	story: {
		contactReportsToDormDuty: 'a61-day3-contact-reports-to-dorm-duty'
	},
	moves: {
		reportKept: 'a61-report:kept',
		reportMissed: 'a61-report:missed',
		reportDeclined: 'a61-report:declined'
	}
} as const;

const playerId = arrivalCorridorIds.characters.player;
const contactId = dayOneNarrativeIds.characters.localContact;
const dormDutyId = arrivalCorridorIds.characters.dormDuty;

function storyStateGuard(
	id: string,
	storyNodeId: string,
	state: 'available' | 'active' | 'blocked' | 'completed'
) {
	return {
		id,
		condition: {
			type: 'story-node-state' as const,
			storyNodeId,
			state
		}
	};
}

function playerKnowsGuard(id: string, claimId: string) {
	return {
		id,
		condition: {
			type: 'character-knows-claim' as const,
			characterId: playerId,
			claimId
		}
	};
}

function samePlaceGuard(id: string) {
	return {
		id,
		label: 'Источник и слушатель разговаривают рядом',
		condition: {
			type: 'characters-share-location' as const,
			characterIds: [contactId, dormDutyId]
		}
	};
}

function reportMove(
	id: string,
	label: string,
	claimId: string,
	confidence: number,
	guards: NarrativeMoveDefinition['guards'],
	memorySummary: string
): NarrativeMoveDefinition {
	const outcomeId = `${id}:outcome`;
	return {
		id,
		storyNodeId: rumorSocialEchoIds.story.contactReportsToDormDuty,
		kind: 'inform',
		label,
		actorCharacterId: contactId,
		targetCharacterIds: [dormDutyId],
		communicatedClaimId: claimId,
		communicationIntent: 'honest',
		guards: [samePlaceGuard(`${id}:same-place`), ...guards],
		resolution: {type: 'automatic', outcomeId},
		outcomes: [
			{
				id: outcomeId,
				key: 'continue',
				label: 'Дежурная запоминает рассказ как услышанное от конкретного человека',
				effectStoryNodeIds: [],
				effects: [
					{
						id: `${id}:learn`,
						type: 'character-learns-claim',
						recipient: {type: 'move-target', targetIndex: 0},
						claim: {type: 'communicated-claim'},
						attitude: 'believes',
						confidence,
						source: {type: 'move-actor'}
					},
					{
						id: `${id}:memory`,
						type: 'character-remembers',
						character: {type: 'move-target', targetIndex: 0},
						summary: memorySummary,
						importance: 0.5,
						baseStrength: 0.55,
						tags: ['day-three', 'rumor', 'dorm', 'new-arrival'],
						source: {type: 'communicated-claim'}
					},
					{
						id: `${id}:complete-report`,
						type: 'story-node-set-state',
						storyNodeId: rumorSocialEchoIds.story.contactReportsToDormDuty,
						state: 'completed'
					}
				]
			}
		]
	};
}

function reportMoves(): NarrativeMoveDefinition[] {
	return [
		reportMove(
			rumorSocialEchoIds.moves.reportKept,
			'Рассказать, что новенький действительно пришёл вечером',
			rumorSocialEchoIds.claims.keptMeeting,
			0.9,
			[
				playerKnowsGuard(
					'a61-report-kept:accepted',
					phoneSocialLoopIds.claims.meetingAccepted
				),
				storyStateGuard(
					'a61-report-kept:meeting',
					phoneSocialLoopIds.story.meeting,
					'completed'
				)
			],
			'Знакомый новенького сказал у вахты, что тот пришёл на вечернюю встречу, как и обещал.'
		),
		reportMove(
			rumorSocialEchoIds.moves.reportMissed,
			'Рассказать, что новенький согласился, но так и не пришёл',
			rumorSocialEchoIds.claims.missedMeeting,
			0.82,
			[
				playerKnowsGuard(
					'a61-report-missed:accepted',
					phoneSocialLoopIds.claims.meetingAccepted
				),
				storyStateGuard(
					'a61-report-missed:meeting',
					phoneSocialLoopIds.story.meeting,
					'blocked'
				)
			],
			'Знакомый новенького сказал у вахты, что тот обещал прийти вечером, но встреча не состоялась.'
		),
		reportMove(
			rumorSocialEchoIds.moves.reportDeclined,
			'Рассказать, что новенький заранее отказался от встречи',
			rumorSocialEchoIds.claims.declinedMeeting,
			0.88,
			[
				playerKnowsGuard(
					'a61-report-declined:declined',
					phoneSocialLoopIds.claims.meetingDeclined
				),
				storyStateGuard(
					'a61-report-declined:meeting',
					phoneSocialLoopIds.story.meeting,
					'blocked'
				)
			],
			'Знакомый новенького упомянул у вахты, что тот заранее предупредил, что вечером не придёт.'
		)
	];
}

export function create93DaysRumorSocialEchoProject(): NarrativeProject {
	const project = create93DaysPhoneSocialLoopProject();
	project.projectId = '93-days-rumor-social-echo-v1';
	project.name = '93 дня до конца нашего лета — слух и социальное эхо';

	project.claims = [
		...project.claims,
		{
			id: rumorSocialEchoIds.claims.keptMeeting,
			text: 'Новенький пришёл на вечернюю встречу, как обещал.',
			stance: 'supports',
			tags: ['rumor', 'reliability', 'day-three']
		},
		{
			id: rumorSocialEchoIds.claims.missedMeeting,
			text: 'Новенький согласился встретиться вечером, но не появился.',
			stance: 'supports',
			tags: ['rumor', 'broken-promise', 'day-three']
		},
		{
			id: rumorSocialEchoIds.claims.declinedMeeting,
			text: 'Новенький заранее сказал, что вечером не придёт.',
			stance: 'supports',
			tags: ['rumor', 'declined', 'day-three']
		}
	];

	project.storyNodes = [
		...project.storyNodes,
		{
			id: rumorSocialEchoIds.story.contactReportsToDormDuty,
			kind: 'event',
			title: 'Короткий разговор у вахты о новеньком',
			description:
				'На третье утро знакомый героя пересекается с дежурной и коротко рассказывает, чем закончилась вчерашняя договорённость.',
			primaryCharacterId: contactId,
			participantIds: [contactId, dormDutyId],
			placement: {
				day: 3,
				minuteOfDay: 8 * 60 + 15,
				locationId: arrivalCorridorIds.locations.studentDormitory
			},
			activationState: 'available'
		}
	];

	project.narrativeMoves = [...project.narrativeMoves, ...reportMoves()];

	const existingTrust = project.relationships.find(
		relationship =>
			relationship.fromCharacterId === dormDutyId &&
			relationship.toCharacterId === contactId
	);
	project.relationships = existingTrust
		? project.relationships.map(relationship =>
				relationship === existingTrust
					? {
							...relationship,
							values: {...relationship.values, trust: 0.65}
						}
					: relationship
			)
		: [
				...project.relationships,
				{
					fromCharacterId: dormDutyId,
					toCharacterId: contactId,
					values: {trust: 0.65}
				}
			];

	return project;
}
