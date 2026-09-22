import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../export-compiler';
import {
	createNarrativeReactionDecisionOpportunity,
	executeNarrativeNpcDecision
} from '../npc-decision';
import {
	resolveAndApplyNarrativeProjectMove,
	setNarrativeCharacterActualLocation
} from '../living-simulation';
import {executeNarrativePlayerAction} from '../player-action';
import {deriveNarrativePlayerPresentation} from '../player-presentation';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from '../player-runtime';
import {
	createNarrativePlayerSave,
	restoreNarrativePlayerSave
} from '../player-save';
import {executeNarrativePlayerStoryWork} from '../player-story-work';
import {executeNarrativePlayerWait} from '../player-wait';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {dayOneNarrativeIds} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {
	create93DaysFirsthandSocialRepairProject,
	firsthandSocialRepairIds
} from '../../../domain/narrative/content/93-days-firsthand-social-repair';
import {phoneSocialLoopIds} from '../../../domain/narrative/content/93-days-phone-social-loop';
import {rumorSocialEchoIds} from '../../../domain/narrative/content/93-days-rumor-social-echo';

type History = 'kept' | 'missed' | 'declined';

const playerId = arrivalCorridorIds.characters.player;
const contactId = dayOneNarrativeIds.characters.localContact;
const listenerId = arrivalCorridorIds.characters.dormDuty;
const dormId = arrivalCorridorIds.locations.studentDormitory;
const workSms = 'story-node:' + phoneSocialLoopIds.story.incomingSms;
const workMeeting = 'story-node:' + phoneSocialLoopIds.story.meeting;
const ids = firsthandSocialRepairIds;

function compileFixture() {
	const result = compileNarrativeRuntimeArtifact(
		create93DaysFirsthandSocialRepairProject()
	);
	if (result.status !== 'compiled') {
		throw new Error(
			'A62 compilation failed: ' +
				JSON.stringify(result.diagnostics)
		);
	}
	return result.artifact;
}

function start(artifact: NarrativeRuntimeArtifactV1) {
	const materialized = materializeNarrativePlayerSession(artifact);
	if (materialized.status !== 'ready') {
		throw new Error(materialized.summary);
	}
	const started = bootstrapNarrativePlayerWorldStart(materialized.session);
	if (started.status === 'rejected') {
		throw new Error(started.summary);
	}
	return started.session;
}

function wait(session: NarrativePlayerSession, minutes: number) {
	const result = executeNarrativePlayerWait(session, minutes);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result.session;
}

function waitUntil(
	session: NarrativePlayerSession,
	day: number,
	minuteOfDay: number
) {
	const current =
		(session.currentProject.simulation.day - 1) * 1440 +
		session.currentProject.simulation.minuteOfDay;
	const target = (day - 1) * 1440 + minuteOfDay;
	if (target < current) {
		throw new Error('Cannot rewind the A62 test session.');
	}
	return wait(session, target - current);
}

function move(session: NarrativePlayerSession, moveId: string) {
	const result = executeNarrativePlayerAction(session, moveId, playerId);
	if (result.status !== 'applied') {
		throw new Error('A62 Move failed: ' + result.summary);
	}
	return result.session;
}

function story(
	session: NarrativePlayerSession,
	workId: string,
	decision: 'execute' | 'miss'
) {
	const result = executeNarrativePlayerStoryWork(
		session,
		workId,
		decision,
		playerId
	);
	if (result.status !== 'applied') {
		throw new Error('A62 Story work failed: ' + result.summary);
	}
	return result.session;
}

function replace(
	session: NarrativePlayerSession,
	project: NarrativePlayerSession['currentProject']
) {
	const result = replaceNarrativePlayerSessionProject(session, project);
	if (result.status !== 'updated') {
		throw new Error('A62 session replacement failed.');
	}
	return result.session;
}

function place(
	session: NarrativePlayerSession,
	characterId: string,
	locationId: string
) {
	return replace(
		session,
		setNarrativeCharacterActualLocation(
			session.currentProject,
			characterId,
			locationId
		)
	);
}

function withTrust(
	project: NarrativePlayerSession['currentProject'],
	value: number
): NarrativePlayerSession['currentProject'] {
	const current = project.relationships.find(
		item =>
			item.fromCharacterId === listenerId &&
			item.toCharacterId === contactId
	);
	return {
		...project,
		relationships: [
			...project.relationships.filter(
				item =>
					item.fromCharacterId !== listenerId ||
					item.toCharacterId !== contactId
			),
			{
				fromCharacterId: listenerId,
				toCharacterId: contactId,
				values: {...current?.values, trust: value}
			}
		]
	};
}

function goodwill(
	project: NarrativePlayerSession['currentProject']
) {
	return (
		project.relationships.find(
			item =>
				item.fromCharacterId === listenerId &&
				item.toCharacterId === playerId
		)?.values.goodwill ?? 0
	);
}

const branches = {
	kept: {
		reportMove: rumorSocialEchoIds.moves.reportKept,
		reportClaim: rumorSocialEchoIds.claims.keptMeeting,
		believeMove: rumorSocialEchoIds.moves.believeKept,
		reserveMove: rumorSocialEchoIds.moves.reserveKept,
		believeEcho: rumorSocialEchoIds.moves.warmEcho,
		explainBelieve: ids.moves.explainKeptWarm,
		explainCautious: ids.moves.explainKeptCautious,
		firsthandClaim: ids.claims.kept,
		goodwillGain: 0.05
	},
	missed: {
		reportMove: rumorSocialEchoIds.moves.reportMissed,
		reportClaim: rumorSocialEchoIds.claims.missedMeeting,
		believeMove: rumorSocialEchoIds.moves.believeMissed,
		reserveMove: rumorSocialEchoIds.moves.reserveMissed,
		believeEcho: rumorSocialEchoIds.moves.guardedEcho,
		explainBelieve: ids.moves.explainMissedGuarded,
		explainCautious: ids.moves.explainMissedCautious,
		firsthandClaim: ids.claims.missed,
		goodwillGain: 0.08
	},
	declined: {
		reportMove: rumorSocialEchoIds.moves.reportDeclined,
		reportClaim: rumorSocialEchoIds.claims.declinedMeeting,
		believeMove: rumorSocialEchoIds.moves.believeDeclined,
		reserveMove: rumorSocialEchoIds.moves.reserveDeclined,
		believeEcho: rumorSocialEchoIds.moves.neutralEcho,
		explainBelieve: ids.moves.explainDeclinedNeutral,
		explainCautious: ids.moves.explainDeclinedCautious,
		firsthandClaim: ids.claims.declined,
		goodwillGain: 0.03
	}
} as const;

function reachEcho(
	history: History,
	trust: number,
	artifact: NarrativeRuntimeArtifactV1 = compileFixture()
) {
	const branch = branches[history];
	let session = start(artifact);
	session = waitUntil(session, 2, 10 * 60 + 30);
	session = story(session, workSms, 'execute');

	if (history === 'declined') {
		session = move(session, phoneSocialLoopIds.moves.decline);
	} else {
		session = move(session, phoneSocialLoopIds.moves.accept);
		if (history === 'kept') {
			session = waitUntil(session, 2, 19 * 60);
			session = place(
				session,
				playerId,
				phoneSocialLoopIds.locations.dormCourtyard
			);
			session = place(
				session,
				contactId,
				phoneSocialLoopIds.locations.dormCourtyard
			);
			session = story(session, workMeeting, 'execute');
			session = wait(session, 30);
		} else {
			session = waitUntil(session, 2, 23 * 60 + 1);
			session = story(session, workMeeting, 'miss');
		}
	}

	session = waitUntil(session, 3, 8 * 60 + 15);
	session = place(session, contactId, dormId);
	session = place(session, listenerId, dormId);
	const reported = resolveAndApplyNarrativeProjectMove(
		session.currentProject,
		branch.reportMove
	);
	expect(reported.resolution.status).toBe('resolved');
	const opportunity = createNarrativeReactionDecisionOpportunity(
		withTrust(reported.project, trust),
		rumorSocialEchoIds.reactionSets.dormDutyAssessesReport,
		'a62-opportunity:firsthand',
		0
	);
	const assessment = executeNarrativeNpcDecision(
		withTrust(reported.project, trust),
		[opportunity]
	);
	expect(assessment.trace.status).toBe('executed');
	expect(assessment.trace.selectedMoveId).toBe(
		trust >= 0.5 ? branch.believeMove : branch.reserveMove
	);
	session = replace(session, assessment.project);
	session = place(session, playerId, dormId);
	return {session, branch};
}

function responseActions(session: NarrativePlayerSession) {
	return deriveNarrativePlayerPresentation(session.currentProject).actions.filter(
		action => action.storyNodeId === ids.story.answer
	);
}

describe('A62 artifact and initial runtime boundary', () => {
	test('compiles from A61 without pre-seeding firsthand knowledge or presence', () => {
		const project = create93DaysFirsthandSocialRepairProject();
		const artifact = compileFixture();
		const session = start(artifact);
		expect(artifact.authored.projectId).toBe(project.projectId);
		expect(session.currentProject.simulation.characterKnowledge).toEqual(
			expect.not.arrayContaining([
				expect.objectContaining({claimId: ids.claims.kept})
			])
		);
		expect(
			session.currentProject.storyNodeStateOverrides[ids.story.answer]
		).toBeUndefined();
		expect(session.currentProject.simulation.actualLocationByCharacter).toEqual({
			[playerId]: arrivalCorridorIds.locations.busStation
		});
	});
});

describe('A62 firsthand answers preserve the original rumor', () => {
	test.each([
		['kept', 0.65],
		['missed', 0.65],
		['declined', 0.65],
		['kept', 0.3],
		['missed', 0.3],
		['declined', 0.3]
	] as const)(
		'%s history with source trust %s opens only its truthful direct answer',
		(history, trust) => {
			let {session, branch} = reachEcho(history, trust);
			const echoMoveId =
				trust >= 0.5
					? branch.believeEcho
					: rumorSocialEchoIds.moves.cautiousEcho;
			const directMoveId =
				trust >= 0.5
					? branch.explainBelieve
					: branch.explainCautious;

			expect(responseActions(session)).toEqual([]);
			session = move(session, echoMoveId);
			expect(
				session.currentProject.storyNodeStateOverrides[ids.story.answer]
			).toBe('available');

			const response = responseActions(session);
			expect(response.map(item => item.id).sort()).toEqual(
				[directMoveId, ids.moves.walkAway].sort()
			);
			expect(response.every(item => item.state === 'ready')).toBe(true);
			const preConversation = JSON.stringify({
				claims: session.currentProject.claims,
				storyNodes: session.currentProject.storyNodes,
				moves: session.currentProject.narrativeMoves
			});
			const originalReport = session.currentProject.simulation.characterKnowledge.find(
				item => item.characterId === listenerId && item.claimId === branch.reportClaim
			);
			const beforeGoodwill = goodwill(session.currentProject);

			// The other NPC's schedule may say "dorm", but Actual Presence must
			// show a physical interlocutor before a Player Move can execute.
			const absent = place(
				session,
				listenerId,
				phoneSocialLoopIds.locations.dormCourtyard
			);
			const blocked = executeNarrativePlayerAction(absent, directMoveId, playerId);
			expect(blocked.status).toBe('rejected');
			if (blocked.status === 'rejected') {
				expect(blocked.reason).toBe('blocked');
				expect(blocked.session).toBe(absent);
			}
			expect(absent.currentProject.simulation.characterKnowledge).toEqual(
				session.currentProject.simulation.characterKnowledge
			);

			session = move(session, directMoveId);
			const knowledge = session.currentProject.simulation.characterKnowledge;
			expect(
				knowledge.find(
					item => item.characterId === listenerId && item.claimId === branch.reportClaim
				)
			).toEqual(originalReport);
			expect(
				knowledge.find(
					item => item.characterId === listenerId && item.claimId === branch.firsthandClaim
				)
			).toEqual(
				expect.objectContaining({
					attitude: 'believes',
					confidence: 0.9,
					source: {
						type: 'told',
						sourceCharacterId: playerId,
						sourceEventId: ids.story.answer
					}
				})
			);
			expect(
				knowledge.filter(
					item =>
						item.characterId === listenerId &&
						Object.values(ids.claims).includes(item.claimId as typeof ids.claims.kept)
				)
			).toHaveLength(1);
			expect(
				session.currentProject.memories.some(
					item =>
						item.characterId === listenerId &&
						item.source?.type === 'claim' &&
						item.source.claimId === branch.firsthandClaim
				)
			).toBe(true);
			expect(goodwill(session.currentProject)).toBeCloseTo(
				beforeGoodwill + branch.goodwillGain
			);
			expect(session.currentProject.storyNodeStateOverrides).toMatchObject({
				[ids.story.answer]: 'completed',
				[ids.story.dayFourAnswered]: 'available'
			});
			expect(
				session.currentProject.storyNodeStateOverrides[ids.story.dayFourSilent]
			).toBeUndefined();
			expect(responseActions(session)).toEqual([]);
			const secondChoice = executeNarrativePlayerAction(
				session,
				ids.moves.walkAway,
				playerId
			);
			expect(secondChoice.status).toBe('rejected');
			expect(JSON.stringify({
				claims: session.currentProject.claims,
				storyNodes: session.currentProject.storyNodes,
				moves: session.currentProject.narrativeMoves
			})).toBe(preConversation);

			session = waitUntil(session, 4, 9 * 60);
			session = place(session, listenerId, dormId);
			const dayFour = deriveNarrativePlayerPresentation(session.currentProject);
			expect(
				dayFour.actions.filter(
					action =>
						action.storyNodeId === ids.story.dayFourAnswered ||
						action.storyNodeId === ids.story.dayFourSilent
				).map(action => action.id)
			).toEqual([ids.moves.dayFourAnswered]);
			session = move(session, ids.moves.dayFourAnswered);
			expect(
				session.currentProject.storyNodeStateOverrides[ids.story.dayFourAnswered]
			).toBe('completed');
		}
	);
});

describe('A62 leave / follow-up / persistence', () => {
	test('leaving preserves third-party Knowledge but opens only the unanswered Day Four', () => {
		let {session, branch} = reachEcho('missed', 0.65);
		session = move(session, branch.believeEcho);
		const goodwillBefore = goodwill(session.currentProject);
		session = move(session, ids.moves.walkAway);
		expect(goodwill(session.currentProject)).toBe(goodwillBefore);
		expect(
			session.currentProject.simulation.characterKnowledge.some(
				item =>
					item.characterId === listenerId &&
					item.claimId === branch.firsthandClaim
			)
		).toBe(false);
		expect(
			session.currentProject.simulation.characterKnowledge.some(
				item =>
					item.characterId === listenerId &&
					item.claimId === branch.reportClaim &&
					item.source.type === 'told' &&
					item.source.sourceCharacterId === contactId
			)
		).toBe(true);
		expect(session.currentProject.storyNodeStateOverrides).toMatchObject({
			[ids.story.answer]: 'completed',
			[ids.story.dayFourSilent]: 'available'
		});
		expect(
			session.currentProject.storyNodeStateOverrides[ids.story.dayFourAnswered]
		).toBeUndefined();
		session = waitUntil(session, 4, 9 * 60);
		session = place(session, listenerId, dormId);
		const actions = deriveNarrativePlayerPresentation(session.currentProject).actions;
		expect(
			actions.filter(
				item =>
					item.storyNodeId === ids.story.dayFourAnswered ||
					item.storyNodeId === ids.story.dayFourSilent
			).map(item => item.id)
		).toEqual([ids.moves.dayFourSilent]);
	});

	test.each(['answered', 'silent'] as const)(
		'%s history keeps exactly one day-four story after save/restore',
		choice => {
			const artifact = compileFixture();
			let {session, branch} = reachEcho('declined', 0.3, artifact);
			session = move(session, rumorSocialEchoIds.moves.cautiousEcho);
			session = move(
				session,
				choice === 'answered' ? branch.explainCautious : ids.moves.walkAway
			);
			const save = createNarrativePlayerSave(session);
			const restored = restoreNarrativePlayerSave(start(artifact), save);
			expect(restored.status).toBe('restored');
			if (restored.status !== 'restored') {
				throw new Error('A62 expected valid save/restore.');
			}
			session = restored.session;
			const expectedFollowup =
				choice === 'answered' ? ids.story.dayFourAnswered : ids.story.dayFourSilent;
			const otherFollowup =
				choice === 'answered' ? ids.story.dayFourSilent : ids.story.dayFourAnswered;
			expect(
				session.currentProject.storyNodeStateOverrides[expectedFollowup]
			).toBe('available');
			expect(
				session.currentProject.storyNodeStateOverrides[otherFollowup]
			).toBeUndefined();
			expect(
				session.currentProject.simulation.characterKnowledge.some(
					item =>
						item.characterId === listenerId &&
						item.claimId === branch.firsthandClaim &&
						item.source.type === 'told' &&
						item.source.sourceCharacterId === playerId
				)
			).toBe(choice === 'answered');
			session = waitUntil(session, 4, 9 * 60);
			session = place(session, listenerId, dormId);
			expect(
				deriveNarrativePlayerPresentation(session.currentProject).actions
					.filter(
						item =>
							item.storyNodeId === ids.story.dayFourAnswered ||
							item.storyNodeId === ids.story.dayFourSilent
					)
					.map(item => item.storyNodeId)
			).toEqual([expectedFollowup]);
		}
	);
});
