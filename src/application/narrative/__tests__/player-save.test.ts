import {ItemDefinition, ItemInstance} from '../../../domain/narrative/items';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {projectNarrativePersistence} from '../../../store/narrative-project/persistence-projection';
import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {setNarrativeCharacterActualLocation} from '../living-simulation';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from '../player-runtime';
import {
	createNarrativePlayerSave,
	narrativePlayerSaveFormat,
	narrativePlayerSaveVersion,
	restoreNarrativePlayerSave,
	restoreNarrativePlayerSaveJson,
	serializeNarrativePlayerSave
} from '../player-save';
import {applyNarrativeItemRuntimePlacement} from '../physical';
import {advanceNarrativeProjectSimulation} from '../simulation';

function compiledArtifact() {
	const project = createNarrativeProject(
		'a53-player-save',
		'A53 player save',
		ninetyThreeDaysTemplate
	);
	project.locations = [{id: 'station', name: 'Автовокзал'}];
	project.characters = [
		{
			id: 'player',
			name: 'Неизвестный',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.behaviorProfiles = [
		{id: 'player-default', characterId: 'player', name: 'Player default'}
	];
	const definitions: ItemDefinition[] = [
		{
			id: 'document',
			name: 'Паспорт',
			tags: ['document'],
			carry: {weightKg: 0.1, volumeUnits: 1, sizeClass: 'tiny'}
		}
	];
	const instances: ItemInstance[] = [
		{
			id: 'passport-1',
			definitionId: 'document',
			placement: {type: 'location', locationId: 'station'}
		}
	];
	project.itemDefinitions = definitions;
	project.itemInstances = instances;

	const result = compileNarrativeRuntimeArtifact(project);
	if (result.status !== 'compiled') {
		throw new Error('Expected A53 save fixture to compile.');
	}
	return result.artifact;
}

function readySession(): {
	artifact: ReturnType<typeof compiledArtifact>;
	session: NarrativePlayerSession;
} {
	const artifact = compiledArtifact();
	const result = materializeNarrativePlayerSession(artifact);
	if (result.status !== 'ready') {
		throw new Error(`Expected ready A53 player session, got ${result.code}.`);
	}
	return {artifact, session: result.session};
}

function acceptProject(
	session: NarrativePlayerSession,
	project: NarrativePlayerSession['currentProject']
) {
	const result = replaceNarrativePlayerSessionProject(session, project);
	if (result.status !== 'updated') {
		throw new Error(`Expected player session update, got ${result.reason}.`);
	}
	return result.session;
}

function playedSession(session: NarrativePlayerSession) {
	let next = acceptProject(
		session,
		setNarrativeCharacterActualLocation(
			session.currentProject,
			'player',
			'station'
		)
	);
	next = acceptProject(
		next,
		advanceNarrativeProjectSimulation(next.currentProject, 75).project
	);
	const pickup = applyNarrativeItemRuntimePlacement(
		next.currentProject,
		'passport-1',
		{type: 'character', characterId: 'player'}
	);
	if (!pickup.applied) {
		throw new Error('Expected passport pickup to be valid.');
	}
	return acceptProject(next, pickup.project);
}

describe('A53 player save codec', () => {
	test('serializes runtime-only state with artifact/build identity', () => {
		const {artifact, session} = readySession();
		const played = playedSession(session);
		const save = createNarrativePlayerSave(played);

		expect(save.format).toBe(narrativePlayerSaveFormat);
		expect(save.version).toBe(narrativePlayerSaveVersion);
		expect(save.identity).toEqual({
			artifactFormat: artifact.format,
			artifactVersion: artifact.version,
			sourceSchemaVersion: artifact.sourceSchemaVersion,
			projectId: artifact.authored.projectId,
			hostStoryId: artifact.authored.hostStoryId,
			sourceUpdatedAt: artifact.authored.updatedAt
		});
		expect(save.runtime.simulation.actualLocationByCharacter.player).toBe(
			'station'
		);
		expect(save.runtime.simulation.bodyByCharacter.player).toBeDefined();
		expect(save.runtime.itemPlacementOverrides?.['passport-1']).toEqual({
			type: 'character',
			characterId: 'player'
		});

		const serialized = serializeNarrativePlayerSave(played);
		expect(serialized).not.toContain('"editor"');
		expect(serialized).not.toContain('"storyNodes"');
		expect(serialized).not.toContain('"locations"');
		expect(serialized).not.toContain('"itemDefinitions"');
		expect((save as any).authored).toBeUndefined();
	});

	test('restores mutable runtime over a fresh artifact session and can continue', () => {
		const {artifact, session} = readySession();
		const artifactBefore = JSON.stringify(artifact);
		const played = playedSession(session);
		const runtimeBefore = projectNarrativePersistence(
			played.currentProject
		).runtime;
		const serialized = serializeNarrativePlayerSave(played);

		const fresh = materializeNarrativePlayerSession(artifact);
		if (fresh.status !== 'ready') {
			throw new Error('Expected fresh session before restore.');
		}
		const restored = restoreNarrativePlayerSaveJson(fresh.session, serialized);
		expect(restored.status).toBe('restored');
		if (restored.status !== 'restored') {
			throw new Error('Expected restored player save.');
		}

		expect(
			projectNarrativePersistence(restored.session.currentProject).runtime
		).toEqual(runtimeBefore);
		expect(restored.session.currentProject.itemInstances).toEqual(
			artifact.authored.itemInstances
		);
		expect(restored.session.currentProject.editor).toEqual(
			fresh.session.currentProject.editor
		);
		expect(JSON.stringify(artifact)).toBe(artifactBefore);

		const continued = advanceNarrativeProjectSimulation(
			restored.session.currentProject,
			15
		);
		expect(continued.project.simulation.minuteOfDay).toBe(
			runtimeBefore.simulation.minuteOfDay + 15
		);
		expect(
			continued.project.simulation.actualLocationByCharacter.player
		).toBe('station');
		expect(continued.project.itemPlacementOverrides['passport-1']).toEqual({
			type: 'character',
			characterId: 'player'
		});
	});

	test('rejects a save from another artifact/build without changing the session', () => {
		const {session} = readySession();
		const played = playedSession(session);
		const save = createNarrativePlayerSave(played);
		const fresh = readySession().session;

		const wrongProject = restoreNarrativePlayerSave(fresh, {
			...save,
			identity: {...save.identity, projectId: 'another-project'}
		});
		const wrongBuild = restoreNarrativePlayerSave(fresh, {
			...save,
			identity: {
				...save.identity,
				sourceUpdatedAt: '2099-01-01T00:00:00.000Z'
			}
		});

		expect(wrongProject).toEqual({
			status: 'rejected',
			reason: 'artifact-mismatch',
			session: fresh
		});
		expect(wrongBuild).toEqual({
			status: 'rejected',
			reason: 'artifact-mismatch',
			session: fresh
		});
		expect(wrongProject.session).toBe(fresh);
		expect(wrongBuild.session).toBe(fresh);
	});

	test('rejects malformed runtime atomically', () => {
		const {session} = readySession();
		const save = createNarrativePlayerSave(playedSession(session));
		const fresh = readySession().session;
		const invalid = restoreNarrativePlayerSave(fresh, {
			...save,
			runtime: {simulation: {day: 1}}
		});

		expect(invalid.status).toBe('rejected');
		expect(invalid.reason).toBe('invalid-runtime');
		expect(invalid.session).toBe(fresh);
		expect(fresh.currentProject.simulation.actualLocationByCharacter).toEqual(
			{}
		);
		expect(fresh.currentProject.itemPlacementOverrides).toEqual({});
	});

	test('rejects bad envelope versions and invalid JSON without a partial session', () => {
		const {session} = readySession();
		const save = createNarrativePlayerSave(session);

		expect(
			restoreNarrativePlayerSave(session, {...save, format: 'other-save'})
		).toMatchObject({
			status: 'rejected',
			reason: 'unsupported-save-format',
			session
		});
		expect(
			restoreNarrativePlayerSave(session, {...save, version: 99})
		).toMatchObject({
			status: 'rejected',
			reason: 'unsupported-save-version',
			session
		});
		expect(restoreNarrativePlayerSaveJson(session, '{broken')).toEqual({
			status: 'rejected',
			reason: 'invalid-save',
			session
		});
	});
});
