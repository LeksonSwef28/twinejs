import {CanvasNodeInstance} from '../../domain/narrative/editor';
import {NarrativeCharacter} from '../../domain/narrative/entities';
import {NarrativeProject} from '../../domain/narrative/project';
import {StoryNodeDefinition} from '../../domain/narrative/story';

export type AuthorFocus =
	| {type: 'story-node'; id: string}
	| {type: 'character'; id: string};

export type ResolvedAuthorFocus =
	| {
			focus: Extract<AuthorFocus, {type: 'story-node'}>;
			storyNode: StoryNodeDefinition;
	  }
	| {
			focus: Extract<AuthorFocus, {type: 'character'}>;
			character: NarrativeCharacter;
	  };

export function resolveAuthorFocus(
	project: NarrativeProject,
	focus: AuthorFocus | undefined
): ResolvedAuthorFocus | undefined {
	if (!focus) {
		return undefined;
	}
	if (focus.type === 'story-node') {
		const storyNode = project.storyNodes.find(node => node.id === focus.id);
		return storyNode ? {focus, storyNode} : undefined;
	}
	const character = project.characters.find(candidate => candidate.id === focus.id);
	return character ? {focus, character} : undefined;
}

export function validateAuthorFocus(
	project: NarrativeProject,
	focus: AuthorFocus | undefined
): AuthorFocus | undefined {
	return resolveAuthorFocus(project, focus)?.focus;
}

export function authorFocusEquals(
	left: AuthorFocus | undefined,
	right: AuthorFocus | undefined
) {
	return left === right || (left?.type === right?.type && left?.id === right?.id);
}

export function canvasNodeRepresentsAuthorFocus(
	node: CanvasNodeInstance,
	focus: AuthorFocus | undefined
) {
	if (!focus || !node.entityRef || node.entityRef.id !== focus.id) {
		return false;
	}
	return focus.type === 'story-node'
		? node.entityRef.type === 'storyNode'
		: node.entityRef.type === 'character';
}
