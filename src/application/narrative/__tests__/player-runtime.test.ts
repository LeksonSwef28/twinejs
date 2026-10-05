import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {ItemDefinition, ItemInstance} from '../../../domain/narrative/items';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../export-compiler';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from '../player-runtime';
import {
	resolveAndApplyNarrativeProjectMove,
	setNarrativeCharacterActualLocation
} from '../living-simulation';
import {applyNarrativeItemRuntimePlacement} from '../physical';
import {advanceNarrativeProjectSimulation} from '../simulation';

function authoredProject() {
	const project = createNarrativeProject(
		'a53-player-runtime',
		'A53 player runtime',
		ninetyThreeDaysTemplate
	);
	project.locations = [{id: 'station', name: 'Автовокзал'}];
	project.characters = [
		{
			id: 'player',
			name: 'Неизвестный',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		},
		{
			id: 'katya',
			name: 'Катя',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'katya-default'
		}
	];
	project.behaviorProfiles = [
		{id: 'player-default', characterId: 'player', name: 'Player default'},
		{id: 'katya-default', characterId: 'katya', name: 'Katya default'}
	];
	project.storyNodes = [
		{
			id: 'station-contact',
			kind: 'dialogue',
			title: 'Первый разговор',
			participantIds: ['player', 'katya'],
			activationState: 'available'
		}
	];
	const greeting: NarrativeMoveDefinition = {
		id: 'greeting',
		storyNodeId: 'station-contact',
		kind: 'custom',
		label: 'Поздороваться',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [
			{
				id: 'same-place',
				condition: {
					type: 'characters-share-location',
					characterIds: ['player', 'katya']
				}
			}
		],
		resolution: {type: 'automatic', outcomeId: 'warm-greeting'},
		outcomes: [
			{
				id: 'warm-greeting',
				key: 'continue',
				label: 'Катя отвечает',
				effectStoryNodeIds: [],
				effects: [
					{
						id: 'trust-greeting',
						type: 'relationship-adjust',
						from: {type: 'move-target', targetIndex: 0},
						to: {type: 'move-actor'},
						axis: 'trust',
						delta: 1
					}
				]
			}
		]
	};
	project.narrativeMoves = [greeting];
	const definitions: ItemDefinition[] = [
		{
			id: 'portfolio',
			name: 'Портфель',
			tags: ['bag'],
			carry: {weightKg: 1, volumeUnits: 5, sizeClass: 'medium'},
			container: {
				capacityVolumeUnits: 8,
				maxContentsWeightKg: 5,
				maxItemSize: 'medium',
				carryStyle: 'hand',
				handsRequired: 1
			}
		},
		{
			id: 'thermos',
			name: 'Термос',
			tags: ['drink'],
			carry: {weightKg: 0.8, volumeUnits: 3, sizeClass: 'medium'}
		}
	];
	const instances: ItemInstance[] = [
		{
			id: 'portfolio-1',
			definitionId: 'portfolio',
			placement: {type: 'character', characterId: 'player'}
		},
		{
			id: 'thermos-1',
			definitionId: 'thermos',
			placement: {type: 'location', locationId: 'station'}
		}
	];
	project.itemDefinitions = definitions;
	project.itemInstances = instances;
	return project;
}

function compiledArtifact(): NarrativeRuntimeArtifactV1 {
	const result = compileNarrativeRuntimeArtifact(authoredProject());
	if (result.status !== 'compiled') {
		throw new Error('Expected A53 fixture to compile.');
	}
	return result.artifact;
}

function readySession(artifact = compiledArtifact()): NarrativePlayerSession {
	const result = materializeNarrativePlayerSession(artifact);
	if (result.status !== 'ready') {
		throw new Error(`Expected ready player session, got ${result.code}.`);
	}
	return result.session;
}

function acceptProject(
	session: NarrativePlayerSession,
	project: NarrativePlayerSession['currentProject']
) {
	const result = replaceNarrativePlayerSessionProject(session, project);
	if (result.status !== 'updated') {
		throw new Error(`Expected session update, got ${result.reason}.`);
	}
	return result.session;
}

describe('A53 player runtime boundary', () => {
	test('materializes a deterministic fresh session from the compiled artifact', () => {
		const artifact = compiledArtifact();
		const first = readySession(artifact);
		const second = readySession(artifact);

		expect(first.identity).toEqual({
			artifactFormat: 'narrative-runtime-artifact',
			artifactVersion: 1,
			sourceSchemaVersion: artifact.sourceSchemaVersion,
			projectId: artifact.authored.projectId,
			hostStoryId: artifact.authored.hostStoryId
		});
		expect(first.currentProject.simulation).toEqual(
			artifact.initialRuntime.simulation
		);
		expect(first.currentProject.memories).toEqual(artifact.initialRuntime.memories);
		expect(first.currentProject.simulation.actualLocationByCharacter).toEqual({});
		expect(first.currentProject.editor).toEqual({
			selectedDay: 1,
			selectedPeriodId: artifact.authored.template.periods[0].id,
			selectedMinuteOfDay: artifact.authored.template.periods[0].startMinute
		});
		expect(first).toEqual(second);
	});

	test('runs shared canonical time, Move/effect and physical item APIs without mutating the artifact', () => {
		const artifact = compiledArtifact();
		const artifactBefore = JSON.stringify(artifact);
		const authoredItemsBefore = JSON.stringify(artifact.authored.itemInstances);
		let session = readySession(artifact);

		session = acceptProject(
			session,
			setNarrativeCharacterActualLocation(
				session.currentProject,
				'player',
				'station'
			)
		);
		session = acceptProject(
			session,
			setNarrativeCharacterActualLocation(
				session.currentProject,
				'katya',
				'station'
			)
		);

		const advanced = advanceNarrativeProjectSimulation(session.currentProject, 30);
		session = acceptProject(session, advanced.project);
		expect(session.currentProject.simulation.minuteOfDay).toBe(
			artifact.initialRuntime.simulation.minuteOfDay + 30
		);
		expect(
			session.currentProject.simulation.bodyByCharacter.player
		).toBeDefined();

		const move = resolveAndApplyNarrativeProjectMove(
			session.currentProject,
			'greeting'
		);
		expect(move.resolution.status).toBe('resolved');
		session = acceptProject(session, move.project);
		expect(session.currentProject.relationships).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					fromCharacterId: 'katya',
					toCharacterId: 'player',
					values: {trust: 1}
				})
			])
		);
		expect(session.currentProject.runtimeOccurrences).toHaveLength(1);

		const packed = applyNarrativeItemRuntimePlacement(
			session.currentProject,
			'thermos-1',
			{type: 'container', containerInstanceId: 'portfolio-1'}
		);
		expect(packed.applied).toBe(true);
		session = acceptProject(session, packed.project);
		expect(session.currentProject.itemPlacementOverrides['thermos-1']).toEqual({
			type: 'container',
			containerInstanceId: 'portfolio-1'
		});

		expect(JSON.stringify(artifact)).toBe(artifactBefore);
		expect(JSON.stringify(session.currentProject.itemInstances)).toBe(
			authoredItemsBefore
		);
		expect(session.currentProject.editor).toEqual({
			selectedDay: 1,
			selectedPeriodId: artifact.authored.template.periods[0].id,
			selectedMinuteOfDay: artifact.authored.template.periods[0].startMinute
		});
	});

	test('rejects incompatible or structurally incomplete artifact input atomically', () => {
		const artifact = compiledArtifact();
		const wrongFormat = materializeNarrativePlayerSession({
			...artifact,
			format: 'other-runtime-artifact'
		});
		const wrongVersion = materializeNarrativePlayerSession({
			...artifact,
			version: 99
		});
		const wrongSchema = materializeNarrativePlayerSession({
			...artifact,
			sourceSchemaVersion: 999
		});
		const invalidRuntime = materializeNarrativePlayerSession({
			...artifact,
			initialRuntime: {simulation: {day: 1}}
		});

		expect(wrongFormat).toMatchObject({
			status: 'rejected',
			code: 'unsupported-artifact-format'
		});
		expect(wrongVersion).toMatchObject({
			status: 'rejected',
			code: 'unsupported-artifact-version'
		});
		expect(wrongSchema).toMatchObject({
			status: 'rejected',
			code: 'unsupported-source-schema'
		});
		expect(invalidRuntime).toMatchObject({
			status: 'rejected',
			code: 'invalid-initial-runtime'
		});
		expect('session' in wrongFormat).toBe(false);
		expect('session' in wrongVersion).toBe(false);
		expect('session' in wrongSchema).toBe(false);
		expect('session' in invalidRuntime).toBe(false);
	});

	test('rejects cross-project or schema replacement and retains the current session', () => {
		const session = readySession();
		const identityMismatch = replaceNarrativePlayerSessionProject(session, {
			...session.currentProject,
			projectId: 'different-project'
		});
		const schemaMismatch = replaceNarrativePlayerSessionProject(session, {
			...session.currentProject,
			schemaVersion: session.currentProject.schemaVersion + 1
		});

		expect(identityMismatch).toEqual({
			status: 'rejected',
			reason: 'identity-mismatch',
			session
		});
		expect(schemaMismatch).toEqual({
			status: 'rejected',
			reason: 'schema-mismatch',
			session
		});
	});
});
