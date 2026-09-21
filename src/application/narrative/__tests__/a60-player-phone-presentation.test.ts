import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../export-compiler';
import {executeNarrativePlayerAction} from '../player-action';
import {executeNarrativePlayerItemPlacement} from '../player-item-placement';
import {deriveNarrativePlayerPresentation} from '../player-presentation';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession
} from '../player-runtime';
import {executeNarrativePlayerStoryWork} from '../player-story-work';
import {executeNarrativePlayerWait} from '../player-wait';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {dayOneNarrativeIds} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {
	create93DaysPhoneSocialLoopProject,
	phoneSocialLoopIds
} from '../../../domain/narrative/content/93-days-phone-social-loop';

const playerId = arrivalCorridorIds.characters.player;
const smsWorkId = `story-node:${phoneSocialLoopIds.story.incomingSms}`;

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

function compileFixture() {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysPhoneSocialLoopProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A60 phone presentation fixture to compile.');
	}
	return compiled.artifact;
}

function action(session: NarrativePlayerSession, moveId: string) {
	const result = executeNarrativePlayerAction(session, moveId, playerId);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result.session;
}

function wait(session: NarrativePlayerSession, minutes: number) {
	const result = executeNarrativePlayerWait(session, minutes);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result.session;
}

describe('A60-S3 derived Player phone presentation', () => {
	test('derives phone availability and phone actions from the carried tagged phone, including inside a carried bag', () => {
		let session = startSession(compileFixture());
		let view = deriveNarrativePlayerPresentation(session.currentProject);

		expect(view.phone).toEqual(
			expect.objectContaining({
				status: 'available',
				itemInstanceId: arrivalCorridorIds.items.buttonPhone,
				contacts: [
					expect.objectContaining({
						characterId: dayOneNarrativeIds.characters.localContact
					})
				],
				actions: [
					expect.objectContaining({
						id: dayOneNarrativeIds.moves.callContact
					})
				]
			})
		);
		expect(view.actions.map(item => item.id)).not.toContain(
			dayOneNarrativeIds.moves.callContact
		);

		const packed = executeNarrativePlayerItemPlacement(
			session,
			arrivalCorridorIds.items.buttonPhone,
			{
				type: 'container',
				containerInstanceId: arrivalCorridorIds.items.travelBag
			},
			playerId
		);
		expect(packed.status).toBe('applied');
		if (packed.status !== 'applied') {
			throw new Error(packed.summary);
		}
		session = packed.session;
		view = deriveNarrativePlayerPresentation(session.currentProject);
		expect(view.phone.status).toBe('available');
		if (view.phone.status !== 'available') {
			throw new Error(view.phone.summary);
		}
		expect(view.phone.itemInstanceId).toBe(
			arrivalCorridorIds.items.buttonPhone
		);
	});

	test('projects unread/read SMS and reply actions from canonical Story history without duplicating Событие рядом', () => {
		let session = startSession(compileFixture());
		session = action(session, dayOneNarrativeIds.moves.callContact);

		// Day 1 06:00 -> Day 2 10:30. Communication is locationless.
		session = wait(session, 28 * 60 + 30);
		let view = deriveNarrativePlayerPresentation(session.currentProject);
		expect(view.phone.status).toBe('available');
		if (view.phone.status !== 'available') {
			throw new Error(view.phone.summary);
		}

		expect(view.phone.entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					storyNodeId: dayOneNarrativeIds.story.callContact,
					channel: 'phone-call',
					direction: 'outgoing',
					state: 'handled'
				}),
				expect.objectContaining({
					storyNodeId: phoneSocialLoopIds.story.incomingSms,
					workId: smsWorkId,
					channel: 'sms',
					direction: 'incoming',
					state: 'unread',
					scheduledDay: 2,
					scheduledMinuteOfDay: 10 * 60 + 30
				})
			])
		);
		expect(view.storyOpportunities.map(item => item.id)).not.toContain(
			smsWorkId
		);
		expect(view.phone.actions.map(item => item.id)).not.toEqual(
			expect.arrayContaining([
				phoneSocialLoopIds.moves.accept,
				phoneSocialLoopIds.moves.decline
			])
		);

		const opened = executeNarrativePlayerStoryWork(
			session,
			smsWorkId,
			'execute',
			playerId
		);
		expect(opened.status).toBe('applied');
		if (opened.status !== 'applied') {
			throw new Error(opened.summary);
		}
		session = opened.session;
		view = deriveNarrativePlayerPresentation(session.currentProject);
		expect(view.phone.status).toBe('available');
		if (view.phone.status !== 'available') {
			throw new Error(view.phone.summary);
		}
		expect(view.phone.entries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					storyNodeId: phoneSocialLoopIds.story.incomingSms,
					state: 'read'
				})
			])
		);
		expect(view.phone.actions.map(item => item.id)).toEqual(
			expect.arrayContaining([
				phoneSocialLoopIds.moves.accept,
				phoneSocialLoopIds.moves.decline
			])
		);
		expect(view.actions.map(item => item.id)).not.toEqual(
			expect.arrayContaining([
				phoneSocialLoopIds.moves.accept,
				phoneSocialLoopIds.moves.decline
			])
		);
	});
});
