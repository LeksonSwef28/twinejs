import {compileNarrativeRuntimeArtifact, NarrativeRuntimeArtifactV1} from '../export-compiler';
import {executeNarrativePlayerAction} from '../player-action';
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
	create93DaysFirstWeekProject,
	firstWeekIds,
	firstWeekProjectId
} from '../../../domain/narrative/content/93-days-first-week';
import {phoneSocialLoopIds} from '../../../domain/narrative/content/93-days-phone-social-loop';
import {
	a63ContactArrivalStoryId
} from '../../../domain/narrative/content/93-days-player-npc-social-delivery';
import {rumorSocialEchoIds} from '../../../domain/narrative/content/93-days-rumor-social-echo';

const playerId = arrivalCorridorIds.characters.player;
const contactId = dayOneNarrativeIds.characters.localContact;
const smsWorkId = 'story-node:' + phoneSocialLoopIds.story.incomingSms;
const reportWorkId = 'story-node:' + rumorSocialEchoIds.story.contactReportsToDormDuty;

function compileFixture(): NarrativeRuntimeArtifactV1 {
	const compiled = compileNarrativeRuntimeArtifact(create93DaysFirstWeekProject());
	if (compiled.status !== 'compiled') {
		throw new Error(
			compiled.diagnostics.map(item => item.source).join('\n')
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
	return result.session;
}

function waitUntil(
	session: NarrativePlayerSession,
	day: number,
	minuteOfDay: number
) {
	const now =
		(session.currentProject.simulation.day - 1) * 24 * 60 +
		session.currentProject.simulation.minuteOfDay;
	const target = (day - 1) * 24 * 60 + minuteOfDay;
	if (target <= now) {
		throw new Error('A67 first-week test requires a future target.');
	}
	return wait(session, target - now);
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

function action(session: NarrativePlayerSession, moveId: string) {
	const result = executeNarrativePlayerAction(session, moveId, playerId);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result.session;
}

describe('A67-W1 first-week content skeleton', () => {
	test('extends the existing Day 1-4 production project without a new schema', () => {
		const project = create93DaysFirstWeekProject();

		expect(project.projectId).toBe(firstWeekProjectId);
		expect(project.schemaVersion).toBe(3);
		expect(
			project.storyNodes.some(
				node => node.id === rumorSocialEchoIds.story.contactReportsToDormDuty
			)
		).toBe(true);
		expect(
			project.locations.map(location => location.id)
		).toEqual(
			expect.arrayContaining([
				firstWeekIds.locations.oldMarket,
				firstWeekIds.locations.oldCinema
			])
		);
		expect(
			project.characters.some(
				character => character.id === firstWeekIds.characters.cameraStudent
			)
		).toBe(true);
	});

	test('keeps Old City market and cinema as separate canonical locations', () => {
		const project = create93DaysFirstWeekProject();
		const market = project.locations.find(
			location => location.id === firstWeekIds.locations.oldMarket
		);
		const cinema = project.locations.find(
			location => location.id === firstWeekIds.locations.oldCinema
		);

		expect(market?.name).toBe('Старый рынок');
		expect(cinema?.name).toBe('Старый кинотеатр');
		expect(firstWeekIds.locations.oldMarket).not.toBe(
			firstWeekIds.locations.oldCinema
		);
	});

	test('places a coherent Day 5-7 topology into canonical Story data', () => {
		const project = create93DaysFirstWeekProject();
		const nodes = Object.fromEntries(
			project.storyNodes.map(node => [node.id, node])
		);

		expect(nodes[firstWeekIds.story.dayFiveMarketIntroduction].placement).toMatchObject({
			day: 5,
			locationId: firstWeekIds.locations.oldMarket
		});
		expect(nodes[firstWeekIds.story.daySixCinema].placement).toMatchObject({
			day: 6,
			locationId: firstWeekIds.locations.oldCinema
		});
		expect(nodes[firstWeekIds.story.daySixDormCounterline].placement).toMatchObject({
			day: 6,
			locationId: arrivalCorridorIds.locations.studentDormitory
		});
		expect(nodes[firstWeekIds.story.daySevenWeekEcho].placement).toMatchObject({
			day: 7,
			locationId: arrivalCorridorIds.locations.studentDormitory
		});
		expect(nodes[firstWeekIds.story.daySevenWeekEcho].activationState).toBe(
			'dormant'
		);
	});

	test('adds ordinary routes and routine data for the new social hub', () => {
		const project = create93DaysFirstWeekProject();

		expect(project.travelRoutes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.routes.dormToMarketBus,
					destinationLocationId: firstWeekIds.locations.oldMarket
				}),
				expect.objectContaining({
					id: firstWeekIds.routes.marketToCinemaWalk,
					originLocationId: firstWeekIds.locations.oldMarket,
					destinationLocationId: firstWeekIds.locations.oldCinema
				})
			])
		);
		expect(project.routineRules).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.routines.cameraStudentMarket,
					characterId: firstWeekIds.characters.cameraStudent,
					targetLocationId: firstWeekIds.locations.oldMarket
				}),
				expect.objectContaining({
					id: firstWeekIds.routines.cameraStudentCinema,
					characterId: firstWeekIds.characters.cameraStudent,
					targetLocationId: firstWeekIds.locations.oldCinema
				})
			])
		);
	});

	test('still compiles through the canonical runtime artifact compiler', () => {
		const compiled = compileNarrativeRuntimeArtifact(
			create93DaysFirstWeekProject()
		);

		expect(compiled.status).toBe('compiled');
		if (compiled.status !== 'compiled') {
			throw new Error(
				compiled.diagnostics.map(item => item.source).join('\n')
			);
		}
		expect(compiled.artifact.authored.projectId).toBe(firstWeekProjectId);
	});

	test('preserves inherited A63 exact-time Day Three NPC delivery', () => {
		let session = start(compileFixture());

		session = waitUntil(session, 2, 10 * 60 + 30);
		session = story(session, smsWorkId, 'execute');
		session = action(session, phoneSocialLoopIds.moves.decline);
		session = waitUntil(session, 3, 8 * 60 + 15);

		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'story-work' &&
					item.storyNodeId === a63ContactArrivalStoryId &&
					item.result === 'executed' &&
					item.moment.day === 3 &&
					item.moment.minuteOfDay === 8 * 60 + 15
			)
		).toHaveLength(1);
		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'story-work' &&
					item.workId === reportWorkId &&
					item.result === 'executed' &&
					item.moment.day === 3 &&
					item.moment.minuteOfDay === 8 * 60 + 15
			)
		).toHaveLength(1);
		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'move-outcome' &&
					item.moveId === rumorSocialEchoIds.moves.reportDeclined
			)
		).toHaveLength(1);
		expect(
			session.currentProject.simulation.characterKnowledge.some(
				item =>
					item.characterId === arrivalCorridorIds.characters.dormDuty &&
					item.claimId === rumorSocialEchoIds.claims.declinedMeeting &&
					item.source.type === 'told' &&
					item.source.sourceCharacterId === contactId
			)
		).toBe(true);
	});
});
