import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {
	create93DaysDayOneDayTwoProject,
	dayOneNarrativeIds
} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {materializeNarrativePlayerSession, replaceNarrativePlayerSessionProject} from '../player-runtime';
import {executeNarrativePlayerStoryWork} from '../player-story-work';

function sessionAt(minuteOfDay: number) {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysDayOneDayTwoProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A57 project to compile.');
	}
	const materialized = materializeNarrativePlayerSession(compiled.artifact);
	if (materialized.status !== 'ready') {
		throw new Error('Expected A57 project to materialize.');
	}
	const started = bootstrapNarrativePlayerWorldStart(materialized.session);
	if (started.status === 'rejected') {
		throw new Error('Expected A57 world start.');
	}
	const project = {
		...started.session.currentProject,
		simulation: {...started.session.currentProject.simulation, minuteOfDay}
	};
	const replaced = replaceNarrativePlayerSessionProject(started.session, project);
	if (replaced.status !== 'updated') {
		throw new Error('Expected time setup replacement.');
	}
	return replaced.session;
}

describe('A57 player Story-work boundary', () => {
	const optionalWorkId = `story-node:${dayOneNarrativeIds.story.stationOpportunity}`;
	const npcWorkId = `story-node:${dayOneNarrativeIds.story.dormNpcOccurrence}`;

	test('executes a due player opportunity through canonical Story runtime', () => {
		const result = executeNarrativePlayerStoryWork(
			sessionAt(6 * 60 + 10),
			optionalWorkId,
			'execute',
			arrivalCorridorIds.characters.player
		);
		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error('Expected Story opportunity to apply.');
		}
		expect(result.result).toBe('completed');
		expect(
			result.session.currentProject.storyNodeStateOverrides[
				dayOneNarrativeIds.story.stationOpportunity
			]
		).toBe('completed');
		expect(result.session.currentProject.runtimeOccurrences).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'story-work',
					workId: optionalWorkId,
					result: 'executed'
				})
			])
		);
	});

	test('records an expired opportunity as canonical miss history', () => {
		const result = executeNarrativePlayerStoryWork(
			sessionAt(6 * 60 + 21),
			optionalWorkId,
			'execute',
			arrivalCorridorIds.characters.player
		);
		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error('Expected expired Story opportunity to apply as miss.');
		}
		expect(result.result).toBe('expired');
		expect(
			result.session.currentProject.storyNodeStateOverrides[
				dayOneNarrativeIds.story.stationOpportunity
			]
		).toBe('blocked');
	});

	test('rejects NPC-only work as a player choice', () => {
		const result = executeNarrativePlayerStoryWork(
			sessionAt(18 * 60),
			npcWorkId,
			'execute',
			arrivalCorridorIds.characters.player
		);
		expect(result).toMatchObject({
			status: 'rejected',
			reason: 'not-player-work'
		});
	});
});
