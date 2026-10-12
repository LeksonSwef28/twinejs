import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	composeNarrativeProjectPersistence,
	isNarrativeProjectPersistenceEnvelope,
	narrativeProjectPersistenceFormat
} from '../persistence-projection';
import {
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

	test('uses a Windows-safe file name and a nonempty fallback', () => {
		expect(narrativeSourceSnapshotFilename({name: 'Лето: 93 / черновик?'}))
			.toBe('Лето- 93 - черновик-.narrative-source.json');
		expect(narrativeSourceSnapshotFilename({name: '...'}))
			.toBe('Narrative Project.narrative-source.json');
	});
});
