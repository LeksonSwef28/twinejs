import {CharacterBodyState} from './body';
import {CharacterMindState, MemoryTrace, PendingReaction, RelationshipState} from './cognition';
import {NarrativeEditorState} from './editor';
import {NarrativeCharacter, NarrativeLocation, NarrativeScene} from './entities';
import {InjuryState} from './injury';
import {NarrativeMoveDefinition} from './interaction';
import {InteractionTemplateDefinition} from './interaction-template';
import {ItemDefinition, ItemInstance, ItemRuntimePlacement} from './items';
import {
	CharacterKnowledgeState,
	ClaimDefinition,
	InitialKnowledgeSeed,
	ObjectiveFactDefinition
} from './knowledge';
import {ReactionCandidateSetDefinition} from './reaction';
import {ActiveStoryExecutionState} from './runtime-execution';
import {NarrativeRuntimeOccurrence} from './runtime-story';
import {BehaviorProfile, RoutineRule, ScheduleException} from './schedule';
import {
	StoryConnectionDefinition,
	StoryNodeActivationState,
	StoryNodeDefinition
} from './story';
import {NarrativeProjectTemplate} from './template';

export const narrativeProjectSchemaVersion = 2;

export type {NarrativeWorkspaceMode} from './editor';

export interface NarrativeSimulationState {
	day: number;
	minuteOfDay: number;
	activeBehaviorProfileByCharacter: Record<string, string>;
	actualLocationByCharacter: Record<string, string | undefined>;
	/** Runtime beliefs/knowledge. Objective facts and claims remain authored definitions. */
	characterKnowledge: CharacterKnowledgeState[];
	/** Runtime needs state. It advances only with the Simulation Playhead or typed body effects. */
	bodyByCharacter: Record<string, CharacterBodyState>;
}

export interface NarrativeProject {
	schemaVersion: number;
	projectId: string;
	hostStoryId: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	template: NarrativeProjectTemplate;
	locations: NarrativeLocation[];
	scenes: NarrativeScene[];
	characters: NarrativeCharacter[];
	itemDefinitions: ItemDefinition[];
	itemInstances: ItemInstance[];
	objectiveFacts: ObjectiveFactDefinition[];
	claims: ClaimDefinition[];
	/** Authored simulation-start cognition; does not mutate live preview/runtime state. */
	initialKnowledge: InitialKnowledgeSeed[];
	behaviorProfiles: BehaviorProfile[];
	routineRules: RoutineRule[];
	scheduleExceptions: ScheduleException[];
	storyNodes: StoryNodeDefinition[];
	storyConnections: StoryConnectionDefinition[];
	/** Authored actions/dialogue choices owned by Story nodes. */
	narrativeMoves: NarrativeMoveDefinition[];
	/** Reusable role-bound authoring structures. Templates themselves never execute. */
	interactionTemplates: InteractionTemplateDefinition[];
	/** Authored candidate groups used by explainable reaction ranking. */
	reactionCandidateSets: ReactionCandidateSetDefinition[];
	memories: MemoryTrace[];
	relationships: RelationshipState[];
	pendingReactions: PendingReaction[];
	mindStates: CharacterMindState[];
	/** Current injuries are runtime conditions, not an abstract HP total. */
	injuriesByCharacter: Record<string, InjuryState[]>;
	/** Runtime overlay on canonical authored ItemInstance placement. */
	itemPlacementOverrides: Record<string, ItemRuntimePlacement>;
	/** A41 runtime activation/consumption state. Authored StoryNode state is never rewritten by play. */
	storyNodeStateOverrides: Record<string, StoryNodeActivationState>;
	/** A41/A42 append-only provenance for outcomes and Story-work lifecycle results. */
	runtimeOccurrences: NarrativeRuntimeOccurrence[];
	/** A42 explicitly started Story work that is consuming simulation time. */
	activeStoryExecutions: ActiveStoryExecutionState[];
	editor: NarrativeEditorState;
	simulation: NarrativeSimulationState;
}
