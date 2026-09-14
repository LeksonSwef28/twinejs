import {
	evaluateNarrativeCondition,
	evaluateNarrativeGuards,
	NarrativeConditionTrace,
	NarrativeRuntimeEvaluationContext
} from '../../domain/narrative/interaction-runtime';
import {NarrativeMoveDefinition} from '../../domain/narrative/interaction';
import {NarrativeProject} from '../../domain/narrative/project';
import {
	NarrativeReferenceFinding,
	validateNarrativeProjectReferences
} from '../../domain/narrative/project-reference-validation';
import {
	evaluateReactionCandidateSet,
	ReactionCandidateSetEvaluation,
	reactionCandidateSetIsStructurallyValid,
	ReactionEvaluationContext
} from '../../domain/narrative/reaction';
import {
	analyzeNarrativeScheduleConflicts,
	NarrativeScheduleConflictFinding
} from '../../domain/narrative/schedule-analysis';
import {
	buildStoryBrainIndex,
	queryStoryBrainFocus,
	queryStoryBrainImpact,
	StoryBrainEntityKind,
	StoryBrainEntityRef,
	StoryBrainFocusResult,
	StoryBrainImpactResult
} from '../../domain/narrative/story-brain';
import {
	analyzeStoryCoverage,
	StoryCoverageFinding
} from '../../domain/narrative/story-analysis';
import {
	findStoryBridgeCandidates,
	StoryBridgeFinderResult
} from '../../domain/narrative/story-bridge-finder';

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

export type StoryBrainFinding =
	| StoryCoverageFinding
	| NarrativeReferenceFinding
	| NarrativeScheduleConflictFinding;

export interface StoryBrainCoverageResult {
	projectFindingCount: number;
	findings: StoryBrainFinding[];
}

export interface StoryBrainQueryResult {
	focus: StoryBrainFocusResult;
	impact: StoryBrainImpactResult;
	why: StoryBrainWhyResult;
	coverage: StoryBrainCoverageResult;
	bridges: StoryBridgeFinderResult;
	reactions: ReactionCandidateSetEvaluation[];
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

function reactionContext(project: NarrativeProject): ReactionEvaluationContext {
	return {
		...runtimeContext(project),
		mindStates: project.mindStates,
		memories: project.memories
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

function focusStoryNodeIds(
	project: NarrativeProject,
	focus: StoryBrainEntityRef,
	focusResult: StoryBrainFocusResult,
	moves: NarrativeMoveDefinition[]
) {
	const ids = new Set<string>();
	if (focus.kind === 'story-node') {
		ids.add(focus.id);
	}
	if (focus.kind === 'move') {
		const move = project.narrativeMoves.find(candidate => candidate.id === focus.id);
		if (move) {
			ids.add(move.storyNodeId);
		}
	}
	for (const entity of focusResult.entities) {
		if (entity.kind === 'story-node') {
			ids.add(entity.id);
		}
	}
	for (const move of moves) {
		ids.add(move.storyNodeId);
	}
	return [...ids].filter(id => project.storyNodes.some(node => node.id === id));
}

function focusCharacterIds(
	project: NarrativeProject,
	focus: StoryBrainEntityRef,
	focusResult: StoryBrainFocusResult,
	storyNodeIds: string[],
	moves: NarrativeMoveDefinition[]
) {
	const ids = new Set<string>();
	if (focus.kind === 'character') {
		ids.add(focus.id);
	}
	for (const entity of focusResult.entities) {
		if (entity.kind === 'character') {
			ids.add(entity.id);
		}
	}
	const nodeIds = new Set(storyNodeIds);
	for (const node of project.storyNodes) {
		if (!nodeIds.has(node.id)) {
			continue;
		}
		if (node.primaryCharacterId) {
			ids.add(node.primaryCharacterId);
		}
		for (const participantId of node.participantIds) {
			ids.add(participantId);
		}
	}
	for (const move of moves) {
		ids.add(move.actorCharacterId);
		for (const targetId of move.targetCharacterIds) {
			ids.add(targetId);
		}
	}
	return ids;
}

function coverageForFocus(
	findings: StoryCoverageFinding[],
	storyNodeIds: string[],
	moves: NarrativeMoveDefinition[],
	focus: StoryBrainEntityRef
) {
	const nodeIds = new Set(storyNodeIds);
	const moveIds = new Set(moves.map(move => move.id));
	return findings.filter(
		finding =>
			(finding.storyNodeId !== undefined && nodeIds.has(finding.storyNodeId)) ||
			(finding.moveId !== undefined && moveIds.has(finding.moveId)) ||
			(focus.kind === 'character' && finding.characterId === focus.id)
	);
}

function referenceFindingsForFocus(
	findings: NarrativeReferenceFinding[],
	storyNodeIds: string[],
	moves: NarrativeMoveDefinition[],
	focus: StoryBrainEntityRef
) {
	const nodeIds = new Set(storyNodeIds);
	const moveIds = new Set(moves.map(move => move.id));
	return findings.filter(finding => {
		if (finding.storyNodeId && nodeIds.has(finding.storyNodeId)) {
			return true;
		}
		if (finding.moveId && moveIds.has(finding.moveId)) {
			return true;
		}
		if (focus.kind === 'character') {
			return (
				finding.characterId === focus.id ||
				(finding.targetKind === 'character' && finding.targetId === focus.id)
			);
		}
		if (focus.kind === 'story-node') {
			return finding.targetKind === 'story-node' && finding.targetId === focus.id;
		}
		if (focus.kind === 'claim') {
			return finding.targetKind === 'claim' && finding.targetId === focus.id;
		}
		if (focus.kind === 'item') {
			return finding.targetKind === 'item-instance' && finding.targetId === focus.id;
		}
		return false;
	});
}

function reactionsForFocus(project: NarrativeProject, storyNodeIds: string[]) {
	const nodeIds = new Set(storyNodeIds);
	const movesById = new Map(project.narrativeMoves.map(move => [move.id, move]));
	const context = reactionContext(project);

	return project.reactionCandidateSets
		.filter(set => {
			if (
				!nodeIds.has(set.storyNodeId) ||
				!reactionCandidateSetIsStructurallyValid(set) ||
				!project.characters.some(character => character.id === set.reactingCharacterId) ||
				(set.counterpartCharacterId !== undefined &&
					!project.characters.some(
						character => character.id === set.counterpartCharacterId
					))
			) {
				return false;
			}
			return set.candidates.every(candidate => {
				const move = movesById.get(candidate.moveId);
				return move?.storyNodeId === set.storyNodeId;
			});
		})
		.map(set => evaluateReactionCandidateSet(set, context));
}

/**
 * Application-level Story Brain query. It composes the read-only authored graph
 * with the current preview/runtime state for WHY and reaction explanations.
 * Coverage, authored-reference/schedule validation, Bridge Finder and reaction
 * ranking remain derived/read-only; authoring changes still require a command.
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
	const related = relatedMoves(project, focus, focusResult);
	const moves = related.map(move => {
		const {availability, guardEvaluation} = moveAvailability(move, context);
		return {
			moveId: move.id,
			label: move.label,
			availability,
			guardTraces: guardEvaluation.traces,
			...explainResolution(move, context)
		};
	});
	const storyNodeIds = focusStoryNodeIds(project, focus, focusResult, related);
	const characterIds = focusCharacterIds(
		project,
		focus,
		focusResult,
		storyNodeIds,
		related
	);
	const projectCoverage = analyzeStoryCoverage(
		project.storyNodes,
		project.storyConnections,
		project.narrativeMoves,
		project.template.dayCount
	);
	const referenceValidation = validateNarrativeProjectReferences(project);
	const scheduleAnalysis = analyzeNarrativeScheduleConflicts(project);
	const focusCoverage = coverageForFocus(
		projectCoverage.findings,
		storyNodeIds,
		related,
		focus
	);
	const focusReferences = referenceFindingsForFocus(
		referenceValidation.findings,
		storyNodeIds,
		related,
		focus
	);
	const focusScheduleConflicts = scheduleAnalysis.findings.filter(finding =>
		characterIds.has(finding.characterId)
	);
	const bridges = findStoryBridgeCandidates(
		{
			nodes: project.storyNodes,
			connections: project.storyConnections,
			moves: project.narrativeMoves,
			initialKnowledge: project.initialKnowledge,
			itemInstances: project.itemInstances
		},
		storyNodeIds
	);

	return {
		focus: focusResult,
		impact,
		why: {moves},
		coverage: {
			projectFindingCount:
				projectCoverage.findings.length +
				referenceValidation.findings.length +
				scheduleAnalysis.findings.length,
			findings: [...focusCoverage, ...focusReferences, ...focusScheduleConflicts]
		},
		bridges,
		reactions: reactionsForFocus(project, storyNodeIds)
	};
}

export function storyBrainEntityCount(
	entities: StoryBrainEntityRef[],
	kind: StoryBrainEntityKind
) {
	return entities.filter(entity => entity.kind === kind).length;
}
