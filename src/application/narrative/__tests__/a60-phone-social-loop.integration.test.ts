import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../export-compiler';
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
import {executeNarrativePlayerSleep} from '../player-sleep';
import {executeNarrativePlayerStoryWork} from '../player-story-work';
import {executeNarrativePlayerTravel} from '../player-travel';
import {executeNarrativePlayerWait} from '../player-wait';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {
	narrativeRuntimeStoryNodes,
	setNarrativeCharacterActualLocation
} from '../living-simulation';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {dayOneNarrativeIds} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {
	create93DaysPhoneSocialLoopProject,
	phoneSocialLoopIds
} from '../../../domain/narrative/content/93-days-phone-social-loop';

const playerId = arrivalCorridorIds.characters.player;
const contactId = dayOneNarrativeIds.characters.localContact;
const smsWorkId = `story-node:${phoneSocialLoopIds.story.incomingSms}`;
const meetingWorkId = `story-node:${phoneSocialLoopIds.story.meeting}`;

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

function action(session: NarrativePlayerSession, moveId: string) {
	const result = executeNarrativePlayerAction(session, moveId, playerId);
	if (result.status !== 'applied') {
		throw new Error(`A60 action failed (${moveId}): ${result.summary}`);
	}
	return result.session;
}

function wait(session: NarrativePlayerSession, minutes: number) {
	const result = executeNarrativePlayerWait(session, minutes);
	if (result.status !== 'applied') {
		throw new Error(`A60 wait failed (${minutes}): ${result.summary}`);
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
		throw new Error('A60 waitUntil target is in the past.');
	}
	return wait(session, target - current);
}

function travel(session: NarrativePlayerSession, routeId: string) {
	const result = executeNarrativePlayerTravel(session, routeId, playerId);
	if (result.status !== 'applied') {
		throw new Error(`A60 travel failed (${routeId}): ${result.summary}`);
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
		throw new Error(`A60 Story work failed (${workId}): ${result.summary}`);
	}
	return result;
}

function storyState(session: NarrativePlayerSession, storyNodeId: string) {
	return narrativeRuntimeStoryNodes(session.currentProject).find(
		node => node.id === storyNodeId
	)?.activationState;
}

function contactGoodwill(session: NarrativePlayerSession) {
	return (
		session.currentProject.relationships.find(
			relationship =>
				relationship.fromCharacterId === contactId &&
				relationship.toCharacterId === playerId
		)?.values.goodwill ?? 0
	);
}

function reachDayTwoSms(artifact: NarrativeRuntimeArtifactV1) {
	let session = startSession(artifact);
	session = action(session, dayOneNarrativeIds.moves.callContact);
	session = travel(session, arrivalCorridorIds.routes.stationToSquareWalk);
	session = travel(session, arrivalCorridorIds.routes.squareToStopWalk);
	session = travel(session, arrivalCorridorIds.routes.stopToDormCityBus);
	session = waitUntil(session, 1, 22 * 60 + 30);

	const slept = executeNarrativePlayerSleep(
		session,
		'day1-dorm-overnight-sleep',
		playerId
	);
	if (slept.status !== 'applied') {
		throw new Error(slept.summary);
	}
	session = slept.session;
	session = waitUntil(session, 2, 10 * 60 + 30);

	return session;
}

function readSms(session: NarrativePlayerSession) {
	const before = deriveNarrativePlayerPresentation(session.currentProject);
	expect(before.phone.status).toBe('available');
	if (before.phone.status !== 'available') {
		throw new Error(before.phone.summary);
	}
	expect(before.phone.entries).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				workId: smsWorkId,
				storyNodeId: phoneSocialLoopIds.story.incomingSms,
				state: 'unread'
			})
		])
	);
	expect(before.storyOpportunities.map(item => item.id)).not.toContain(smsWorkId);
	const read = storyWork(session, smsWorkId, 'execute');
	expect(read.result).toBe('completed');
	expect(storyState(read.session, phoneSocialLoopIds.story.incomingSms)).toBe(
		'completed'
	);
	return read.session;
}

function compileFixture() {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysPhoneSocialLoopProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error(
			`Expected A60 project to compile: ${compiled.diagnostics
				.map(item => item.source)
				.join(', ')}`
		);
	}
	return compiled.artifact;
}

describe('A60-S1 content-only phone social loop', () => {
	test('SMS -> accept -> flexible physical meeting -> save/restore -> Day Three social echo', () => {
		const artifact = compileFixture();
		let session = readSms(reachDayTwoSms(artifact));

		let view = deriveNarrativePlayerPresentation(session.currentProject);
		expect(view.actions.map(item => item.id)).toEqual(
			expect.arrayContaining([
				phoneSocialLoopIds.moves.accept,
				phoneSocialLoopIds.moves.decline
			])
		);

		session = action(session, phoneSocialLoopIds.moves.accept);
		expect(storyState(session, phoneSocialLoopIds.story.meeting)).toBe(
			'available'
		);
		expect(view.actions.map(item => item.id)).not.toContain(
			phoneSocialLoopIds.moves.metEcho
		);

		session = waitUntil(session, 2, 18 * 60 + 55);
		const withContact = setNarrativeCharacterActualLocation(
			session.currentProject,
			contactId,
			phoneSocialLoopIds.locations.dormCourtyard
		);
		const replaced = replaceNarrativePlayerSessionProject(session, withContact);
		expect(replaced.status).toBe('updated');
		if (replaced.status !== 'updated') {
			throw new Error('Expected explicit contact Actual Presence update.');
		}
		session = replaced.session;

		session = travel(session, phoneSocialLoopIds.routes.dormToCourtyard);
		session = waitUntil(session, 2, 19 * 60);
		view = deriveNarrativePlayerPresentation(session.currentProject);
		expect(view.localCharacters.map(character => character.id)).toContain(
			contactId
		);
		expect(view.storyOpportunities).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: meetingWorkId,
					state: 'ready',
					locationName: 'Двор общежития'
				})
			])
		);

		const meeting = storyWork(session, meetingWorkId, 'execute');
		expect(meeting.result).toBe('started');
		session = wait(meeting.session, 30);
		expect(storyState(session, phoneSocialLoopIds.story.meeting)).toBe(
			'completed'
		);
		expect(
			session.currentProject.runtimeOccurrences.some(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === meetingWorkId &&
					occurrence.result === 'executed'
			)
		).toBe(true);

		session = travel(session, phoneSocialLoopIds.routes.courtyardToDorm);
		session = waitUntil(session, 2, 22 * 60 + 30);
		const slept = executeNarrativePlayerSleep(
			session,
			'day1-dorm-overnight-sleep',
			playerId
		);
		expect(slept.status).toBe('applied');
		if (slept.status !== 'applied') {
			throw new Error(slept.summary);
		}
		session = slept.session;
		expect(session.currentProject.simulation).toMatchObject({
			day: 3,
			minuteOfDay: 7 * 60 + 30
		});

		view = deriveNarrativePlayerPresentation(session.currentProject);
		expect(view.actions.map(item => item.id)).toContain(
			phoneSocialLoopIds.moves.metEcho
		);
		expect(view.actions.map(item => item.id)).not.toEqual(
			expect.arrayContaining([
				phoneSocialLoopIds.moves.missedEcho,
				phoneSocialLoopIds.moves.declinedEcho
			])
		);

		const save = createNarrativePlayerSave(session);
		const restored = restoreNarrativePlayerSave(startSession(artifact), save);
		expect(restored.status).toBe('restored');
		if (restored.status !== 'restored') {
			throw new Error('Expected A60 accepted meeting branch to restore.');
		}
		const continued = action(
			restored.session,
			phoneSocialLoopIds.moves.metEcho
		);
		expect(contactGoodwill(continued)).toBeCloseTo(0.15);
		expect(
			continued.currentProject.runtimeOccurrences.some(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === meetingWorkId &&
					occurrence.result === 'executed'
			)
		).toBe(true);
	});

	test('accepted invitation can expire into a missed-meeting history and different Day Three consequence', () => {
		const artifact = compileFixture();
		let session = readSms(reachDayTwoSms(artifact));
		session = action(session, phoneSocialLoopIds.moves.accept);
		session = waitUntil(session, 2, 23 * 60 + 1);

		const view = deriveNarrativePlayerPresentation(session.currentProject);
		expect(view.storyOpportunities).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: meetingWorkId,
					state: 'expired'
				})
			])
		);

		const missed = storyWork(session, meetingWorkId, 'miss');
		expect(missed.result).toBe('expired');
		session = missed.session;
		expect(storyState(session, phoneSocialLoopIds.story.meeting)).toBe(
			'blocked'
		);
		expect(
			session.currentProject.runtimeOccurrences.some(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === meetingWorkId &&
					occurrence.result === 'missed'
			)
		).toBe(true);

		const slept = executeNarrativePlayerSleep(
			session,
			'day1-dorm-overnight-sleep',
			playerId
		);
		expect(slept.status).toBe('applied');
		if (slept.status !== 'applied') {
			throw new Error(slept.summary);
		}
		session = slept.session;

		const dayThree = deriveNarrativePlayerPresentation(session.currentProject);
		expect(dayThree.actions.map(item => item.id)).toContain(
			phoneSocialLoopIds.moves.missedEcho
		);
		expect(dayThree.actions.map(item => item.id)).not.toContain(
			phoneSocialLoopIds.moves.metEcho
		);
		const echoed = action(session, phoneSocialLoopIds.moves.missedEcho);
		expect(contactGoodwill(echoed)).toBeCloseTo(-0.15);
	});

	test('declining in advance blocks the meeting but remains distinct from missing an accepted promise', () => {
		const artifact = compileFixture();
		let session = readSms(reachDayTwoSms(artifact));
		session = action(session, phoneSocialLoopIds.moves.decline);

		expect(storyState(session, phoneSocialLoopIds.story.meeting)).toBe(
			'blocked'
		);
		expect(
			deriveNarrativePlayerPresentation(session.currentProject)
				.storyOpportunities.map(item => item.id)
		).not.toContain(meetingWorkId);

		session = waitUntil(session, 2, 22 * 60 + 30);
		const slept = executeNarrativePlayerSleep(
			session,
			'day1-dorm-overnight-sleep',
			playerId
		);
		expect(slept.status).toBe('applied');
		if (slept.status !== 'applied') {
			throw new Error(slept.summary);
		}
		session = slept.session;

		const dayThree = deriveNarrativePlayerPresentation(session.currentProject);
		expect(dayThree.actions.map(item => item.id)).toContain(
			phoneSocialLoopIds.moves.declinedEcho
		);
		expect(dayThree.actions.map(item => item.id)).not.toContain(
			phoneSocialLoopIds.moves.missedEcho
		);
		const echoed = action(session, phoneSocialLoopIds.moves.declinedEcho);
		expect(contactGoodwill(echoed)).toBe(0);
	});
});
