import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {materializeNarrativePlayerSession} from '../player-runtime';
import {executeNarrativePlayerItemPlacement} from '../player-item-placement';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';

function packingSession() {
	const project = createNarrativeProject(
		'a58-packing-story',
		'A58 packing',
		ninetyThreeDaysTemplate
	);
	project.projectId = 'a58-packing-project';
	project.createdAt = '2000-06-01T00:00:00.000Z';
	project.updatedAt = '2000-06-01T00:00:00.000Z';
	project.characters = [
		{
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.behaviorProfiles = [
		{id: 'player-default', characterId: 'player', name: 'Player default'}
	];
	project.itemDefinitions = [
		{
			id: 'bag',
			name: 'Дорожная сумка',
			tags: ['bag'],
			carry: {weightKg: 1, volumeUnits: 8, sizeClass: 'medium'},
			container: {
				capacityVolumeUnits: 4,
				maxContentsWeightKg: 2,
				maxItemSize: 'small',
				carryStyle: 'shoulder',
				handsRequired: 0
			}
		},
		{
			id: 'phone',
			name: 'Телефон',
			tags: ['phone'],
			carry: {weightKg: 0.2, volumeUnits: 1, sizeClass: 'small'}
		},
		{
			id: 'bulky',
			name: 'Громоздкий предмет',
			tags: [],
			carry: {weightKg: 1, volumeUnits: 3, sizeClass: 'large'}
		}
	];
	project.itemInstances = [
		{
			id: 'bag-1',
			definitionId: 'bag',
			placement: {type: 'character', characterId: 'player'}
		},
		{
			id: 'phone-1',
			definitionId: 'phone',
			placement: {type: 'character', characterId: 'player'}
		},
		{
			id: 'bulky-1',
			definitionId: 'bulky',
			placement: {type: 'character', characterId: 'player'}
		}
	];

	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected packing fixture to compile.');
	}
	const materialized = materializeNarrativePlayerSession(compiled.artifact);
	if (materialized.status !== 'ready') {
		throw new Error(materialized.summary);
	}
	return materialized.session;
}

describe('A58 Player item placement bridge', () => {
	test('packs and unpacks an owned item through canonical carrying rules', () => {
		const session = packingSession();
		const packed = executeNarrativePlayerItemPlacement(
			session,
			'phone-1',
			{type: 'container', containerInstanceId: 'bag-1'},
			'player'
		);
		expect(packed.status).toBe('applied');
		if (packed.status !== 'applied') {
			throw new Error(packed.summary);
		}
		expect(
			packed.session.currentProject.itemPlacementOverrides['phone-1']
		).toEqual({type: 'container', containerInstanceId: 'bag-1'});

		const unpacked = executeNarrativePlayerItemPlacement(
			packed.session,
			'phone-1',
			{type: 'character'},
			'player'
		);
		expect(unpacked.status).toBe('applied');
		if (unpacked.status !== 'applied') {
			throw new Error(unpacked.summary);
		}
		expect(
			unpacked.session.currentProject.itemPlacementOverrides['phone-1']
		).toEqual({type: 'character', characterId: 'player'});
	});

	test('rejects an item too large for the carried container atomically', () => {
		const session = packingSession();
		const result = executeNarrativePlayerItemPlacement(
			session,
			'bulky-1',
			{type: 'container', containerInstanceId: 'bag-1'},
			'player'
		);
		expect(result).toMatchObject({
			status: 'rejected',
			reason: 'placement-blocked',
			session
		});
		expect(session.currentProject.itemPlacementOverrides).toEqual({});
	});

	test('cannot use a remote container or move a remote source item', () => {
		const session = packingSession();
		const remoteProject = {
			...session.currentProject,
			itemInstances: session.currentProject.itemInstances.map(item =>
				item.id === 'bag-1'
					? {...item, placement: {type: 'unplaced' as const}}
					: item
			)
		};
		const remoteSession = {...session, currentProject: remoteProject};

		const invalidTarget = executeNarrativePlayerItemPlacement(
			remoteSession,
			'phone-1',
			{type: 'container', containerInstanceId: 'bag-1'},
			'player'
		);
		expect(invalidTarget).toMatchObject({
			status: 'rejected',
			reason: 'invalid-target'
		});

		const remoteSourceProject = {
			...session.currentProject,
			itemInstances: session.currentProject.itemInstances.map(item =>
				item.id === 'phone-1'
					? {...item, placement: {type: 'unplaced' as const}}
					: item
			)
		};
		const remoteSourceSession = {...session, currentProject: remoteSourceProject};
		const invalidSource = executeNarrativePlayerItemPlacement(
			remoteSourceSession,
			'phone-1',
			{type: 'pockets'},
			'player'
		);
		expect(invalidSource).toMatchObject({
			status: 'rejected',
			reason: 'not-owned'
		});
	});
});
