import {EntityId} from './entities';
import {ReactionCandidateSetEvaluation} from './reaction';

export type NpcDecisionOpportunitySource =
	| {type: 'reaction-set'}
	| {type: 'pending-reaction'; pendingReactionId: EntityId};

export interface NpcDecisionActionPolicy {
	/** Explicit simulation cost; the selector never invents action duration. */
	timeCostMinutes: number;
	/** Allows a non-zero-cost emergent action to temporarily supersede schedule intent. */
	mayInterruptScheduleIntent?: boolean;
}

export interface NpcDecisionOpportunity {
	id: EntityId;
	characterId: EntityId;
	reactionSetId: EntityId;
	source: NpcDecisionOpportunitySource;
	/** Higher-priority opportunities are considered before score ties. */
	priority: number;
	/** Maximum simulation minutes this opportunity may spend. */
	budgetMinutes: number;
	actionPolicyByMoveId: Record<string, NpcDecisionActionPolicy>;
}

export type NpcDecisionCandidateBlockerCode =
	| 'reaction-unavailable'
	| 'missing-move'
	| 'actor-mismatch'
	| 'budget-exceeded'
	| 'schedule-intent-conflict'
	| 'active-execution-conflict'
	| 'project-end';

export interface NpcDecisionCandidateBlocker {
	code: NpcDecisionCandidateBlockerCode;
	summary: string;
}

export interface NpcDecisionCandidateRuntimeInput {
	moveId: EntityId;
	actorCharacterId?: EntityId;
	timeCostMinutes: number;
	mayInterruptScheduleIntent: boolean;
	hasScheduleIntent: boolean;
	hasConflictingActiveExecution: boolean;
	fitsProjectTime: boolean;
}

export interface NpcDecisionOpportunityEvaluation {
	opportunity: NpcDecisionOpportunity;
	reactionEvaluation: ReactionCandidateSetEvaluation;
	candidateRuntime: Record<string, NpcDecisionCandidateRuntimeInput | undefined>;
}

export interface NpcDecisionCandidateTrace {
	opportunityId: EntityId;
	candidateId: EntityId;
	moveId: EntityId;
	priority: number;
	score: number;
	timeCostMinutes: number;
	selectable: boolean;
	blockers: NpcDecisionCandidateBlocker[];
}

export interface NpcDecisionSelectionTrace {
	candidateTraces: NpcDecisionCandidateTrace[];
	selectedOpportunityId?: EntityId;
	selectedCandidateId?: EntityId;
	selectedMoveId?: EntityId;
	selectedTimeCostMinutes?: number;
	randomDraw?: number;
	randomnessUsed: boolean;
	tiedTopCandidateIds: EntityId[];
	summary: string;
}

function nonNegativeInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function npcDecisionOpportunityIsValid(
	opportunity: NpcDecisionOpportunity
): boolean {
	if (
		!opportunity.id ||
		!opportunity.characterId ||
		!opportunity.reactionSetId ||
		!Number.isFinite(opportunity.priority) ||
		!nonNegativeInteger(opportunity.budgetMinutes)
	) {
		return false;
	}
	if (
		opportunity.source.type === 'pending-reaction' &&
		!opportunity.source.pendingReactionId
	) {
		return false;
	}
	return Object.values(opportunity.actionPolicyByMoveId).every(
		policy =>
			nonNegativeInteger(policy.timeCostMinutes) &&
			(policy.mayInterruptScheduleIntent === undefined ||
				typeof policy.mayInterruptScheduleIntent === 'boolean')
	);
}

function candidateBlockers(
	opportunity: NpcDecisionOpportunity,
	availability: 'available' | 'blocked' | 'unknown',
	runtime: NpcDecisionCandidateRuntimeInput | undefined
): NpcDecisionCandidateBlocker[] {
	const blockers: NpcDecisionCandidateBlocker[] = [];
	if (availability !== 'available') {
		blockers.push({
			code: 'reaction-unavailable',
			summary:
				availability === 'unknown'
					? 'Reaction eligibility is unknown.'
					: 'Reaction is blocked by authored/runtime guards.'
		});
	}
	if (!runtime) {
		blockers.push({code: 'missing-move', summary: 'Candidate Narrative Move was not found.'});
		return blockers;
	}
	if (
		runtime.actorCharacterId !== undefined &&
		runtime.actorCharacterId !== opportunity.characterId
	) {
		blockers.push({
			code: 'actor-mismatch',
			summary: `Move actor ${runtime.actorCharacterId} does not match decision character ${opportunity.characterId}.`
		});
	}
	if (runtime.timeCostMinutes > opportunity.budgetMinutes) {
		blockers.push({
			code: 'budget-exceeded',
			summary: `Action costs ${runtime.timeCostMinutes} minutes but opportunity budget is ${opportunity.budgetMinutes}.`
		});
	}
	if (
		runtime.timeCostMinutes > 0 &&
		runtime.hasScheduleIntent &&
		!runtime.mayInterruptScheduleIntent
	) {
		blockers.push({
			code: 'schedule-intent-conflict',
			summary: 'Non-zero-cost emergent action would interrupt current schedule intent.'
		});
	}
	if (runtime.hasConflictingActiveExecution) {
		blockers.push({
			code: 'active-execution-conflict',
			summary: 'Character is already occupied by a different active Story execution.'
		});
	}
	if (!runtime.fitsProjectTime) {
		blockers.push({
			code: 'project-end',
			summary: 'Action cannot finish before the end of the project timeline.'
		});
	}
	return blockers;
}

/**
 * Pure A43 selector. It consumes already-evaluated authored ReactionCandidates
 * plus explicit runtime/action-economy metadata. It never executes a Move,
 * advances time, changes schedule intent, or invents randomness.
 */
export function selectNpcDecisionAction(
	evaluations: NpcDecisionOpportunityEvaluation[],
	randomDraw?: number
): NpcDecisionSelectionTrace {
	if (
		randomDraw !== undefined &&
		(!Number.isFinite(randomDraw) || randomDraw < 0 || randomDraw >= 1)
	) {
		throw new RangeError('randomDraw must be >= 0 and < 1.');
	}
	const candidateTraces = evaluations.flatMap(evaluation => {
		if (!npcDecisionOpportunityIsValid(evaluation.opportunity)) {
			throw new Error(`Invalid NPC decision opportunity: ${evaluation.opportunity.id}`);
		}
		if (
			evaluation.reactionEvaluation.setId !== evaluation.opportunity.reactionSetId ||
			evaluation.reactionEvaluation.reactingCharacterId !==
				evaluation.opportunity.characterId
		) {
			throw new Error(
				`Reaction evaluation does not match NPC opportunity ${evaluation.opportunity.id}.`
			);
		}
		return evaluation.reactionEvaluation.candidates.map(candidate => {
			const runtime = evaluation.candidateRuntime[candidate.candidateId];
			const blockers = candidateBlockers(
				evaluation.opportunity,
				candidate.availability,
				runtime
			);
			return {
				opportunityId: evaluation.opportunity.id,
				candidateId: candidate.candidateId,
				moveId: candidate.moveId,
				priority: evaluation.opportunity.priority,
				score: candidate.score,
				timeCostMinutes: runtime?.timeCostMinutes ?? 0,
				selectable: blockers.length === 0,
				blockers
			} satisfies NpcDecisionCandidateTrace;
		});
	});

	candidateTraces.sort(
		(a, b) =>
			Number(b.selectable) - Number(a.selectable) ||
			b.priority - a.priority ||
			b.score - a.score ||
			a.opportunityId.localeCompare(b.opportunityId) ||
			a.candidateId.localeCompare(b.candidateId)
	);
	const selectable = candidateTraces.filter(candidate => candidate.selectable);
	if (selectable.length === 0) {
		return {
			candidateTraces,
			randomDraw,
			randomnessUsed: false,
			tiedTopCandidateIds: [],
			summary: 'No NPC action is selectable for these explicit decision opportunities.'
		};
	}
	const top = selectable[0];
	const tiedTop = selectable.filter(
		candidate => candidate.priority === top.priority && candidate.score === top.score
	);
	const choiceIndex =
		randomDraw === undefined || tiedTop.length === 1
			? 0
			: Math.min(tiedTop.length - 1, Math.floor(randomDraw * tiedTop.length));
	const selected = tiedTop[choiceIndex];
	return {
		candidateTraces,
		selectedOpportunityId: selected.opportunityId,
		selectedCandidateId: selected.candidateId,
		selectedMoveId: selected.moveId,
		selectedTimeCostMinutes: selected.timeCostMinutes,
		randomDraw,
		randomnessUsed: randomDraw !== undefined && tiedTop.length > 1,
		tiedTopCandidateIds: tiedTop.map(candidate => candidate.candidateId),
		summary:
			randomDraw !== undefined && tiedTop.length > 1
				? `Selected ${selected.candidateId} from an exact top tie using explicit random draw ${randomDraw}.`
				: `Selected ${selected.candidateId} deterministically by priority, score and stable ids.`
	};
}
