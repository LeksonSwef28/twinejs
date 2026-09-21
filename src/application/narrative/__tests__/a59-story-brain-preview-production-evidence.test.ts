import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../export-compiler';
import {executeNarrativePlayerAction} from '../player-action';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession
} from '../player-runtime';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {
	comparePreviewScenarios,
	createPreviewScenario,
	executePreviewMove,
	forkPreviewScenario,
	setPreviewRuntimeInput
} from '../preview-laboratory';
import {storyBrainNavigationForFinding} from '../story-brain-diagnostic-navigation';
import {
	queryStoryBrain,
	queryStoryBrainProjectDiagnostics
} from '../story-brain-query';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {dayOneNarrativeIds} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {create93DaysEverydaySystemsProject} from '../../../domain/narrative/content/93-days-everyday-systems';
import {NarrativeProject} from '../../../domain/narrative/project';

const playerId = arrivalCorridorIds.characters.player;
const clerkId = arrivalCorridorIds.characters.stationClerk;

function cloneProject(project: NarrativeProject): NarrativeProject {
	return JSON.parse(JSON.stringify(project)) as NarrativeProject;
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

function action(session: NarrativePlayerSession, moveId: string) {
	const result = executeNarrativePlayerAction(session, moveId, playerId);
	if (result.status !== 'applied') {
		throw new Error(`A59 Story Brain setup action failed: ${result.summary}`);
	}
	return result.session;
}

describe('A59-S2 real Story Brain + Preview production evidence', () => {
	test('Story Brain explains a real Day Two action before and after the player learns its route Claim', () => {
		const compiled = compileNarrativeRuntimeArtifact(
			create93DaysEverydaySystemsProject()
		);
		if (compiled.status !== 'compiled') {
			throw new Error('Expected canonical 93 Days project to compile.');
		}
		let session = startSession(compiled.artifact);

		const before = queryStoryBrain(session.currentProject, {
			kind: 'move',
			id: dayOneNarrativeIds.moves.dayTwoKnownRoute
		});
		expect(before.why.moves).toEqual([
			expect.objectContaining({
				moveId: dayOneNarrativeIds.moves.dayTwoKnownRoute,
				availability: 'blocked'
			})
		]);
		expect(before.why.moves[0].guardTraces).toEqual([
			expect.objectContaining({
				status: 'unmet',
				guardId: 'day2-known-route:guard'
			})
		]);

		session = action(session, dayOneNarrativeIds.moves.askTowerPolitely);
		session = action(session, dayOneNarrativeIds.moves.clarifyTransfer);

		const after = queryStoryBrain(session.currentProject, {
			kind: 'move',
			id: dayOneNarrativeIds.moves.dayTwoKnownRoute
		});
		expect(after.why.moves[0]).toEqual(
			expect.objectContaining({
				moveId: dayOneNarrativeIds.moves.dayTwoKnownRoute,
				availability: 'available'
			})
		);
		expect(after.why.moves[0].guardTraces).toEqual([
			expect.objectContaining({
				status: 'met',
				guardId: 'day2-known-route:guard'
			})
		]);
		expect(
			after.focus.entities.map(entity => `${entity.kind}:${entity.id}`)
		).toContain(
			`claim:${dayOneNarrativeIds.claims.towerTransferRoute}`
		);

		const claimImpact = queryStoryBrain(session.currentProject, {
			kind: 'claim',
			id: dayOneNarrativeIds.claims.towerTransferRoute
		});
		expect(
			claimImpact.impact.hits.map(
				hit => `${hit.entity.kind}:${hit.entity.id}`
			)
		).toContain(`move:${dayOneNarrativeIds.moves.dayTwoKnownRoute}`);
	});

	test('Preview forks two real authored clerk choices and exposes downstream relationship/memory differences without touching source', () => {
		const source = create93DaysEverydaySystemsProject();
		const sourceBefore = cloneProject(source);

		let base = createPreviewScenario(source, 'a59-base', 'A59 base');
		base = setPreviewRuntimeInput(base, {
			type: 'actual-location',
			characterId: playerId,
			locationId: arrivalCorridorIds.locations.busStation
		});
		base = setPreviewRuntimeInput(base, {
			type: 'actual-location',
			characterId: clerkId,
			locationId: arrivalCorridorIds.locations.busStation
		});

		const politeStart = forkPreviewScenario(base, 'a59-polite', 'Polite');
		const abruptStart = forkPreviewScenario(base, 'a59-abrupt', 'Abrupt');
		const polite = executePreviewMove(
			politeStart,
			dayOneNarrativeIds.moves.askTowerPolitely
		);
		const abrupt = executePreviewMove(
			abruptStart,
			dayOneNarrativeIds.moves.askAbruptly
		);

		expect(polite.resolution.status).toBe('resolved');
		expect(abrupt.resolution.status).toBe('resolved');
		expect(polite.scenario.actions.at(-1)).toEqual(
			expect.objectContaining({
				kind: 'resolved-outcome',
				moveId: dayOneNarrativeIds.moves.askTowerPolitely,
				forced: false
			})
		);
		expect(abrupt.scenario.actions.at(-1)).toEqual(
			expect.objectContaining({
				kind: 'resolved-outcome',
				moveId: dayOneNarrativeIds.moves.askAbruptly,
				forced: false
			})
		);

		const comparison = comparePreviewScenarios(
			polite.scenario,
			abrupt.scenario
		);
		expect(comparison.changedPaths).toEqual(
			expect.arrayContaining([
				'runtime.relationships',
				'runtime.memories',
				'runtime.runtimeOccurrences'
			])
		);
		expect(comparison.leftOccurrenceIds).not.toEqual(
			comparison.rightOccurrenceIds
		);
		expect(source).toEqual(sourceBefore);
	});

	test('real-slice diagnostics navigate a malformed Day Two Move clone back to its canonical Story source', () => {
		const source = create93DaysEverydaySystemsProject();
		const broken = cloneProject(source);
		const move = broken.narrativeMoves.find(
			candidate => candidate.id === dayOneNarrativeIds.moves.dayTwoKnownRoute
		);
		if (!move) {
			throw new Error('Expected Day Two known-route Move.');
		}
		move.guards = [
			{
				id: 'a59-broken-route-claim',
				condition: {
					type: 'character-knows-claim',
					characterId: playerId,
					claimId: 'a59-missing-route-claim'
				}
			}
		];

		const diagnostics = queryStoryBrainProjectDiagnostics(broken);
		const finding = diagnostics.findings.find(
			candidate =>
				candidate.kind === 'broken-authored-reference' &&
				candidate.ownerKind === 'narrative-move' &&
				candidate.ownerId === dayOneNarrativeIds.moves.dayTwoKnownRoute
		);
		expect(finding).toBeDefined();
		expect(
			finding && storyBrainNavigationForFinding(broken, finding)
		).toEqual({
			focus: {
				kind: 'move',
				id: dayOneNarrativeIds.moves.dayTwoKnownRoute
			},
			workspace: 'story',
			canvasEntityRef: {
				type: 'storyNode',
				id: dayOneNarrativeIds.story.dayTwoMorning
			}
		});
		expect(source.narrativeMoves).toEqual(sourceBefore.narrativeMoves);
	});
});
