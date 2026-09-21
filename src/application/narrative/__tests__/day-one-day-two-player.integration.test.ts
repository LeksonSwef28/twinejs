import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1,
	serializeNarrativeRuntimeArtifact
} from '../export-compiler';
import {deriveNarrativePlayerPresentation} from '../player-presentation';
import {executeNarrativePlayerAction} from '../player-action';
import {
	NarrativePlayerSession,
	materializeNarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from '../player-runtime';
import {executeNarrativePlayerSleep} from '../player-sleep';
import {executeNarrativePlayerStoryWork} from '../player-story-work';
import {executeNarrativePlayerTravel} from '../player-travel';
import {executeNarrativePlayerWait} from '../player-wait';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {consumeNarrativeStoryWork} from '../story-execution';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {
	create93DaysDayOneDayTwoProject,
	dayOneNarrativeIds
} from '../../../domain/narrative/content/93-days-day-one-day-two';

const playerId = arrivalCorridorIds.characters.player;
const optionalWorkId = `story-node:${dayOneNarrativeIds.story.stationOpportunity}`;

function startSession(artifact: NarrativeRuntimeArtifactV1) {
	const materialized = materializeNarrativePlayerSession(artifact);
	if (materialized.status !== 'ready') {
		throw new Error(`A57 artifact failed to materialize: ${materialized.summary}`);
	}
	const started = bootstrapNarrativePlayerWorldStart(materialized.session);
	if (started.status === 'rejected') {
		throw new Error(`A57 world start failed: ${started.summary}`);
	}
	return started.session;
}

function action(session: NarrativePlayerSession, moveId: string) {
	const result = executeNarrativePlayerAction(session, moveId, playerId);
	if (result.status !== 'applied') {
		throw new Error(`A57 action failed (${moveId}): ${result.summary}`);
	}
	return result.session;
}

function wait(session: NarrativePlayerSession, minutes: number) {
	const result = executeNarrativePlayerWait(session, minutes);
	if (result.status !== 'applied') {
		throw new Error(`A57 wait failed (${minutes}): ${result.summary}`);
	}
	return result.session;
}

function story(
	session: NarrativePlayerSession,
	decision: 'execute' | 'miss'
) {
	const result = executeNarrativePlayerStoryWork(
		session,
		optionalWorkId,
		decision,
		playerId
	);
	if (result.status !== 'applied') {
		throw new Error(`A57 Story work failed (${decision}): ${result.summary}`);
	}
	return result.session;
}

function travel(session: NarrativePlayerSession, routeId: string) {
	const result = executeNarrativePlayerTravel(session, routeId, playerId);
	if (result.status !== 'applied') {
		throw new Error(`A57 travel failed (${routeId}): ${result.summary}`);
	}
	return result.session;
}

function sleep(session: NarrativePlayerSession) {
	const result = executeNarrativePlayerSleep(
		session,
		'day1-dorm-overnight-sleep',
		playerId
	);
	if (result.status !== 'applied') {
		throw new Error(`A57 sleep failed: ${result.summary}`);
	}
	return result.session;
}

function reachDorm(session: NarrativePlayerSession) {
	let current = travel(session, arrivalCorridorIds.routes.stationToSquareWalk);
	current = travel(current, arrivalCorridorIds.routes.squareToStopWalk);
	current = travel(current, arrivalCorridorIds.routes.stopToTowerRouteTaxi);
	current = travel(current, arrivalCorridorIds.routes.towerToDormWalk);
	return current;
}

function finishDayOne(session: NarrativePlayerSession) {
	const bedtimeMinute = 22 * 60 + 30;
	const now = session.currentProject.simulation;
	if (now.day !== 1 || now.minuteOfDay >= bedtimeMinute) {
		throw new Error('Expected to reach the dorm before authored bedtime on Day One.');
	}
	return sleep(wait(session, bedtimeMinute - now.minuteOfDay));
}

function goodwill(session: NarrativePlayerSession) {
	return session.currentProject.relationships.find(
		relationship =>
			relationship.fromCharacterId === arrivalCorridorIds.characters.stationClerk &&
			relationship.toCharacterId === playerId
	)?.values.goodwill;
}

function knowsExactRoute(session: NarrativePlayerSession) {
	return session.currentProject.simulation.characterKnowledge.some(
		state =>
			state.characterId === playerId &&
			state.claimId === dayOneNarrativeIds.claims.towerTransferRoute
	);
}

describe('A57-S3 divergent Day One -> Day Two player runs', () => {
	test('materializes two valid histories from one compiled artifact without mutating authored definitions', () => {
		const sourceProject = create93DaysDayOneDayTwoProject();
		const compiled = compileNarrativeRuntimeArtifact(sourceProject);
		if (compiled.status !== 'compiled') {
			throw new Error('Expected A57 project to compile.');
		}
		expect(
			compiled.artifact.initialRuntime.simulation.actualLocationByCharacter
		).toEqual({});
		const artifactBefore = serializeNarrativeRuntimeArtifact(compiled.artifact);
		const authoredStoryBefore = JSON.stringify(compiled.artifact.authored.storyNodes);
		const authoredMovesBefore = JSON.stringify(
			compiled.artifact.authored.narrativeMoves
		);

		let runA = startSession(compiled.artifact);
		runA = action(runA, dayOneNarrativeIds.moves.callContact);
		runA = action(runA, dayOneNarrativeIds.moves.askTowerPolitely);
		runA = action(runA, dayOneNarrativeIds.moves.clarifyTransfer);
		runA = wait(runA, 10);
		runA = story(runA, 'execute');
		runA = reachDorm(runA);
		runA = finishDayOne(runA);

		let runB = startSession(compiled.artifact);
		runB = action(runB, dayOneNarrativeIds.moves.callContact);
		runB = action(runB, dayOneNarrativeIds.moves.askAbruptly);
		runB = action(runB, dayOneNarrativeIds.moves.thankAndLeave);
		runB = wait(runB, 10);
		runB = story(runB, 'miss');
		runB = reachDorm(runB);
		runB = finishDayOne(runB);

		for (const run of [runA, runB]) {
			expect(run.currentProject.simulation).toMatchObject({
				day: 2,
				minuteOfDay: 7 * 60 + 30
			});
			expect(
				run.currentProject.simulation.actualLocationByCharacter[playerId]
			).toBe(arrivalCorridorIds.locations.studentDormitory);
			expect(
				run.currentProject.simulation.characterKnowledge.some(
					state =>
						state.characterId === playerId &&
						state.claimId === dayOneNarrativeIds.claims.contactUnavailable
				)
			).toBe(true);
		}

		expect(goodwill(runA)).toBeCloseTo(0.2);
		expect(goodwill(runB)).toBeCloseTo(-0.05);
		expect(knowsExactRoute(runA)).toBe(true);
		expect(knowsExactRoute(runB)).toBe(false);

		expect(
			runA.currentProject.runtimeOccurrences.find(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === optionalWorkId
			)
		).toEqual(expect.objectContaining({result: 'executed'}));
		expect(
			runB.currentProject.runtimeOccurrences.find(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === optionalWorkId
			)
		).toEqual(expect.objectContaining({result: 'missed'}));
		expect(runA.currentProject.runtimeOccurrences).not.toEqual(
			runB.currentProject.runtimeOccurrences
		);

		expect(
			runA.currentProject.storyNodeStateOverrides[
				dayOneNarrativeIds.story.stationOpportunity
			]
		).toBe('completed');
		expect(
			runB.currentProject.storyNodeStateOverrides[
				dayOneNarrativeIds.story.stationOpportunity
			]
		).toBe('blocked');

		const actionsA = deriveNarrativePlayerPresentation(runA.currentProject).actions.map(
			action => action.id
		);
		const actionsB = deriveNarrativePlayerPresentation(runB.currentProject).actions.map(
			action => action.id
		);
		expect(actionsA).toEqual(
			expect.arrayContaining([
				dayOneNarrativeIds.moves.dayTwoKnownRoute,
				dayOneNarrativeIds.moves.dayTwoSawOpportunity
			])
		);
		expect(actionsA).not.toEqual(
			expect.arrayContaining([
				dayOneNarrativeIds.moves.dayTwoUnknownRoute,
				dayOneNarrativeIds.moves.dayTwoMissedOpportunity
			])
		);
		expect(actionsB).toEqual(
			expect.arrayContaining([
				dayOneNarrativeIds.moves.dayTwoUnknownRoute,
				dayOneNarrativeIds.moves.dayTwoMissedOpportunity
			])
		);
		expect(actionsB).not.toEqual(
			expect.arrayContaining([
				dayOneNarrativeIds.moves.dayTwoKnownRoute,
				dayOneNarrativeIds.moves.dayTwoSawOpportunity
			])
		);

		expect(JSON.stringify(runA.currentProject.storyNodes)).toBe(authoredStoryBefore);
		expect(JSON.stringify(runB.currentProject.storyNodes)).toBe(authoredStoryBefore);
		expect(JSON.stringify(runA.currentProject.narrativeMoves)).toBe(
			authoredMovesBefore
		);
		expect(JSON.stringify(runB.currentProject.narrativeMoves)).toBe(
			authoredMovesBefore
		);
		expect(serializeNarrativeRuntimeArtifact(compiled.artifact)).toBe(
			artifactBefore
		);
	});

	test('records the authored NPC-only occurrence while the protagonist remains elsewhere', () => {
		const compiled = compileNarrativeRuntimeArtifact(
			create93DaysDayOneDayTwoProject()
		);
		if (compiled.status !== 'compiled') {
			throw new Error('Expected A57 project to compile.');
		}
		let session = startSession(compiled.artifact);
		session = wait(session, 12 * 60);

		expect(session.currentProject.simulation).toMatchObject({
			day: 1,
			minuteOfDay: 18 * 60
		});
		expect(
			session.currentProject.simulation.actualLocationByCharacter[playerId]
		).toBe(arrivalCorridorIds.locations.busStation);
		expect(
			session.currentProject.simulation.actualLocationByCharacter[
				arrivalCorridorIds.characters.dormDuty
			]
		).toBe(arrivalCorridorIds.locations.studentDormitory);
		expect(
			session.currentProject.simulation.actualLocationByCharacter[
				dayOneNarrativeIds.characters.dormResident
			]
		).toBe(arrivalCorridorIds.locations.studentDormitory);

		const workId = `story-node:${dayOneNarrativeIds.story.dormNpcOccurrence}`;
		const consumed = consumeNarrativeStoryWork(session.currentProject, workId, {
			decision: 'execute'
		});
		expect(consumed.trace.status).toBe('completed');
		const replacement = replaceNarrativePlayerSessionProject(
			session,
			consumed.project
		);
		if (replacement.status !== 'updated') {
			throw new Error('Expected NPC-only Story result to enter the player session.');
		}
		session = replacement.session;

		expect(
			session.currentProject.runtimeOccurrences.find(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === workId
			)
		).toEqual(
			expect.objectContaining({
				storyNodeId: dayOneNarrativeIds.story.dormNpcOccurrence,
				result: 'executed'
			})
		);
		expect(
			session.currentProject.simulation.actualLocationByCharacter[playerId]
		).toBe(arrivalCorridorIds.locations.busStation);
	});
});
