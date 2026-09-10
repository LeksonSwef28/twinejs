import {CognitionTier} from '../../domain/narrative/entities';

export type NarrativeProjectCommand =
	| {type: 'project/rename'; name: string}
	| {type: 'location/add'; id: string; name: string}
	| {type: 'character/add'; id: string; profileId: string; name: string; cognitionTier: CognitionTier}
	| {type: 'editor/selectDay'; day: number}
	| {type: 'editor/selectPeriod'; periodId: string};
