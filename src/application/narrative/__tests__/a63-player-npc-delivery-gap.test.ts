import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../export-compiler';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession
} from '../player-runtime';
import {executeNarrativePlayerAction} from '../player-action';
import {executeNarrativePlayerStoryWork} from '../player-story-work';
import {executeNarrativePlayerWait} from '../player-wait';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {
	create93DaysFirsthandSocialRepairProject
} from '../../../domain/narrative/content/93-days-firsthand-social-repair';
import {phoneSocialLoopIds} from '../../../domain/narrative/content/93-days-phone-social-loop';
import {rumorSocialEchoIds} from '../../../domain/narrative/content/93-days-rumor-social-echo';

const playerId = arrivalCorridorIds.characters.player;
const smsWorkId = 'story-node:' + phoneSocialLoopIds.story.incomingSms;
const rumorWorkId = 'story-node:' + rumorSocialEchoIds.story.contactReportsToDormDuty;

function compileFixture(): NarrativeRuntimeArtifactV1 {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysFirsthandSocialRepairProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error(
			'Expected A63 source project to compile: ' +
				compiled.diagnostics.map(item => item.source).join(', ')
		);
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

function wait(session: NarrativePlayerSession, minutes: number) {
	const result = executeNarrativePlayerWait(session, minutes);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result;
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
	if (target <= current) {
		throw new Error('A63 gap fixture requires a future target.');
	}
	return wait(session, target - current);
}

function action(session: NarrativePlayerSession, moveId: string) {
	const result = executeNarrativePlayerAction(session, moveId, playerId);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
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
		throw new Error(result.summary);
	}
	return result.session;
}

/**
 * E0 evidence test. This deliberately captures the repository state before A63:
 * due work is discovered by ordinary Player time progression, but it is not
 * delivered into the existing Story/Move/NPC execution boundaries.
 *
 * This test must be replaced by positive delivery expectations in A63-S1.
 */
describe('A63 E0 Player NPC delivery gap', () => {
	test('ordinary Player wait discovers the Day Three rumor work without executing it', () => {
		const artifact = compileFixture();
		let session = start(artifact);

		const sms = waitUntil(session, 2, 10 * 60 + 30);
		session = story(sms.session, smsWorkId, 'execute');
		session = action(session, phoneSocialLoopIds.moves.decline);

		const dayThree = waitUntil(session, 3, 8 * 60 + 15);
		session = dayThree.session;

		expect(dayThree.dueWorkIds).toContain(rumorWorkId);
		expect(
			session.currentProject.simulation.characterKnowledge.some(
				item =>
					item.characterId === arrivalCorridorIds.characters.dormDuty &&
					Object.values(rumorSocialEchoIds.claims).includes(
						item.claimId as typeof rumorSocialEchoIds.claims.keptMeeting
					)
			)
		).toBe(false);
		expect(
			session.currentProject.runtimeOccurrences.some(
				item =>
					item.type === 'move-outcome' &&
					item.storyNodeId === rumorSocialEchoIds.story.contactReportsToDormDuty
			)
		).toBe(false);
		expect(
			session.currentProject.storyNodeStateOverrides[
				rumorSocialEchoIds.story.contactReportsToDormDuty
			]
		).toBeUndefined();
		expect(
			session.currentProject.storyNodeStateOverrides[
				rumorSocialEchoIds.story.dormDutyAssessesReport
			]
		).toBeUndefined();
	});

	test('crossing the same due moment in one long wait still only returns declarative work', () => {
		const artifact = compileFixture();
		let session = start(artifact);
		const sms = waitUntil(session, 2, 10 * 60 + 30);
		session = story(sms.session, smsWorkId, 'execute');
		session = action(session, phoneSocialLoopIds.moves.decline);

		const current =
			(session.currentProject.simulation.day - 1) * 1440 +
			session.currentProject.simulation.minuteOfDay;
		const target = (3 - 1) * 1440 + 10 * 60;
		const crossed = wait(session, target - current);

		expect(crossed.dueWorkIds).toContain(rumorWorkId);
		expect(crossed.session.currentProject.simulation).toMatchObject({
			day: 3,
			minuteOfDay: 10 * 60
		});
		expect(
			crossed.session.currentProject.runtimeOccurrences.some(
				item => item.storyNodeId === rumorSocialEchoIds.story.contactReportsToDormDuty
			)
		).toBe(false);
	});
});
