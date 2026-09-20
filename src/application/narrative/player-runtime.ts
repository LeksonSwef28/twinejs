import {NarrativeEditorState} from '../../domain/narrative/editor';
import {
	NarrativeProject,
	narrativeProjectSchemaVersion
} from '../../domain/narrative/project';
import {
	composeNarrativeProjectPersistence,
	NarrativeProjectAuthoredProjection,
	NarrativeProjectRuntimeProjection,
	narrativeProjectPersistenceFormat
} from '../../store/narrative-project/persistence-projection';
import {narrativeTravelRouteIsStructurallyValid} from '../../domain/narrative/travel';
import {narrativePlayerStartIsStructurallyValid} from '../../domain/narrative/player-start';
import {narrativeSleepOptionIsStructurallyValid} from '../../domain/narrative/sleep';
import {
	NarrativeRuntimeArtifactV1,
	narrativeRuntimeArtifactFormat,
	narrativeRuntimeArtifactVersion
} from './export-compiler';

export type NarrativePlayerBootstrapErrorCode =
	| 'invalid-artifact'
	| 'unsupported-artifact-format'
	| 'unsupported-artifact-version'
	| 'unsupported-source-schema'
	| 'invalid-authored-project'
	| 'invalid-initial-runtime';

export interface NarrativePlayerSessionIdentity {
	artifactFormat: typeof narrativeRuntimeArtifactFormat;
	artifactVersion: typeof narrativeRuntimeArtifactVersion;
	sourceSchemaVersion: number;
	projectId: string;
	hostStoryId: string;
}

export interface NarrativePlayerSession {
	readonly identity: NarrativePlayerSessionIdentity;
	readonly currentProject: NarrativeProject;
}

export type NarrativePlayerBootstrapResult =
	| {status: 'ready'; session: NarrativePlayerSession}
	| {
			status: 'rejected';
			code: NarrativePlayerBootstrapErrorCode;
			summary: string;
	  };

export type NarrativePlayerSessionReplacementResult =
	| {status: 'updated'; session: NarrativePlayerSession}
	| {
			status: 'rejected';
			reason: 'identity-mismatch' | 'schema-mismatch';
			session: NarrativePlayerSession;
	  };

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function jsonClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

const authoredArrayKeys: Array<keyof NarrativeProjectAuthoredProjection> = [
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
];

function authoredProjectionLooksUsable(
	value: unknown
): value is NarrativeProjectAuthoredProjection {
	if (!isRecord(value)) {
		return false;
	}
	const template = value.template;
	if (
		!isRecord(template) ||
		!Array.isArray(template.periods) ||
		template.periods.length === 0
	) {
		return false;
	}
	const firstPeriod = template.periods[0];
	if (
		!isRecord(firstPeriod) ||
		typeof firstPeriod.id !== 'string' ||
		!Number.isInteger(firstPeriod.startMinute)
	) {
		return false;
	}
	const travelRoutes = value.travelRoutes;
	const playerStart = value.playerStart;
	const sleepOptions = value.sleepOptions;
	return (
		typeof value.projectId === 'string' &&
		typeof value.hostStoryId === 'string' &&
		typeof value.name === 'string' &&
		typeof value.createdAt === 'string' &&
		typeof value.updatedAt === 'string' &&
		authoredArrayKeys.every(key => Array.isArray(value[key])) &&
		(travelRoutes === undefined ||
			(Array.isArray(travelRoutes) &&
				travelRoutes.every(narrativeTravelRouteIsStructurallyValid))) &&
		(playerStart === undefined ||
			narrativePlayerStartIsStructurallyValid(playerStart)) &&
		(sleepOptions === undefined ||
			(Array.isArray(sleepOptions) &&
				sleepOptions.every(narrativeSleepOptionIsStructurallyValid)))
	);
}

function runtimeProjectionLooksUsable(
	value: unknown
): value is NarrativeProjectRuntimeProjection {
	if (!isRecord(value)) {
		return false;
	}
	const simulation = value.simulation;
	if (!isRecord(simulation)) {
		return false;
	}
	return (
		Array.isArray(value.memories) &&
		Array.isArray(value.relationships) &&
		Array.isArray(value.pendingReactions) &&
		Array.isArray(value.mindStates) &&
		(value.injuriesByCharacter === undefined ||
			isRecord(value.injuriesByCharacter)) &&
		(value.itemPlacementOverrides === undefined ||
			isRecord(value.itemPlacementOverrides)) &&
		(value.storyNodeStateOverrides === undefined ||
			isRecord(value.storyNodeStateOverrides)) &&
		(value.runtimeOccurrences === undefined ||
			Array.isArray(value.runtimeOccurrences)) &&
		(value.activeStoryExecutions === undefined ||
			Array.isArray(value.activeStoryExecutions)) &&
		Number.isInteger(simulation.day) &&
		(simulation.day as number) >= 1 &&
		Number.isInteger(simulation.minuteOfDay) &&
		(simulation.minuteOfDay as number) >= 0 &&
		(simulation.minuteOfDay as number) < 24 * 60 &&
		isRecord(simulation.activeBehaviorProfileByCharacter) &&
		isRecord(simulation.actualLocationByCharacter) &&
		Array.isArray(simulation.characterKnowledge) &&
		isRecord(simulation.bodyByCharacter)
	);
}

function compatibilityEditorState(
	authored: NarrativeProjectAuthoredProjection
): NarrativeEditorState {
	const firstPeriod = authored.template.periods[0];
	return {
		selectedDay: 1,
		selectedPeriodId: firstPeriod.id,
		selectedMinuteOfDay: firstPeriod.startMinute
	};
}

function rejected(
	code: NarrativePlayerBootstrapErrorCode,
	summary: string
): NarrativePlayerBootstrapResult {
	return {status: 'rejected', code, summary};
}

/**
 * A53 player bootstrap boundary. The artifact stays immutable source data; the
 * returned project is a defensive materialization consumed by the existing
 * canonical TypeScript runtime APIs.
 */
export function materializeNarrativePlayerSession(
	value: unknown
): NarrativePlayerBootstrapResult {
	if (!isRecord(value)) {
		return rejected('invalid-artifact', 'Runtime artifact must be an object.');
	}
	if (value.format !== narrativeRuntimeArtifactFormat) {
		return rejected(
			'unsupported-artifact-format',
			'Unsupported Narrative runtime artifact format.'
		);
	}
	if (value.version !== narrativeRuntimeArtifactVersion) {
		return rejected(
			'unsupported-artifact-version',
			'Unsupported Narrative runtime artifact version.'
		);
	}
	if (value.sourceSchemaVersion !== narrativeProjectSchemaVersion) {
		return rejected(
			'unsupported-source-schema',
			'Runtime artifact source schema is not supported by this player build.'
		);
	}
	if (!authoredProjectionLooksUsable(value.authored)) {
		return rejected(
			'invalid-authored-project',
			'Runtime artifact authored projection is incomplete or invalid.'
		);
	}
	if (!runtimeProjectionLooksUsable(value.initialRuntime)) {
		return rejected(
			'invalid-initial-runtime',
			'Runtime artifact initial runtime projection is incomplete or invalid.'
		);
	}

	const artifact = value as unknown as NarrativeRuntimeArtifactV1;
	let authored: NarrativeProjectAuthoredProjection;
	let runtime: NarrativeProjectRuntimeProjection;
	try {
		authored = jsonClone(artifact.authored);
		runtime = jsonClone(artifact.initialRuntime);
	} catch {
		return rejected(
			'invalid-artifact',
			'Runtime artifact could not be isolated as JSON data.'
		);
	}
	const project = composeNarrativeProjectPersistence({
		format: narrativeProjectPersistenceFormat,
		schemaVersion: artifact.sourceSchemaVersion,
		authored,
		editor: compatibilityEditorState(authored),
		runtime
	});

	return {
		status: 'ready',
		session: {
			identity: {
				artifactFormat: narrativeRuntimeArtifactFormat,
				artifactVersion: narrativeRuntimeArtifactVersion,
				sourceSchemaVersion: artifact.sourceSchemaVersion,
				projectId: project.projectId,
				hostStoryId: project.hostStoryId
			},
			currentProject: project
		}
	};
}

/**
 * Thin ownership boundary for results returned by canonical runtime APIs. It
 * rejects accidental cross-project/schema replacement but adds no gameplay
 * semantics of its own.
 */
export function replaceNarrativePlayerSessionProject(
	session: NarrativePlayerSession,
	nextProject: NarrativeProject
): NarrativePlayerSessionReplacementResult {
	if (
		nextProject.projectId !== session.identity.projectId ||
		nextProject.hostStoryId !== session.identity.hostStoryId
	) {
		return {status: 'rejected', reason: 'identity-mismatch', session};
	}
	if (nextProject.schemaVersion !== session.identity.sourceSchemaVersion) {
		return {status: 'rejected', reason: 'schema-mismatch', session};
	}
	return {
		status: 'updated',
		session: {...session, currentProject: nextProject}
	};
}
