import {CharacterMindState, MemoryTrace, PendingReaction, RelationshipState} from './cognition';
import {NarrativeEditorState} from './editor';
import {NarrativeCharacter, NarrativeLocation, NarrativeScene} from './entities';
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
	behaviorProfiles: BehaviorProfile[];
	routineRules: RoutineRule[];
	scheduleExceptions: ScheduleException[];
	storyNodes: StoryNodeDefinition[];
	storyConnections: StoryConnectionDefinition[];
	memories: MemoryTrace[];
	relationships: RelationshipState[];
	pendingReactions: PendingReaction[];
	mindStates: CharacterMindState[];
	editor: NarrativeEditorState;
	simulation: NarrativeSimulationState;
}
