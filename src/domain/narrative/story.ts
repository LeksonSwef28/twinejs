import {EntityId} from './entities';

export type StoryNodeKind =
	| 'beat'
	| 'event'
	| 'dialogue'
	| 'condition'
	| 'effect';

export type StoryNodeActivationState =
	| 'draft'
	| 'dormant'
	| 'available'
	| 'active'
	| 'blocked'
	| 'completed';

/**
 * Placement is intentionally optional. Authors can draft story material before
 * deciding when or where it belongs in the 93-day world.
 */
export interface StoryPlacement {
	day?: number;
	minuteOfDay?: number;
	locationId?: EntityId;
}

export type StoryOccurrenceMode = 'one-shot' | 'repeatable';
export type StoryInterruptionPolicy = 'interruptible' | 'locked';
export type StoryCommunicationChannel = 'sms' | 'phone-call';

export interface StoryCommunicationDefinition {
	channel: StoryCommunicationChannel;
}

export function storyCommunicationIsValid(
	value: unknown
): value is StoryCommunicationDefinition {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const candidate = value as Partial<StoryCommunicationDefinition>;
	return candidate.channel === 'sms' || candidate.channel === 'phone-call';
}

/**
 * Optional A42 execution semantics for an exactly scheduled Story node.
 * Missing policy fields use conservative defaults in the runtime execution layer:
 * one-shot, zero duration, no automatic expiry and interruptible execution.
 */
export interface StoryRuntimePolicyDefinition {
	occurrenceMode?: StoryOccurrenceMode;
	durationMinutes?: number;
	/** When set, executing after scheduled moment + this window records a miss. */
	missAfterMinutes?: number;
	interruption?: StoryInterruptionPolicy;
}

export interface StoryNodeDefinition {
	id: EntityId;
	kind: StoryNodeKind;
	title: string;
	description?: string;
	primaryCharacterId?: EntityId;
	participantIds: EntityId[];
	placement?: StoryPlacement;
	activationState: StoryNodeActivationState;
	/**
	 * Optional authored presentation metadata for remote communication.
	 * Timing/history remain canonical Story placement/runtime semantics.
	 */
	communication?: StoryCommunicationDefinition;
	/** Optional A42 runtime execution policy; authored definition, not live state. */
	runtimePolicy?: StoryRuntimePolicyDefinition;
}

export type StoryConnectionKind =
	| 'flow'
	| 'semantic'
	| 'condition-true'
	| 'condition-false'
	| 'effect'
	| 'knowledge'
	| 'relationship';

export type StoryEdgeMode = 'reference' | 'executable';

const executableConnectionKinds = new Set<StoryConnectionKind>([
	'flow',
	'condition-true',
	'condition-false',
	'effect'
]);

export function storyConnectionKindCanExecute(kind: StoryConnectionKind) {
	return executableConnectionKinds.has(kind);
}

/**
 * Executable semantics are opt-in. Missing mode is treated as reference so
 * older schema-v2 projects and malformed payloads can never gain runtime
 * behavior merely by being loaded.
 */
export function storyConnectionMode(
	connection: Pick<StoryConnectionDefinition, 'mode' | 'kind' | 'sourcePortId' | 'targetPortId'>
): StoryEdgeMode {
	return connection.mode === 'executable' &&
		storyConnectionKindCanExecute(connection.kind) &&
		Boolean(connection.sourcePortId) &&
		Boolean(connection.targetPortId)
		? 'executable'
		: 'reference';
}

/**
 * Reference edges are authoring/semantic relations only. Executable edges are
 * explicit causal/runtime connections and therefore require typed ports.
 */
export interface StoryConnectionDefinition {
	id: EntityId;
	sourceNodeId: EntityId;
	targetNodeId: EntityId;
	sourcePortId?: string;
	targetPortId?: string;
	kind: StoryConnectionKind;
	mode: StoryEdgeMode;
}
