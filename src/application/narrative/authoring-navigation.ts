import {NarrativeProject} from '../../domain/narrative/project';
import {
	storyCanvasViewportForNode,
	worldTimeViewportForStoryNode
} from '../../domain/narrative/workspace-navigation';
import {AuthorFocus} from './author-focus';
import {NarrativeProjectCommand} from './commands';
import {
	ProjectSearchDocument,
	projectSearchNavigationTarget
} from './project-search';

export type AuthoringNavigationIntent =
	| {type: 'open-story-in-story'; storyNodeId: string}
	| {type: 'open-story-in-world-time'; storyNodeId: string}
	| {type: 'open-character-in-story'; characterId: string}
	| {type: 'open-search-document'; document: ProjectSearchDocument};

export type AuthoringNavigationCommand = Extract<
	NarrativeProjectCommand,
	{
		type:
			| 'editor/selectWorkspace'
			| 'editor/setStoryViewport'
			| 'editor/setWorldTimeViewport';
	}
>;

export type NavigationProjectionStatus =
	| {status: 'projected'}
	| {status: 'canonical-only'; reason: 'no-story-visual'}
	| {status: 'unavailable'; reason: 'unscheduled-story'}
	| {status: 'unsupported-focus-kind'}
	| {status: 'missing-target'};

export interface AuthoringNavigationPlan {
	focusTransition?: AuthorFocus;
	commands: AuthoringNavigationCommand[];
	projection: NavigationProjectionStatus;
}

export interface AuthoringNavigationOptions {
	splitView: boolean;
}

function workspaceCommand(
	project: NarrativeProject,
	workspace: 'story' | 'world-time',
	splitView: boolean
): AuthoringNavigationCommand[] {
	return !splitView && (project.editor.workspaceMode ?? 'story') !== workspace
		? [{type: 'editor/selectWorkspace', workspace}]
		: [];
}

function storyVisual(project: NarrativeProject, type: 'storyNode' | 'character', id: string) {
	return project.editor.storyCanvas?.nodes.find(
		node => node.entityRef?.type === type && node.entityRef.id === id
	);
}

function storyPlan(
	project: NarrativeProject,
	focus: AuthorFocus,
	visualType: 'storyNode' | 'character',
	options: AuthoringNavigationOptions
): AuthoringNavigationPlan {
	const visual = storyVisual(project, visualType, focus.id);
	const commands: AuthoringNavigationCommand[] = [];
	if (visual) {
		commands.push({
			type: 'editor/setStoryViewport',
			viewport: storyCanvasViewportForNode(
				visual.position,
				project.editor.storyCanvas?.viewport.zoom
			)
		});
	}
	commands.push(...workspaceCommand(project, 'story', options.splitView));
	return {
		focusTransition: focus,
		commands,
		projection: visual
			? {status: 'projected'}
			: {status: 'canonical-only', reason: 'no-story-visual'}
	};
}

function worldTimeCommands(
	project: NarrativeProject,
	centerAbsoluteMinute: number,
	options: AuthoringNavigationOptions
): AuthoringNavigationCommand[] {
	return [
		{
			type: 'editor/setWorldTimeViewport',
			centerAbsoluteMinute,
			pixelsPerHour: Math.max(
				12,
				project.editor.worldTimeViewport?.pixelsPerHour ?? 12
			)
		},
		...workspaceCommand(project, 'world-time', options.splitView)
	];
}

function planSearchNavigation(
	project: NarrativeProject,
	document: ProjectSearchDocument,
	options: AuthoringNavigationOptions
): AuthoringNavigationPlan {
	const target = projectSearchNavigationTarget(project, document);

	if (document.kind === 'story-node') {
		const node = project.storyNodes.find(candidate => candidate.id === document.id);
		if (!node) {
			return {commands: [], projection: {status: 'missing-target'}};
		}
		return storyPlan(
			project,
			{type: 'story-node', id: node.id},
			'storyNode',
			options
		);
	}

	if (document.kind === 'character') {
		const character = project.characters.find(candidate => candidate.id === document.id);
		if (!character) {
			return {commands: [], projection: {status: 'missing-target'}};
		}
		return storyPlan(
			project,
			{type: 'character', id: character.id},
			'character',
			options
		);
	}

	if (target.storyNodeId) {
		const node = project.storyNodes.find(candidate => candidate.id === target.storyNodeId);
		if (!node) {
			return {commands: [], projection: {status: 'missing-target'}};
		}
		return storyPlan(
			project,
			{type: 'story-node', id: node.id},
			'storyNode',
			options
		);
	}

	const commands: AuthoringNavigationCommand[] = [];
	if (target.workspace === 'world-time' && target.absoluteMinute !== undefined) {
		commands.push(...worldTimeCommands(project, target.absoluteMinute, options));
	} else {
		commands.push(...workspaceCommand(project, target.workspace, options.splitView));
	}
	return {
		commands,
		projection: {status: 'unsupported-focus-kind'}
	};
}

export function planAuthoringNavigation(
	project: NarrativeProject,
	intent: AuthoringNavigationIntent,
	options: AuthoringNavigationOptions
): AuthoringNavigationPlan {
	switch (intent.type) {
		case 'open-story-in-story': {
			const node = project.storyNodes.find(
				candidate => candidate.id === intent.storyNodeId
			);
			if (!node) {
				return {commands: [], projection: {status: 'missing-target'}};
			}
			return storyPlan(
				project,
				{type: 'story-node', id: node.id},
				'storyNode',
				options
			);
		}
		case 'open-character-in-story': {
			const character = project.characters.find(
				candidate => candidate.id === intent.characterId
			);
			if (!character) {
				return {commands: [], projection: {status: 'missing-target'}};
			}
			return storyPlan(
				project,
				{type: 'character', id: character.id},
				'character',
				options
			);
		}
		case 'open-story-in-world-time': {
			const node = project.storyNodes.find(
				candidate => candidate.id === intent.storyNodeId
			);
			if (!node) {
				return {commands: [], projection: {status: 'missing-target'}};
			}
			const viewport = worldTimeViewportForStoryNode(
				node,
				project.editor.worldTimeViewport?.pixelsPerHour
			);
			if (!viewport) {
				return {
					focusTransition: {type: 'story-node', id: node.id},
					commands: [],
					projection: {status: 'unavailable', reason: 'unscheduled-story'}
				};
			}
			return {
				focusTransition: {type: 'story-node', id: node.id},
				commands: [
					{type: 'editor/setWorldTimeViewport', ...viewport},
					...workspaceCommand(project, 'world-time', options.splitView)
				],
				projection: {status: 'projected'}
			};
		}
		case 'open-search-document':
			return planSearchNavigation(project, intent.document, options);
	}
}
