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
		contactReportsToDormDuty: 'a61-day3-contact-reports-to-dorm-duty',
		dormDutyAssessesReport: 'a61-day3-dorm-duty-assesses-report',
		warmEcho: 'a61-day3-dorm-duty-warm-echo',
		guardedEcho: 'a61-day3-dorm-duty-guarded-echo',
		neutralEcho: 'a61-day3-dorm-duty-neutral-echo',
		cautiousEcho: 'a61-day3-dorm-duty-cautious-echo'
	},
	reactionSets: {
		dormDutyAssessesReport: 'a61-reaction:dorm-duty-assesses-report'
	},
	moves: {
		reportKept: 'a61-report:kept',
		reportMissed: 'a61-report:missed',
		reportDeclined: 'a61-report:declined',
		believeKept: 'a61-assess:believe-kept',
		reserveKept: 'a61-assess:reserve-kept',
		believeMissed: 'a61-assess:believe-missed',
		reserveMissed: 'a61-assess:reserve-missed',
		believeDeclined: 'a61-assess:believe-declined',
		reserveDeclined: 'a61-assess:reserve-declined',
		warmEcho: 'a61-echo:warm',
		guardedEcho: 'a61-echo:guarded',
		neutralEcho: 'a61-echo:neutral',
		cautiousEcho: 'a61-echo:cautious'
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


function listenerKnowsGuard(id: string, claimId: string) {
	return {
		id,
		condition: {
			type: 'character-knows-claim' as const,
			characterId: dormDutyId,
			claimId
		}
	};
}

function assessmentMove(
	id: string,
	label: string,
	claimId: string,
	echoStoryNodeId: string,
	goodwillDelta: number,
	memorySummary: string
): NarrativeMoveDefinition {
	const outcomeId = `${id}:outcome`;
	return {
		id,
		storyNodeId: rumorSocialEchoIds.story.dormDutyAssessesReport,
		kind: 'observe',
		label,
		actorCharacterId: dormDutyId,
		targetCharacterIds: [playerId],
		guards: [listenerKnowsGuard(`${id}:knows-report`, claimId)],
		resolution: {type: 'automatic', outcomeId},
		outcomes: [
			{
				id: outcomeId,
				key: 'continue',
				label: memorySummary,
				effectStoryNodeIds: [echoStoryNodeId],
				effects: [
					...(goodwillDelta === 0
						? []
						: [
								{
									id: `${id}:goodwill`,
									type: 'relationship-adjust' as const,
									from: {type: 'move-actor' as const},
									to: {type: 'move-target' as const, targetIndex: 0},
									axis: 'goodwill',
									delta: goodwillDelta
								}
							]),
					{
						id: `${id}:memory`,
						type: 'character-remembers',
						character: {type: 'move-actor'},
						summary: memorySummary,
						importance: 0.45,
						baseStrength: 0.5,
						tags: ['day-three', 'rumor-assessment', claimId],
						source: {type: 'current-move'}
					},
					{
						id: `${id}:open-echo`,
						type: 'story-node-set-state',
						storyNodeId: echoStoryNodeId,
						state: 'available'
					},
					{
						id: `${id}:complete-assessment`,
						type: 'story-node-set-state',
						storyNodeId: rumorSocialEchoIds.story.dormDutyAssessesReport,
						state: 'completed'
					}
				]
			}
		]
	};
}

function assessmentMoves(): NarrativeMoveDefinition[] {
	return [
		assessmentMove(
			rumorSocialEchoIds.moves.believeKept,
			'Принять рассказ о выполненном обещании',
			rumorSocialEchoIds.claims.keptMeeting,
			rumorSocialEchoIds.story.warmEcho,
			0.12,
			'Дежурная доверилась знакомому и решила, что новенький, похоже, держит слово.'
		),
		assessmentMove(
			rumorSocialEchoIds.moves.reserveKept,
			'Не делать выводов по одному хорошему рассказу',
			rumorSocialEchoIds.claims.keptMeeting,
			rumorSocialEchoIds.story.cautiousEcho,
			0,
			'Дежурная запомнила хороший рассказ, но решила сначала посмотреть на новенького сама.'
		),
		assessmentMove(
			rumorSocialEchoIds.moves.believeMissed,
			'Принять рассказ о нарушенной договорённости',
			rumorSocialEchoIds.claims.missedMeeting,
			rumorSocialEchoIds.story.guardedEcho,
			-0.12,
			'Дежурная поверила, что новенький пообещал прийти и не появился.'
		),
		assessmentMove(
			rumorSocialEchoIds.moves.reserveMissed,
			'Не судить новенького по чужому недовольству',
			rumorSocialEchoIds.claims.missedMeeting,
			rumorSocialEchoIds.story.cautiousEcho,
			0,
			'Дежурная услышала неприятный рассказ, но не стала делать вывод без своей встречи.'
		),
		assessmentMove(
			rumorSocialEchoIds.moves.believeDeclined,
			'Отметить, что новенький предупредил заранее',
			rumorSocialEchoIds.claims.declinedMeeting,
			rumorSocialEchoIds.story.neutralEcho,
			0.02,
			'Дежурная решила, что заранее отказаться лучше, чем дать обещание и не прийти.'
		),
		assessmentMove(
			rumorSocialEchoIds.moves.reserveDeclined,
			'Оставить заранее отменённую встречу без оценки',
			rumorSocialEchoIds.claims.declinedMeeting,
			rumorSocialEchoIds.story.cautiousEcho,
			0,
			'Дежурная услышала про отменённую встречу и не стала считать это важным признаком.'
		)
	];
}

function playerEchoMove(
	id: string,
	storyNodeId: string,
	label: string,
	outcomeLabel: string,
	memorySummary: string
): NarrativeMoveDefinition {
	const outcomeId = `${id}:outcome`;
	return {
		id,
		storyNodeId,
		kind: 'observe',
		label,
		actorCharacterId: playerId,
		targetCharacterIds: [dormDutyId],
		guards: [
			{
				id: `${id}:same-place`,
				condition: {
					type: 'characters-share-location',
					characterIds: [playerId, dormDutyId]
				}
			}
		],
		resolution: {type: 'automatic', outcomeId},
		outcomes: [
			{
				id: outcomeId,
				key: 'continue',
				label: outcomeLabel,
				effectStoryNodeIds: [],
				effects: [
					{
						id: `${id}:memory`,
						type: 'character-remembers',
						character: {type: 'move-actor'},
						summary: memorySummary,
						importance: 0.4,
						baseStrength: 0.5,
						tags: ['day-three', 'rumor-echo'],
						source: {type: 'current-move'}
					},
					{
						id: `${id}:complete-echo`,
						type: 'story-node-set-state',
						storyNodeId,
						state: 'completed'
					}
				]
			}
		]
	};
}

function socialEchoMoves(): NarrativeMoveDefinition[] {
	return [
		playerEchoMove(
			rumorSocialEchoIds.moves.warmEcho,
			rumorSocialEchoIds.story.warmEcho,
			'Ответить на тёплое приветствие дежурной',
			'Дежурная уже слышала хороший отзыв и встречает новенького заметно теплее.',
			'У вахты дежурная встретила меня так, будто заранее слышала обо мне что-то хорошее.'
		),
		playerEchoMove(
			rumorSocialEchoIds.moves.guardedEcho,
			rumorSocialEchoIds.story.guardedEcho,
			'Ответить на сдержанное приветствие дежурной',
			'Дежурная отвечает корректно, но заметно осторожнее обычного.',
			'У вахты дежурная держалась сдержанно, словно уже слышала про пропущенную договорённость.'
		),
		playerEchoMove(
			rumorSocialEchoIds.moves.neutralEcho,
			rumorSocialEchoIds.story.neutralEcho,
			'Поздороваться с дежурной',
			'Дежурная воспринимает заранее отменённую встречу спокойно, без заметного упрёка.',
			'У вахты разговор остался ровным: заранее сказанный отказ не выглядел нарушенным обещанием.'
		),
		playerEchoMove(
			rumorSocialEchoIds.moves.cautiousEcho,
			rumorSocialEchoIds.story.cautiousEcho,
			'Ответить на осторожное приветствие дежурной',
			'Дежурная слышала чужой рассказ, но пока не делает из него окончательных выводов.',
			'Дежурная явно что-то слышала обо мне, но решила сначала составить своё мнение.'
		)
	];
}

function trustCandidate(
	id: string,
	moveId: string,
	claimId: string,
	baseScore: number,
	useSourceTrust: boolean
) {
	return {
		id,
		moveId,
		valence: 'neutral' as const,
		baseScore,
		guards: [listenerKnowsGuard(`${id}:knows`, claimId)],
		considerations: useSourceTrust
			? [
					{
						id: `${id}:source-trust`,
						type: 'relationship-at-least' as const,
						axis: 'trust',
						value: 0.5,
						weight: 3
					}
				]
			: []
	};
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
		},
		{
			id: rumorSocialEchoIds.story.dormDutyAssessesReport,
			kind: 'beat',
			title: 'Дежурная решает, насколько верить рассказу',
			description:
				'Источник известен, но доверие к источнику и субъективная уверенность в Claim остаются разными величинами.',
			primaryCharacterId: dormDutyId,
			participantIds: [dormDutyId],
			activationState: 'available'
		},
		...[
			[rumorSocialEchoIds.story.warmEcho, 'Тёплое первое узнавание'],
			[rumorSocialEchoIds.story.guardedEcho, 'Настороженное первое узнавание'],
			[rumorSocialEchoIds.story.neutralEcho, 'Спокойное первое узнавание'],
			[rumorSocialEchoIds.story.cautiousEcho, 'Осторожное первое узнавание']
		].map(([id, title]) => ({
			id,
			kind: 'dialogue' as const,
			title,
			primaryCharacterId: dormDutyId,
			participantIds: [playerId, dormDutyId],
			placement: {
				locationId: arrivalCorridorIds.locations.studentDormitory
			},
			activationState: 'dormant' as const
		}))
	];

	project.narrativeMoves = [
		...project.narrativeMoves,
		...reportMoves(),
		...assessmentMoves(),
		...socialEchoMoves()
	];

	project.reactionCandidateSets = [
		...project.reactionCandidateSets,
		{
			id: rumorSocialEchoIds.reactionSets.dormDutyAssessesReport,
			storyNodeId: rumorSocialEchoIds.story.dormDutyAssessesReport,
			reactingCharacterId: dormDutyId,
			counterpartCharacterId: contactId,
			candidates: [
				trustCandidate(
					'a61-candidate:believe-kept',
					rumorSocialEchoIds.moves.believeKept,
					rumorSocialEchoIds.claims.keptMeeting,
					1,
					true
				),
				trustCandidate(
					'a61-candidate:reserve-kept',
					rumorSocialEchoIds.moves.reserveKept,
					rumorSocialEchoIds.claims.keptMeeting,
					2,
					false
				),
				trustCandidate(
					'a61-candidate:believe-missed',
					rumorSocialEchoIds.moves.believeMissed,
					rumorSocialEchoIds.claims.missedMeeting,
					1,
					true
				),
				trustCandidate(
					'a61-candidate:reserve-missed',
					rumorSocialEchoIds.moves.reserveMissed,
					rumorSocialEchoIds.claims.missedMeeting,
					2,
					false
				),
				trustCandidate(
					'a61-candidate:believe-declined',
					rumorSocialEchoIds.moves.believeDeclined,
					rumorSocialEchoIds.claims.declinedMeeting,
					1,
					true
				),
				trustCandidate(
					'a61-candidate:reserve-declined',
					rumorSocialEchoIds.moves.reserveDeclined,
					rumorSocialEchoIds.claims.declinedMeeting,
					2,
					false
				)
			]
		}
	];


	return project;
}
