import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {buildProjectSearchIndex} from '../project-search';
import {planAuthoringNavigation} from '../authoring-navigation';

function projectFixture() {
	const project = createNarrativeProject(
		'story-a67-navigation',
		'A67 Navigation',
		ninetyThreeDaysTemplate
	);
	project.characters.push({
		id: 'katya',
		name: 'Катя',
		cognitionTier: 'full',
		defaultBehaviorProfileId: 'katya-profile'
	});
	project.behaviorProfiles.push({
		id: 'katya-profile',
		characterId: 'katya',
		name: 'Обычная жизнь'
	});
	project.locations.push({id: 'bar', name: 'Бар'});
	project.storyNodes.push(
		{
			id: 'scheduled',
			kind: 'event',
			title: 'Встреча',
			participantIds: ['katya'],
			activationState: 'draft',
			placement: {day: 4, minuteOfDay: 600, locationId: 'bar'}
		},
		{
			id: 'unscheduled',
			kind: 'beat',
			title: 'Черновик',
			participantIds: [],
			activationState: 'draft'
		}
	);
	project.editor.storyCanvas!.nodes.push(
		{
			id: 'scheduled-visual',
			kind: 'entity',
			entityRef: {type: 'storyNode', id: 'scheduled'},
			position: {x: 100, y: 200}
		},
		{
			id: 'katya-first',
			kind: 'entity',
			entityRef: {type: 'character', id: 'katya'},
			position: {x: 300, y: 400}
		},
		{
			id: 'katya-second',
			kind: 'entity',
			entityRef: {type: 'character', id: 'katya'},
			position: {x: 900, y: 1000}
		}
	);
	project.narrativeMoves.push({
		id: 'move-a',
		storyNodeId: 'scheduled',
		kind: 'inform',
		label: 'Сказать',
		targetCharacterIds: [],
		guards: [],
		resolution: {type: 'automatic', outcomeId: 'outcome-a'},
		outcomes: [{id: 'outcome-a', label: 'Ок', effectStoryNodeIds: []}]
	});
	project.routineRules.push({
		id: 'katya-routine',
		characterId: 'katya',
		behaviorProfileId: 'katya-profile',
		activeRange: {fromDay: 1, toDay: 93},
		recurrence: {type: 'everyDay'},
		timeWindow: {type: 'exact', startMinute: 600, endMinute: 660},
		targetLocationId: 'bar'
	});
	return project;
}

describe('A67 authoring navigation planner', () => {
	test('opens Story in Story using the existing viewport helper semantics', () => {
		const project = projectFixture();
		project.editor.workspaceMode = 'world-time';

		const plan = planAuthoringNavigation(
			project,
			{type: 'open-story-in-story', storyNodeId: 'scheduled'},
			{splitView: false}
		);

		expect(plan.focusTransition).toEqual({type: 'story-node', id: 'scheduled'});
		expect(plan.projection).toEqual({status: 'projected'});
		expect(plan.commands.map(command => command.type)).toEqual([
			'editor/setStoryViewport',
			'editor/selectWorkspace'
		]);
	});

	test('keeps a canonical Story focus when there is no Story visual', () => {
		const project = projectFixture();

		const plan = planAuthoringNavigation(
			project,
			{type: 'open-story-in-story', storyNodeId: 'unscheduled'},
			{splitView: false}
		);

		expect(plan.focusTransition).toEqual({type: 'story-node', id: 'unscheduled'});
		expect(plan.projection).toEqual({
			status: 'canonical-only',
			reason: 'no-story-visual'
		});
		expect(plan.commands).toEqual([]);
	});

	test('returns missing-target without commands for deleted Story or Character', () => {
		const project = projectFixture();

		expect(
			planAuthoringNavigation(
				project,
				{type: 'open-story-in-story', storyNodeId: 'missing'},
				{splitView: false}
			)
		).toEqual({commands: [], projection: {status: 'missing-target'}});
		expect(
			planAuthoringNavigation(
				project,
				{type: 'open-character-in-story', characterId: 'missing'},
				{splitView: false}
			)
		).toEqual({commands: [], projection: {status: 'missing-target'}});
	});

	test('uses the first stable Character Canvas copy only for viewport centering', () => {
		const project = projectFixture();
		project.editor.workspaceMode = 'world-time';

		const plan = planAuthoringNavigation(
			project,
			{type: 'open-character-in-story', characterId: 'katya'},
			{splitView: false}
		);

		expect(plan.focusTransition).toEqual({type: 'character', id: 'katya'});
		expect(plan.commands[0]).toEqual({
			type: 'editor/setStoryViewport',
			viewport: {x: 80, y: -160, zoom: 1}
		});
	});

	test('supports canonical Character focus without a Canvas visual', () => {
		const project = projectFixture();
		project.editor.storyCanvas!.nodes = project.editor.storyCanvas!.nodes.filter(
			node => node.entityRef?.type !== 'character'
		);

		const plan = planAuthoringNavigation(
			project,
			{type: 'open-character-in-story', characterId: 'katya'},
			{splitView: false}
		);

		expect(plan.focusTransition).toEqual({type: 'character', id: 'katya'});
		expect(plan.projection).toEqual({
			status: 'canonical-only',
			reason: 'no-story-visual'
		});
		expect(plan.commands).toEqual([]);
	});

	test('opens scheduled Story in WORLD/TIME without touching simulation', () => {
		const project = projectFixture();
		const simulationBefore = JSON.parse(JSON.stringify(project.simulation));

		const plan = planAuthoringNavigation(
			project,
			{type: 'open-story-in-world-time', storyNodeId: 'scheduled'},
			{splitView: false}
		);

		expect(plan.focusTransition).toEqual({type: 'story-node', id: 'scheduled'});
		expect(plan.commands).toEqual([
			{
				type: 'editor/setWorldTimeViewport',
				centerAbsoluteMinute: 3 * 1440 + 600,
				pixelsPerHour: 12
			},
			{type: 'editor/selectWorkspace', workspace: 'world-time'}
		]);
		expect(project.simulation).toEqual(simulationBefore);
	});

	test('does not invent time or switch workspace for an unscheduled Story', () => {
		const project = projectFixture();

		const plan = planAuthoringNavigation(
			project,
			{type: 'open-story-in-world-time', storyNodeId: 'unscheduled'},
			{splitView: false}
		);

		expect(plan).toEqual({
			focusTransition: {type: 'story-node', id: 'unscheduled'},
			commands: [],
			projection: {status: 'unavailable', reason: 'unscheduled-story'}
		});
	});

	test('omits workspace switching in Split View and when destination is already active', () => {
		const project = projectFixture();

		const split = planAuthoringNavigation(
			project,
			{type: 'open-story-in-world-time', storyNodeId: 'scheduled'},
			{splitView: true}
		);
		expect(split.commands.map(command => command.type)).toEqual([
			'editor/setWorldTimeViewport'
		]);

		project.editor.workspaceMode = 'world-time';
		const alreadyThere = planAuthoringNavigation(
			project,
			{type: 'open-story-in-world-time', storyNodeId: 'scheduled'},
			{splitView: false}
		);
		expect(alreadyThere.commands.map(command => command.type)).toEqual([
			'editor/setWorldTimeViewport'
		]);
	});

	test('Search establishes direct Story/Character focus and resolved owning Story focus', () => {
		const project = projectFixture();
		const index = buildProjectSearchIndex(project);
		const story = index.find(document => document.key === 'story-node:scheduled')!;
		const character = index.find(document => document.key === 'character:katya')!;
		const move = index.find(document => document.key === 'move:move-a')!;

		expect(
			planAuthoringNavigation(
				project,
				{type: 'open-search-document', document: story},
				{splitView: false}
			).focusTransition
		).toEqual({type: 'story-node', id: 'scheduled'});
		expect(
			planAuthoringNavigation(
				project,
				{type: 'open-search-document', document: character},
				{splitView: false}
			).focusTransition
		).toEqual({type: 'character', id: 'katya'});
		expect(
			planAuthoringNavigation(
				project,
				{type: 'open-search-document', document: move},
				{splitView: false}
			).focusTransition
		).toEqual({type: 'story-node', id: 'scheduled'});
	});

	test('routine navigation keeps Character context out of first-slice Focus', () => {
		const project = projectFixture();
		const routine = buildProjectSearchIndex(project).find(
			document => document.key === 'routine-rule:katya-routine'
		)!;

		const plan = planAuthoringNavigation(
			project,
			{type: 'open-search-document', document: routine},
			{splitView: false}
		);

		expect(plan.focusTransition).toBeUndefined();
		expect(plan.projection).toEqual({status: 'unsupported-focus-kind'});
		expect(plan.commands.map(command => command.type)).toEqual([
			'editor/setWorldTimeViewport',
			'editor/selectWorkspace'
		]);
	});

	test('only emits the approved editor navigation commands', () => {
		const project = projectFixture();
		const intents = [
			{type: 'open-story-in-story' as const, storyNodeId: 'scheduled'},
			{type: 'open-story-in-world-time' as const, storyNodeId: 'scheduled'},
			{type: 'open-character-in-story' as const, characterId: 'katya'}
		];
		const allowed = new Set([
			'editor/selectWorkspace',
			'editor/setStoryViewport',
			'editor/setWorldTimeViewport'
		]);

		for (const intent of intents) {
			const plan = planAuthoringNavigation(project, intent, {splitView: false});
			expect(plan.commands.every(command => allowed.has(command.type))).toBe(true);
		}
	});
});
