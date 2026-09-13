import {CharacterMindState, MemoryTrace} from './cognition';
import {EntityId} from './entities';
import {
	NarrativeGuardDefinition
} from './interaction';
import {
	evaluateNarrativeGuards,
	NarrativeConditionStatus,
	NarrativeRuntimeEvaluationContext
} from './interaction-runtime';
import {StoryNodeActivationState} from './story';

export type ReactionValence = 'positive' | 'neutral' | 'negative' | 'other';

export type ReactionConsiderationDefinition =
	| {
			id: EntityId;
			type: 'mood-is';
			mood: string;
			weight: number;
	  }
	| {
			id: EntityId;
			type: 'relationship-at-least';
			axis: string;
			value: number;
			weight: number;
	  }
	| {
			id: EntityId;
			type: 'knows-claim';
			claimId: EntityId;
			weight: number;
	  }
	| {
			id: EntityId;
			type: 'memory-tag';
			tag: string;
			weight: number;
	  }
	| {
			id: EntityId;
			type: 'story-node-state';
			storyNodeId: EntityId;
			state: StoryNodeActivationState;
			weight: number;
	  };

export interface ReactionCandidateDefinition {
	id: EntityId;
	moveId: EntityId;
	valence: ReactionValence;
	baseScore: number;
	guards: NarrativeGuardDefinition[];
	considerations: ReactionConsiderationDefinition[];
}

export interface ReactionCandidateSetDefinition {
	id: EntityId;
	storyNodeId: EntityId;
	reactingCharacterId: EntityId;
	counterpartCharacterId?: EntityId;
	candidates: ReactionCandidateDefinition[];
}

export interface ReactionEvaluationContext extends NarrativeRuntimeEvaluationContext {
	mindStates: CharacterMindState[];
	memories: MemoryTrace[];
}

export type ReactionCandidateAvailability = 'available' | 'blocked' | 'unknown';

export interface ReactionConsiderationTrace {
	considerationId: EntityId;
	status: NarrativeConditionStatus;
	weight: number;
	appliedWeight: number;
	summary: string;
}

export interface ReactionCandidateEvaluation {
	candidateId: EntityId;
	moveId: EntityId;
	valence: ReactionValence;
	availability: ReactionCandidateAvailability;
	baseScore: number;
	score: number;
	guardTraces: ReturnType<typeof evaluateNarrativeGuards>['traces'];
	considerationTraces: ReactionConsiderationTrace[];
}

export interface ReactionCandidateSetEvaluation {
	setId: EntityId;
	reactingCharacterId: EntityId;
	candidates: ReactionCandidateEvaluation[];
}

function considerationIsStructurallyValid(
	consideration: ReactionConsiderationDefinition
) {
	if (!consideration.id || !Number.isFinite(consideration.weight)) {
		return false;
	}
	switch (consideration.type) {
		case 'mood-is':
			return Boolean(consideration.mood.trim());
		case 'relationship-at-least':
			return (
				Boolean(consideration.axis.trim()) && Number.isFinite(consideration.value)
			);
		case 'knows-claim':
			return Boolean(consideration.claimId);
		case 'memory-tag':
			return Boolean(consideration.tag.trim());
		case 'story-node-state':
			return Boolean(consideration.storyNodeId);
	}
}

export function reactionCandidateSetIsStructurallyValid(
	set: ReactionCandidateSetDefinition
) {
	if (
		!set.id ||
		!set.storyNodeId ||
		!set.reactingCharacterId ||
		set.candidates.length === 0
	) {
		return false;
	}

	const candidateIds = new Set<string>();
	const moveIds = new Set<string>();
	for (const candidate of set.candidates) {
		if (
			!candidate.id ||
			!candidate.moveId ||
			!Number.isFinite(candidate.baseScore) ||
			candidateIds.has(candidate.id) ||
			moveIds.has(candidate.moveId)
		) {
			return false;
		}
		candidateIds.add(candidate.id);
		moveIds.add(candidate.moveId);

		const guardIds = new Set<string>();
		for (const guard of candidate.guards) {
			if (!guard.id || guardIds.has(guard.id)) {
				return false;
			}
			guardIds.add(guard.id);
		}

		const considerationIds = new Set<string>();
		for (const consideration of candidate.considerations) {
			if (
				considerationIds.has(consideration.id) ||
				!considerationIsStructurallyValid(consideration)
			) {
				return false;
			}
			considerationIds.add(consideration.id);
		}
	}

	return true;
}

function traceConsideration(
	set: ReactionCandidateSetDefinition,
	consideration: ReactionConsiderationDefinition,
	context: ReactionEvaluationContext
): ReactionConsiderationTrace {
	let status: NarrativeConditionStatus = 'unknown';
	let summary = 'Недостаточно данных.';

	switch (consideration.type) {
		case 'mood-is': {
			const mind = context.mindStates.find(
				state => state.characterId === set.reactingCharacterId
			);
			if (mind?.mood === undefined) {
				status = 'unknown';
				summary = 'Текущее настроение персонажа не задано.';
			} else {
				status = mind.mood === consideration.mood ? 'met' : 'unmet';
				summary = `Настроение: ${mind.mood}; ожидается ${consideration.mood}.`;
			}
			break;
		}
		case 'relationship-at-least': {
			if (!set.counterpartCharacterId) {
				status = 'unknown';
				summary = 'Для оценки отношения не задан второй персонаж.';
				break;
			}
			const relationship = context.relationships.find(
				candidate =>
					candidate.fromCharacterId === set.reactingCharacterId &&
					candidate.toCharacterId === set.counterpartCharacterId
			);
			const value = relationship?.values[consideration.axis];
			if (value === undefined) {
				status = 'unknown';
				summary = `Нет значения отношения по оси «${consideration.axis}».`;
			} else {
				status = value >= consideration.value ? 'met' : 'unmet';
				summary = `${consideration.axis}: ${value}; порог ${consideration.value}.`;
			}
			break;
		}
		case 'knows-claim': {
			const knows = context.characterKnowledge.some(
				state =>
					state.characterId === set.reactingCharacterId &&
					state.claimId === consideration.claimId
			);
			status = knows ? 'met' : 'unmet';
			summary = knows
				? 'У персонажа есть состояние знания для этого Claim.'
				: 'У персонажа нет состояния знания для этого Claim.';
			break;
		}
		case 'memory-tag': {
			const matchingMemories = context.memories.filter(
				memory =>
					memory.characterId === set.reactingCharacterId &&
					memory.tags.includes(consideration.tag)
			);
			status = matchingMemories.length > 0 ? 'met' : 'unmet';
			summary = matchingMemories.length > 0
				? `Найдено воспоминаний с тегом «${consideration.tag}»: ${matchingMemories.length}.`
				: `Нет воспоминаний с тегом «${consideration.tag}».`;
			break;
		}
		case 'story-node-state': {
			const node = context.storyNodes.find(
				candidate => candidate.id === consideration.storyNodeId
			);
			if (!node) {
				status = 'unknown';
				summary = 'Story node для consideration не найден.';
			} else {
				status = node.activationState === consideration.state ? 'met' : 'unmet';
				summary = `Story state: ${node.activationState}; ожидается ${consideration.state}.`;
			}
			break;
		}
	}

	return {
		considerationId: consideration.id,
		status,
		weight: consideration.weight,
		appliedWeight: status === 'met' ? consideration.weight : 0,
		summary
	};
}

/**
 * Pure A28 ranking. The candidate list is authored and may contain any number
 * of reactions; positive/neutral/negative are labels, not a fixed three-state
 * machine. Guards control eligibility, while considerations only explainably
 * adjust score. No candidate is executed automatically here.
 */
export function evaluateReactionCandidateSet(
	set: ReactionCandidateSetDefinition,
	context: ReactionEvaluationContext
): ReactionCandidateSetEvaluation {
	if (!reactionCandidateSetIsStructurallyValid(set)) {
		throw new Error('Reaction candidate set is structurally invalid.');
	}

	const candidates = set.candidates.map(candidate => {
		const guardEvaluation = evaluateNarrativeGuards(candidate.guards, context);
		const availability: ReactionCandidateAvailability = guardEvaluation.traces.some(
			trace => trace.status === 'unmet'
		)
			? 'blocked'
			: guardEvaluation.traces.some(trace => trace.status === 'unknown')
				? 'unknown'
				: 'available';
		const considerationTraces = candidate.considerations.map(consideration =>
			traceConsideration(set, consideration, context)
		);
		const score = considerationTraces.reduce(
			(total, trace) => total + trace.appliedWeight,
			candidate.baseScore
		);

		return {
			candidateId: candidate.id,
			moveId: candidate.moveId,
			valence: candidate.valence,
			availability,
			baseScore: candidate.baseScore,
			score,
			guardTraces: guardEvaluation.traces,
			considerationTraces
		};
	});

	const rank = {available: 0, unknown: 1, blocked: 2} as const;
	candidates.sort(
		(a, b) =>
			rank[a.availability] - rank[b.availability] ||
			b.score - a.score ||
			a.candidateId.localeCompare(b.candidateId)
	);

	return {setId: set.id, reactingCharacterId: set.reactingCharacterId, candidates};
}
