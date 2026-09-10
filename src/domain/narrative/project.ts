import {CharacterMindState, MemoryTrace, PendingReaction, RelationshipState} from './cognition';
import {NarrativeCharacter, NarrativeLocation, NarrativeScene} from './entities';
import {BehaviorProfile, RoutineRule, ScheduleException} from './schedule';
import {NarrativeProjectTemplate} from './template';

export const narrativeProjectSchemaVersion = 1;

export type NarrativeWorkspaceMode = 'story' | 'world-time';

export interface NarrativeEditorState {
	selectedDay: number;
	selectedPeriodId: string;
	/** Optional while schema version 1 projects created before exact-time navigation are still supported. */
	selectedMinuteOfDay?: number;
	/** Optional while schema version 1 projects created before the dual-workspace UI are still supported. */
	workspaceMode?: NarrativeWorkspaceMode;
}

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
	memories: MemoryTrace[];
	relationships: RelationshipState[];
	pendingReactions: PendingReaction[];
	mindStates: CharacterMindState[];
	editor: NarrativeEditorState;
	simulation: NarrativeSimulationState;
}
