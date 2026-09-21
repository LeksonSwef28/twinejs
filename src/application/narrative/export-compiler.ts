import {narrativeEconomyIsStructurallyValid} from '../../domain/narrative/economy';
import {initializeCharacterKnowledge} from '../../domain/narrative/knowledge';
import {NarrativeProject} from '../../domain/narrative/project';
import {narrativeTravelRouteIsStructurallyValid} from '../../domain/narrative/travel';
import {narrativeSleepOptionIsStructurallyValid} from '../../domain/narrative/sleep';
import {
	NarrativeProjectAuthoredProjection,
	NarrativeProjectRuntimeProjection,
	projectNarrativePersistence
} from '../../store/narrative-project/persistence-projection';
import {
	StoryBrainFinding,
	queryStoryBrainProjectDiagnostics
} from './story-brain-query';

export const narrativeRuntimeArtifactFormat = 'narrative-runtime-artifact';
export const narrativeRuntimeArtifactVersion = 1 as const;

export interface NarrativeRuntimeArtifactV1 {
	format: typeof narrativeRuntimeArtifactFormat;
	version: typeof narrativeRuntimeArtifactVersion;
	sourceSchemaVersion: number;
	authored: NarrativeProjectAuthoredProjection;
	initialRuntime: NarrativeProjectRuntimeProjection;
}

export type NarrativeExportDisposition = 'blocker' | 'advisory';

export interface NarrativeStoryBrainExportDiagnostic {
	source: 'story-brain';
	disposition: NarrativeExportDisposition;
	finding: StoryBrainFinding;
}

export type NarrativeCompilerDiagnosticCode =
	| 'missing-template-period'
	| 'invalid-initial-runtime'
	| 'invalid-economy'
	| 'invalid-travel-route'
	| 'invalid-sleep-option';

export interface NarrativeCompilerExportDiagnostic {
	source: 'compiler';
	disposition: 'blocker';
	code: NarrativeCompilerDiagnosticCode;
	summary: string;
}

export type NarrativeExportDiagnostic =
	| NarrativeStoryBrainExportDiagnostic
	| NarrativeCompilerExportDiagnostic;

export type NarrativeCompileResult =
	| {
			status: 'compiled';
			artifact: NarrativeRuntimeArtifactV1;
			diagnostics: NarrativeExportDiagnostic[];
	  }
	| {
			status: 'blocked';
			diagnostics: NarrativeExportDiagnostic[];
	  };

const blockingStoryBrainKinds = new Set<StoryBrainFinding['kind']>([
	'broken-authored-reference',
	'partial-story-placement',
	'invalid-story-placement',
	'runtime-policy-without-exact-placement'
]);

function storyBrainExportDiagnostic(
	finding: StoryBrainFinding
): NarrativeStoryBrainExportDiagnostic {
	return {
		source: 'story-brain',
		disposition: blockingStoryBrainKinds.has(finding.kind) ? 'blocker' : 'advisory',
		finding
	};
}

function canonicalizeJson(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(canonicalizeJson);
	}
	if (value && typeof value === 'object') {
		const source = value as Record<string, unknown>;
		const result: Record<string, unknown> = {};
		for (const key of Object.keys(source).sort()) {
			if (source[key] !== undefined) {
				result[key] = canonicalizeJson(source[key]);
			}
		}
		return result;
	}
	return value;
}

function canonicalClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(canonicalizeJson(value))) as T;
}

function compilerBlocker(
	code: NarrativeCompilerDiagnosticCode,
	summary: string
): NarrativeCompilerExportDiagnostic {
	return {source: 'compiler', disposition: 'blocker', code, summary};
}

function initialRuntimeForProject(
	project: NarrativeProject
):
	| {status: 'ready'; runtime: NarrativeProjectRuntimeProjection}
	| {status: 'blocked'; diagnostic: NarrativeCompilerExportDiagnostic} {
	const firstPeriod = project.template.periods[0];
	if (!firstPeriod) {
		return {
			status: 'blocked',
			diagnostic: compilerBlocker(
				'missing-template-period',
				'Cannot compile initial runtime because the project template has no first period.'
			)
		};
	}

	let characterKnowledge: NarrativeProjectRuntimeProjection['simulation']['characterKnowledge'];
	try {
		characterKnowledge = initializeCharacterKnowledge(project.initialKnowledge);
	} catch (error) {
		return {
			status: 'blocked',
			diagnostic: compilerBlocker(
				'invalid-initial-runtime',
				error instanceof Error
					? `Cannot compile initial runtime: ${error.message}`
					: 'Cannot compile initial runtime from authored initial state.'
			)
		};
	}

	return {
		status: 'ready',
		runtime: {
			memories: [],
			relationships: [],
			pendingReactions: [],
			mindStates: [],
			injuriesByCharacter: {},
			itemPlacementOverrides: {},
			storyNodeStateOverrides: {},
			runtimeOccurrences: [],
			activeStoryExecutions: [],
			cashByCharacter: {...(project.economy?.initialCashByCharacter ?? {})},
			simulation: {
				day: 1,
				minuteOfDay: firstPeriod.startMinute,
				activeBehaviorProfileByCharacter: {},
				actualLocationByCharacter: {},
				characterKnowledge,
				bodyByCharacter: {}
			}
		}
	};
}

/**
 * Compiles authored Narrative Project state into a deterministic runtime artifact.
 * Current editor/live/Preview state is deliberately excluded from the artifact.
 */
export function compileNarrativeRuntimeArtifact(
	project: NarrativeProject
): NarrativeCompileResult {
	const diagnostics: NarrativeExportDiagnostic[] =
		queryStoryBrainProjectDiagnostics(project).findings.map(storyBrainExportDiagnostic);
	if (project.economy !== undefined) {
		if (!narrativeEconomyIsStructurallyValid(project.economy)) {
			diagnostics.push(
				compilerBlocker(
					'invalid-economy',
					'Cannot compile invalid authored economy definition.'
				)
			);
		} else {
			const characterIds = new Set(project.characters.map(character => character.id));
			const locationIds = new Set(project.locations.map(location => location.id));
			const itemIds = new Set(project.itemInstances.map(item => item.id));
			const offerIds = new Set<string>();
			const invalidInitialCharacter = Object.keys(
				project.economy.initialCashByCharacter
			).find(characterId => !characterIds.has(characterId));
			const invalidOffer = project.economy.purchaseOffers.find(offer => {
				if (offerIds.has(offer.id)) {
					return true;
				}
				offerIds.add(offer.id);
				return (
					!locationIds.has(offer.locationId) ||
					!itemIds.has(offer.itemInstanceId) ||
					(offer.sellerCharacterId !== undefined &&
						!characterIds.has(offer.sellerCharacterId))
				);
			});
			if (invalidInitialCharacter || invalidOffer) {
				diagnostics.push(
					compilerBlocker(
						'invalid-economy',
						invalidInitialCharacter
							? `Initial cash points to unknown Character: ${invalidInitialCharacter}.`
							: `Purchase offer has invalid/duplicate references: ${invalidOffer?.id ?? '(unknown)'}.`
					)
				);
			}
		}
	}

	for (const route of project.travelRoutes ?? []) {
		const routeId = route.id;
		if (!narrativeTravelRouteIsStructurallyValid(route)) {
			diagnostics.push(
				compilerBlocker(
					'invalid-travel-route',
					`Cannot compile invalid travel route: ${routeId || '(missing id)'}.`
				)
			);
		}
	}
	for (const option of project.sleepOptions ?? []) {
		const optionId = option.id;
		if (!narrativeSleepOptionIsStructurallyValid(option)) {
			diagnostics.push(
				compilerBlocker(
					'invalid-sleep-option',
					`Cannot compile invalid sleep option: ${optionId || '(missing id)'}.`
				)
			);
		}
	}

	const initialRuntime = initialRuntimeForProject(project);
	if (initialRuntime.status === 'blocked') {
		diagnostics.push(initialRuntime.diagnostic);
		return {status: 'blocked', diagnostics};
	}

	if (diagnostics.some(diagnostic => diagnostic.disposition === 'blocker')) {
		return {status: 'blocked', diagnostics};
	}

	const authored = projectNarrativePersistence(project).authored;
	const artifact: NarrativeRuntimeArtifactV1 = {
		format: narrativeRuntimeArtifactFormat,
		version: narrativeRuntimeArtifactVersion,
		sourceSchemaVersion: project.schemaVersion,
		authored,
		initialRuntime: initialRuntime.runtime
	};

	return {
		status: 'compiled',
		artifact: canonicalClone(artifact),
		diagnostics
	};
}

/**
 * Stable JSON representation for export/golden tests. Object keys are sorted
 * recursively; authored array order is preserved.
 */
export function serializeNarrativeRuntimeArtifact(
	artifact: NarrativeRuntimeArtifactV1
) {
	return JSON.stringify(canonicalizeJson(artifact));
}
