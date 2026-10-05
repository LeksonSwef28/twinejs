import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {ItemDefinition, ItemInstance} from '../../../domain/narrative/items';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {
	resolveAndApplyNarrativeProjectMove,
	setNarrativeCharacterActualLocation
} from '../living-simulation';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from '../player-runtime';
import {
	restoreNarrativePlayerSaveJson,
	serializeNarrativePlayerSave
} from '../player-save';
import {applyNarrativeItemRuntimePlacement} from '../physical';
import {advanceNarrativeProjectSimulation} from '../simulation';

function compileIntegrationArtifact() {
	const project = createNarrativeProject(
		'a53-integration',
		'A53 integration closure',
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

	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A53 integration fixture to compile.');
	}
	return compiled.artifact;
}

function materialize(
	artifact: ReturnType<typeof compileIntegrationArtifact>
): NarrativePlayerSession {
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

function relationshipTrust(session: NarrativePlayerSession) {
	return session.currentProject.relationships.find(
		relationship =>
			relationship.fromCharacterId === 'katya' &&
			relationship.toCharacterId === 'player'
	)?.values.trust;
}

describe('A53 integrated player-session lifecycle', () => {
	test('new game -> canonical mutations -> save -> fresh materialization -> restore -> continue', () => {
		const artifact = compileIntegrationArtifact();
		const artifactBefore = JSON.stringify(artifact);
		const authoredItemsBefore = JSON.stringify(artifact.authored.itemInstances);
		let session = materialize(artifact);

		expect(session.currentProject.simulation.actualLocationByCharacter).toEqual(
			{}
		);
		expect(session.currentProject.relationships).toEqual([]);
		expect(session.currentProject.runtimeOccurrences).toEqual([]);
		expect(session.currentProject.itemPlacementOverrides).toEqual({});

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
		session = acceptProject(
			session,
			advanceNarrativeProjectSimulation(session.currentProject, 30).project
		);

		const firstGreeting = resolveAndApplyNarrativeProjectMove(
			session.currentProject,
			'greeting'
		);
		expect(firstGreeting.resolution.status).toBe('resolved');
		session = acceptProject(session, firstGreeting.project);

		const packed = applyNarrativeItemRuntimePlacement(
			session.currentProject,
			'thermos-1',
			{type: 'container', containerInstanceId: 'portfolio-1'}
		);
		expect(packed.applied).toBe(true);
		session = acceptProject(session, packed.project);

		expect(relationshipTrust(session)).toBe(1);
		expect(session.currentProject.runtimeOccurrences).toHaveLength(1);
		expect(session.currentProject.itemPlacementOverrides['thermos-1']).toEqual({
			type: 'container',
			containerInstanceId: 'portfolio-1'
		});
		expect(session.currentProject.simulation.bodyByCharacter.player).toBeDefined();

		const saveJson = serializeNarrativePlayerSave(session);
		const fresh = materialize(artifact);
		expect(fresh.currentProject.simulation.actualLocationByCharacter).toEqual({});
		expect(fresh.currentProject.relationships).toEqual([]);
		expect(fresh.currentProject.runtimeOccurrences).toEqual([]);
		expect(fresh.currentProject.itemPlacementOverrides).toEqual({});

		const restored = restoreNarrativePlayerSaveJson(fresh, saveJson);
		expect(restored.status).toBe('restored');
		if (restored.status !== 'restored') {
			throw new Error('Expected integrated player save to restore.');
		}
		session = restored.session;

		expect(
			session.currentProject.simulation.actualLocationByCharacter
		).toEqual({player: 'station', katya: 'station'});
		expect(relationshipTrust(session)).toBe(1);
		expect(session.currentProject.runtimeOccurrences).toHaveLength(1);
		expect(session.currentProject.itemPlacementOverrides['thermos-1']).toEqual({
			type: 'container',
			containerInstanceId: 'portfolio-1'
		});

		session = acceptProject(
			session,
			advanceNarrativeProjectSimulation(session.currentProject, 45).project
		);
		const secondGreeting = resolveAndApplyNarrativeProjectMove(
			session.currentProject,
			'greeting'
		);
		expect(secondGreeting.resolution.status).toBe('resolved');
		session = acceptProject(session, secondGreeting.project);

		expect(session.currentProject.simulation.minuteOfDay).toBe(
			artifact.initialRuntime.simulation.minuteOfDay + 75
		);
		expect(relationshipTrust(session)).toBe(2);
		expect(session.currentProject.runtimeOccurrences).toHaveLength(2);
		expect(session.currentProject.itemPlacementOverrides['thermos-1']).toEqual({
			type: 'container',
			containerInstanceId: 'portfolio-1'
		});
		expect(JSON.stringify(session.currentProject.itemInstances)).toBe(
			authoredItemsBefore
		);
		expect(JSON.stringify(artifact)).toBe(artifactBefore);
	});
});
