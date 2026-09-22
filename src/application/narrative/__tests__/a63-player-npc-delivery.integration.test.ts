import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../export-compiler';
import {setNarrativeCharacterActualLocation} from '../living-simulation';
import {executeNarrativePlayerAction} from '../player-action';
import {deriveNarrativePlayerPresentation} from '../player-presentation';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from '../player-runtime';
import {createNarrativePlayerSave, restoreNarrativePlayerSave} from '../player-save';
import {executeNarrativePlayerStoryWork} from '../player-story-work';
import {executeNarrativePlayerWait} from '../player-wait';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {dayOneNarrativeIds} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {firsthandSocialRepairIds} from '../../../domain/narrative/content/93-days-firsthand-social-repair';
import {
	create93DaysPlayerNpcSocialDeliveryProject
} from '../../../domain/narrative/content/93-days-player-npc-social-delivery';
import {phoneSocialLoopIds} from '../../../domain/narrative/content/93-days-phone-social-loop';
import {rumorSocialEchoIds} from '../../../domain/narrative/content/93-days-rumor-social-echo';

type History = 'kept' | 'missed' | 'declined';
const playerId = arrivalCorridorIds.characters.player;
const contactId = dayOneNarrativeIds.characters.localContact;
const listenerId = arrivalCorridorIds.characters.dormDuty;
const dormId = arrivalCorridorIds.locations.studentDormitory;
const reportId = rumorSocialEchoIds.story.contactReportsToDormDuty;
const reportWorkId = 'story-node:' + reportId;
const smsWorkId = 'story-node:' + phoneSocialLoopIds.story.incomingSms;
const meetingWorkId = 'story-node:' + phoneSocialLoopIds.story.meeting;
const branches = {
	kept: {
		report: rumorSocialEchoIds.moves.reportKept,
		claim: rumorSocialEchoIds.claims.keptMeeting,
		assess: rumorSocialEchoIds.moves.believeKept,
		reserve: rumorSocialEchoIds.moves.reserveKept,
		echo: rumorSocialEchoIds.moves.warmEcho,
		echoStory: rumorSocialEchoIds.story.warmEcho,
		explain: firsthandSocialRepairIds.moves.explainKeptWarm,
		cautiousExplain: firsthandSocialRepairIds.moves.explainKeptCautious
	},
	missed: {
		report: rumorSocialEchoIds.moves.reportMissed,
		claim: rumorSocialEchoIds.claims.missedMeeting,
		assess: rumorSocialEchoIds.moves.believeMissed,
		reserve: rumorSocialEchoIds.moves.reserveMissed,
		echo: rumorSocialEchoIds.moves.guardedEcho,
		echoStory: rumorSocialEchoIds.story.guardedEcho,
		explain: firsthandSocialRepairIds.moves.explainMissedGuarded,
		cautiousExplain: firsthandSocialRepairIds.moves.explainMissedCautious
	},
	declined: {
		report: rumorSocialEchoIds.moves.reportDeclined,
		claim: rumorSocialEchoIds.claims.declinedMeeting,
		assess: rumorSocialEchoIds.moves.believeDeclined,
		reserve: rumorSocialEchoIds.moves.reserveDeclined,
		echo: rumorSocialEchoIds.moves.neutralEcho,
		echoStory: rumorSocialEchoIds.story.neutralEcho,
		explain: firsthandSocialRepairIds.moves.explainDeclinedNeutral,
		cautiousExplain: firsthandSocialRepairIds.moves.explainDeclinedCautious
	}
} as const;

function compileFixture() {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysPlayerNpcSocialDeliveryProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('A63 compilation failed: ' + JSON.stringify(compiled.diagnostics));
	}
	return compiled.artifact;
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

function replace(
	session: NarrativePlayerSession,
	project: NarrativePlayerSession['currentProject']
) {
	const result = replaceNarrativePlayerSessionProject(session, project);
	if (result.status !== 'updated') {
		throw new Error('A63 Player session replacement failed.');
	}
	return result.session;
}

function place(session: NarrativePlayerSession, characterId: string, locationId: string) {
	return replace(
		session,
		setNarrativeCharacterActualLocation(session.currentProject, characterId, locationId)
	);
}

function wait(session: NarrativePlayerSession, minutes: number) {
	const result = executeNarrativePlayerWait(session, minutes);
	if (result.status !== 'applied') {
		throw new Error('A63 wait rejected: ' + result.summary);
	}
	return result.session;
}

function waitUntil(session: NarrativePlayerSession, day: number, minuteOfDay: number) {
	const now = (session.currentProject.simulation.day - 1) * 1440 +
		session.currentProject.simulation.minuteOfDay;
	const target = (day - 1) * 1440 + minuteOfDay;
	if (target <= now) {
		throw new Error('A63 test requires a future Player moment.');
	}
	return wait(session, target - now);
}

function move(session: NarrativePlayerSession, moveId: string) {
	const result = executeNarrativePlayerAction(session, moveId, playerId);
	if (result.status !== 'applied') {
		throw new Error('A63 Move rejected: ' + result.summary);
	}
	return result.session;
}

function story(session: NarrativePlayerSession, workId: string, decision: 'execute' | 'miss') {
	const result = executeNarrativePlayerStoryWork(session, workId, decision, playerId);
	if (result.status !== 'applied') {
		throw new Error('A63 Story rejected: ' + result.summary);
	}
	return result.session;
}

function trust(session: NarrativePlayerSession, value: number) {
	const project = session.currentProject;
	const existing = project.relationships.find(
		item => item.fromCharacterId === listenerId && item.toCharacterId === contactId
	);
	return replace(session, {
		...project,
		relationships: [
			...project.relationships.filter(
				item => item.fromCharacterId !== listenerId || item.toCharacterId !== contactId
			),
			{
				fromCharacterId: listenerId,
				toCharacterId: contactId,
				values: {...existing?.values, trust: value}
			}
		]
	});
}

/** Explicit presence in the test harness, never an inferred authored schedule. */
function beforeReport(history: History, sourceTrust: number, contactArrives: boolean,
	artifact: NarrativeRuntimeArtifactV1 = compileFixture()) {
	let session = start(artifact);
	session = waitUntil(session, 2, 10 * 60 + 30);
	session = story(session, smsWorkId, 'execute');
	if (history === 'declined') {
		session = move(session, phoneSocialLoopIds.moves.decline);
	} else {
		session = move(session, phoneSocialLoopIds.moves.accept);
		if (history === 'kept') {
			session = waitUntil(session, 2, 19 * 60);
			session = place(session, playerId, phoneSocialLoopIds.locations.dormCourtyard);
			session = place(session, contactId, phoneSocialLoopIds.locations.dormCourtyard);
			session = story(session, meetingWorkId, 'execute');
			session = wait(session, 30);
		} else {
			session = waitUntil(session, 2, 23 * 60 + 1);
			session = story(session, meetingWorkId, 'miss');
		}
	}
	session = waitUntil(session, 3, 8 * 60);
	session = trust(session, sourceTrust);
	if (contactArrives) {
		session = place(session, contactId, dormId);
	}
	return {session, artifact};
}

function occurrences(session: NarrativePlayerSession, moveId: string) {
	return session.currentProject.runtimeOccurrences.filter(
		item => item.type === 'move-outcome' && item.moveId === moveId
	);
}

describe('A63 S2 automatic delivery through ordinary Player wait', () => {
	test.each([
		['kept', 0.65],
		['missed', 0.65],
		['declined', 0.65],
		['kept', 0.3],
		['missed', 0.3],
		['declined', 0.3]
	] as const)('%s history and source trust %s deliver exactly one report and assessment',
		(history, sourceTrust) => {
			const branch = branches[history];
			let {session} = beforeReport(history, sourceTrust, true);
			expect(occurrences(session, branch.report)).toHaveLength(0);
			session = wait(session, 15);
			expect(session.currentProject.simulation).toMatchObject({
				day: 3, minuteOfDay: 8 * 60 + 15
			});
			expect(occurrences(session, branch.report)).toHaveLength(1);
			expect(occurrences(
				session,
				sourceTrust >= 0.5 ? branch.assess : branch.reserve
			)).toHaveLength(1);
			expect(session.currentProject.runtimeOccurrences.filter(
				item => item.type === 'story-work' &&
					item.workId === reportWorkId &&
					item.result === 'executed' &&
					item.moment.day === 3 &&
					item.moment.minuteOfDay === 8 * 60 + 15
			)).toHaveLength(1);
			expect(session.currentProject.simulation.characterKnowledge).toEqual(
				expect.arrayContaining([expect.objectContaining({
					characterId: listenerId,
					claimId: branch.claim,
					source: expect.objectContaining({
						type: 'told',
						sourceCharacterId: contactId
					})
				})])
			);
			expect(session.currentProject.storyNodeStateOverrides[reportId]).toBe('completed');
			expect(session.currentProject.storyNodeStateOverrides[
				rumorSocialEchoIds.story.dormDutyAssessesReport
			]).toBe('completed');
			const echoStoryId = sourceTrust >= 0.5
				? branch.echoStory : rumorSocialEchoIds.story.cautiousEcho;
			expect(session.currentProject.storyNodeStateOverrides[echoStoryId]).toBe('available');
			session = place(session, playerId, dormId);
			const echoMove = sourceTrust >= 0.5
				? branch.echo : rumorSocialEchoIds.moves.cautiousEcho;
			expect(deriveNarrativePlayerPresentation(session.currentProject).actions.some(
				action => action.id === echoMove && action.state === 'ready'
			)).toBe(true);
			session = move(session, echoMove);
			const answer = sourceTrust >= 0.5 ? branch.explain : branch.cautiousExplain;
			expect(deriveNarrativePlayerPresentation(session.currentProject).actions.some(
				action => action.id === answer && action.state === 'ready'
			)).toBe(true);
			session = move(session, answer);
			expect(session.currentProject.storyNodeStateOverrides[
				firsthandSocialRepairIds.story.dayFourAnswered
			]).toBe('available');
			expect(session.currentProject.simulation.characterKnowledge.some(
				item => item.characterId === listenerId &&
					item.source.type === 'told' &&
					item.source.sourceCharacterId === playerId
			)).toBe(true);
			session = wait(session, 60);
			expect(occurrences(session, branch.report)).toHaveLength(1);
		}
	);

	test('absent contact misses the occurrence without inventing Knowledge or presence', () => {
		const {session: before} = beforeReport('declined', 0.65, false);
		expect(before.currentProject.simulation.actualLocationByCharacter[contactId])
			.not.toBe(dormId);
		const after = wait(before, 15);
		expect(occurrences(after, branches.declined.report)).toHaveLength(0);
		expect(after.currentProject.simulation.characterKnowledge.some(
			item => item.characterId === listenerId && item.claimId === branches.declined.claim
		)).toBe(false);
		expect(after.currentProject.runtimeOccurrences.filter(
			item => item.type === 'story-work' &&
				item.workId === reportWorkId && item.result === 'missed'
		)).toHaveLength(1);
		expect(after.currentProject.storyNodeStateOverrides[reportId]).toBe('blocked');
		expect(after.currentProject.storyNodeStateOverrides[
			rumorSocialEchoIds.story.dormDutyAssessesReport
		]).toBeUndefined();
		expect(after.currentProject.simulation.actualLocationByCharacter[contactId])
			.toBe(before.currentProject.simulation.actualLocationByCharacter[contactId]);
		expect(occurrences(wait(after, 60), branches.declined.report)).toHaveLength(0);
	});

	test('one long wait and split waits yield the same social runtime', () => {
		const {session} = beforeReport('kept', 0.3, true);
		const long = wait(session, 120);
		const split = wait(wait(session, 15), 105);
		expect(split.currentProject.simulation).toEqual(long.currentProject.simulation);
		expect(split.currentProject.storyNodeStateOverrides)
			.toEqual(long.currentProject.storyNodeStateOverrides);
		expect(split.currentProject.runtimeOccurrences)
			.toEqual(long.currentProject.runtimeOccurrences);
		expect(split.currentProject.simulation.characterKnowledge)
			.toEqual(long.currentProject.simulation.characterKnowledge);
	});

	test('save before and after delivery preserves a single exact-time occurrence', () => {
		const prepared = beforeReport('missed', 0.65, true);
		const beforeSave = createNarrativePlayerSave(prepared.session);
		const restoredBefore = restoreNarrativePlayerSave(
			start(prepared.artifact), beforeSave
		);
		expect(restoredBefore.status).toBe('restored');
		if (restoredBefore.status !== 'restored') {
			throw new Error('A63 pre-delivery restore failed.');
		}
		let delivered = wait(restoredBefore.session, 15);
		expect(occurrences(delivered, branches.missed.report)).toHaveLength(1);
		const afterSave = createNarrativePlayerSave(delivered);
		const restoredAfter = restoreNarrativePlayerSave(
			start(prepared.artifact), afterSave
		);
		expect(restoredAfter.status).toBe('restored');
		if (restoredAfter.status !== 'restored') {
			throw new Error('A63 post-delivery restore failed.');
		}
		delivered = wait(restoredAfter.session, 60);
		expect(occurrences(delivered, branches.missed.report)).toHaveLength(1);
		expect(delivered.currentProject.runtimeOccurrences.filter(
			item => item.type === 'story-work' &&
				item.workId === reportWorkId && item.result === 'executed'
		)).toHaveLength(1);
	});
});
