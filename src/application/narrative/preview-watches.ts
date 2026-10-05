import {KnowledgeAttitude} from '../../domain/narrative/knowledge';
import {StoryNodeActivationState} from '../../domain/narrative/story';
import {narrativeRuntimeStoryNodes} from './living-simulation';
import {PreviewScenario} from './preview-laboratory';

/**
 * Finite, typed watch definitions for the preview laboratory. These deliberately
 * avoid arbitrary JSON/object paths so a watch always names a supported runtime
 * concept with explicit entity references.
 */
export type PreviewWatchDefinition =
	| {type: 'moment'}
	| {type: 'actual-location'; characterId: string}
	| {type: 'knowledge'; characterId: string; claimId: string}
	| {
			type: 'relationship-axis';
			fromCharacterId: string;
			toCharacterId: string;
			axis: string;
	  }
	| {type: 'story-node-state'; storyNodeId: string};

export type PreviewWatchResult =
	| {type: 'moment'; day: number; minuteOfDay: number}
	| {type: 'actual-location'; characterId: string; locationId?: string}
	| {
			type: 'knowledge';
			characterId: string;
			claimId: string;
			attitude?: KnowledgeAttitude;
			confidence?: number;
			timesHeard?: number;
	  }
	| {
			type: 'relationship-axis';
			fromCharacterId: string;
			toCharacterId: string;
			axis: string;
			value?: number;
	  }
	| {type: 'story-node-state'; storyNodeId: string; state: StoryNodeActivationState};

function assertCharacter(scenario: PreviewScenario, characterId: string) {
	if (!scenario.project.characters.some(character => character.id === characterId)) {
		throw new Error(`Unknown preview watch character: ${characterId}`);
	}
}

function assertClaim(scenario: PreviewScenario, claimId: string) {
	if (!scenario.project.claims.some(claim => claim.id === claimId)) {
		throw new Error(`Unknown preview watch claim: ${claimId}`);
	}
}

function assertStoryNode(scenario: PreviewScenario, storyNodeId: string) {
	if (!scenario.project.storyNodes.some(node => node.id === storyNodeId)) {
		throw new Error(`Unknown preview watch story node: ${storyNodeId}`);
	}
}

/** Stable identity for local Watch collections; not a generic runtime path. */
export function previewWatchId(watch: PreviewWatchDefinition): string {
	switch (watch.type) {
		case 'moment':
			return 'moment';
		case 'actual-location':
			return `actual-location:${watch.characterId}`;
		case 'knowledge':
			return `knowledge:${watch.characterId}:${watch.claimId}`;
		case 'relationship-axis':
			return `relationship-axis:${watch.fromCharacterId}:${watch.toCharacterId}:${watch.axis}`;
		case 'story-node-state':
			return `story-node-state:${watch.storyNodeId}`;
	}
}

/** Pure read projection over a sandbox scenario. It never appends actions or mutates state. */
export function inspectPreviewWatch(
	scenario: PreviewScenario,
	watch: PreviewWatchDefinition
): PreviewWatchResult {
	const project = scenario.project;
	switch (watch.type) {
		case 'moment':
			return {
				type: 'moment',
				day: project.simulation.day,
				minuteOfDay: project.simulation.minuteOfDay
			};
		case 'actual-location':
			assertCharacter(scenario, watch.characterId);
			return {
				type: 'actual-location',
				characterId: watch.characterId,
				locationId: project.simulation.actualLocationByCharacter[watch.characterId]
			};
		case 'knowledge': {
			assertCharacter(scenario, watch.characterId);
			assertClaim(scenario, watch.claimId);
			const state = project.simulation.characterKnowledge.find(
				entry =>
					entry.characterId === watch.characterId && entry.claimId === watch.claimId
			);
			return {
				type: 'knowledge',
				characterId: watch.characterId,
				claimId: watch.claimId,
				attitude: state?.attitude,
				confidence: state?.confidence,
				timesHeard: state?.timesHeard
			};
		}
		case 'relationship-axis': {
			assertCharacter(scenario, watch.fromCharacterId);
			assertCharacter(scenario, watch.toCharacterId);
			if (!watch.axis.trim()) {
				throw new RangeError('Preview relationship watch axis must not be empty.');
			}
			const relationship = project.relationships.find(
				entry =>
					entry.fromCharacterId === watch.fromCharacterId &&
					entry.toCharacterId === watch.toCharacterId
			);
			return {
				type: 'relationship-axis',
				fromCharacterId: watch.fromCharacterId,
				toCharacterId: watch.toCharacterId,
				axis: watch.axis,
				value: relationship?.values[watch.axis]
			};
		}
		case 'story-node-state': {
			assertStoryNode(scenario, watch.storyNodeId);
			const node = narrativeRuntimeStoryNodes(project).find(
				candidate => candidate.id === watch.storyNodeId
			);
			if (!node) {
				throw new Error(`Preview watch story node missing from runtime projection: ${watch.storyNodeId}`);
			}
			return {
				type: 'story-node-state',
				storyNodeId: watch.storyNodeId,
				state: node.activationState
			};
		}
	}
}
