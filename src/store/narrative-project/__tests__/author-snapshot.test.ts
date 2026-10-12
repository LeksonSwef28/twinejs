import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	composeNarrativeProjectPersistence,
	isNarrativeProjectPersistenceEnvelope,
	narrativeProjectPersistenceFormat
} from '../persistence-projection';
import {
	inspectNarrativeSourceSnapshot,
	narrativeSourceRestoreTargetIsEmpty,
	narrativeSourceSnapshotFilename,
	serializeNarrativeSourceSnapshot
} from '../author-snapshot';

describe('author source checkpoint (W6)', () => {
	test('exports editable authored, editor and runtime projections without changing the project', () => {
		const project = createNarrativeProject(
			'host-a',
			'Первая неделя',
			ninetyThreeDaysTemplate
		);
		project.storyNodes = [{
			id: 'story-1',
			kind: 'dialogue',
			title: 'Разговор',
			participantIds: [],
			activationState: 'draft'
		}];
		project.editor.selectedDay = 8;
		project.simulation.day = 5;
		const unchanged = JSON.stringify(project);

		const text = serializeNarrativeSourceSnapshot(project);
		const snapshot: unknown = JSON.parse(text);
		expect(isNarrativeProjectPersistenceEnvelope(snapshot)).toBe(true);
		if (!isNarrativeProjectPersistenceEnvelope(snapshot)) {
			throw new Error('Expected a source persistence envelope');
		}

		expect(snapshot.format).toBe(narrativeProjectPersistenceFormat);
		expect(snapshot.schemaVersion).toBe(project.schemaVersion);
		expect(snapshot.authored.projectId).toBe(project.projectId);
		expect(snapshot.authored.hostStoryId).toBe('host-a');
		expect(snapshot.authored.storyNodes).toEqual(project.storyNodes);
		expect(snapshot.editor.selectedDay).toBe(8);
		expect(snapshot.runtime.simulation.day).toBe(5);
		expect('editor' in snapshot.authored).toBe(false);
		expect('simulation' in snapshot.authored).toBe(false);
		expect(composeNarrativeProjectPersistence(snapshot)).toEqual(project);
		expect(JSON.stringify(project)).toBe(unchanged);
	});


	test('accepts current-v3 source snapshot for the same empty host and keeps all projections', () => {
		const current = createNarrativeProject(
			'host-a', 'Чистый проект', ninetyThreeDaysTemplate
		);
		const saved = createNarrativeProject(
			'host-a', 'Авторская история', ninetyThreeDaysTemplate
		);
		saved.characters = [{
			id: 'character-a',
			name: 'Анна',
			cognitionTier: 'full'
		}];
		saved.storyNodes = [{
			id: 'scene-a',
			kind: 'dialogue',
			title: 'Важный разговор',
			participantIds: ['character-a'],
			activationState: 'draft'
		}];
		saved.editor.selectedDay = 8;
		saved.simulation.day = 4;
		const before = JSON.stringify(current);
		const result = inspectNarrativeSourceSnapshot(
			serializeNarrativeSourceSnapshot(saved), current
		);

		expect(result.status).toBe('ready');
		if (result.status !== 'ready') {
			throw new Error(result.reason);
		}
		expect(result.project).toEqual(saved);
		expect(JSON.stringify(current)).toBe(before);
	});

	test('rejects cross-host source snapshots and derived runtime JSON', () => {
		const current = createNarrativeProject('host-a', 'Active', ninetyThreeDaysTemplate);
		const different = createNarrativeProject('host-b', 'Other', ninetyThreeDaysTemplate);
		expect(inspectNarrativeSourceSnapshot(
			serializeNarrativeSourceSnapshot(different), current
		)).toEqual(expect.objectContaining({status: 'rejected', reason: expect.stringMatching(/другой host/i)}));
		expect(inspectNarrativeSourceSnapshot('{"format":"narrative-runtime-artifact"}', current))
			.toEqual(expect.objectContaining({status: 'rejected'}));
		expect(inspectNarrativeSourceSnapshot('not JSON', current))
			.toEqual(expect.objectContaining({status: 'rejected'}));
	});

	test('fails closed for changed schema, missing core data and template mismatch', () => {
		const current = createNarrativeProject('host-a', 'Active', ninetyThreeDaysTemplate);
		const raw = JSON.parse(serializeNarrativeSourceSnapshot(current));
		const changedSchema = {...raw, schemaVersion: 42};
		expect(inspectNarrativeSourceSnapshot(JSON.stringify(changedSchema), current).status)
			.toBe('rejected');
		const missingNodes = {...raw, authored: {...raw.authored, storyNodes: undefined}};
		expect(inspectNarrativeSourceSnapshot(JSON.stringify(missingNodes), current).status)
			.toBe('rejected');
		const mismatchedTemplate = {
			...raw,
			authored: {
				...raw.authored,
				template: {...raw.authored.template, dayCount: 20}
			}
		};
		expect(inspectNarrativeSourceSnapshot(
			JSON.stringify(mismatchedTemplate), current
		).status).toBe('rejected');
	});

	test('never offers restore over authored or preview/runtime activity', () => {
		const empty = createNarrativeProject('host-a', 'Target', ninetyThreeDaysTemplate);
		const source = serializeNarrativeSourceSnapshot(empty);
		const authored = createNarrativeProject('host-a', 'Target', ninetyThreeDaysTemplate);
		authored.storyNodes = [{
			id: 'existing',
			kind: 'beat',
			title: 'Авторская сцена',
			participantIds: [],
			activationState: 'draft'
		}];
		expect(narrativeSourceRestoreTargetIsEmpty(authored)).toBe(false);
		expect(inspectNarrativeSourceSnapshot(source, authored).status).toBe('rejected');

		const previewed = createNarrativeProject('host-a', 'Target', ninetyThreeDaysTemplate);
		previewed.simulation.day = 2;
		expect(narrativeSourceRestoreTargetIsEmpty(previewed)).toBe(false);
		expect(inspectNarrativeSourceSnapshot(source, previewed).status).toBe('rejected');
	});

	test('uses a Windows-safe file name and a nonempty fallback', () => {
		expect(narrativeSourceSnapshotFilename({name: 'Лето: 93 / черновик?'}))
			.toBe('Лето- 93 - черновик-.narrative-source.json');
		expect(narrativeSourceSnapshotFilename({name: '...'}))
			.toBe('Narrative Project.narrative-source.json');
	});
});
