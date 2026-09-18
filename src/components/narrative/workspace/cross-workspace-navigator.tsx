import * as React from 'react';
import {PreviewFromHereFocus} from '../../../application/narrative/preview-from-here';
import {formatMinuteOfDay} from '../../../domain/narrative/calendar';
import {
	storyCanvasViewportForNode,
	storyNodesForCharacter,
	storyNodesForLocation,
	storyWorldNavigationContext,
	worldTimeViewportForStoryNode
} from '../../../domain/narrative/workspace-navigation';
import {useNarrativeProject} from '../../../store/narrative-project';

export interface CrossWorkspaceNavigatorProps {
	splitView?: boolean;
	onPreviewFromHere?(focus: PreviewFromHereFocus): void;
}

export const CrossWorkspaceNavigator: React.FC<CrossWorkspaceNavigatorProps> = ({
	splitView = false,
	onPreviewFromHere
}) => {
	const {project, execute} = useNarrativeProject();
	const [storyNodeId, setStoryNodeId] = React.useState('');
	const [locationFilterId, setLocationFilterId] = React.useState('');
	const [characterFilterId, setCharacterFilterId] = React.useState('');
	const nodesForLocation = locationFilterId
		? storyNodesForLocation(project.storyNodes, locationFilterId)
		: project.storyNodes;
	const nodesForCharacter = characterFilterId
		? storyNodesForCharacter(
				project.storyNodes,
				project.narrativeMoves,
				characterFilterId
			)
		: project.storyNodes;
	const locationIds = new Set(nodesForLocation.map(node => node.id));
	const characterIds = new Set(nodesForCharacter.map(node => node.id));
	const filteredNodes = project.storyNodes.filter(
		node => locationIds.has(node.id) && characterIds.has(node.id)
	);
	const selectedId =
		storyNodeId && filteredNodes.some(node => node.id === storyNodeId)
			? storyNodeId
			: filteredNodes[0]?.id ?? '';
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
	const context = selectedNode
		? storyWorldNavigationContext(
				selectedNode,
				project.narrativeMoves,
				project.simulation.actualLocationByCharacter,
				{
					day: project.simulation.day,
					minuteOfDay: project.simulation.minuteOfDay
				}
			)
		: undefined;
	const locationsById = new Map(project.locations.map(location => [location.id, location]));
	const charactersById = new Map(
		project.characters.map(character => [character.id, character])
	);

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
		if (!splitView) {
			execute({type: 'editor/selectWorkspace', workspace: 'story'});
		}
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
		if (!splitView) {
			execute({type: 'editor/selectWorkspace', workspace: 'world-time'});
		}
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
				aria-label="Фильтр Story по локации"
				value={locationFilterId}
				onChange={event => {
					setLocationFilterId(event.target.value);
					setStoryNodeId('');
				}}
			>
				<option value="">Все локации</option>
				{project.locations.map(location => (
					<option key={location.id} value={location.id}>
						{location.name}
					</option>
				))}
			</select>
			<select
				aria-label="Фильтр Story по персонажу"
				value={characterFilterId}
				onChange={event => {
					setCharacterFilterId(event.target.value);
					setStoryNodeId('');
				}}
			>
				<option value="">Все персонажи</option>
				{project.characters.map(character => (
					<option key={character.id} value={character.id}>
						{character.name}
					</option>
				))}
			</select>
			<select
				aria-label="Сюжетный блок для навигации между Story и World Time"
				value={selectedId}
				onChange={event => setStoryNodeId(event.target.value)}
				disabled={filteredNodes.length === 0}
			>
				{filteredNodes.length === 0 ? (
					<option value="">Нет Story в этом контексте</option>
				) : (
					filteredNodes.map(node => (
						<option key={node.id} value={node.id}>
							{node.title}
							{node.placement?.day !== undefined &&
							node.placement.minuteOfDay !== undefined
								? ` · День ${node.placement.day} ${formatMinuteOfDay(
										node.placement.minuteOfDay
									)}`
								: ' · без времени'}
						</option>
					))
				)}
			</select>
			<button type="button" onClick={showInStory} disabled={!visual}>
				Показать в Story
			</button>
			<button type="button" onClick={showInWorldTime} disabled={!worldTarget}>
				Показать во времени
			</button>
			{onPreviewFromHere && (
				<button
					type="button"
					disabled={!selectedNode}
					onClick={() =>
						selectedNode &&
						onPreviewFromHere({
							type: 'story-node',
							storyNodeId: selectedNode.id
						})
					}
				>
					Preview from here
				</button>
			)}

			{selectedNode && context && (
				<div className="narrative-workspace__cross-nav-context">
					<strong>{selectedNode.title}</strong>
					<span>
						Authored: {' '}
						{selectedNode.placement?.day !== undefined &&
						selectedNode.placement.minuteOfDay !== undefined
							? `День ${selectedNode.placement.day} · ${formatMinuteOfDay(
									selectedNode.placement.minuteOfDay
								)}`
							: 'время не задано'}
						{' · '}
						{context.authoredLocationId
							? locationsById.get(context.authoredLocationId)?.name ??
								context.authoredLocationId
							: 'локация не задана'}
					</span>
					<span>
						Участники: {' '}
						{context.participantIds.length > 0
							? context.participantIds
									.map(id => charactersById.get(id)?.name ?? id)
									.join(', ')
							: 'не заданы'}
						{' · '}Moves: {context.moveIds.length}
					</span>
					<span>
						Simulation Playhead: День {project.simulation.day} ·{' '}
						{formatMinuteOfDay(project.simulation.minuteOfDay)}. {' '}
						{context.actualPresenceComparableToStoryMoment
							? 'Можно сравнивать actual presence с authored placement.'
							: 'Actual presence относится к другому моменту и не подменяет authored placement.'}
					</span>
					{context.actualPresenceComparableToStoryMoment &&
						context.participants.length > 0 && (
							<span>
								Actual: {' '}
								{context.participants
									.map(participant => {
										const name =
											charactersById.get(participant.characterId)?.name ??
											participant.characterId;
										if (participant.presenceRelation === 'same-location') {
											return `${name}: на месте`;
										}
										if (participant.presenceRelation === 'different-location') {
											return `${name}: ${
												locationsById.get(participant.actualLocationId ?? '')?.name ??
												'в другом месте'
											}`;
										}
										return `${name}: неизвестно`;
									})
									.join(' · ')}
							</span>
						)}
				</div>
			)}
		</div>
	);
};
