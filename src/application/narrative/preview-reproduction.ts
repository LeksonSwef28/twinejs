import type {
	NarrativeProjectMoveResolutionInput,
	NarrativeProjectMoveResolutionTrace
} from './living-simulation';
import type {PreviewRuntimeInput, PreviewScenario} from './preview-laboratory';

export type PreviewLaboratoryReproductionMetadata =
	| {type: 'test-input'; input: PreviewRuntimeInput}
	| {type: 'advance'; requestedMinutes: number; appliedMinutes: number}
	| {
			type: 'resolved-move';
			moveId: string;
			input: NarrativeProjectMoveResolutionInput;
			outcomeId: string;
	  }
	| {type: 'forced-outcome'; moveId: string; outcomeId: string}
	| {type: 'checkpoint-restore'; checkpointId: string};

export interface PreviewMoveTraceReproductionMetadata {
	type: 'trace-move';
	scenarioId: string;
	sourceActionCount: number;
	moveId: string;
	input: NarrativeProjectMoveResolutionInput;
	status: NarrativeProjectMoveResolutionTrace['status'];
	outcomeId?: string;
}

export function clonePreviewRuntimeInput(input: PreviewRuntimeInput): PreviewRuntimeInput {
	switch (input.type) {
		case 'moment':
			return {...input};
		case 'actual-location':
			return {...input};
		case 'knowledge':
			return {...input};
		case 'forget-claim':
			return {...input};
	}
}

export function clonePreviewMoveResolutionInput(
	input: NarrativeProjectMoveResolutionInput
): NarrativeProjectMoveResolutionInput {
	return input.skillCheck
		? {skillCheck: {...input.skillCheck}}
		: {};
}

/** Read-only descriptor for reproducing the explicit input used by a Move trace. */
export function describePreviewMoveTraceReproduction(
	scenario: PreviewScenario,
	moveId: string,
	input: NarrativeProjectMoveResolutionInput,
	trace: NarrativeProjectMoveResolutionTrace
): PreviewMoveTraceReproductionMetadata {
	if (trace.moveId !== moveId) {
		throw new Error(
			`Preview trace belongs to Move ${trace.moveId}, not requested Move ${moveId}.`
		);
	}
	return {
		type: 'trace-move',
		scenarioId: scenario.id,
		sourceActionCount: scenario.actions.length,
		moveId,
		input: clonePreviewMoveResolutionInput(input),
		status: trace.status,
		...(trace.outcomeId ? {outcomeId: trace.outcomeId} : {})
	};
}
