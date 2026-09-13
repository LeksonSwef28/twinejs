import * as React from 'react';
import {
	storyCanvasViewportForNode,
	worldTimeViewportForStoryNode
} from '../../../domain/narrative/workspace-navigation';
import {useNarrativeProject} from '../../../store/narrative-project';

export const CrossWorkspaceNavigator: React.FC = () => {
	const {project, execute} = useNarrativeProject();
	const placedStoryNodes = project.storyNodes.filter(
		node =>
			node.placement?.day !== undefined &&
			node.placement.minuteOfDay !== undefined
	);
	const [storyNodeId, setStoryNodeId] = React.useState('');
	const selectedId =
		storyNodeId && project.storyNodes.some(node => node.id === storyNodeId)
			? storyNodeId
			: placedStoryNodes[0]?.id ?? project.storyNodes[0]?.id ?? '';
	const selectedNode = project.storyNodes.find(node => node.id === selectedId);
	const visual = project.editor.storyCanvas?.nodes.find(
		node =>
			node.entityRef?.type === 'storyNode' &&
			node.entityRef.id === selectedId
	);
	const worldTarget = selectedNode
		? worldTimeViewportForStoryNode(
				selectedNode,
				project.editor.worldTimeViewport?.pixelsPerHour
			)
		: undefined;

	function showInStory() {
		if (!visual) {
			return;
		}
		execute({
			type: 'editor/setStoryViewport',
			viewport: storyCanvasViewportForNode(
				visual.position,
				project.editor.storyCanvas?.viewport.zoom
			)
		});
		execute({type: 'editor/selectWorkspace', workspace: 'story'});
	}

	function showInWorldTime() {
		if (!worldTarget) {
			return;
		}
		execute({
			type: 'editor/setWorldTimeViewport',
			centerAbsoluteMinute: worldTarget.centerAbsoluteMinute,
			pixelsPerHour: worldTarget.pixelsPerHour
		});
		execute({type: 'editor/selectWorkspace', workspace: 'world-time'});
	}

	if (project.storyNodes.length === 0) {
		return null;
	}

	return (
		<div
			className="narrative-workspace__cross-nav"
			aria-label="Связь Story и World Time"
		>
			<span>STORY ↔ WORLD/TIME</span>
			<select
				aria-label="Сюжетный блок для навигации между Story и World Time"
				value={selectedId}
				onChange={event => setStoryNodeId(event.target.value)}
			>
				{project.storyNodes.map(node => (
					<option key={node.id} value={node.id}>
						{node.title}
						{node.placement?.day !== undefined &&
						node.placement.minuteOfDay !== undefined
							? ` · День ${node.placement.day}`
							: ' · без времени'}
					</option>
				))}
			</select>
			<button type="button" onClick={showInStory} disabled={!visual}>
				Показать в Story
			</button>
			<button type="button" onClick={showInWorldTime} disabled={!worldTarget}>
				Показать во времени
			</button>
		</div>
	);
};
