import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../export-compiler';
import {executeNarrativePlayerAction} from '../player-action';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from '../player-runtime';
import {executeNarrativePlayerStoryWork} from '../player-story-work';
import {executeNarrativePlayerWait} from '../player-wait';
import {
	createNarrativeReactionDecisionOpportunity,
	evaluateNarrativeNpcDecision,
	executeNarrativeNpcDecision
} from '../npc-decision';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {
	resolveAndApplyNarrativeProjectMove,
	resolveNarrativeProjectMove,
	setNarrativeCharacterActualLocation
} from '../living-simulation';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {dayOneNarrativeIds} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {
	phoneSocialLoopIds
} from '../../../domain/narrative/content/93-days-phone-social-loop';
import {
	create93DaysRumorSocialEchoProject,
	rumorSocialEchoIds
} from '../../../domain/narrative/content/93-days-rumor-social-echo';

const playerId = arrivalCorridorIds.characters.player;
const contactId = dayOneNarrativeIds.characters.localContact;
const dormDutyId = arrivalCorridorIds.characters.dormDuty;
const smsWorkId = `story-node:${phoneSocialLoopIds.story.incomingSms}`;
const meetingWorkId = `story-node:${phoneSocialLoopIds.story.meeting}`;

function compileFixture() {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysRumorSocialEchoProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error(
			`Expected A61 rumor project to compile: ${compiled.diagnostics
				.map(item => item.source)
				.join(', ')}`
		);
	}
	return compiled.artifact;
}

function startSession(artifact: NarrativeRuntimeArtifactV1) {
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

function wait(session: NarrativePlayerSession, durationMinutes: number) {
	const result = executeNarrativePlayerWait(session, durationMinutes);
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
		(session.currentProject.simulation.day - 1) * 24 * 60 +
		session.currentProject.simulation.minuteOfDay;
	const target = (day - 1) * 24 * 60 + minuteOfDay;
	if (target < current) {
		throw new Error('A61 wait target is in the past.');
	}
	return wait(session, target - current);
}

function action(session: NarrativePlayerSession, moveId: string) {
	const result = executeNarrativePlayerAction(session, moveId, playerId);
	if (result.status !== 'applied') {
		throw new Error(`A61 player action failed: ${result.summary}`);
	}
	return result.session;
}

function storyWork(
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
		throw new Error(`A61 Story work failed: ${result.summary}`);
	}
	return result.session;
}

function replaceProject(
	session: NarrativePlayerSession,
	project: NarrativePlayerSession['currentProject']
) {
	const result = replaceNarrativePlayerSessionProject(session, project);
	if (result.status !== 'updated') {
		throw new Error('A61 session rejected canonical project replacement.');
	}
	return result.session;
}

function setLocation(
	session: NarrativePlayerSession,
	characterId: string,
	locationId: string
) {
	return replaceProject(
		session,
		setNarrativeCharacterActualLocation(
			session.currentProject,
			characterId,
			locationId
		)
	);
}

function reachSms() {
	let session = startSession(compileFixture());
	session = waitUntil(session, 2, 10 * 60 + 30);
	session = storyWork(session, smsWorkId, 'execute');
	return session;
}

function reachRumorMoment(
	branch: 'met' | 'missed' | 'declined'
): NarrativePlayerSession {
	let session = reachSms();

	if (branch === 'declined') {
		session = action(session, phoneSocialLoopIds.moves.decline);
	} else {
		session = action(session, phoneSocialLoopIds.moves.accept);
		if (branch === 'met') {
			session = waitUntil(session, 2, 19 * 60);
			session = setLocation(
				session,
				playerId,
				phoneSocialLoopIds.locations.dormCourtyard
			);
			session = setLocation(
				session,
				contactId,
				phoneSocialLoopIds.locations.dormCourtyard
			);
			session = storyWork(session, meetingWorkId, 'execute');
			session = wait(session, 30);
		} else {
			session = waitUntil(session, 2, 23 * 60 + 1);
			session = storyWork(session, meetingWorkId, 'miss');
		}
	}

	session = waitUntil(session, 3, 8 * 60 + 15);
	session = setLocation(
		session,
		contactId,
		arrivalCorridorIds.locations.studentDormitory
	);
	session = setLocation(
		session,
		dormDutyId,
		arrivalCorridorIds.locations.studentDormitory
	);
	return session;
}

function expectedReport(branch: 'met' | 'missed' | 'declined') {
	if (branch === 'met') {
		return {
			moveId: rumorSocialEchoIds.moves.reportKept,
			claimId: rumorSocialEchoIds.claims.keptMeeting,
			confidence: 0.9
		};
	}
	if (branch === 'missed') {
		return {
			moveId: rumorSocialEchoIds.moves.reportMissed,
			claimId: rumorSocialEchoIds.claims.missedMeeting,
			confidence: 0.82
		};
	}
	return {
		moveId: rumorSocialEchoIds.moves.reportDeclined,
		claimId: rumorSocialEchoIds.claims.declinedMeeting,
		confidence: 0.88
	};
}

function expectedAssessment(branch: 'met' | 'missed' | 'declined') {
	if (branch === 'met') {
		return {
			believeMoveId: rumorSocialEchoIds.moves.believeKept,
			reserveMoveId: rumorSocialEchoIds.moves.reserveKept,
			echoStoryNodeId: rumorSocialEchoIds.story.warmEcho,
			goodwillDelta: 0.12
		};
	}
	if (branch === 'missed') {
		return {
			believeMoveId: rumorSocialEchoIds.moves.believeMissed,
			reserveMoveId: rumorSocialEchoIds.moves.reserveMissed,
			echoStoryNodeId: rumorSocialEchoIds.story.guardedEcho,
			goodwillDelta: -0.12
		};
	}
	return {
		believeMoveId: rumorSocialEchoIds.moves.believeDeclined,
		reserveMoveId: rumorSocialEchoIds.moves.reserveDeclined,
		echoStoryNodeId: rumorSocialEchoIds.story.neutralEcho,
		goodwillDelta: 0.02
	};
}

function relationshipValue(
	project: NarrativePlayerSession['currentProject'],
	fromCharacterId: string,
	toCharacterId: string,
	axis: string
) {
	return (
		project.relationships.find(
			relationship =>
				relationship.fromCharacterId === fromCharacterId &&
				relationship.toCharacterId === toCharacterId
		)?.values[axis] ?? 0
	);
}

describe('A61-S1 rumor provenance', () => {
	test.each(['met', 'missed', 'declined'] as const)(
		'%s A60 history becomes one concrete NPC-to-NPC told Claim',
		branch => {
			const session = reachRumorMoment(branch);
			const expected = expectedReport(branch);
			const allReportMoves = Object.values(rumorSocialEchoIds.moves);

			for (const moveId of allReportMoves) {
				const resolution = resolveNarrativeProjectMove(
					session.currentProject,
					moveId
				);
				expect(resolution.status).toBe(
					moveId === expected.moveId ? 'resolved' : 'blocked'
				);
			}

			const authoredBefore = JSON.stringify({
				claims: session.currentProject.claims,
				storyNodes: session.currentProject.storyNodes,
				narrativeMoves: session.currentProject.narrativeMoves
			});
			const applied = resolveAndApplyNarrativeProjectMove(
				session.currentProject,
				expected.moveId
			);
			expect(applied.resolution.status).toBe('resolved');

			const knowledge = applied.project.simulation.characterKnowledge.find(
				state =>
					state.characterId === dormDutyId &&
					state.claimId === expected.claimId
			);
			expect(knowledge).toMatchObject({
				characterId: dormDutyId,
				claimId: expected.claimId,
				attitude: 'believes',
				confidence: expected.confidence,
				source: {
					type: 'told',
					sourceCharacterId: contactId,
					sourceEventId:
						rumorSocialEchoIds.story.contactReportsToDormDuty
				},
				learnedAt: {day: 3, minuteOfDay: 8 * 60 + 15},
				timesHeard: 1
			});

			const memory = applied.project.memories.find(
				item =>
					item.characterId === dormDutyId &&
					item.source?.type === 'claim' &&
					item.source.claimId === expected.claimId
			);
			expect(memory).toEqual(
				expect.objectContaining({
					characterId: dormDutyId,
					tags: expect.arrayContaining(['rumor', 'dorm', 'new-arrival']),
					source: {type: 'claim', claimId: expected.claimId},
					relatedEntityIds: expect.arrayContaining([
						expected.claimId,
						rumorSocialEchoIds.story.contactReportsToDormDuty
					])
				})
			);

			expect(
				applied.project.runtimeOccurrences.some(
					occurrence =>
						occurrence.type === 'move-outcome' &&
						occurrence.moveId === expected.moveId &&
						occurrence.moment.day === 3 &&
						occurrence.moment.minuteOfDay === 8 * 60 + 15
				)
			).toBe(true);
			expect(
				applied.project.storyNodeStateOverrides[
					rumorSocialEchoIds.story.contactReportsToDormDuty
				]
			).toBe('completed');
			expect(
				JSON.stringify({
					claims: applied.project.claims,
					storyNodes: applied.project.storyNodes,
					narrativeMoves: applied.project.narrativeMoves
				})
			).toBe(authoredBefore);
		}
	);
});


describe('A61-S2 source-trust reaction', () => {
	test.each(['met', 'missed', 'declined'] as const)(
		'%s report uses explicit source trust to choose believe vs reserve',
		branch => {
			const session = reachRumorMoment(branch);
			const report = expectedReport(branch);
			const reported = resolveAndApplyNarrativeProjectMove(
				session.currentProject,
				report.moveId
			);
			expect(reported.resolution.status).toBe('resolved');

			const expected = expectedAssessment(branch);
			const opportunity = createNarrativeReactionDecisionOpportunity(
				reported.project,
				rumorSocialEchoIds.reactionSets.dormDutyAssessesReport,
				'a61-opportunity:dorm-duty-assesses-report',
				0
			);
			const evaluated = evaluateNarrativeNpcDecision(reported.project, [
				opportunity
			]);
			expect(evaluated.selection.selectedMoveId).toBe(expected.believeMoveId);
			expect(evaluated.selection.randomnessUsed).toBe(false);

			const believed = evaluated.evaluations[0].reactionEvaluation.candidates.find(
				candidate => candidate.moveId === expected.believeMoveId
			);
			expect(
				believed?.considerationTraces.find(trace =>
					trace.considerationId.endsWith(':source-trust')
				)
			).toEqual(
				expect.objectContaining({
					status: 'met',
					weight: 3,
					appliedWeight: 3
				})
			);

			const goodwillBefore = relationshipValue(
				reported.project,
				dormDutyId,
				playerId,
				'goodwill'
			);
			const executed = executeNarrativeNpcDecision(reported.project, [
				opportunity
			]);
			expect(executed.trace.status).toBe('executed');
			expect(executed.trace.selectedMoveId).toBe(expected.believeMoveId);
			expect(
				executed.project.storyNodeStateOverrides[expected.echoStoryNodeId]
			).toBe('available');
			expect(
				relationshipValue(
					executed.project,
					dormDutyId,
					playerId,
					'goodwill'
				)
			).toBeCloseTo(goodwillBefore + expected.goodwillDelta);

			const lowTrust = {
				...reported.project,
				relationships: reported.project.relationships.map(relationship =>
					relationship.fromCharacterId === dormDutyId &&
					relationship.toCharacterId === contactId
						? {
								...relationship,
								values: {...relationship.values, trust: 0.3}
							}
						: relationship
				)
			};
			const lowTrustOpportunity = createNarrativeReactionDecisionOpportunity(
				lowTrust,
				rumorSocialEchoIds.reactionSets.dormDutyAssessesReport,
				'a61-opportunity:dorm-duty-assesses-low-trust',
				0
			);
			const lowTrustEvaluation = evaluateNarrativeNpcDecision(lowTrust, [
				lowTrustOpportunity
			]);
			expect(lowTrustEvaluation.selection.selectedMoveId).toBe(
				expected.reserveMoveId
			);
			expect(lowTrustEvaluation.selection.randomnessUsed).toBe(false);
			const lowTrustBelieved =
				lowTrustEvaluation.evaluations[0].reactionEvaluation.candidates.find(
					candidate => candidate.moveId === expected.believeMoveId
				);
			expect(
				lowTrustBelieved?.considerationTraces.find(trace =>
					trace.considerationId.endsWith(':source-trust')
				)
			).toEqual(
				expect.objectContaining({
					status: 'unmet',
					weight: 3,
					appliedWeight: 0
				})
			);
		}
	);
});
