import {CognitionTier} from '../../domain/narrative/entities';
import {NarrativeWorkspaceMode} from '../../domain/narrative/project';

export type NarrativeProjectCommand =
	| {type: 'project/rename'; name: string}
	| {type: 'location/add'; id: string; name: string}
	| {type: 'character/add'; id: string; profileId: string; name: string; cognitionTier: CognitionTier}
	| {type: 'editor/selectDay'; day: number}
	| {type: 'editor/selectPeriod'; periodId: string}
	| {type: 'editor/selectMoment'; day: number; minuteOfDay: number}
	| {type: 'editor/selectWorkspace'; workspace: NarrativeWorkspaceMode};
