import {NarrativeProject} from '../../domain/narrative/project';
import {PreviewLaboratoryAction, PreviewScenario} from './preview-laboratory';

export const PREVIEW_CHECKPOINT_LIMIT = 8;

export interface PreviewCheckpoint {
	id: string;
	scenarioId: string;
	label: string;
	projectSnapshot: NarrativeProject;
	sourceActionCount: number;
}

function cloneProject(project: NarrativeProject): NarrativeProject {
	return JSON.parse(JSON.stringify(project)) as NarrativeProject;
}

function assertCheckpointCollection(
	scenario: PreviewScenario,
	checkpoints: PreviewCheckpoint[]
) {
	const foreign = checkpoints.find(checkpoint => checkpoint.scenarioId !== scenario.id);
	if (foreign) {
		throw new Error(
			`Preview checkpoint ${foreign.id} belongs to scenario ${foreign.scenarioId}, not ${scenario.id}.`
		);
	}
}

export function capturePreviewCheckpoint(
	scenario: PreviewScenario,
	checkpoints: PreviewCheckpoint[],
	id: string,
	label: string
): PreviewCheckpoint {
	assertCheckpointCollection(scenario, checkpoints);
	if (checkpoints.length >= PREVIEW_CHECKPOINT_LIMIT) {
		throw new RangeError(
			`Preview checkpoint limit reached (${PREVIEW_CHECKPOINT_LIMIT} per scenario).`
		);
	}
	const normalizedId = id.trim();
	if (!normalizedId) {
		throw new Error('Preview checkpoint id is required.');
	}
	if (checkpoints.some(checkpoint => checkpoint.id === normalizedId)) {
		throw new Error(`Duplicate preview checkpoint id: ${normalizedId}`);
	}
	const normalizedLabel = label.trim() || `Checkpoint ${checkpoints.length + 1}`;
	return {
		id: normalizedId,
		scenarioId: scenario.id,
		label: normalizedLabel,
		projectSnapshot: cloneProject(scenario.project),
		sourceActionCount: scenario.actions.length
	};
}

export function restorePreviewCheckpoint(
	scenario: PreviewScenario,
	checkpoint: PreviewCheckpoint
): PreviewScenario {
	if (checkpoint.scenarioId !== scenario.id) {
		throw new Error(
			`Preview checkpoint ${checkpoint.id} belongs to scenario ${checkpoint.scenarioId}, not ${scenario.id}.`
		);
	}
	const restoreAction: PreviewLaboratoryAction = {
		id: `${scenario.id}:action:${scenario.actions.length + 1}`,
		kind: 'checkpoint-restore',
		summary: `Restored preview checkpoint ${checkpoint.label}.`
	};
	return {
		...scenario,
		project: cloneProject(checkpoint.projectSnapshot),
		actions: [...scenario.actions, restoreAction]
	};
}

export function removePreviewCheckpoint(
	checkpoints: PreviewCheckpoint[],
	checkpointId: string
): PreviewCheckpoint[] {
	return checkpoints.filter(checkpoint => checkpoint.id !== checkpointId);
}
