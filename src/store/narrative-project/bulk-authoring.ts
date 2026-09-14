import {NarrativeProject} from '../../domain/narrative/project';

export interface BulkStoryLocationAuthoringCommand {
	type: 'story/bulkSetLocation';
	storyNodeIds: string[];
	locationId?: string;
}

export type BulkStoryAuthoringCommand = BulkStoryLocationAuthoringCommand;

export function isBulkStoryAuthoringCommand(
	command: {type: string}
): command is BulkStoryAuthoringCommand {
	return command.type === 'story/bulkSetLocation';
}

function uniqueIds(ids: string[]) {
	return [...new Set(ids.filter(Boolean))];
}

/**
 * Applies a deliberately narrow bulk edit atomically. The operation changes
 * authored Story placement only, preserves day/time, and becomes one Undo step
 * in editor-authoring.ts. It never touches runtime Story state or the playhead.
 */
export function applyBulkStoryAuthoringCommand(
	project: NarrativeProject,
	command: BulkStoryAuthoringCommand
): NarrativeProject {
	const storyNodeIds = uniqueIds(command.storyNodeIds);
	if (storyNodeIds.length === 0) {
		return project;
	}
	if (
		command.locationId !== undefined &&
		!project.locations.some(location => location.id === command.locationId)
	) {
		return project;
	}
	const nodeIds = new Set(project.storyNodes.map(node => node.id));
	if (storyNodeIds.some(id => !nodeIds.has(id))) {
		return project;
	}
	const selected = new Set(storyNodeIds);
	let changed = false;
	const storyNodes = project.storyNodes.map(node => {
		if (!selected.has(node.id)) {
			return node;
		}
		if (command.locationId) {
			if (node.placement?.locationId === command.locationId) {
				return node;
			}
			changed = true;
			return {
				...node,
				placement: {...node.placement, locationId: command.locationId}
			};
		}
		if (!node.placement?.locationId) {
			return node;
		}
		changed = true;
		const placement =
			node.placement.day === undefined && node.placement.minuteOfDay === undefined
				? undefined
				: {
						day: node.placement.day,
						minuteOfDay: node.placement.minuteOfDay
				  };
		return {...node, placement};
	});

	return changed
		? {...project, storyNodes, updatedAt: new Date().toISOString()}
		: project;
}
