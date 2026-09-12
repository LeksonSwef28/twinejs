import {CharacterMindState, MemoryTrace, PendingReaction, RelationshipState} from './cognition';
import {NarrativeEditorState} from './editor';
import {NarrativeCharacter, NarrativeLocation, NarrativeScene} from './entities';
import {NarrativeMoveDefinition} from './interaction';
import {ItemDefinition, ItemInstance} from './items';
import {
	CharacterKnowledgeState,
	ClaimDefinition,
	InitialKnowledgeSeed,
	ObjectiveFactDefinition
} from './knowledge';
import {BehaviorProfile, RoutineRule, ScheduleException} from './schedule';
import {StoryConnectionDefinition, StoryNodeDefinition} from './story';
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
	memories: MemoryTrace[];
	relationships: RelationshipState[];
	pendingReactions: PendingReaction[];
	mindStates: CharacterMindState[];
	editor: NarrativeEditorState;
	simulation: NarrativeSimulationState;
}
