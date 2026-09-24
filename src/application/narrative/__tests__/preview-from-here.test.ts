import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {createPreviewScenario} from '../preview-laboratory';
import {
	createPreviewFromHereRequest,
	createPreviewFromHereScenario,
	inspectPreviewFromHereFocus
} from '../preview-from-here';

function projectForPreviewFromHere() {
	const project = createNarrativeProject(
		'a51-preview-from-here',
		'A51 preview from here',
		ninetyThreeDaysTemplate
	);
	project.locations = [
		{id: 'home', name: 'Дом'},
		{id: 'station', name: 'Станция'}
	];
	project.characters = [
		{
			id: 'player',
			name: 'Игрок',
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
	project.storyNodes = [
		{
			id: 'meeting',
			kind: 'event',
			title: 'Встреча',
			participantIds: ['player', 'katya'],
			placement: {day: 2, minuteOfDay: 600, locationId: 'station'},
			activationState: 'available'
		},
		{
			id: 'draft-meeting',
			kind: 'dialogue',
			title: 'Черновая встреча',
			participantIds: ['player'],
			placement: {day: 3, locationId: 'home'},
			activationState: 'draft'
		}
	];
	const move: NarrativeMoveDefinition = {
		id: 'promise',
		storyNodeId: 'meeting',
		kind: 'inform',
		label: 'Дать обещание',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [],
		resolution: {type: 'automatic', outcomeId: 'accepted'},
		outcomes: [
			{
				id: 'accepted',
				key: 'success',
				label: 'Принято',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
	project.narrativeMoves = [move];
	project.simulation.day = 1;
	project.simulation.minuteOfDay = 480;
	project.simulation.actualLocationByCharacter = {
		player: 'home',
		katya: 'home'
	};
	return project;
}

describe('A51 Preview from here contract', () => {
	it('creates the same fresh live snapshot while keeping Story focus separate', () => {
		const project = projectForPreviewFromHere();
		const sourceBefore = JSON.parse(JSON.stringify(project));
		const normal = createPreviewScenario(project);
		const result = createPreviewFromHereScenario(project, {
			type: 'story-node',
			storyNodeId: 'meeting'
		});

		expect(result.scenario.project).toEqual(normal.project);
		expect(result.scenario.baselineProject).toEqual(normal.baselineProject);
		expect(result.scenario.project).toEqual(project);
		expect(result.scenario.project).not.toBe(project);
		expect(project).toEqual(sourceBefore);
		expect(result.preferredMoveId).toBe('promise');
	});

	it('reports a different authored Story moment without moving the sandbox playhead or presence', () => {
		const project = projectForPreviewFromHere();
		const result = createPreviewFromHereScenario(project, {
			type: 'story-node',
			storyNodeId: 'meeting'
		});

		expect(result.context).toMatchObject({
			type: 'story-node',
			alignment: 'different-moment',
			authoredDay: 2,
			authoredMinuteOfDay: 600,
			authoredLocationId: 'station',
			actualPresenceComparableToStoryMoment: false
		});
		expect(result.scenario.project.simulation.day).toBe(1);
		expect(result.scenario.project.simulation.minuteOfDay).toBe(480);
		expect(result.scenario.project.simulation.actualLocationByCharacter.player).toBe(
			'home'
		);
		expect(result.scenario.project.simulation.actualLocationByCharacter.katya).toBe(
			'home'
		);
	});

	it('reports aligned Story focus through the canonical presence-comparison semantics', () => {
		const project = projectForPreviewFromHere();
		project.simulation.day = 2;
		project.simulation.minuteOfDay = 600;
		project.simulation.actualLocationByCharacter.player = 'station';
		project.simulation.actualLocationByCharacter.katya = 'home';

		const context = inspectPreviewFromHereFocus(project, {
			type: 'story-node',
			storyNodeId: 'meeting'
		});

		expect(context).toMatchObject({
			type: 'story-node',
			alignment: 'aligned',
			actualPresenceComparableToStoryMoment: true
		});
		if (context.type !== 'story-node') {
			throw new Error('Expected Story focus context.');
		}
		expect(context.participants).toEqual([
			{characterId: 'player', actualLocationId: 'station', presenceRelation: 'same-location'},
			{characterId: 'katya', actualLocationId: 'home', presenceRelation: 'different-location'}
		]);
	});

	it('keeps partially scheduled Story focus unscheduled instead of inventing a moment', () => {
		const project = projectForPreviewFromHere();
		const context = inspectPreviewFromHereFocus(project, {
			type: 'story-node',
			storyNodeId: 'draft-meeting'
		});

		expect(context).toMatchObject({
			type: 'story-node',
			alignment: 'unscheduled',
			authoredDay: 3,
			authoredMinuteOfDay: undefined,
			authoredLocationId: 'home',
			actualPresenceComparableToStoryMoment: false
		});
	});

	it('keeps View Cursor focus separate from the live Simulation Playhead', () => {
		const project = projectForPreviewFromHere();
		const result = createPreviewFromHereScenario(project, {
			type: 'view-moment',
			day: 4,
			minuteOfDay: 900
		});

		expect(result.context).toEqual({
			type: 'view-moment',
			alignment: 'different-moment',
			viewMoment: {day: 4, minuteOfDay: 900},
			simulationMoment: {day: 1, minuteOfDay: 480}
		});
		expect(result.scenario.project.simulation.day).toBe(1);
		expect(result.scenario.project.simulation.minuteOfDay).toBe(480);
	});

	it('reports aligned View Cursor focus without creating runtime changes', () => {
		const project = projectForPreviewFromHere();
		const request = createPreviewFromHereRequest(project, 7, {
			type: 'view-moment',
			day: 1,
			minuteOfDay: 480
		});

		expect(request).toEqual({
			requestId: 7,
			focus: {type: 'view-moment', day: 1, minuteOfDay: 480},
			context: {
				type: 'view-moment',
				alignment: 'aligned',
				viewMoment: {day: 1, minuteOfDay: 480},
				simulationMoment: {day: 1, minuteOfDay: 480}
			}
		});
	});

	it('rejects invalid Story and View references without mutating the source project', () => {
		const project = projectForPreviewFromHere();
		const before = JSON.parse(JSON.stringify(project));

		expect(() =>
			createPreviewFromHereScenario(project, {
				type: 'story-node',
				storyNodeId: 'missing'
			})
		).toThrow('Unknown Preview-from-here Story node: missing');
		expect(() =>
			createPreviewFromHereScenario(project, {
				type: 'view-moment',
				day: 0,
				minuteOfDay: 0
			})
		).toThrow('Preview-from-here day is outside the project template.');
		expect(() =>
			createPreviewFromHereScenario(project, {
				type: 'view-moment',
				day: 1,
				minuteOfDay: 1440
			})
		).toThrow('Preview-from-here minuteOfDay must be between 0 and 1439.');
		expect(project).toEqual(before);
	});
});
