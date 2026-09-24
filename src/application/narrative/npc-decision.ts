import {minutesPerDay} from '../../domain/narrative/calendar';
import {PendingReaction} from '../../domain/narrative/cognition';
import {NarrativeSkillCheckResolutionInput} from '../../domain/narrative/interaction';
import {
	NpcDecisionActionPolicy,
	NpcDecisionOpportunity,
	NpcDecisionOpportunityEvaluation,
	NpcDecisionSelectionTrace,
	selectNpcDecisionAction
} from '../../domain/narrative/npc-decision';
import {NarrativeProject} from '../../domain/narrative/project';
import {ReactionCandidateSetDefinition} from '../../domain/narrative/reaction';
import {
	evaluateNarrativeProjectReactionSet,
	NarrativeProjectMoveResolutionTrace,
	resolveAndApplyNarrativeProjectMove
} from './living-simulation';
import {advanceNarrativeProjectSimulation} from './simulation';

export interface NarrativeNpcDecisionEvaluationResult {
	evaluations: NpcDecisionOpportunityEvaluation[];
	selection: NpcDecisionSelectionTrace;
}

export interface NarrativeNpcDecisionExecutionInput {
	/** Optional explicit draw used only among exact top ties. */
	randomDraw?: number;
	/** Skill-check inputs remain explicit; the NPC layer never invents rolls. */
	skillCheckByMoveId?: Record<string, NarrativeSkillCheckResolutionInput | undefined>;
}

export type NarrativeNpcDecisionExecutionStatus =
	| 'executed'
	| 'no-action'
	| 'blocked'
	| 'unknown'
	| 'input-required';

export interface NarrativeNpcDecisionExecutionTrace {
	status: NarrativeNpcDecisionExecutionStatus;
	selection: NpcDecisionSelectionTrace;
	moveResolution?: NarrativeProjectMoveResolutionTrace;
	selectedOpportunityId?: string;
	selectedMoveId?: string;
	timeCostMinutes: number;
	remainingBudgetMinutes?: number;
	consumedPendingReactionId?: string;
	dueWorkIds: string[];
	/** Schedule intent is never erased by an emergent action. */
	scheduleIntentRetained: true;
	summary: string;
}

export interface NarrativeNpcDecisionExecutionResult {
	project: NarrativeProject;
	trace: NarrativeNpcDecisionExecutionTrace;
}

function reactionSet(project: NarrativeProject, reactionSetId: string) {
	const set = project.reactionCandidateSets.find(candidate => candidate.id === reactionSetId);
	if (!set) {
		throw new Error(`Unknown Reaction Candidate Set: ${reactionSetId}`);
	}
	return set;
}

function pendingReaction(project: NarrativeProject, pendingReactionId: string) {
	const pending = project.pendingReactions.find(candidate => candidate.id === pendingReactionId);
	if (!pending) {
		throw new Error(`Unknown PendingReaction: ${pendingReactionId}`);
	}
	return pending;
}

function opportunityForSet(
	set: ReactionCandidateSetDefinition,
	id: string,
	budgetMinutes: number,
	actionPolicyByMoveId: Record<string, NpcDecisionActionPolicy>,
	priority = 0
): NpcDecisionOpportunity {
	return {
		id,
		characterId: set.reactingCharacterId,
		reactionSetId: set.id,
		source: {type: 'reaction-set'},
		priority,
		budgetMinutes,
		actionPolicyByMoveId
	};
}

/** Explicit opportunity from a ReactionCandidateSet; the clock never creates it implicitly. */
export function createNarrativeReactionDecisionOpportunity(
	project: NarrativeProject,
	reactionSetId: string,
	id: string,
	budgetMinutes: number,
	actionPolicyByMoveId: Record<string, NpcDecisionActionPolicy> = {},
	priority = 0
): NpcDecisionOpportunity {
	return opportunityForSet(
		reactionSet(project, reactionSetId),
		id,
		budgetMinutes,
		actionPolicyByMoveId,
		priority
	);
}

/**
 * Bridges an existing PendingReaction into an explicit decision opportunity.
 * The pending reaction remains distinct from the ReactionCandidate set and is
 * consumed only after a Move actually resolves.
 */
export function createNarrativePendingReactionDecisionOpportunity(
	project: NarrativeProject,
	pendingReactionId: string,
	reactionSetId: string,
	id: string,
	budgetMinutes: number,
	actionPolicyByMoveId: Record<string, NpcDecisionActionPolicy> = {}
): NpcDecisionOpportunity {
	const pending = pendingReaction(project, pendingReactionId);
	const set = reactionSet(project, reactionSetId);
	if (pending.characterId !== set.reactingCharacterId) {
		throw new Error(
			`PendingReaction ${pending.id} belongs to ${pending.characterId}, not ${set.reactingCharacterId}.`
		);
	}
	return {
		...opportunityForSet(
			set,
			id,
			budgetMinutes,
			actionPolicyByMoveId,
			pending.priority
		),
		source: {type: 'pending-reaction', pendingReactionId: pending.id}
	};
}

function projectRemainingMinutes(project: NarrativeProject) {
	const currentAbsolute =
		(project.simulation.day - 1) * minutesPerDay + project.simulation.minuteOfDay;
	return project.template.dayCount * minutesPerDay - 1 - currentAbsolute;
}

function runtimeInputForCandidate(
	project: NarrativeProject,
	set: ReactionCandidateSetDefinition,
	opportunity: NpcDecisionOpportunity,
	candidateId: string,
	moveId: string
) {
	const move = project.narrativeMoves.find(candidate => candidate.id === moveId);
	if (!move) {
		return undefined;
	}
	const actionPolicy = opportunity.actionPolicyByMoveId[moveId] ?? {
		timeCostMinutes: 0,
		mayInterruptScheduleIntent: false
	};
	const hasConflictingActiveExecution = project.activeStoryExecutions.some(
		execution =>
			execution.participantIds.includes(opportunity.characterId) &&
			execution.storyNodeId !== set.storyNodeId
	);
	return {
		moveId,
		actorCharacterId: move.actorCharacterId,
		timeCostMinutes: actionPolicy.timeCostMinutes,
		mayInterruptScheduleIntent: actionPolicy.mayInterruptScheduleIntent ?? false,
		hasScheduleIntent: Boolean(
			project.simulation.activeBehaviorProfileByCharacter[opportunity.characterId]
		),
		hasConflictingActiveExecution,
		fitsProjectTime: actionPolicy.timeCostMinutes <= projectRemainingMinutes(project),
		candidateId
	};
}

/**
 * Evaluates explicit opportunities and selects at most one authored action.
 * This function is read-only: it does not execute a Move or advance time.
 */
export function evaluateNarrativeNpcDecision(
	project: NarrativeProject,
	opportunities: NpcDecisionOpportunity[],
	randomDraw?: number
): NarrativeNpcDecisionEvaluationResult {
	const evaluations = opportunities.map(opportunity => {
		const set = reactionSet(project, opportunity.reactionSetId);
		if (set.reactingCharacterId !== opportunity.characterId) {
			throw new Error(
				`NPC opportunity ${opportunity.id} character does not match ReactionCandidateSet.`
			);
		}
		if (opportunity.source.type === 'pending-reaction') {
			const pending = pendingReaction(project, opportunity.source.pendingReactionId);
			if (pending.characterId !== opportunity.characterId) {
				throw new Error(
					`NPC opportunity ${opportunity.id} PendingReaction character mismatch.`
				);
			}
		}
		const reactionEvaluation = evaluateNarrativeProjectReactionSet(project, set.id);
		const candidateRuntime = Object.fromEntries(
			reactionEvaluation.candidates.map(candidate => [
				candidate.candidateId,
				runtimeInputForCandidate(
					project,
					set,
					opportunity,
					candidate.candidateId,
					candidate.moveId
				)
			])
		);
		return {opportunity, reactionEvaluation, candidateRuntime};
	});
	return {
		evaluations,
		selection: selectNpcDecisionAction(evaluations, randomDraw)
	};
}

function consumePendingReaction(
	project: NarrativeProject,
	pending: PendingReaction
): NarrativeProject {
	return {
		...project,
		pendingReactions: project.pendingReactions.filter(candidate => candidate.id !== pending.id),
		mindStates: project.mindStates.map(mind =>
			mind.characterId === pending.characterId
				? {
						...mind,
						pendingReactionIds: mind.pendingReactionIds.filter(id => id !== pending.id)
				  }
				: mind
		)
	};
}

/**
 * Explicit A43 execution boundary. Selection happens first. If a selected Move
 * has a time cost, simulation advances by exactly that authored opportunity
 * cost before the Move resolves, so the resulting occurrence is timestamped at
 * action completion. Due work discovered while time passes remains declarative.
 */
export function executeNarrativeNpcDecision(
	project: NarrativeProject,
	opportunities: NpcDecisionOpportunity[],
	input: NarrativeNpcDecisionExecutionInput = {}
): NarrativeNpcDecisionExecutionResult {
	const evaluation = evaluateNarrativeNpcDecision(
		project,
		opportunities,
		input.randomDraw
	);
	const selection = evaluation.selection;
	if (!selection.selectedOpportunityId || !selection.selectedMoveId) {
		return {
			project,
			trace: {
				status: 'no-action',
				selection,
				timeCostMinutes: 0,
				dueWorkIds: [],
				scheduleIntentRetained: true,
				summary: selection.summary
			}
		};
	}
	const opportunity = opportunities.find(
		candidate => candidate.id === selection.selectedOpportunityId
	)!;
	const move = project.narrativeMoves.find(
		candidate => candidate.id === selection.selectedMoveId
	)!;
	const skillCheck = input.skillCheckByMoveId?.[move.id];
	if (move.resolution.type === 'skill-check' && !skillCheck) {
		const preflight = resolveAndApplyNarrativeProjectMove(project, move.id);
		return {
			project,
			trace: {
				status: 'input-required',
				selection,
				moveResolution: preflight.resolution,
				selectedOpportunityId: opportunity.id,
				selectedMoveId: move.id,
				timeCostMinutes: 0,
				remainingBudgetMinutes: opportunity.budgetMinutes,
				dueWorkIds: [],
				scheduleIntentRetained: true,
				summary: 'Selected NPC Move requires explicit skill value and roll before time is spent.'
			}
		};
	}

	const timeCostMinutes = selection.selectedTimeCostMinutes ?? 0;
	const timeAdvance =
		timeCostMinutes > 0
			? advanceNarrativeProjectSimulation(project, timeCostMinutes)
			: undefined;
	const atResolution = timeAdvance?.project ?? project;
	const moveResult = resolveAndApplyNarrativeProjectMove(atResolution, move.id, {
		skillCheck
	});
	if (moveResult.resolution.status !== 'resolved') {
		return {
			project: atResolution,
			trace: {
				status: moveResult.resolution.status,
				selection,
				moveResolution: moveResult.resolution,
				selectedOpportunityId: opportunity.id,
				selectedMoveId: move.id,
				timeCostMinutes,
				remainingBudgetMinutes: opportunity.budgetMinutes - timeCostMinutes,
				dueWorkIds: timeAdvance?.dueWork.map(work => work.id) ?? [],
				scheduleIntentRetained: true,
				summary: `NPC spent ${timeCostMinutes} minutes, but the selected Move did not resolve.`
			}
		};
	}

	let next = moveResult.project;
	let consumedPendingReactionId: string | undefined;
	if (opportunity.source.type === 'pending-reaction') {
		const pending = pendingReaction(next, opportunity.source.pendingReactionId);
		next = consumePendingReaction(next, pending);
		consumedPendingReactionId = pending.id;
	}
	return {
		project: next,
		trace: {
			status: 'executed',
			selection,
			moveResolution: moveResult.resolution,
			selectedOpportunityId: opportunity.id,
			selectedMoveId: move.id,
			timeCostMinutes,
			remainingBudgetMinutes: opportunity.budgetMinutes - timeCostMinutes,
			consumedPendingReactionId,
			dueWorkIds: timeAdvance?.dueWork.map(work => work.id) ?? [],
			scheduleIntentRetained: true,
			summary: `NPC Move ${move.id} resolved after spending ${timeCostMinutes} simulation minutes.`
		}
	};
}
