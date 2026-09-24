import {narrativeProjectSchemaVersion} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	createNarrativeRuntimeSnapshot,
	restoreNarrativeRuntimeSnapshot
} from '../runtime-snapshot';
import {createLocalStorageNarrativeProjectRepository} from '../repository';
import {projectNarrativePersistence} from '../persistence-projection';

const hostStoryId = 'a39-physical-persistence';
const storageKey = `twine:narrative-project:v${narrativeProjectSchemaVersion}:${hostStoryId}`;

function physicalProject() {
	const project = createNarrativeProject(
		hostStoryId,
		'A39 physical persistence',
		ninetyThreeDaysTemplate
	);
	project.characters = [
		{
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.itemDefinitions = [
		{id: 'thermos', name: 'Термос', tags: ['drink']},
		{id: 'portfolio', name: 'Портфель', tags: ['bag']}
	];
	project.itemInstances = [
		{
			id: 'thermos-1',
			definitionId: 'thermos',
			placement: {type: 'location', locationId: 'home'}
		},
		{
			id: 'portfolio-1',
			definitionId: 'portfolio',
			placement: {type: 'character', characterId: 'player'}
		}
	];
	project.injuriesByCharacter = {
		player: [
			{
				id: 'ankle',
				characterId: 'player',
				kind: 'ankle-sprain',
				region: 'ankle',
				pain: 'painful',
				recoveryRemainingMinutes: 180,
				treatment: 'self-care'
			}
		]
	};
	project.itemPlacementOverrides = {
		'thermos-1': {type: 'container', containerInstanceId: 'portfolio-1'}
	};
	return project;
}

describe('A39 physical runtime persistence', () => {
	beforeEach(() => window.localStorage.clear());

	test('runtime snapshot round-trips injuries and inventory placement overlays', () => {
		const source = physicalProject();
		const target = physicalProject();
		target.projectId = source.projectId;
		target.injuriesByCharacter = {};
		target.itemPlacementOverrides = {};

		const restored = restoreNarrativeRuntimeSnapshot(
			target,
			createNarrativeRuntimeSnapshot(source)
		);

		expect(restored.status).toBe('restored');
		expect(restored.project.injuriesByCharacter).toEqual(
			source.injuriesByCharacter
		);
		expect(restored.project.itemPlacementOverrides).toEqual(
			source.itemPlacementOverrides
		);
	});

	test('pre-A39 v1 snapshots without physical fields remain readable', () => {
		const source = physicalProject();
		const current = createNarrativeRuntimeSnapshot(source);
		const runtime = {...current.runtime} as Omit<
			typeof current.runtime,
			'injuriesByCharacter' | 'itemPlacementOverrides'
		> & {
			injuriesByCharacter?: typeof current.runtime.injuriesByCharacter;
			itemPlacementOverrides?: typeof current.runtime.itemPlacementOverrides;
		};
		delete runtime.injuriesByCharacter;
		delete runtime.itemPlacementOverrides;

		const restored = restoreNarrativeRuntimeSnapshot(
			{...source, injuriesByCharacter: {}, itemPlacementOverrides: {}},
			{...current, runtime}
		);

		expect(restored.status).toBe('restored');
		expect(restored.project.injuriesByCharacter).toEqual({});
		expect(restored.project.itemPlacementOverrides).toEqual({});
	});

	test('project repository keeps valid physical runtime state in the runtime projection', () => {
		const source = physicalProject();
		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			source.name,
			ninetyThreeDaysTemplate
		);
		repository.save(source);

		const raw = JSON.parse(window.localStorage.getItem(storageKey)!);
		expect(raw.authored.injuriesByCharacter).toBeUndefined();
		expect(raw.authored.itemPlacementOverrides).toBeUndefined();
		expect(raw.runtime.injuriesByCharacter.player[0].id).toBe('ankle');
		expect(raw.runtime.itemPlacementOverrides['thermos-1']).toEqual({
			type: 'container',
			containerInstanceId: 'portfolio-1'
		});

		const loaded = repository.load();
		expect(loaded.injuriesByCharacter).toEqual(source.injuriesByCharacter);
		expect(loaded.itemPlacementOverrides).toEqual(source.itemPlacementOverrides);
	});

	test('repository drops malformed physical runtime while preserving authored data', () => {
		const source = physicalProject();
		source.storyNodes = [
			{
				id: 'authored-safe',
				kind: 'event',
				title: 'Authored survives',
				participantIds: [],
				activationState: 'draft'
			}
		];
		const envelope = projectNarrativePersistence(source) as any;
		envelope.runtime.injuriesByCharacter = {
			player: [{id: 'broken', characterId: 'someone-else'}]
		};
		envelope.runtime.itemPlacementOverrides = {
			'thermos-1': {type: 'container'}
		};
		window.localStorage.setItem(storageKey, JSON.stringify(envelope));

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			source.name,
			ninetyThreeDaysTemplate
		);
		const loaded = repository.load();

		expect(loaded.storyNodes[0].id).toBe('authored-safe');
		expect(loaded.injuriesByCharacter).toEqual({});
		expect(loaded.itemPlacementOverrides).toEqual({});
	});
});
