import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {createNarrativeSimulationDebugSnapshot} from '../debug-snapshot';

function debugProject() {
	const project = createNarrativeProject(
		'a44-debug',
		'A44 debug',
		ninetyThreeDaysTemplate
	);
	project.locations = [
		{id: 'station', name: 'Станция'},
		{id: 'home', name: 'Дом'}
	];
	project.characters = [
		{
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.itemDefinitions = [
		{id: 'portfolio-def', name: 'Портфель', tags: []},
		{id: 'thermos-def', name: 'Термос', tags: []}
	];
	project.itemInstances = [
		{
			id: 'portfolio-1',
			definitionId: 'portfolio-def',
			placement: {type: 'character', characterId: 'player'}
		},
		{
			id: 'thermos-1',
			definitionId: 'thermos-def',
			placement: {type: 'location', locationId: 'home'}
		}
	];
	project.itemPlacementOverrides = {
		'thermos-1': {type: 'container', containerInstanceId: 'portfolio-1'}
	};
	project.storyNodes = [
		{
			id: 'story-now',
			kind: 'event',
			title: 'Сейчас',
			participantIds: ['player'],
			activationState: 'available',
			placement: {day: 1, minuteOfDay: 600, locationId: 'station'}
		},
		{
			id: 'story-later',
			kind: 'event',
			title: 'Позже',
			participantIds: [],
			activationState: 'available',
			placement: {day: 1, minuteOfDay: 650}
		}
	];
	project.storyNodeStateOverrides = {'story-now': 'completed'};
	project.simulation.day = 1;
	project.simulation.minuteOfDay = 600;
	project.simulation.actualLocationByCharacter.player = 'station';
	project.simulation.activeBehaviorProfileByCharacter.player = 'player-default';
	project.simulation.bodyByCharacter.player = {
		characterId: 'player',
		fatigue: 0.4,
		sleepDebtMinutes: 30,
		satiety: 0.7,
		digestionRemainingMinutes: 10,
		sleepRemainingMinutes: 0
	};
	project.injuriesByCharacter.player = [
		{
			id: 'ankle',
			characterId: 'player',
			kind: 'ankle-sprain',
			region: 'ankle',
			pain: 'painful',
			recoveryRemainingMinutes: 100,
			treatment: 'self-care'
		}
	];
	project.memories = [
		{
			id: 'memory-1',
			characterId: 'player',
			summary: 'Помнит станцию',
			createdAtDay: 1,
			createdAtMinute: 590,
			importance: 0.8,
			baseStrength: 0.8,
			tags: ['station'],
			relatedEntityIds: ['station']
		}
	];
	project.pendingReactions = [
		{
			id: 'pending-1',
			characterId: 'player',
			reactionType: 'reply',
			priority: 2,
			conditions: []
		}
	];
	project.mindStates = [
		{
			characterId: 'player',
			mood: 'alert',
			activeMemoryIds: ['memory-1'],
			pendingReactionIds: ['pending-1']
		}
	];
	project.runtimeOccurrences = [
		{
			id: 'occurrence:move:outcome:1:600:1',
			type: 'move-outcome',
			storyNodeId: 'story-now',
			moveId: 'move',
			outcomeId: 'outcome',
			effectIds: ['effect'],
			moment: {day: 1, minuteOfDay: 600}
		}
	];
	return project;
}

describe('A44 Living Simulation debug snapshot', () => {
	test('projects physical, cognition, inventory and Story runtime state without mutating project', () => {
		const project = debugProject();
		const before = JSON.stringify(project);
		const snapshot = createNarrativeSimulationDebugSnapshot(project);

		expect(snapshot.playhead).toEqual({day: 1, minuteOfDay: 600});
		expect(snapshot.characters[0]).toMatchObject({
			id: 'player',
			actualLocationName: 'Станция',
			behaviorProfileId: 'player-default',
			memoryCount: 1,
			pendingReactionCount: 1,
			mood: 'alert'
		});
		expect(snapshot.characters[0].body?.sleepDebtMinutes).toBe(30);
		expect(snapshot.characters[0].injuries[0].id).toBe('ankle');
		expect(snapshot.characters[0].items.map(item => item.id)).toEqual([
			'portfolio-1',
			'thermos-1'
		]);
		expect(
			snapshot.characters[0].items.find(item => item.id === 'thermos-1')?.placement
		).toContain('Портфель');
		expect(snapshot.story.find(node => node.id === 'story-now')).toMatchObject({
			authoredState: 'available',
			runtimeState: 'completed'
		});
		expect(snapshot.recentOccurrences).toHaveLength(1);
		expect(JSON.stringify(project)).toBe(before);
	});

	test('orders upcoming scheduled Story work from the current playhead', () => {
		const snapshot = createNarrativeSimulationDebugSnapshot(debugProject());
		expect(snapshot.upcomingWork.map(work => work.id)).toEqual([
			'story-node:story-now',
			'story-node:story-later'
		]);
	});
});
