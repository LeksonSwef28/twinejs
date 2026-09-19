import {KnowledgeAttitude, characterKnowledgeStateId} from '../../domain/narrative/knowledge';
import {NarrativeProject} from '../../domain/narrative/project';
import {
	NarrativeProjectMoveResolutionInput,
	NarrativeProjectMoveResolutionTrace,
	NarrativeProjectOutcomeApplicationTrace,
	applyNarrativeProjectOutcome,
	resolveAndApplyNarrativeProjectMove,
	resolveNarrativeProjectMove
} from './living-simulation';
import {
	PreviewLaboratoryReproductionMetadata,
	clonePreviewMoveResolutionInput,
	clonePreviewRuntimeInput
} from './preview-reproduction';
import {advanceNarrativeProjectSimulation} from './simulation';

export type PreviewLaboratoryActionKind =
	| 'set-source'
	| 'fork'
	| 'reset'
	| 'checkpoint-restore'
	| 'test-input'
	| 'advance'
	| 'resolved-outcome'
	| 'forced-outcome';

export interface PreviewLaboratoryAction {
	id: string;
	kind: PreviewLaboratoryActionKind;
	summary: string;
	moveId?: string;
	outcomeId?: string;
	occurrenceId?: string;
	forced?: boolean;
	reproduction?: PreviewLaboratoryReproductionMetadata;
}

export interface PreviewScenario {
	id: string;
	name: string;
	/** Immutable reset point for this sandbox scenario. */
	baselineProject: NarrativeProject;
	/** Mutable only through preview helpers; never persisted to authoring state. */
	project: NarrativeProject;
	actions: PreviewLaboratoryAction[];
}

export type PreviewRuntimeInput =
	| {type: 'moment'; day: number; minuteOfDay: number}
	| {type: 'actual-location'; characterId: string; locationId?: string}
	| {
			type: 'knowledge';
			characterId: string;
			claimId: string;
			attitude: KnowledgeAttitude;
			confidence: number;
	  }
	| {type: 'forget-claim'; characterId: string; claimId: string};

export interface PreviewScenarioChanges {
	changedPaths: string[];
	newOccurrenceIds: string[];
	actionCount: number;
}

export interface PreviewScenarioComparison {
	leftScenarioId: string;
	rightScenarioId: string;
	changedPaths: string[];
	leftOccurrenceIds: string[];
	rightOccurrenceIds: string[];
}

export interface PreviewMoveExecutionResult {
	scenario: PreviewScenario;
	resolution: NarrativeProjectMoveResolutionTrace;
	outcomeTrace?: NarrativeProjectOutcomeApplicationTrace;
}

function cloneProject(project: NarrativeProject): NarrativeProject {
	return JSON.parse(JSON.stringify(project)) as NarrativeProject;
}

function action(
	scenario: PreviewScenario,
	kind: PreviewLaboratoryActionKind,
	summary: string,
	details: Omit<PreviewLaboratoryAction, 'id' | 'kind' | 'summary'> = {}
): PreviewLaboratoryAction {
	return {
		id: `${scenario.id}:action:${scenario.actions.length + 1}`,
		kind,
		summary,
		...details
	};
}

function withProjectAndAction(
	scenario: PreviewScenario,
	project: NarrativeProject,
	entry: PreviewLaboratoryAction
): PreviewScenario {
	return {...scenario, project, actions: [...scenario.actions, entry]};
}

/** Creates a non-persisted preview sandbox from the current project/runtime state. */
export function createPreviewScenario(
	source: NarrativeProject,
	id = 'preview-main',
	name = 'Main preview'
): PreviewScenario {
	const baselineProject = cloneProject(source);
	const scenario: PreviewScenario = {
		id,
		name,
		baselineProject,
		project: cloneProject(baselineProject),
		actions: []
	};
	return {
		...scenario,
		actions: [action(scenario, 'set-source', 'Preview source captured from current runtime.')]
	};
}

/** Forks from the current sandbox state. Reset on the fork returns to this fork point. */
export function forkPreviewScenario(
	source: PreviewScenario,
	id: string,
	name: string
): PreviewScenario {
	const baselineProject = cloneProject(source.project);
	const scenario: PreviewScenario = {
		id,
		name,
		baselineProject,
		project: cloneProject(baselineProject),
		actions: []
	};
	return {
		...scenario,
		actions: [
			action(scenario, 'fork', `Forked from preview scenario ${source.name}.`)
		]
	};
}

export function resetPreviewScenario(scenario: PreviewScenario): PreviewScenario {
	const next = {...scenario, project: cloneProject(scenario.baselineProject)};
	return {
		...next,
		actions: [...scenario.actions, action(scenario, 'reset', 'Preview reset to its baseline.')]
	};
}

function assertCharacter(project: NarrativeProject, characterId: string) {
	if (!project.characters.some(character => character.id === characterId)) {
		throw new Error(`Unknown preview character: ${characterId}`);
	}
}

function assertClaim(project: NarrativeProject, claimId: string) {
	if (!project.claims.some(claim => claim.id === claimId)) {
		throw new Error(`Unknown preview claim: ${claimId}`);
	}
}

/** Applies explicit test-only runtime input to a sandbox clone. */
export function setPreviewRuntimeInput(
	scenario: PreviewScenario,
	input: PreviewRuntimeInput
): PreviewScenario {
	const project = cloneProject(scenario.project);
	let summary: string;
	if (input.type === 'moment') {
		if (
			!Number.isInteger(input.day) ||
			input.day < 1 ||
			input.day > project.template.dayCount
		) {
			throw new RangeError('Preview day is outside the project template.');
		}
		if (
			!Number.isInteger(input.minuteOfDay) ||
			input.minuteOfDay < 0 ||
			input.minuteOfDay >= 24 * 60
		) {
			throw new RangeError('Preview minuteOfDay must be between 0 and 1439.');
		}
		project.simulation.day = input.day;
		project.simulation.minuteOfDay = input.minuteOfDay;
		summary = `Test moment set to day ${input.day}, minute ${input.minuteOfDay}.`;
	} else if (input.type === 'actual-location') {
		assertCharacter(project, input.characterId);
		if (
			input.locationId &&
			!project.locations.some(location => location.id === input.locationId)
		) {
			throw new Error(`Unknown preview location: ${input.locationId}`);
		}
		if (input.locationId) {
			project.simulation.actualLocationByCharacter[input.characterId] = input.locationId;
		} else {
			delete project.simulation.actualLocationByCharacter[input.characterId];
		}
		summary = `Test actual location for ${input.characterId} set to ${
			input.locationId ?? 'unset'
		}.`;
	} else if (input.type === 'knowledge') {
		assertCharacter(project, input.characterId);
		assertClaim(project, input.claimId);
		if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) {
			throw new RangeError('Preview knowledge confidence must be between 0 and 1.');
		}
		const id = characterKnowledgeStateId(input.characterId, input.claimId);
		const existing = project.simulation.characterKnowledge.find(entry => entry.id === id);
		const nextKnowledge = {
			id,
			characterId: input.characterId,
			claimId: input.claimId,
			attitude: input.attitude,
			confidence: input.confidence,
			source: {type: 'authored' as const},
			timesHeard: existing?.timesHeard ?? 1,
			learnedAt: existing?.learnedAt,
			lastReinforcedAt: existing?.lastReinforcedAt
		};
		project.simulation.characterKnowledge = existing
			? project.simulation.characterKnowledge.map(entry =>
					entry.id === id ? nextKnowledge : entry
			  )
			: [...project.simulation.characterKnowledge, nextKnowledge];
		summary = `Test knowledge ${input.characterId}/${input.claimId} set to ${input.attitude}.`;
	} else {
		assertCharacter(project, input.characterId);
		assertClaim(project, input.claimId);
		project.simulation.characterKnowledge = project.simulation.characterKnowledge.filter(
			entry =>
				entry.characterId !== input.characterId || entry.claimId !== input.claimId
		);
		summary = `Test knowledge ${input.characterId}/${input.claimId} removed.`;
	}
	return withProjectAndAction(
		scenario,
		project,
		action(scenario, 'test-input', summary, {
			reproduction: {type: 'test-input', input: clonePreviewRuntimeInput(input)}
		})
	);
}

/** Read-only eligibility/resolution trace against the sandbox state. */
export function tracePreviewMove(
	scenario: PreviewScenario,
	moveId: string,
	input: NarrativeProjectMoveResolutionInput = {}
): NarrativeProjectMoveResolutionTrace {
	return resolveNarrativeProjectMove(scenario.project, moveId, input);
}

/** Resolves through authored rules and applies only a successfully selected outcome. */
export function executePreviewMove(
	scenario: PreviewScenario,
	moveId: string,
	input: NarrativeProjectMoveResolutionInput = {}
): PreviewMoveExecutionResult {
	const result = resolveAndApplyNarrativeProjectMove(scenario.project, moveId, input);
	if (!result.outcomeTrace) {
		return {...result, scenario};
	}
	const nextScenario = withProjectAndAction(
		scenario,
		cloneProject(result.project),
		action(
			scenario,
			'resolved-outcome',
			`Resolved ${moveId} through authored rules as ${result.outcomeTrace.outcomeId}.`,
			{
				moveId,
				outcomeId: result.outcomeTrace.outcomeId,
				occurrenceId: result.outcomeTrace.occurrenceId,
				forced: false,
				reproduction: {
					type: 'resolved-move',
					moveId,
					input: clonePreviewMoveResolutionInput(input),
					outcomeId: result.outcomeTrace.outcomeId
				}
			}
		)
	);
	return {...result, scenario: nextScenario};
}

/**
 * Authoring-only inspection path. It deliberately bypasses eligibility and the
 * authored resolver, but applies an already-authored Outcome through the same
 * runtime effect engine. The authored Move/Outcome definitions are never edited.
 */
export function forcePreviewOutcome(
	scenario: PreviewScenario,
	moveId: string,
	outcomeId: string
): {scenario: PreviewScenario; trace: NarrativeProjectOutcomeApplicationTrace} {
	const result = applyNarrativeProjectOutcome(scenario.project, moveId, outcomeId);
	return {
		scenario: withProjectAndAction(
			scenario,
			cloneProject(result.project),
			action(
				scenario,
				'forced-outcome',
				`Forced authored outcome ${moveId} → ${outcomeId} for inspection.`,
				{
					moveId,
					outcomeId,
					occurrenceId: result.trace.occurrenceId,
					forced: true,
					reproduction: {type: 'forced-outcome', moveId, outcomeId}
				}
			)
		),
		trace: result.trace
	};
}

export function advancePreviewScenario(
	scenario: PreviewScenario,
	minutes: number
): PreviewScenario {
	const result = advanceNarrativeProjectSimulation(scenario.project, minutes);
	return withProjectAndAction(
		scenario,
		cloneProject(result.project),
		action(
			scenario,
			'advance',
			`Preview advanced ${result.trace.appliedMinutes} minute(s).`,
			{
				reproduction: {
					type: 'advance',
					requestedMinutes: result.trace.requestedMinutes,
					appliedMinutes: result.trace.appliedMinutes
				}
			}
		)
	);
}

function runtimeProjection(project: NarrativeProject) {
	return {
		simulation: project.simulation,
		memories: project.memories,
		relationships: project.relationships,
		pendingReactions: project.pendingReactions,
		mindStates: project.mindStates,
		injuriesByCharacter: project.injuriesByCharacter,
		itemPlacementOverrides: project.itemPlacementOverrides,
		storyNodeStateOverrides: project.storyNodeStateOverrides,
		runtimeOccurrences: project.runtimeOccurrences,
		activeStoryExecutions: project.activeStoryExecutions
	};
}

function changedPaths(left: unknown, right: unknown, path = 'runtime'): string[] {
	if (Object.is(left, right)) {
		return [];
	}
	if (
		left === null ||
		right === null ||
		typeof left !== 'object' ||
		typeof right !== 'object'
	) {
		return [path];
	}
	if (Array.isArray(left) || Array.isArray(right)) {
		return JSON.stringify(left) === JSON.stringify(right) ? [] : [path];
	}
	const leftRecord = left as Record<string, unknown>;
	const rightRecord = right as Record<string, unknown>;
	const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
	return [...keys].flatMap(key =>
		changedPaths(leftRecord[key], rightRecord[key], `${path}.${key}`)
	);
}

export function inspectPreviewScenarioChanges(
	scenario: PreviewScenario
): PreviewScenarioChanges {
	return {
		changedPaths: changedPaths(
			runtimeProjection(scenario.baselineProject),
			runtimeProjection(scenario.project)
		),
		newOccurrenceIds: scenario.project.runtimeOccurrences
			.slice(scenario.baselineProject.runtimeOccurrences.length)
			.map(occurrence => occurrence.id),
		actionCount: scenario.actions.length
	};
}

export function comparePreviewScenarios(
	left: PreviewScenario,
	right: PreviewScenario
): PreviewScenarioComparison {
	return {
		leftScenarioId: left.id,
		rightScenarioId: right.id,
		changedPaths: changedPaths(
			runtimeProjection(left.project),
			runtimeProjection(right.project)
		),
		leftOccurrenceIds: left.project.runtimeOccurrences.map(occurrence => occurrence.id),
		rightOccurrenceIds: right.project.runtimeOccurrences.map(occurrence => occurrence.id)
	};
}
