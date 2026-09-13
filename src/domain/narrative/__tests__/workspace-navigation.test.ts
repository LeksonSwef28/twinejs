import {
	storyCanvasViewportForNode,
	storyNodeAbsoluteMinute,
	workspacePanelsForMode,
	worldTimeViewportForStoryNode
} from '../workspace-navigation';
import {StoryNodeDefinition} from '../story';

function node(placement?: StoryNodeDefinition['placement']): StoryNodeDefinition {
	return {
		id: 'story-node',
		kind: 'event',
		title: 'Событие',
		participantIds: [],
		activationState: 'draft',
		placement
	};
}

describe('cross-workspace navigation', () => {
	test('Split View exposes the two canonical workspaces without inventing a third mode', () => {
		expect(workspacePanelsForMode('story', false)).toEqual({
			showStory: true,
			showWorldTime: false
		});
		expect(workspacePanelsForMode('world-time', false)).toEqual({
			showStory: false,
			showWorldTime: true
		});
		expect(workspacePanelsForMode('story', true)).toEqual({
			showStory: true,
			showWorldTime: true
		});
		expect(workspacePanelsForMode('world-time', true)).toEqual({
			showStory: true,
			showWorldTime: true
		});
	});

	test('maps an exact Story placement to the same World-Time minute', () => {
		const storyNode = node({day: 12, minuteOfDay: 18 * 60 + 35});
		expect(storyNodeAbsoluteMinute(storyNode)).toBe(
			11 * 24 * 60 + 18 * 60 + 35
		);
		expect(worldTimeViewportForStoryNode(storyNode, 4)).toEqual({
			centerAbsoluteMinute: 11 * 24 * 60 + 18 * 60 + 35,
			pixelsPerHour: 12
		});
	});

	test('does not invent a World-Time target for an unscheduled Story node', () => {
		expect(storyNodeAbsoluteMinute(node())).toBeUndefined();
		expect(worldTimeViewportForStoryNode(node(), 24)).toBeUndefined();
	});

	test('centers a Story canvas node while preserving a useful zoom', () => {
		expect(storyCanvasViewportForNode({x: 100, y: 200}, 1)).toEqual({
			x: 280,
			y: 40,
			zoom: 1
		});
		expect(storyCanvasViewportForNode({x: 100, y: 200}, 0.4).zoom).toBe(0.8);
	});
});
