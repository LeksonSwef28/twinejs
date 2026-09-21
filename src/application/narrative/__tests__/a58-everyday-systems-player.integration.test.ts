import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../export-compiler';
import {executeNarrativePlayerAction} from '../player-action';
import {executeNarrativePlayerFoodUse} from '../player-item-use';
import {executeNarrativePlayerItemPlacement} from '../player-item-placement';
import {executeNarrativePlayerPurchase} from '../player-purchase';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession
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
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {
	create93DaysDayOneDayTwoProject,
	dayOneNarrativeIds
} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {
	create93DaysEverydaySystemsProject,
	everydaySystemsIds
} from '../../../domain/narrative/content/93-days-everyday-systems';

const playerId = arrivalCorridorIds.characters.player;
const optionalWorkId = `story-node:${dayOneNarrativeIds.story.stationOpportunity}`;

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

function travel(session: NarrativePlayerSession, routeId: string) {
	const result = executeNarrativePlayerTravel(session, routeId, playerId);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result.session;
}

function story(session: NarrativePlayerSession) {
	const result = executeNarrativePlayerStoryWork(
		session,
		optionalWorkId,
		'execute',
		playerId
	);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result.session;
}

describe('A58-S3 everyday systems full Player integration', () => {
	test('preserves economy/body/item/history through a Day One -> Day Two save restore', () => {
		const source = create93DaysEverydaySystemsProject();
		const a57StoryBefore = JSON.stringify(
			create93DaysDayOneDayTwoProject().storyNodes
		);
		const compiled = compileNarrativeRuntimeArtifact(source);
		if (compiled.status !== 'compiled') {
			throw new Error('Expected A58 project to compile.');
		}

		let session = startSession(compiled.artifact);
		expect(session.currentProject.cashByCharacter[playerId]).toBe(12000);

		session = action(session, dayOneNarrativeIds.moves.callContact);
		session = action(session, dayOneNarrativeIds.moves.askTowerPolitely);
		session = action(session, dayOneNarrativeIds.moves.clarifyTransfer);
		session = wait(session, 10);
		session = story(session);

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

		session = travel(session, arrivalCorridorIds.routes.towerToDormWalk);
		const bedtime = 22 * 60 + 30;
		session = wait(
			session,
			bedtime - session.currentProject.simulation.minuteOfDay
		);
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
		expect(session.currentProject.cashByCharacter[playerId]).toBe(9600);
		expect(
			session.currentProject.itemPlacementOverrides[
				everydaySystemsIds.items.heavyMeal
			]
		).toEqual({type: 'unplaced'});
		expect(
			session.currentProject.runtimeOccurrences.some(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === optionalWorkId &&
					occurrence.result === 'executed'
			)
		).toBe(true);
		expect(JSON.stringify(session.currentProject.storyNodes)).toBe(
			a57StoryBefore
		);

		const save = createNarrativePlayerSave(session);
		const fresh = startSession(compiled.artifact);
		const restored = restoreNarrativePlayerSave(fresh, save);
		expect(restored.status).toBe('restored');
		if (restored.status !== 'restored') {
			throw new Error('Expected A58 save to restore.');
		}

		expect(restored.session.currentProject.cashByCharacter).toEqual(
			session.currentProject.cashByCharacter
		);
		expect(restored.session.currentProject.simulation.bodyByCharacter).toEqual(
			session.currentProject.simulation.bodyByCharacter
		);
		expect(restored.session.currentProject.itemPlacementOverrides).toEqual(
			session.currentProject.itemPlacementOverrides
		);
		expect(restored.session.currentProject.runtimeOccurrences).toEqual(
			session.currentProject.runtimeOccurrences
		);
		expect(restored.session.currentProject.simulation).toMatchObject({
			day: 2,
			minuteOfDay: 7 * 60 + 30
		});
	});
});
