import {CanvasEntityReference} from '../../domain/narrative/editor';
import {NarrativeProject} from '../../domain/narrative/project';
import {StoryBrainEntityRef} from '../../domain/narrative/story-brain';
import {StoryBrainFinding} from './story-brain-query';

export interface StoryBrainDiagnosticNavigation {
	focus: StoryBrainEntityRef;
	canvasEntityRef?: CanvasEntityReference;
}

function focusExists(project: NarrativeProject, focus: StoryBrainEntityRef) {
	switch (focus.kind) {
		case 'story-node':
			return project.storyNodes.some(node => node.id === focus.id);
		case 'move':
			return project.narrativeMoves.some(move => move.id === focus.id);
		case 'claim':
			return project.claims.some(claim => claim.id === focus.id);
		case 'character':
			return project.characters.some(character => character.id === focus.id);
		case 'item':
			return project.itemInstances.some(item => item.id === focus.id);
	}
}

function canvasEntityRefForFocus(
	project: NarrativeProject,
	focus: StoryBrainEntityRef
): CanvasEntityReference | undefined {
	switch (focus.kind) {
		case 'story-node':
			return {type: 'storyNode', id: focus.id};
		case 'move': {
			const move = project.narrativeMoves.find(candidate => candidate.id === focus.id);
			return move ? {type: 'storyNode', id: move.storyNodeId} : undefined;
		}
		case 'character':
			return {type: 'character', id: focus.id};
		case 'item':
			return {type: 'item', id: focus.id};
		case 'claim':
			return undefined;
	}
}

function navigationForFocus(
	project: NarrativeProject,
	focus: StoryBrainEntityRef | undefined
): StoryBrainDiagnosticNavigation | undefined {
	if (!focus || !focusExists(project, focus)) {
		return undefined;
	}
	return {focus, canvasEntityRef: canvasEntityRefForFocus(project, focus)};
}

/**
 * Maps a read-only diagnostic to an existing authoring source. The function is
 * intentionally conservative: findings whose owner has no precise Story Brain
 * entity do not receive a fake navigation target.
 */
export function storyBrainNavigationForFinding(
	project: NarrativeProject,
	finding: StoryBrainFinding
): StoryBrainDiagnosticNavigation | undefined {
	if (finding.kind !== 'broken-authored-reference') {
		if (finding.moveId) {
			return navigationForFocus(project, {kind: 'move', id: finding.moveId});
		}
		if (finding.storyNodeId) {
			return navigationForFocus(project, {
				kind: 'story-node',
				id: finding.storyNodeId
			});
		}
		if (finding.characterId) {
			return navigationForFocus(project, {
				kind: 'character',
				id: finding.characterId
			});
		}
		return undefined;
	}

	switch (finding.ownerKind) {
		case 'story-node':
			return navigationForFocus(project, {kind: 'story-node', id: finding.ownerId});
		case 'narrative-move':
			return navigationForFocus(project, {kind: 'move', id: finding.ownerId});
		case 'claim':
			return navigationForFocus(project, {kind: 'claim', id: finding.ownerId});
		case 'character':
			return navigationForFocus(project, {kind: 'character', id: finding.ownerId});
		case 'item-instance':
			return navigationForFocus(project, {kind: 'item', id: finding.ownerId});
		default:
			return undefined;
	}
}
