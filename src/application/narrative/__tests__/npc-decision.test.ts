import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ReactionCandidateSetDefinition} from '../../../domain/narrative/reaction';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	createNarrativePendingReactionDecisionOpportunity,
	createNarrativeReactionDecisionOpportunity,
	evaluateNarrativeNpcDecision,
	executeNarrativeNpcDecision
} from '../npc-decision';

function automaticMove(id: string, storyNodeId = 'reaction-story'): NarrativeMoveDefinition {
	return {
		id,
		storyNodeId,
		kind: 'custom',
		label: id,
		actorCharacterId: 'npc',
		targetCharacterIds: ['player'],
		guards: [],
		resolution: {type: 'automatic', outcomeId: `${id}:outcome`},
		outcomes: [
			{
				id: `${id}:outcome`,
				key: 'continue',
				label: 'Continue',
				effectStoryNodeIds: [],
				effects: []
			}
		]
	};
}

function reactionSet(
	id: string,
	moveId: string,
	baseScore: number,
	storyNodeId = 'reaction-story'
): ReactionCandidateSetDefinition {
	return {
		id,
		storyNodeId,
		reactingCharacterId: 'npc',
		counterpartCharacterId: 'player',
		candidates: [
			{
				id: `${id}:candidate`,
				moveId,
				valence: 'neutral',
				baseScore,
				guards: [],
				considerations: []
			}
		]
	};
}

function baseProject() {
	const project = createNarrativeProject(
		'a43-story',
		'A43 NPC decisions',
		ninetyThreeDaysTemplate
	);
	project.characters = [
		{
			id: 'npc',
			name: 'NPC',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'npc-default'
		},
		{
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.storyNodes = [
		{
			id: 'reaction-story',
			kind: 'event',
			title: 'Reaction scene',
			participantIds: ['npc', 'player'],
			activationState: 'available'
		},
		{
			id: 'other-story',
			kind: 'event',
			title: 'Other scene',
			participantIds: ['npc'],
			activationState: 'available'
		},
		{
			id: 'due-event',
			kind: 'event',
			title: 'Due event',
			participantIds: [],
			activationState: 'available',
			placement: {day: 1, minuteOfDay: 603}
		}
	];
	project.simulation.day = 1;
	project.simulation.minuteOfDay = 600;
	return project;
}

describe('A43 NPC decision application bridge', () => {
	test('schedule intent blocks costful emergent action unless interruption is explicit', () => {
		const project = baseProject();
		project.narrativeMoves = [automaticMove('reply')];
		project.reactionCandidateSets = [reactionSet('replies', 'reply', 5)];
		project.simulation.activeBehaviorProfileByCharacter.npc = 'npc-default';
		const authoredBefore = JSON.stringify(project.storyNodes);

		const blockedOpportunity = createNarrativeReactionDecisionOpportunity(
			project,
			'replies',
			'opp:block',
			10,
			{reply: {timeCostMinutes: 5}}
		);
		const blocked = evaluateNarrativeNpcDecision(project, [blockedOpportunity]);
		expect(blocked.selection.selectedMoveId).toBeUndefined();
		expect(blocked.selection.candidateTraces[0].blockers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({code: 'schedule-intent-conflict'})
			])
		);

		const allowedOpportunity = createNarrativeReactionDecisionOpportunity(
			project,
			'replies',
			'opp:allow',
			10,
			{reply: {timeCostMinutes: 5, mayInterruptScheduleIntent: true}}
		);
		const executed = executeNarrativeNpcDecision(project, [allowedOpportunity]);
		expect(executed.trace.status).toBe('executed');
		expect(executed.trace.timeCostMinutes).toBe(5);
		expect(executed.project.simulation.minuteOfDay).toBe(605);
		expect(executed.trace.dueWorkIds).toContain('story-node:due-event');
		expect(
			executed.project.simulation.activeBehaviorProfileByCharacter.npc
		).toBe('npc-default');
		expect(executed.trace.scheduleIntentRetained).toBe(true);
		const occurrence = executed.project.runtimeOccurrences.find(
			item => item.type === 'move-outcome' && item.moveId === 'reply'
		);
		expect(occurrence?.moment).toEqual({day: 1, minuteOfDay: 605});
		expect(JSON.stringify(executed.project.storyNodes)).toBe(authoredBefore);
	});

	test('PendingReaction priority can schedule an opportunity and is consumed only after execution', () => {
		const project = baseProject();
		project.narrativeMoves = [automaticMove('ordinary'), automaticMove('urgent')];
		project.reactionCandidateSets = [
			reactionSet('ordinary-set', 'ordinary', 100),
			reactionSet('urgent-set', 'urgent', 1)
		];
		project.pendingReactions = [
			{
				id: 'pending:urgent',
				characterId: 'npc',
				reactionType: 'urgent',
				priority: 5,
				conditions: []
			}
		];
		project.mindStates = [
			{
				characterId: 'npc',
				activeMemoryIds: [],
				pendingReactionIds: ['pending:urgent']
			}
		];
		const ordinary = createNarrativeReactionDecisionOpportunity(
			project,
			'ordinary-set',
			'opp:ordinary',
			0
		);
		const urgent = createNarrativePendingReactionDecisionOpportunity(
			project,
			'pending:urgent',
			'urgent-set',
			'opp:urgent',
			0
		);

		const result = executeNarrativeNpcDecision(project, [ordinary, urgent]);
		expect(result.trace.selectedOpportunityId).toBe('opp:urgent');
		expect(result.trace.selectedMoveId).toBe('urgent');
		expect(result.trace.consumedPendingReactionId).toBe('pending:urgent');
		expect(result.project.pendingReactions).toEqual([]);
		expect(result.project.mindStates[0].pendingReactionIds).toEqual([]);
	});

	test('skill-check decision spends no time until explicit roll and skill input exist', () => {
		const project = baseProject();
		const skillMove: NarrativeMoveDefinition = {
			id: 'skill-reply',
			storyNodeId: 'reaction-story',
			kind: 'persuade',
			label: 'Skill reply',
			actorCharacterId: 'npc',
			targetCharacterIds: ['player'],
			guards: [],
			resolution: {
				type: 'skill-check',
				check: {
					skillKey: 'empathy',
					difficulty: 7,
					rollRule: {type: 'dice', diceCount: 1, dieSides: 6},
					modifiers: [],
					successOutcomeId: 'skill:success',
					failureOutcomeId: 'skill:failure'
				}
			},
			outcomes: [
				{id: 'skill:success', key: 'success', label: 'Success', effectStoryNodeIds: [], effects: []},
				{id: 'skill:failure', key: 'failure', label: 'Failure', effectStoryNodeIds: [], effects: []}
			]
		};
		project.narrativeMoves = [skillMove];
		project.reactionCandidateSets = [reactionSet('skill-set', 'skill-reply', 3)];
		const opportunity = createNarrativeReactionDecisionOpportunity(
			project,
			'skill-set',
			'opp:skill',
			10,
			{'skill-reply': {timeCostMinutes: 4}}
		);

		const missing = executeNarrativeNpcDecision(project, [opportunity]);
		expect(missing.trace.status).toBe('input-required');
		expect(missing.project.simulation.minuteOfDay).toBe(600);
		expect(missing.trace.timeCostMinutes).toBe(0);

		const explicit = executeNarrativeNpcDecision(project, [opportunity], {
			skillCheckByMoveId: {'skill-reply': {skillValue: 2, rollTotal: 5}}
		});
		expect(explicit.trace.status).toBe('executed');
		expect(explicit.project.simulation.minuteOfDay).toBe(604);
		expect(explicit.trace.moveResolution?.outcomeId).toBe('skill:success');
	});

	test('different active Story execution blocks choice while same-scene execution does not', () => {
		const project = baseProject();
		project.narrativeMoves = [automaticMove('reply')];
		project.reactionCandidateSets = [reactionSet('set', 'reply', 1)];
		const opportunity = createNarrativeReactionDecisionOpportunity(
			project,
			'set',
			'opp',
			0
		);
		project.activeStoryExecutions = [
			{
				id: 'execution:other',
				workId: 'story-node:other-story',
				storyNodeId: 'other-story',
				participantIds: ['npc'],
				scheduledMoment: {day: 1, minuteOfDay: 590},
				startedAt: {day: 1, minuteOfDay: 590},
				completesAt: {day: 1, minuteOfDay: 620},
				durationMinutes: 30,
				occurrenceMode: 'one-shot',
				interruption: 'interruptible'
			}
		];
		const blocked = evaluateNarrativeNpcDecision(project, [opportunity]);
		expect(blocked.selection.selectedMoveId).toBeUndefined();
		expect(blocked.selection.candidateTraces[0].blockers[0].code).toBe(
			'active-execution-conflict'
		);

		project.activeStoryExecutions[0] = {
			...project.activeStoryExecutions[0],
			storyNodeId: 'reaction-story'
		};
		const sameScene = evaluateNarrativeNpcDecision(project, [opportunity]);
		expect(sameScene.selection.selectedMoveId).toBe('reply');
	});
});
