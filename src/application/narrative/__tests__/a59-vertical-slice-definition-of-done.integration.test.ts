import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../export-compiler';
import {executeNarrativePlayerAction} from '../player-action';
import {executeNarrativePlayerFoodUse} from '../player-item-use';
import {executeNarrativePlayerItemPlacement} from '../player-item-placement';
import {deriveNarrativePlayerPresentation} from '../player-presentation';
import {executeNarrativePlayerPurchase} from '../player-purchase';
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
import {evaluateNarrativePhysicalAction} from '../physical';
import {consumeNarrativeStoryWork} from '../story-execution';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {dayOneNarrativeIds} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {
	create93DaysEverydaySystemsProject,
	everydaySystemsIds
} from '../../../domain/narrative/content/93-days-everyday-systems';

const playerId = arrivalCorridorIds.characters.player;
const stationOpportunityWorkId =
	`story-node:${dayOneNarrativeIds.story.stationOpportunity}`;
const dormNpcWorkId = `story-node:${dayOneNarrativeIds.story.dormNpcOccurrence}`;

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
		throw new Error(`A59 action failed (${moveId}): ${result.summary}`);
	}
	return result.session;
}

function wait(session: NarrativePlayerSession, minutes: number) {
	const result = executeNarrativePlayerWait(session, minutes);
	if (result.status !== 'applied') {
		throw new Error(`A59 wait failed (${minutes}): ${result.summary}`);
	}
	return result.session;
}

function travel(session: NarrativePlayerSession, routeId: string) {
	const result = executeNarrativePlayerTravel(session, routeId, playerId);
	if (result.status !== 'applied') {
		throw new Error(`A59 travel failed (${routeId}): ${result.summary}`);
	}
	return result.session;
}

function executeStationOpportunity(session: NarrativePlayerSession) {
	const result = executeNarrativePlayerStoryWork(
		session,
		stationOpportunityWorkId,
		'execute',
		playerId
	);
	if (result.status !== 'applied') {
		throw new Error(`A59 station opportunity failed: ${result.summary}`);
	}
	return result.session;
}

function executeDormNpcOccurrence(session: NarrativePlayerSession) {
	const consumed = consumeNarrativeStoryWork(session.currentProject, dormNpcWorkId, {
		decision: 'execute'
	});
	if (consumed.trace.status !== 'completed') {
		throw new Error(
			`A59 NPC-only Story occurrence failed: ${consumed.trace.summary}`
		);
	}
	const replacement = replaceNarrativePlayerSessionProject(
		session,
		consumed.project
	);
	if (replacement.status !== 'updated') {
		throw new Error('A59 NPC-only Story result failed session replacement.');
	}
	return replacement.session;
}

function goodwill(session: NarrativePlayerSession) {
	return session.currentProject.relationships.find(
		relationship =>
			relationship.fromCharacterId ===
				arrivalCorridorIds.characters.stationClerk &&
			relationship.toCharacterId === playerId
	)?.values.goodwill;
}

function playerKnows(session: NarrativePlayerSession, claimId: string) {
	return session.currentProject.simulation.characterKnowledge.some(
		state => state.characterId === playerId && state.claimId === claimId
	);
}

describe('A59-S1 vertical slice Definition of Done', () => {
	test('plays arrival -> Day Two -> save/restore -> continued action through canonical runtime only', () => {
		const source = create93DaysEverydaySystemsProject();
		const authoredStoryBefore = source.storyNodes;
		const compiled = compileNarrativeRuntimeArtifact(source);
		if (compiled.status !== 'compiled') {
			throw new Error('Expected canonical A58 project to compile for A59.');
		}
		expect(
			compiled.artifact.initialRuntime.simulation.actualLocationByCharacter
		).toEqual({});

		let session = startSession(compiled.artifact);
		let view = deriveNarrativePlayerPresentation(session.currentProject);

		expect(session.currentProject.simulation).toMatchObject({
			day: 1,
			minuteOfDay: 6 * 60
		});
		expect(
			session.currentProject.simulation.actualLocationByCharacter[playerId]
		).toBe(arrivalCorridorIds.locations.busStation);
		expect(view.localCharacters.map(character => character.id)).toContain(
			arrivalCorridorIds.characters.stationClerk
		);
		expect(session.currentProject.cashByCharacter[playerId]).toBe(12000);

		session = action(session, dayOneNarrativeIds.moves.callContact);
		session = action(session, dayOneNarrativeIds.moves.askTowerPolitely);
		session = action(session, dayOneNarrativeIds.moves.clarifyTransfer);

		expect(
			playerKnows(session, dayOneNarrativeIds.claims.contactUnavailable)
		).toBe(true);
		expect(
			playerKnows(session, dayOneNarrativeIds.claims.towerTransferRoute)
		).toBe(true);
		expect(goodwill(session)).toBeCloseTo(0.2);

		session = wait(session, 10);
		session = executeStationOpportunity(session);
		expect(
			session.currentProject.runtimeOccurrences.some(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === stationOpportunityWorkId &&
					occurrence.result === 'executed'
			)
		).toBe(true);

		session = travel(
			session,
			arrivalCorridorIds.routes.stationToSquareWalk
		);
		session = travel(session, arrivalCorridorIds.routes.squareToFoodWalk);

		const purchased = executeNarrativePlayerPurchase(
			session,
			everydaySystemsIds.offers.heavyMeal,
			playerId
		);
		expect(purchased.status).toBe('applied');
		if (purchased.status !== 'applied') {
			throw new Error(purchased.summary);
		}
		session = purchased.session;
		expect(session.currentProject.cashByCharacter[playerId]).toBe(10200);

		const packed = executeNarrativePlayerItemPlacement(
			session,
			everydaySystemsIds.items.heavyMeal,
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
		expect(
			session.currentProject.itemPlacementOverrides[
				everydaySystemsIds.items.heavyMeal
			]
		).toEqual({
			type: 'container',
			containerInstanceId: arrivalCorridorIds.items.travelBag
		});

		const eaten = executeNarrativePlayerFoodUse(
			session,
			everydaySystemsIds.items.heavyMeal,
			playerId
		);
		expect(eaten.status).toBe('applied');
		if (eaten.status !== 'applied') {
			throw new Error(eaten.summary);
		}
		session = eaten.session;
		expect(
			session.currentProject.simulation.bodyByCharacter[playerId]
				.digestionRemainingMinutes
		).toBe(30);
		expect(
			evaluateNarrativePhysicalAction(
				session.currentProject,
				playerId,
				'fast-run'
			).allowed
		).toBe(false);

		session = travel(session, arrivalCorridorIds.routes.foodToSquareWalk);
		session = travel(session, arrivalCorridorIds.routes.squareToStopWalk);
		session = travel(
			session,
			arrivalCorridorIds.routes.stopToTowerCityBus
		);
		expect(session.currentProject.cashByCharacter[playerId]).toBe(9600);
		expect(
			session.currentProject.simulation.bodyByCharacter[playerId]
				.digestionRemainingMinutes
		).toBe(0);
		expect(
			evaluateNarrativePhysicalAction(
				session.currentProject,
				playerId,
				'fast-run'
			).allowed
		).toBe(true);

		const untilNpcOccurrence =
			18 * 60 - session.currentProject.simulation.minuteOfDay;
		expect(untilNpcOccurrence).toBeGreaterThan(0);
		session = wait(session, untilNpcOccurrence);
		expect(
			session.currentProject.simulation.actualLocationByCharacter[playerId]
		).toBe(arrivalCorridorIds.locations.waterTowerTransfer);
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

		session = executeDormNpcOccurrence(session);
		expect(
			session.currentProject.runtimeOccurrences.some(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === dormNpcWorkId &&
					occurrence.result === 'executed'
			)
		).toBe(true);
		expect(
			session.currentProject.simulation.actualLocationByCharacter[playerId]
		).toBe(arrivalCorridorIds.locations.waterTowerTransfer);

		session = travel(session, arrivalCorridorIds.routes.towerToDormWalk);
		const bedtime = 22 * 60 + 30;
		const untilBedtime = bedtime - session.currentProject.simulation.minuteOfDay;
		expect(untilBedtime).toBeGreaterThan(0);
		session = wait(session, untilBedtime);

		expect(
			session.currentProject.simulation.bodyByCharacter[playerId].fatigue
		).toBeGreaterThan(0);

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
			day: 2,
			minuteOfDay: 7 * 60 + 30
		});
		expect(
			session.currentProject.simulation.actualLocationByCharacter[playerId]
		).toBe(arrivalCorridorIds.locations.studentDormitory);

		view = deriveNarrativePlayerPresentation(session.currentProject);
		expect(view.actions.map(candidate => candidate.id)).toEqual(
			expect.arrayContaining([
				dayOneNarrativeIds.moves.dayTwoKnownRoute,
				dayOneNarrativeIds.moves.dayTwoSawOpportunity
			])
		);
		expect(view.actions.map(candidate => candidate.id)).not.toEqual(
			expect.arrayContaining([
				dayOneNarrativeIds.moves.dayTwoUnknownRoute,
				dayOneNarrativeIds.moves.dayTwoMissedOpportunity
			])
		);

		const save = createNarrativePlayerSave(session);
		const fresh = startSession(compiled.artifact);
		const restored = restoreNarrativePlayerSave(fresh, save);
		expect(restored.status).toBe('restored');
		if (restored.status !== 'restored') {
			throw new Error('Expected A59 Player save to restore.');
		}

		expect(restored.session.currentProject.cashByCharacter[playerId]).toBe(9600);
		expect(restored.session.currentProject.runtimeOccurrences).toEqual(
			session.currentProject.runtimeOccurrences
		);
		expect(restored.session.currentProject.simulation.characterKnowledge).toEqual(
			session.currentProject.simulation.characterKnowledge
		);
		expect(restored.session.currentProject.relationships).toEqual(
			session.currentProject.relationships
		);

		const continued = executeNarrativePlayerAction(
			restored.session,
			dayOneNarrativeIds.moves.dayTwoKnownRoute,
			playerId
		);
		expect(continued.status).toBe('applied');
		if (continued.status !== 'applied') {
			throw new Error(continued.summary);
		}
		expect(continued.outcomeLabel).toBe(
			'Вчерашняя дорога уже ощущается знакомее'
		);
		expect(
			playerKnows(
				continued.session,
				dayOneNarrativeIds.claims.towerTransferRoute
			)
		).toBe(true);
		expect(
			continued.session.currentProject.runtimeOccurrences.some(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === stationOpportunityWorkId &&
					occurrence.result === 'executed'
			)
		).toBe(true);
		expect(continued.session.currentProject.storyNodes).toEqual(
			authoredStoryBefore
		);
	});
});
