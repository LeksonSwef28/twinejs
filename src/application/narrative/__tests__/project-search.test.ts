import {createDefaultNarrativeOutcome} from '../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	buildProjectSearchIndex,
	projectBackReferences,
	projectSearchNavigationTarget,
	searchNarrativeProject
} from '../project-search';

function projectFixture() {
	const project = createNarrativeProject(
		'story-a50-search',
		'A50 project search',
		ninetyThreeDaysTemplate
	);
	project.locations.push({id: 'bar', name: 'Летний бар'});
	project.scenes.push({id: 'scene-bar', locationId: 'bar', name: 'Вечер в баре'});
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
	project.itemDefinitions.push({
		id: 'key-def',
		name: 'Ключ от крыши',
		description: 'Старый ключ',
		tags: ['крыша']
	});
	project.itemInstances.push({
		id: 'key-1',
		definitionId: 'key-def',
		placement: {type: 'location', locationId: 'bar'}
	});
	project.objectiveFacts.push({
		id: 'fact-secret',
		title: 'Андрей уже знает секрет',
		description: 'Объективный факт мира',
		tags: ['секрет']
	});
	project.claims.push({
		id: 'claim-secret',
		text: 'Секрет можно рассказать Кате',
		aboutFactId: 'fact-secret',
		stance: 'unresolved',
		tags: ['слух']
	});
	project.initialKnowledge.push({
		id: 'knowledge-katya-secret',
		characterId: 'katya',
		claimId: 'claim-secret',
		attitude: 'believes',
		confidence: 0.6,
		source: {type: 'authored'}
	});
	project.storyNodes.push(
		{
			id: 'reveal',
			kind: 'event',
			title: 'Катя узнаёт правду',
			description: 'Кульминация летнего вечера',
			participantIds: ['katya'],
			activationState: 'draft',
			placement: {day: 4, minuteOfDay: 600, locationId: 'bar'}
		},
		{
			id: 'after',
			kind: 'beat',
			title: 'После разговора',
			participantIds: [],
			activationState: 'draft'
		}
	);
	project.storyConnections.push({
		id: 'reveal-after',
		sourceNodeId: 'reveal',
		targetNodeId: 'after',
		kind: 'flow',
		mode: 'reference'
	});
	const outcome = createDefaultNarrativeOutcome('tell-secret');
	project.narrativeMoves.push({
		id: 'tell-secret',
		storyNodeId: 'reveal',
		kind: 'inform',
		label: 'Рассказать секрет',
		actorCharacterId: 'katya',
		targetCharacterIds: [],
		communicatedClaimId: 'claim-secret',
		guards: [
			{
				id: 'has-key',
				condition: {
					type: 'character-has-item',
					characterId: 'katya',
					itemInstanceId: 'key-1'
				}
			}
		],
		resolution: {type: 'automatic', outcomeId: outcome.id},
		outcomes: [outcome]
	});
	project.interactionTemplates.push({
		id: 'secret-template',
		name: 'Передать секрет',
		description: 'Reusable interaction',
		roles: [{id: 'speaker', label: 'Говорящий', kind: 'character'}],
		claimSlots: [{id: 'claim', label: 'Секрет', required: true}],
		moves: [
			{
				id: 'tell',
				kind: 'inform',
				label: 'Рассказать',
				actorRoleId: 'speaker',
				targetRoleIds: [],
				communicatedClaimSlotId: 'claim'
			}
		],
		tags: ['секрет']
	});
	project.routineRules.push({
		id: 'katya-evening',
		characterId: 'katya',
		behaviorProfileId: 'katya-profile',
		activeRange: {fromDay: 1, toDay: 93},
		recurrence: {type: 'everyDay'},
		timeWindow: {type: 'exact', startMinute: 1080, endMinute: 1320},
		targetLocationId: 'bar'
	});
	project.scheduleExceptions.push({
		id: 'katya-day-four',
		characterId: 'katya',
		activeRange: {fromDay: 4, toDay: 4},
		timeWindow: {type: 'exact', startMinute: 570, endMinute: 660},
		targetLocationId: 'bar',
		priority: 10,
		reason: 'Сюжетная встреча'
	});
	return project;
}

describe('A50 project search', () => {
	test('indexes the authored project across Story, WORLD/TIME and reusable structures', () => {
		const project = projectFixture();
		const index = buildProjectSearchIndex(project);
		const kinds = new Set(index.map(document => document.kind));

		expect(kinds).toEqual(
			new Set([
				'story-node',
				'character',
				'location',
				'scene',
				'item-definition',
				'item-instance',
				'fact',
				'claim',
				'move',
				'interaction-template',
				'routine-rule',
				'schedule-exception'
			])
		);
		expect(index.find(document => document.key === 'routine-rule:katya-evening')).toEqual(
			expect.objectContaining({workspace: 'world-time'})
		);
	});

	test('searches all terms with kind filtering and useful title ranking', () => {
		const project = projectFixture();

		expect(searchNarrativeProject(project, {text: 'катя правда'})[0]).toEqual(
			expect.objectContaining({kind: 'story-node', id: 'reveal'})
		);
		expect(
			searchNarrativeProject(project, {text: 'летний', kinds: ['location']})
		).toEqual([
			expect.objectContaining({kind: 'location', id: 'bar', title: 'Летний бар'})
		]);
		expect(searchNarrativeProject(project, {text: '   '})).toEqual([]);
	});

	test('returns actionable back-references for Story, character, location, knowledge and items', () => {
		const project = projectFixture();

		expect(projectBackReferences(project, {kind: 'story-node', id: 'reveal'})).toEqual(
			expect.arrayContaining([
				expect.objectContaining({kind: 'story-node', id: 'after'}),
				expect.objectContaining({kind: 'move', id: 'tell-secret'})
			])
		);
		expect(projectBackReferences(project, {kind: 'character', id: 'katya'})).toEqual(
			expect.arrayContaining([
				expect.objectContaining({kind: 'story-node', id: 'reveal'}),
				expect.objectContaining({kind: 'routine-rule', id: 'katya-evening'}),
				expect.objectContaining({kind: 'schedule-exception', id: 'katya-day-four'})
			])
		);
		expect(projectBackReferences(project, {kind: 'location', id: 'bar'})).toEqual(
			expect.arrayContaining([
				expect.objectContaining({kind: 'story-node', id: 'reveal'}),
				expect.objectContaining({kind: 'scene', id: 'scene-bar'})
			])
		);
		expect(projectBackReferences(project, {kind: 'claim', id: 'claim-secret'})).toEqual(
			expect.arrayContaining([
				expect.objectContaining({kind: 'move', id: 'tell-secret'}),
				expect.objectContaining({kind: 'character', id: 'katya'})
			])
		);
		expect(projectBackReferences(project, {kind: 'fact', id: 'fact-secret'})).toEqual([
			expect.objectContaining({kind: 'claim', id: 'claim-secret'})
		]);
		expect(projectBackReferences(project, {kind: 'item-definition', id: 'key-def'})).toEqual([
			expect.objectContaining({kind: 'item-instance', id: 'key-1'})
		]);
		expect(projectBackReferences(project, {kind: 'item-instance', id: 'key-1'})).toEqual([
			expect.objectContaining({kind: 'move', id: 'tell-secret'})
		]);
	});

	test('resolves search results to canonical Story or WORLD/TIME destinations without moving simulation time', () => {
		const project = projectFixture();
		const index = buildProjectSearchIndex(project);
		const move = index.find(document => document.key === 'move:tell-secret')!;
		const location = index.find(document => document.key === 'location:bar')!;
		const routine = index.find(document => document.key === 'routine-rule:katya-evening')!;
		const exception = index.find(
			document => document.key === 'schedule-exception:katya-day-four'
		)!;
		const scene = index.find(document => document.key === 'scene:scene-bar')!;
		const template = index.find(
			document => document.key === 'interaction-template:secret-template'
		)!;
		const simulationBefore = {...project.simulation};

		expect(projectSearchNavigationTarget(project, move)).toEqual({
			workspace: 'story',
			storyNodeId: 'reveal',
			locationId: 'bar',
			absoluteMinute: 3 * 1440 + 600
		});
		expect(projectSearchNavigationTarget(project, location)).toEqual({
			workspace: 'world-time',
			locationId: 'bar'
		});
		expect(projectSearchNavigationTarget(project, routine)).toEqual({
			workspace: 'world-time',
			characterId: 'katya',
			locationId: 'bar',
			absoluteMinute: 0
		});
		expect(projectSearchNavigationTarget(project, exception)).toEqual({
			workspace: 'world-time',
			characterId: 'katya',
			locationId: 'bar',
			absoluteMinute: 3 * 1440
		});
		expect(projectSearchNavigationTarget(project, scene)).toEqual({
			workspace: 'world-time',
			locationId: 'bar'
		});
		expect(projectSearchNavigationTarget(project, template)).toEqual({
			workspace: 'story'
		});
		expect(project.simulation).toEqual(simulationBefore);
	});

	test('returns the owning Story node from a Move back-reference', () => {
		const project = projectFixture();
		expect(projectBackReferences(project, {kind: 'move', id: 'tell-secret'})).toEqual([
			expect.objectContaining({kind: 'story-node', id: 'reveal'})
		]);
		expect(projectBackReferences(project, {kind: 'scene', id: 'scene-bar'})).toEqual([
			expect.objectContaining({kind: 'location', id: 'bar'})
		]);
		expect(projectBackReferences(project, {kind: 'routine-rule', id: 'katya-evening'})).toEqual(
			expect.arrayContaining([
				expect.objectContaining({kind: 'character', id: 'katya'}),
				expect.objectContaining({kind: 'location', id: 'bar'})
			])
		);
		expect(
			projectBackReferences(project, {kind: 'schedule-exception', id: 'katya-day-four'})
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({kind: 'character', id: 'katya'}),
				expect.objectContaining({kind: 'location', id: 'bar'})
			])
		);
	});
});
