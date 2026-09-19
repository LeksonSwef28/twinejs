import {effectiveItemPlacement} from '../../domain/narrative/carrying';
import {
	NarrativeMoveDefinition,
	NarrativeOutcomeDefinition,
	NarrativeSkillCheckResolutionInput,
	resolveNarrativeSkillCheck
} from '../../domain/narrative/interaction';
import {
	evaluateNarrativeCondition,
	evaluateNarrativeGuards,
	NarrativeRuntimeEvaluationContext
} from '../../domain/narrative/interaction-runtime';
import {ItemInstance, ItemPlacement} from '../../domain/narrative/items';
import {applyNarrativeOutcomeEffects} from '../../domain/narrative/outcome-effects-runtime';
import {NarrativeProject} from '../../domain/narrative/project';
import {
	evaluateReactionCandidateSet,
	ReactionCandidateSetEvaluation
} from '../../domain/narrative/reaction';
import {
	appendNarrativeRuntimeOccurrence,
	applyStoryNodeStateOverride,
	effectiveRuntimeStoryNodes
} from '../../domain/narrative/runtime-story';
import {applyNarrativeItemRuntimePlacement} from './physical';

export type NarrativeProjectMoveResolutionStatus =
	| 'resolved'
	| 'blocked'
	| 'unknown'
	| 'input-required';

export interface NarrativeProjectMoveResolutionInput {
	skillCheck?: NarrativeSkillCheckResolutionInput;
}

export interface NarrativeProjectMoveResolutionTrace {
	moveId: string;
	status: NarrativeProjectMoveResolutionStatus;
	outcomeId?: string;
	guardTraces: ReturnType<typeof evaluateNarrativeGuards>['traces'];
	resolutionSummary: string;
}

export interface NarrativeProjectOutcomeApplicationTrace {
	moveId: string;
	outcomeId: string;
	effectTraces: ReturnType<typeof applyNarrativeOutcomeEffects>['traces'];
	itemPlacementEffectIds: string[];
	storyStateEffectIds: string[];
	occurrenceId: string;
}

export interface NarrativeProjectMoveApplicationResult {
	project: NarrativeProject;
	resolution: NarrativeProjectMoveResolutionTrace;
	outcomeTrace?: NarrativeProjectOutcomeApplicationTrace;
}

function itemRootPlacement(
	itemInstanceId: string,
	itemsById: Map<string, ItemInstance>,
	project: NarrativeProject,
	visited: Set<string>
): ItemPlacement {
	if (visited.has(itemInstanceId)) {
		return {type: 'unplaced'};
	}
	visited.add(itemInstanceId);
	const item = itemsById.get(itemInstanceId);
	if (!item) {
		return {type: 'unplaced'};
	}
	const placement = effectiveItemPlacement(item, project.itemPlacementOverrides);
	switch (placement.type) {
		case 'unplaced':
		case 'location':
		case 'character':
			return placement;
		case 'pockets':
			return {type: 'character', characterId: placement.characterId};
		case 'container':
			return itemRootPlacement(
				placement.containerInstanceId,
				itemsById,
				project,
				visited
			);
	}
}

/**
 * Projects A39 runtime placement overlays back into the older ItemPlacement
 * read contract used by guards/outcome evaluation. An item in pockets or in a
 * carried container counts as being with that character; authored placement is
 * never rewritten.
 */
export function narrativeRuntimeItemInstances(project: NarrativeProject) {
	const itemsById = new Map(project.itemInstances.map(item => [item.id, item]));
	return project.itemInstances.map(item => ({
		...item,
		placement: itemRootPlacement(item.id, itemsById, project, new Set())
	}));
}

/** A41 read projection: authored Story definitions plus runtime state overrides. */
export function narrativeRuntimeStoryNodes(project: NarrativeProject) {
	return effectiveRuntimeStoryNodes(
		project.storyNodes,
		project.storyNodeStateOverrides
	);
}

export function narrativeProjectRuntimeContext(
	project: NarrativeProject
): NarrativeRuntimeEvaluationContext {
	return {
		characterKnowledge: project.simulation.characterKnowledge,
		itemInstances: narrativeRuntimeItemInstances(project),
		relationships: project.relationships,
		storyNodes: narrativeRuntimeStoryNodes(project),
		actualLocationByCharacter: project.simulation.actualLocationByCharacter
	};
}

export function setNarrativeCharacterActualLocation(
	project: NarrativeProject,
	characterId: string,
	locationId: string
): NarrativeProject {
	if (!project.characters.some(character => character.id === characterId)) {
		throw new Error(`Unknown presence character: ${characterId}`);
	}
	if (!project.locations.some(location => location.id === locationId)) {
		throw new Error(`Unknown presence location: ${locationId}`);
	}
	return {
		...project,
		simulation: {
			...project.simulation,
			actualLocationByCharacter: {
				...project.simulation.actualLocationByCharacter,
				[characterId]: locationId
			}
		}
	};
}

function moveAndOutcome(
	project: NarrativeProject,
	moveId: string,
	outcomeId: string
): {move: NarrativeMoveDefinition; outcome: NarrativeOutcomeDefinition} {
	const move = project.narrativeMoves.find(candidate => candidate.id === moveId);
	if (!move) {
		throw new Error(`Unknown Narrative Move: ${moveId}`);
	}
	const outcome = move.outcomes.find(candidate => candidate.id === outcomeId);
	if (!outcome) {
		throw new Error(`Unknown Narrative Outcome: ${outcomeId}`);
	}
	return {move, outcome};
}

/**
 * Deterministic A40/A41 resolution bridge. It evaluates eligibility against
 * actual runtime state, including A41 effective Story state, then selects an
 * authored outcome. Randomness is never hidden: skill checks require explicit
 * roll/skill input from the caller.
 */
export function resolveNarrativeProjectMove(
	project: NarrativeProject,
	moveId: string,
	input: NarrativeProjectMoveResolutionInput = {}
): NarrativeProjectMoveResolutionTrace {
	const move = project.narrativeMoves.find(candidate => candidate.id === moveId);
	if (!move) {
		throw new Error(`Unknown Narrative Move: ${moveId}`);
	}
	const context = narrativeProjectRuntimeContext(project);
	const guards = evaluateNarrativeGuards(move.guards, context);
	if (!guards.available) {
		const status = guards.traces.some(trace => trace.status === 'unmet')
			? 'blocked'
			: 'unknown';
		return {
			moveId,
			status,
			guardTraces: guards.traces,
			resolutionSummary:
				status === 'blocked'
					? 'Move blocked by runtime guards.'
					: 'Move eligibility is unknown because a guard lacks runtime data.'
		};
	}

	if (move.resolution.type === 'automatic') {
		return {
			moveId,
			status: 'resolved',
			outcomeId: move.resolution.outcomeId,
			guardTraces: guards.traces,
			resolutionSummary: `Automatic outcome: ${move.resolution.outcomeId}.`
		};
	}
	if (move.resolution.type === 'condition') {
		const condition = evaluateNarrativeCondition(move.resolution.condition, context);
		if (condition.status === 'unknown') {
			return {
				moveId,
				status: 'unknown',
				guardTraces: guards.traces,
				resolutionSummary: condition.summary
			};
		}
		const outcomeId =
			condition.status === 'met'
				? move.resolution.trueOutcomeId
				: move.resolution.falseOutcomeId;
		return {
			moveId,
			status: 'resolved',
			outcomeId,
			guardTraces: guards.traces,
			resolutionSummary: `${condition.summary} Outcome: ${outcomeId}.`
		};
	}
	if (!input.skillCheck) {
		return {
			moveId,
			status: 'input-required',
			guardTraces: guards.traces,
			resolutionSummary: 'Skill check requires an explicit skill value and roll.'
		};
	}
	const skill = resolveNarrativeSkillCheck(move.resolution, input.skillCheck);
	return {
		moveId,
		status: 'resolved',
		outcomeId: skill.outcomeId,
		guardTraces: guards.traces,
		resolutionSummary: `${skill.skillKey}: ${skill.total}/${skill.difficulty}; outcome ${skill.outcomeId}.`
	};
}

/**
 * Projects a resolved authored Outcome into the project runtime boundary.
 * Cognition stays in runtime collections, item placement uses the A39 overlay,
 * Story-state effects use the A41 Story override, and each successful Outcome
 * appends an occurrence provenance record. Authored Story/items remain untouched.
 */
export function applyNarrativeProjectOutcome(
	project: NarrativeProject,
	moveId: string,
	outcomeId: string
): {project: NarrativeProject; trace: NarrativeProjectOutcomeApplicationTrace} {
	const {move, outcome} = moveAndOutcome(project, moveId, outcomeId);
	const application = applyNarrativeOutcomeEffects(
		move,
		outcome,
		{
			characterKnowledge: project.simulation.characterKnowledge,
			relationships: project.relationships,
			mindStates: project.mindStates,
			itemInstances: narrativeRuntimeItemInstances(project),
			storyNodes: narrativeRuntimeStoryNodes(project),
			memories: project.memories
		},
		{
			moment: {
				day: project.simulation.day,
				minuteOfDay: project.simulation.minuteOfDay
			},
			sourceEventId: move.storyNodeId
		}
	);
	let next: NarrativeProject = {
		...project,
		memories: application.state.memories ?? [],
		relationships: application.state.relationships,
		mindStates: application.state.mindStates,
		simulation: {
			...project.simulation,
			characterKnowledge: application.state.characterKnowledge
		}
	};
	const itemPlacementEffectIds: string[] = [];
	const storyStateEffectIds: string[] = [];
	for (const effect of outcome.effects) {
		if (effect.type === 'item-set-placement') {
			const runtimeItem = application.state.itemInstances.find(
				item => item.id === effect.itemInstanceId
			);
			if (!runtimeItem) {
				throw new Error(`Outcome lost ItemInstance ${effect.itemInstanceId}.`);
			}
			const placement = applyNarrativeItemRuntimePlacement(
				next,
				effect.itemInstanceId,
				runtimeItem.placement
			);
			if (!placement.applied) {
				throw new Error(
					`Outcome item placement rejected: ${placement.blockers.join(' ')}`
				);
			}
			next = placement.project;
			itemPlacementEffectIds.push(effect.id);
			continue;
		}
		if (effect.type === 'story-node-set-state') {
			next = {
				...next,
				storyNodeStateOverrides: applyStoryNodeStateOverride(
					next.storyNodeStateOverrides,
					effect.storyNodeId,
					effect.state
				)
			};
			storyStateEffectIds.push(effect.id);
		}
	}
	const occurrenceWrite = appendNarrativeRuntimeOccurrence(
		next.runtimeOccurrences,
		{
			type: 'move-outcome',
			storyNodeId: move.storyNodeId,
			moveId,
			outcomeId,
			effectIds: outcome.effects.map(effect => effect.id),
			moment: {
				day: project.simulation.day,
				minuteOfDay: project.simulation.minuteOfDay
			}
		}
	);
	next = {...next, runtimeOccurrences: occurrenceWrite.history};
	return {
		project: next,
		trace: {
			moveId,
			outcomeId,
			effectTraces: application.traces,
			itemPlacementEffectIds,
			storyStateEffectIds,
			occurrenceId: occurrenceWrite.occurrence.id
		}
	};
}

export function resolveAndApplyNarrativeProjectMove(
	project: NarrativeProject,
	moveId: string,
	input: NarrativeProjectMoveResolutionInput = {}
): NarrativeProjectMoveApplicationResult {
	const resolution = resolveNarrativeProjectMove(project, moveId, input);
	if (resolution.status !== 'resolved' || !resolution.outcomeId) {
		return {project, resolution};
	}
	const applied = applyNarrativeProjectOutcome(
		project,
		moveId,
		resolution.outcomeId
	);
	return {project: applied.project, resolution, outcomeTrace: applied.trace};
}

export function evaluateNarrativeProjectReactionSet(
	project: NarrativeProject,
	reactionSetId: string
): ReactionCandidateSetEvaluation {
	const set = project.reactionCandidateSets.find(candidate => candidate.id === reactionSetId);
	if (!set) {
		throw new Error(`Unknown Reaction Candidate Set: ${reactionSetId}`);
	}
	return evaluateReactionCandidateSet(set, {
		...narrativeProjectRuntimeContext(project),
		mindStates: project.mindStates,
		memories: project.memories,
		memoryMoment: {
			day: project.simulation.day,
			minuteOfDay: project.simulation.minuteOfDay
		}
	});
}
