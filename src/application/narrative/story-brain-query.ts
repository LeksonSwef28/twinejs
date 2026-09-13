import {
	evaluateNarrativeCondition,
	evaluateNarrativeGuards,
	NarrativeConditionTrace,
	NarrativeRuntimeEvaluationContext
} from '../../domain/narrative/interaction-runtime';
import {NarrativeMoveDefinition} from '../../domain/narrative/interaction';
import {NarrativeProject} from '../../domain/narrative/project';
import {
	buildStoryBrainIndex,
	queryStoryBrainFocus,
	queryStoryBrainImpact,
	StoryBrainEntityKind,
	StoryBrainEntityRef,
	StoryBrainFocusResult,
	StoryBrainImpactResult
} from '../../domain/narrative/story-brain';

export type StoryBrainMoveAvailability = 'available' | 'blocked' | 'unknown';

export interface StoryBrainWhyMoveResult {
	moveId: string;
	label: string;
	availability: StoryBrainMoveAvailability;
	guardTraces: ReturnType<typeof evaluateNarrativeGuards>['traces'];
	resolutionSummary: string;
	resolutionCondition?: NarrativeConditionTrace;
}

export interface StoryBrainWhyResult {
	moves: StoryBrainWhyMoveResult[];
}

export interface StoryBrainQueryResult {
	focus: StoryBrainFocusResult;
	impact: StoryBrainImpactResult;
	why: StoryBrainWhyResult;
}

function runtimeContext(project: NarrativeProject): NarrativeRuntimeEvaluationContext {
	return {
		characterKnowledge: project.simulation.characterKnowledge,
		itemInstances: project.itemInstances,
		relationships: project.relationships,
		storyNodes: project.storyNodes,
		actualLocationByCharacter: project.simulation.actualLocationByCharacter
	};
}

function moveAvailability(
	move: NarrativeMoveDefinition,
	context: NarrativeRuntimeEvaluationContext
) {
	const guardEvaluation = evaluateNarrativeGuards(move.guards, context);
	const availability: StoryBrainMoveAvailability = guardEvaluation.traces.some(
		trace => trace.status === 'unmet'
	)
		? 'blocked'
		: guardEvaluation.traces.some(trace => trace.status === 'unknown')
			? 'unknown'
			: 'available';

	return {availability, guardEvaluation};
}

function outcomeLabel(move: NarrativeMoveDefinition, outcomeId: string) {
	return move.outcomes.find(outcome => outcome.id === outcomeId)?.label ?? outcomeId;
}

function explainResolution(
	move: NarrativeMoveDefinition,
	context: NarrativeRuntimeEvaluationContext
): Pick<StoryBrainWhyMoveResult, 'resolutionSummary' | 'resolutionCondition'> {
	switch (move.resolution.type) {
		case 'automatic':
			return {
				resolutionSummary: `Без проверки → ${outcomeLabel(
					move,
					move.resolution.outcomeId
				)}`
			};
		case 'condition': {
			const trace = evaluateNarrativeCondition(move.resolution.condition, context);
			const selectedOutcomeId =
				trace.status === 'met'
					? move.resolution.trueOutcomeId
					: trace.status === 'unmet'
						? move.resolution.falseOutcomeId
						: undefined;
			return {
				resolutionSummary: selectedOutcomeId
					? `Условие ${trace.status === 'met' ? 'выполнено' : 'не выполнено'} → ${outcomeLabel(
							move,
							selectedOutcomeId
						)}`
					: 'Условие нельзя однозначно вычислить в текущем preview.',
				resolutionCondition: trace
			};
		}
		case 'skill-check':
			return {
				resolutionSummary: `${move.resolution.check.skillKey} · ${move.resolution.check.rollRule.diceCount}d${move.resolution.check.rollRule.dieSides} · сложность ${move.resolution.check.difficulty}. Нужны runtime skill value и бросок.`
			};
	}
}

function relatedMoves(
	project: NarrativeProject,
	focus: StoryBrainEntityRef,
	focusResult: StoryBrainFocusResult
) {
	if (focus.kind === 'story-node') {
		return project.narrativeMoves.filter(move => move.storyNodeId === focus.id);
	}
	if (focus.kind === 'move') {
		return project.narrativeMoves.filter(move => move.id === focus.id);
	}

	const relatedMoveIds = new Set(
		focusResult.entities
			.filter(entity => entity.kind === 'move')
			.map(entity => entity.id)
	);
	return project.narrativeMoves.filter(move => relatedMoveIds.has(move.id));
}

/**
 * Application-level Story Brain query. It composes the read-only authored graph
 * with the current preview/runtime state for WHY explanations. It never writes
 * to NarrativeProject.
 */
export function queryStoryBrain(
	project: NarrativeProject,
	focus: StoryBrainEntityRef
): StoryBrainQueryResult {
	const index = buildStoryBrainIndex(
		project.storyNodes,
		project.storyConnections,
		project.narrativeMoves
	);
	const focusResult = queryStoryBrainFocus(index, focus);
	const impact = queryStoryBrainImpact(index, focus);
	const context = runtimeContext(project);
	const moves = relatedMoves(project, focus, focusResult).map(move => {
		const {availability, guardEvaluation} = moveAvailability(move, context);
		return {
			moveId: move.id,
			label: move.label,
			availability,
			guardTraces: guardEvaluation.traces,
			...explainResolution(move, context)
		};
	});

	return {
		focus: focusResult,
		impact,
		why: {moves}
	};
}

export function storyBrainEntityCount(
	entities: StoryBrainEntityRef[],
	kind: StoryBrainEntityKind
) {
	return entities.filter(entity => entity.kind === kind).length;
}
