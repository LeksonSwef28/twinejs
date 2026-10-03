import {NarrativeMoveDefinition} from '../interaction';
import {NarrativeProject} from '../project';
import {arrivalCorridorIds} from './93-days-arrival-corridor';
import {
	phoneSocialLoopIds
} from './93-days-phone-social-loop';
import {
	create93DaysRumorSocialEchoProject,
	rumorSocialEchoIds
} from './93-days-rumor-social-echo';

/**
 * A62 builds on the A61 social echo: an NPC's secondhand impression does not
 * become the last word unless the player chooses to let it.
 *
 * Each firsthand report is a separate canonical Claim with the Player as its
 * runtime source. Neither the original teller Claim nor its provenance changes.
 */
export const firsthandSocialRepairIds = {
	claims: {
		kept: 'a62-claim-firsthand-kept-meeting',
		missed: 'a62-claim-firsthand-missed-meeting',
		declined: 'a62-claim-firsthand-declined-meeting'
	},
	story: {
		answer: 'a62-day3-answer-the-rumor',
		dayFourAnswered: 'a62-day4-firsthand-followup',
		dayFourSilent: 'a62-day4-unanswered-followup'
	},
	moves: {
		explainKeptWarm: 'a62-explain:kept-warm',
		explainKeptCautious: 'a62-explain:kept-cautious',
		explainMissedGuarded: 'a62-explain:missed-guarded',
		explainMissedCautious: 'a62-explain:missed-cautious',
		explainDeclinedNeutral: 'a62-explain:declined-neutral',
		explainDeclinedCautious: 'a62-explain:declined-cautious',
		walkAway: 'a62-answer:walk-away',
		dayFourAnswered: 'a62-day4:answered',
		dayFourSilent: 'a62-day4:silent'
	}
} as const;

type DayTwoHistory = 'kept' | 'missed' | 'declined';

const playerId = arrivalCorridorIds.characters.player;
const listenerId = arrivalCorridorIds.characters.dormDuty;
const dormLocation = arrivalCorridorIds.locations.studentDormitory;

function storyStateGuard(id: string, storyNodeId: string, state: 'available' | 'completed' | 'blocked') {
	return {
		id,
		condition: {
			type: 'story-node-state' as const,
			storyNodeId,
			state
		}
	};
}

function samePlaceGuard(id: string) {
	return {
		id,
		condition: {
			type: 'characters-share-location' as const,
			characterIds: [playerId, listenerId]
		}
	};
}

function historyGuards(id: string, history: DayTwoHistory): NarrativeMoveDefinition['guards'] {
	if (history === 'declined') {
		return [
			{
				id: id + ':declined-claim',
				condition: {
					type: 'character-knows-claim',
					characterId: playerId,
					claimId: phoneSocialLoopIds.claims.meetingDeclined
				}
			},
			storyStateGuard(id + ':meeting-blocked', phoneSocialLoopIds.story.meeting, 'blocked')
		];
	}
	return [
		{
			id: id + ':accepted-claim',
			condition: {
				type: 'character-knows-claim',
				characterId: playerId,
				claimId: phoneSocialLoopIds.claims.meetingAccepted
			}
		},
		storyStateGuard(
			id + ':meeting-outcome',
			phoneSocialLoopIds.story.meeting,
			history === 'kept' ? 'completed' : 'blocked'
		)
	];
}

function firsthandMove(
	id: string,
	label: string,
	echoStoryId: string,
	history: DayTwoHistory,
	claimId: string,
	goodwillDelta: number,
	memorySummary: string
): NarrativeMoveDefinition {
	const outcomeId = id + ':outcome';
	return {
		id,
		storyNodeId: firsthandSocialRepairIds.story.answer,
		kind: 'inform',
		label,
		actorCharacterId: playerId,
		targetCharacterIds: [listenerId],
		communicatedClaimId: claimId,
		communicationIntent: 'honest',
		guards: [
			samePlaceGuard(id + ':same-place'),
			storyStateGuard(id + ':answer-available', firsthandSocialRepairIds.story.answer, 'available'),
			storyStateGuard(id + ':echo-completed', echoStoryId, 'completed'),
			...historyGuards(id, history)
		],
		resolution: {type: 'automatic', outcomeId},
		outcomes: [
			{
				id: outcomeId,
				key: 'answered',
				label: memorySummary,
				effectStoryNodeIds: [firsthandSocialRepairIds.story.dayFourAnswered],
				effects: [
					{
						id: id + ':firsthand-knowledge',
						type: 'character-learns-claim',
						recipient: {type: 'move-target', targetIndex: 0},
						claim: {type: 'communicated-claim'},
						attitude: 'believes',
						confidence: 0.9,
						source: {type: 'move-actor'}
					},
					{
						id: id + ':firsthand-memory',
						type: 'character-remembers',
						character: {type: 'move-target', targetIndex: 0},
						summary: memorySummary,
						importance: 0.65,
						baseStrength: 0.7,
						tags: ['day-three', 'firsthand', 'dorm', history],
						source: {type: 'communicated-claim'}
					},
					{
						id: id + ':goodwill',
						type: 'relationship-adjust',
						from: {type: 'move-target', targetIndex: 0},
						to: {type: 'move-actor'},
						axis: 'goodwill',
						delta: goodwillDelta
					},
					{
						id: id + ':open-followup',
						type: 'story-node-set-state',
						storyNodeId: firsthandSocialRepairIds.story.dayFourAnswered,
						state: 'available'
					},
					{
						id: id + ':close-response',
						type: 'story-node-set-state',
						storyNodeId: firsthandSocialRepairIds.story.answer,
						state: 'completed'
					}
				]
			}
		]
	};
}

function playerAnswerMoves(): NarrativeMoveDefinition[] {
	const ids = firsthandSocialRepairIds;
	return [
		firsthandMove(
			ids.moves.explainKeptWarm,
			'Лично рассказать, как прошла встреча',
			rumorSocialEchoIds.story.warmEcho,
			'kept',
			ids.claims.kept,
			0.05,
			'Дежурная услышала от самого новенького, что тот пришёл на встречу, как обещал.'
		),
		firsthandMove(
			ids.moves.explainKeptCautious,
			'Рассказать о состоявшейся встрече без чужих пересказов',
			rumorSocialEchoIds.story.cautiousEcho,
			'kept',
			ids.claims.kept,
			0.05,
			'Новенький лично рассказал осторожной дежурной, что пришёл на встречу, как обещал.'
		),
		firsthandMove(
			ids.moves.explainMissedGuarded,
			'Признать, что не пришёл, и объясниться',
			rumorSocialEchoIds.story.guardedEcho,
			'missed',
			ids.claims.missed,
			0.08,
			'Новенький лично признал, что пропустил встречу после согласия, и извинился.'
		),
		firsthandMove(
			ids.moves.explainMissedCautious,
			'Признать пропущенную встречу, не прячась за слухом',
			rumorSocialEchoIds.story.cautiousEcho,
			'missed',
			ids.claims.missed,
			0.08,
			'Дежурная услышала прямое объяснение и извинение за пропущенную договорённость.'
		),
		firsthandMove(
			ids.moves.explainDeclinedNeutral,
			'Подтвердить, что предупредил об отказе заранее',
			rumorSocialEchoIds.story.neutralEcho,
			'declined',
			ids.claims.declined,
			0.03,
			'Новенький сам подтвердил, что заранее отказался от вечерней встречи.'
		),
		firsthandMove(
			ids.moves.explainDeclinedCautious,
			'Объяснить, что заранее отменил встречу',
			rumorSocialEchoIds.story.cautiousEcho,
			'declined',
			ids.claims.declined,
			0.03,
			'Дежурная выслушала личное объяснение о заранее отменённой встрече.'
		),
		{
			id: ids.moves.walkAway,
			storyNodeId: ids.story.answer,
			kind: 'leave',
			label: 'Не обсуждать чужой рассказ и пройти мимо',
			actorCharacterId: playerId,
			targetCharacterIds: [listenerId],
			guards: [
				samePlaceGuard(ids.moves.walkAway + ':same-place'),
				storyStateGuard(ids.moves.walkAway + ':answer-available', ids.story.answer, 'available')
			],
			resolution: {type: 'automatic', outcomeId: ids.moves.walkAway + ':outcome'},
			outcomes: [
				{
					id: ids.moves.walkAway + ':outcome',
					key: 'silent',
					label: 'Пока дежурная знает лишь то, что услышала от других.',
					effectStoryNodeIds: [ids.story.dayFourSilent],
					effects: [
						{
							id: ids.moves.walkAway + ':player-memory',
							type: 'character-remembers',
							character: {type: 'move-actor'},
							summary: 'Можно было объясниться у вахты, но я предпочёл уйти.',
							importance: 0.35,
							baseStrength: 0.45,
							tags: ['day-three', 'firsthand', 'left-unsaid'],
							source: {type: 'current-move'}
						},
						{
							id: ids.moves.walkAway + ':open-followup',
							type: 'story-node-set-state',
							storyNodeId: ids.story.dayFourSilent,
							state: 'available'
						},
						{
							id: ids.moves.walkAway + ':close-response',
							type: 'story-node-set-state',
							storyNodeId: ids.story.answer,
							state: 'completed'
						}
					]
				}
			]
		}
	];
}

function followupMove(
	id: string,
	storyNodeId: string,
	label: string,
	outcomeLabel: string,
	memorySummary: string
): NarrativeMoveDefinition {
	return {
		id,
		storyNodeId,
		kind: 'observe',
		label,
		actorCharacterId: playerId,
		targetCharacterIds: [listenerId],
		guards: [
			samePlaceGuard(id + ':same-place'),
			storyStateGuard(id + ':followup-available', storyNodeId, 'available')
		],
		resolution: {type: 'automatic', outcomeId: id + ':outcome'},
		outcomes: [
			{
				id: id + ':outcome',
				key: 'continue',
				label: outcomeLabel,
				effectStoryNodeIds: [],
				effects: [
					{
						id: id + ':player-memory',
						type: 'character-remembers',
						character: {type: 'move-actor'},
						summary: memorySummary,
						importance: 0.45,
						baseStrength: 0.55,
						tags: ['day-four', 'firsthand-followup'],
						source: {type: 'current-move'}
					},
					{
						id: id + ':complete-followup',
						type: 'story-node-set-state',
						storyNodeId,
						state: 'completed'
					}
				]
			}
		]
	};
}

export function create93DaysFirsthandSocialRepairProject(): NarrativeProject {
	const project = create93DaysRumorSocialEchoProject();
	const ids = firsthandSocialRepairIds;
	project.projectId = '93-days-firsthand-social-repair-v1';
	project.name = '93 дня до конца нашего лета — разговор из первых рук';

	project.claims = [
		...project.claims,
		{
			id: ids.claims.kept,
			text: 'Новенький лично подтвердил, что пришёл на встречу, как обещал.',
			stance: 'supports',
			tags: ['day-three', 'firsthand', 'meeting-kept']
		},
		{
			id: ids.claims.missed,
			text: 'Новенький лично признал, что после согласия пропустил встречу, и извинился.',
			stance: 'supports',
			tags: ['day-three', 'firsthand', 'meeting-missed']
		},
		{
			id: ids.claims.declined,
			text: 'Новенький лично подтвердил, что заранее отказался от встречи.',
			stance: 'supports',
			tags: ['day-three', 'firsthand', 'meeting-declined']
		}
	];

	project.storyNodes = [
		...project.storyNodes,
		{
			id: ids.story.answer,
			kind: 'dialogue',
			title: 'Поговорить с дежурной лично',
			description:
				'После приветствия у вахты можно рассказать свою сторону вчерашней встречи — или уйти, оставив прежний пересказ единственным услышанным.',
			primaryCharacterId: playerId,
			participantIds: [playerId, listenerId],
			placement: {locationId: dormLocation},
			activationState: 'dormant'
		},
		{
			id: ids.story.dayFourAnswered,
			kind: 'dialogue',
			title: 'На следующий день: после прямого разговора',
			description:
				'Дежурная помнит, что новенький заговорил с ней сам. Чужой рассказ не исчез, но теперь у неё есть и собственный разговор.',
			primaryCharacterId: listenerId,
			participantIds: [playerId, listenerId],
			placement: {day: 4, minuteOfDay: 0, locationId: dormLocation},
			activationState: 'dormant'
		},
		{
			id: ids.story.dayFourSilent,
			kind: 'dialogue',
			title: 'На следующий день: невысказанный ответ',
			description:
				'О вчерашней встрече так и не заговорили напрямую. При новой встрече у вахты старое впечатление остаётся без собственного продолжения.',
			primaryCharacterId: listenerId,
			participantIds: [playerId, listenerId],
			placement: {day: 4, minuteOfDay: 0, locationId: dormLocation},
			activationState: 'dormant'
		}
	];

	const echoMoves = new Set<string>([
		rumorSocialEchoIds.moves.warmEcho,
		rumorSocialEchoIds.moves.guardedEcho,
		rumorSocialEchoIds.moves.neutralEcho,
		rumorSocialEchoIds.moves.cautiousEcho
	]);
	project.narrativeMoves = [
		...project.narrativeMoves.map(move =>
			echoMoves.has(move.id)
				? {
						...move,
						guards: [
							...move.guards,
							storyStateGuard(move.id + ':a62-echo-available', move.storyNodeId, 'available')
						],
						outcomes: move.outcomes.map(outcome => ({
							...outcome,
							effects: [
								...outcome.effects,
								{
									id: move.id + ':a62-open-firsthand',
									type: 'story-node-set-state' as const,
									storyNodeId: ids.story.answer,
									state: 'available' as const
								}
							]
						}))
					}
				: move
		),
		...playerAnswerMoves(),
		followupMove(
			ids.moves.dayFourAnswered,
			ids.story.dayFourAnswered,
			'Заметить, как дежурная встречает тебя после разговора',
			'Она помнит ваш личный разговор и уже не опирается только на чужой пересказ.',
			'После разговора у вахты появилась новая точка отсчёта: теперь мы хотя бы знакомы лично.'
		),
		followupMove(
			ids.moves.dayFourSilent,
			ids.story.dayFourSilent,
			'Пройти мимо дежурной после вчерашнего молчания',
			'Прежнее впечатление осталось: в другой раз ещё можно поговорить, но вчерашний шанс прошёл.',
			'Второй раз встретил дежурную, так и не рассказав ей свою сторону истории.'
		)
	];

	// The A61 teller's Claim and runtime provenance are left unchanged.
	return project;
}
