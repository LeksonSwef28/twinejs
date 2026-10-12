import {
	NarrativeProject,
	narrativeProjectSchemaVersion
} from '../../domain/narrative/project';
import {narrativeProjectCanLoad93DaysProductionStarter} from '../../application/narrative/production-project-bootstrap';
import {
	composeNarrativeProjectPersistence,
	isNarrativeProjectPersistenceEnvelope,
	projectNarrativePersistence
} from './persistence-projection';

/**
 * A downloadable checkpoint of this Narrative Project's owned authored, editor
 * and runtime projections. Unlike a compiled Player artifact, this retains
 * source definitions and editing state.
 *
 * It does NOT include the host Twine Story/passages, and there is no automatic
 * standalone host Story or cross-host transfer. Never describe it as a portable
 * full-story backup or as a game save.
 */
export function serializeNarrativeSourceSnapshot(
	project: NarrativeProject
): string {
	return JSON.stringify(projectNarrativePersistence(project), null, 2);
}

export function narrativeSourceSnapshotFilename(
	project: Pick<NarrativeProject, 'name'>
): string {
	const title = project.name
		.trim()
		.replace(/[\\/:*?"<>|]/g, '-')
		.replace(/[. ]+$/g, '')
		.slice(0, 70)
		.trim();

	return `${title || 'Narrative Project'}.narrative-source.json`;
}

/**
 * Deliberately stricter than the production bootstrap: a writer may have
 * previewed an otherwise empty authored Story, creating valuable runtime
 * state. Import must not erase even those test results by accident.
 */
export function narrativeSourceRestoreTargetIsEmpty(project: NarrativeProject) {
	return (
		narrativeProjectCanLoad93DaysProductionStarter(project) &&
		project.memories.length === 0 &&
		project.relationships.length === 0 &&
		project.pendingReactions.length === 0 &&
		project.mindStates.length === 0 &&
		project.runtimeOccurrences.length === 0 &&
		project.activeStoryExecutions.length === 0 &&
		Object.keys(project.cashByCharacter).length === 0 &&
		Object.keys(project.injuriesByCharacter).length === 0 &&
		Object.keys(project.itemPlacementOverrides).length === 0 &&
		Object.keys(project.storyNodeStateOverrides).length === 0 &&
		project.simulation.day === 1 &&
		project.simulation.minuteOfDay === project.template.periods[0]?.startMinute &&
		project.simulation.characterKnowledge.length === 0 &&
		Object.keys(project.simulation.actualLocationByCharacter).length === 0 &&
		Object.keys(project.simulation.activeBehaviorProfileByCharacter).length === 0 &&
		Object.keys(project.simulation.bodyByCharacter).length === 0
	);
}

export type NarrativeSourceSnapshotInspection =
	| {status: 'ready'; project: NarrativeProject}
	| {status: 'rejected'; reason: string};

const requiredAuthoredArrays = [
	'locations',
	'scenes',
	'characters',
	'itemDefinitions',
	'itemInstances',
	'objectiveFacts',
	'claims',
	'initialKnowledge',
	'behaviorProfiles',
	'routineRules',
	'scheduleExceptions',
	'storyNodes',
	'storyConnections',
	'narrativeMoves',
	'interactionTemplates',
	'reactionCandidateSets'
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

/**
 * A78 only accepts the exact projection snapshot exported by A77, on the same
 * host and same timeline template. No implicit migration, cross-host rebinding,
 * overwrite or partial-import is performed. Unknown data fails closed.
 */
export function inspectNarrativeSourceSnapshot(
	json: string,
	current: NarrativeProject
): NarrativeSourceSnapshotInspection {
	let raw: unknown;
	try {
		raw = JSON.parse(json);
	} catch {
		return {status: 'rejected', reason: 'Файл не содержит корректный JSON.'};
	}
	if (!isNarrativeProjectPersistenceEnvelope(raw)) {
		return {
			status: 'rejected',
			reason: 'Это не снимок исходного Narrative Project. Runtime artifact не подходит.'
		};
	}
	if (raw.schemaVersion !== narrativeProjectSchemaVersion) {
		return {
			status: 'rejected',
			reason: 'Несовместимая версия схемы. Автоматическая миграция снимков недоступна.'
		};
	}
	const authored = raw.authored as unknown as Record<string, unknown>;
	const runtime = raw.runtime as unknown as Record<string, unknown>;
	const editor = raw.editor as unknown as Record<string, unknown>;
	const simulation = runtime.simulation;
	if (
		typeof authored.projectId !== 'string' || !authored.projectId.trim() ||
		typeof authored.hostStoryId !== 'string' ||
		typeof authored.name !== 'string' ||
		typeof authored.createdAt !== 'string' ||
		typeof authored.updatedAt !== 'string' ||
		requiredAuthoredArrays.some(key => !Array.isArray(authored[key])) ||
		!isRecord(authored.template) ||
		!Array.isArray(authored.template.periods) ||
		!isRecord(editor.storyCanvas) ||
		!Array.isArray(editor.storyCanvas.nodes) ||
		!isRecord(editor.worldTimeViewport) ||
		!Number.isInteger(editor.selectedDay) ||
		!Array.isArray(runtime.memories) ||
		!Array.isArray(runtime.relationships) ||
		!Array.isArray(runtime.pendingReactions) ||
		!Array.isArray(runtime.mindStates) ||
		!isRecord(simulation) ||
		!Number.isInteger(simulation.day) ||
		!Number.isInteger(simulation.minuteOfDay) ||
		!Array.isArray(simulation.characterKnowledge) ||
		!isRecord(simulation.bodyByCharacter) ||
		!isRecord(simulation.actualLocationByCharacter) ||
		!isRecord(simulation.activeBehaviorProfileByCharacter)
	) {
		return {
			status: 'rejected',
			reason: 'В снимке отсутствуют обязательные данные автора, редактора или симуляции.'
		};
	}
	if (authored.hostStoryId !== current.hostStoryId) {
		return {
			status: 'rejected',
			reason: 'Снимок принадлежит другой host Twine Story. Перенос между Story пока не поддерживается.'
		};
	}
	if (JSON.stringify(authored.template) !== JSON.stringify(current.template)) {
		return {
			status: 'rejected',
			reason: 'Шаблон мира или календаря не совпадает с текущим проектом.'
		};
	}
	if (!narrativeSourceRestoreTargetIsEmpty(current)) {
		return {
			status: 'rejected',
			reason: 'Восстановление доступно только в пустой Narrative Project: данные не перезаписываются.'
		};
	}
	try {
		return {status: 'ready', project: composeNarrativeProjectPersistence(raw)};
	} catch {
		return {
			status: 'rejected',
			reason: 'Снимок не удалось безопасно прочитать. Текущий проект не изменён.'
		};
	}
}
