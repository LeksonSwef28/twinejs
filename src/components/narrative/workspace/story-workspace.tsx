import * as React from 'react';
import {CanvasNodeInstance} from '../../../domain/narrative/editor';
import {CognitionTier} from '../../../domain/narrative/entities';
import {
	analyzeStoryContinuity,
	connectedStoryNodeIds
} from '../../../domain/narrative/story-analysis';
import {StoryEdgeMode, StoryNodeKind} from '../../../domain/narrative/story';
import {minutesPerDay} from '../../../domain/narrative/calendar';
import {useNarrativeProject} from '../../../store/narrative-project';

const storyWorldWidth = 5000;
const storyWorldHeight = 3200;
const storyNodeWidth = 220;
const storyNodeHeight = 112;

const storyKindLabels: Record<StoryNodeKind, string> = {
	beat: 'Сюжетный бит',
	event: 'Событие',
	dialogue: 'Диалог',
	condition: 'Условие',
	effect: 'Последствие'
};

const edgeModeLabels: Record<StoryEdgeMode, string> = {
	reference: 'Смысловая',
	executable: 'Исполняемая'
};

type SelectedStoryEntity =
	| {type: 'character'; id: string; canvasNodeId: string}
	| {type: 'storyNode'; id: string; canvasNodeId: string}
	| {type: 'item'; id: string; canvasNodeId: string}
	| undefined;

interface DragState {
	canvasNodeId: string;
	startClientX: number;
	startClientY: number;
	originX: number;
	originY: number;
}

interface PanState {
	startClientX: number;
	startClientY: number;
	originX: number;
	originY: number;
}

function storyNodeClass(kind: StoryNodeKind) {
	return `narrative-workspace__node--${kind}`;
}

export const StoryWorkspace: React.FC = () => {
	const {project, execute, createId} = useNarrativeProject();
	const [characterName, setCharacterName] = React.useState('');
	const [cognitionTier, setCognitionTier] = React.useState<CognitionTier>('full');
	const [storyTitle, setStoryTitle] = React.useState('');
	const [storyKind, setStoryKind] = React.useState<StoryNodeKind>('beat');
	const [itemName, setItemName] = React.useState('');
	const [selectedStoryEntity, setSelectedStoryEntity] =
		React.useState<SelectedStoryEntity>();
	const [connectionSourceId, setConnectionSourceId] = React.useState<string>();
	const [connectionMode, setConnectionMode] =
		React.useState<StoryEdgeMode>('reference');
	const [dragState, setDragState] = React.useState<DragState>();
	const [panState, setPanState] = React.useState<PanState>();
	const storyViewportRef = React.useRef<HTMLDivElement>(null);

	const storyCanvas = project.editor.storyCanvas ?? {
		activeCanvasId: 'story-root',
		viewport: {x: 0, y: 0, zoom: 1},
		nodes: []
	};
	const storyViewport = storyCanvas.viewport;
	const selectedMinuteOfDay = project.editor.selectedMinuteOfDay ?? 0;
	const charactersById = React.useMemo(
		() => new Map(project.characters.map(character => [character.id, character])),
		[project.characters]
	);
	const storyNodesById = React.useMemo(
		() => new Map(project.storyNodes.map(node => [node.id, node])),
		[project.storyNodes]
	);
	const itemDefinitionsById = React.useMemo(
		() => new Map(project.itemDefinitions.map(item => [item.id, item])),
		[project.itemDefinitions]
	);
	const itemInstancesById = React.useMemo(
		() => new Map(project.itemInstances.map(item => [item.id, item])),
		[project.itemInstances]
	);
	const inspectedCharacter =
		selectedStoryEntity?.type === 'character'
			? charactersById.get(selectedStoryEntity.id)
			: undefined;
	const inspectedStoryNode =
		selectedStoryEntity?.type === 'storyNode'
			? storyNodesById.get(selectedStoryEntity.id)
			: undefined;
	const inspectedItem =
		selectedStoryEntity?.type === 'item'
			? itemInstancesById.get(selectedStoryEntity.id)
			: undefined;
	const inspectedItemDefinition = inspectedItem
		? itemDefinitionsById.get(inspectedItem.definitionId)
		: undefined;
	const continuity = React.useMemo(
		() =>
			analyzeStoryContinuity(
				project.storyNodes,
				project.storyConnections,
				project.template.dayCount
			),
		[project.storyConnections, project.storyNodes, project.template.dayCount]
	);
	const highlightedStoryIds = React.useMemo(() => {
		if (selectedStoryEntity?.type !== 'storyNode') {
			return undefined;
		}
		return connectedStoryNodeIds(
			selectedStoryEntity.id,
			project.storyConnections
		);
	}, [project.storyConnections, selectedStoryEntity]);

	React.useEffect(() => {
		if (!dragState) {
			return;
		}

		function handleMove(event: MouseEvent) {
			const zoom = storyViewport.zoom || 1;
			execute({
				type: 'editor/moveCanvasNode',
				canvasNodeId: dragState!.canvasNodeId,
				position: {
					x:
						dragState!.originX +
						(event.clientX - dragState!.startClientX) / zoom,
					y:
						dragState!.originY +
						(event.clientY - dragState!.startClientY) / zoom
				}
			});
		}

		function handleUp() {
			setDragState(undefined);
		}

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
		return () => {
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);
		};
	}, [dragState, execute, storyViewport.zoom]);

	React.useEffect(() => {
		if (!panState) {
			return;
		}

		function handleMove(event: MouseEvent) {
			execute({
				type: 'editor/setStoryViewport',
				viewport: {
					...storyViewport,
					x: panState!.originX + event.clientX - panState!.startClientX,
					y: panState!.originY + event.clientY - panState!.startClientY
				}
			});
		}

		function handleUp() {
			setPanState(undefined);
		}

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
		return () => {
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);
		};
	}, [execute, panState, storyViewport]);

	function addCharacter(event: React.FormEvent) {
		event.preventDefault();
		const name = characterName.trim();
		if (!name) {
			return;
		}
		execute({
			type: 'character/add',
			id: createId('character'),
			profileId: createId('behavior-profile'),
			name,
			cognitionTier
		});
		setCharacterName('');
	}

	function addStoryNode(event: React.FormEvent) {
		event.preventDefault();
		const title = storyTitle.trim();
		if (!title) {
			return;
		}
		const index = storyCanvas.nodes.length;
		execute({
			type: 'story/addDraftNode',
			id: createId('story-node'),
			canvasNodeId: createId('canvas-node'),
			kind: storyKind,
			title,
			position: {
				x: 180 + (index % 4) * 270,
				y: 150 + Math.floor(index / 4) * 180
			}
		});
		setStoryTitle('');
	}

	function addItemDefinition(event: React.FormEvent) {
		event.preventDefault();
		const name = itemName.trim();
		if (!name) {
			return;
		}
		execute({type: 'item/addDefinition', id: createId('item-def'), name});
		setItemName('');
	}

	function addItemInstance(definitionId: string) {
		execute({
			type: 'item/addInstance',
			id: createId('item-instance'),
			definitionId
		});
	}

	function addCanvasReference(type: 'character' | 'item', id: string) {
		const index = storyCanvas.nodes.length;
		execute({
			type: 'editor/addCanvasReference',
			canvasNodeId: createId('canvas-node'),
			entityRef: {type, id},
			position: {
				x: 120 + (index % 4) * 250,
				y: 100 + Math.floor(index / 4) * 160
			}
		});
	}

	function startNodeDrag(event: React.MouseEvent, node: CanvasNodeInstance) {
		if (event.button !== 0) {
			return;
		}
		event.stopPropagation();
		setDragState({
			canvasNodeId: node.id,
			startClientX: event.clientX,
			startClientY: event.clientY,
			originX: node.position.x,
			originY: node.position.y
		});
	}

	function selectCanvasNode(node: CanvasNodeInstance) {
		if (!node.entityRef) {
			return;
		}
		if (node.entityRef.type === 'storyNode') {
			if (connectionSourceId && connectionSourceId !== node.entityRef.id) {
				execute({
					type: 'story/connect',
					id: createId('story-connection'),
					sourceNodeId: connectionSourceId,
					targetNodeId: node.entityRef.id,
					kind: 'flow',
					mode: connectionMode,
					sourcePortId: 'flow-out',
					targetPortId: 'flow-in'
				});
				setConnectionSourceId(undefined);
			}
			setSelectedStoryEntity({
				type: 'storyNode',
				id: node.entityRef.id,
				canvasNodeId: node.id
			});
			return;
		}
		if (node.entityRef.type === 'character') {
			setSelectedStoryEntity({
				type: 'character',
				id: node.entityRef.id,
				canvasNodeId: node.id
			});
			return;
		}
		if (node.entityRef.type === 'item') {
			setSelectedStoryEntity({
				type: 'item',
				id: node.entityRef.id,
				canvasNodeId: node.id
			});
		}
	}

	function handleStoryPanStart(event: React.MouseEvent<HTMLDivElement>) {
		const target = event.target as Element;
		if (
			event.button !== 0 ||
			target.closest('.narrative-workspace__node') ||
			target.closest('.narrative-workspace__canvas-toolbar')
		) {
			return;
		}
		event.preventDefault();
		setPanState({
			startClientX: event.clientX,
			startClientY: event.clientY,
			originX: storyViewport.x,
			originY: storyViewport.y
		});
	}

	function handleStoryWheel(event: React.WheelEvent<HTMLDivElement>) {
		event.preventDefault();
		const element = storyViewportRef.current;
		if (!element) {
			return;
		}
		const rect = element.getBoundingClientRect();
		const screenX = event.clientX - rect.left;
		const screenY = event.clientY - rect.top;
		const nextZoom = Math.max(
			0.25,
			Math.min(2.5, storyViewport.zoom * Math.exp(-event.deltaY * 0.0015))
		);
		const worldX = (screenX - storyViewport.x) / storyViewport.zoom;
		const worldY = (screenY - storyViewport.y) / storyViewport.zoom;
		execute({
			type: 'editor/setStoryViewport',
			viewport: {
				x: screenX - worldX * nextZoom,
				y: screenY - worldY * nextZoom,
				zoom: nextZoom
			}
		});
	}

	function resetStoryViewport() {
		execute({
			type: 'editor/setStoryViewport',
			viewport: {x: 0, y: 0, zoom: 1}
		});
	}

	function placeSelectedStoryNodeNow() {
		if (!inspectedStoryNode) {
			return;
		}
		execute({
			type: 'story/setPlacement',
			id: inspectedStoryNode.id,
			placement: {
				...inspectedStoryNode.placement,
				day: project.editor.selectedDay,
				minuteOfDay: selectedMinuteOfDay
			}
		});
	}

	function openSelectedStoryNodeInWorldTime() {
		const placement = inspectedStoryNode?.placement;
		if (placement?.day === undefined || placement.minuteOfDay === undefined) {
			return;
		}
		const centerAbsoluteMinute =
			(placement.day - 1) * minutesPerDay + placement.minuteOfDay;
		execute({
			type: 'editor/setWorldTimeViewport',
			centerAbsoluteMinute,
			pixelsPerHour: Math.max(
				12,
				project.editor.worldTimeViewport?.pixelsPerHour ?? 12
			)
		});
		execute({type: 'editor/selectWorkspace', workspace: 'world-time'});
	}

	const visualNodeByStoryId = new Map<string, CanvasNodeInstance>();
	for (const node of storyCanvas.nodes) {
		if (
			node.entityRef?.type === 'storyNode' &&
			!visualNodeByStoryId.has(node.entityRef.id)
		) {
			visualNodeByStoryId.set(node.entityRef.id, node);
		}
	}

	return (
		<div className="narrative-workspace__studio">
			<aside
				className="narrative-workspace__library"
				aria-label="Project Library истории"
			>
				<div className="narrative-workspace__panel-heading">
					<span>PROJECT LIBRARY</span>
					<small>источник сущностей</small>
				</div>

				<details open>
					<summary>
						Сюжет <span>{project.storyNodes.length}</span>
					</summary>
					<form
						onSubmit={addStoryNode}
						className="narrative-workspace__compact-form"
					>
						<select
							aria-label="Тип сюжетного блока"
							value={storyKind}
							onChange={event =>
								setStoryKind(event.target.value as StoryNodeKind)
							}
						>
							{Object.entries(storyKindLabels).map(([kind, label]) => (
								<option key={kind} value={kind}>
									{label}
								</option>
							))}
						</select>
						<input
							aria-label="Название сюжетного блока"
							value={storyTitle}
							placeholder="Например: Катя узнаёт правду"
							onChange={event => setStoryTitle(event.target.value)}
						/>
						<button type="submit">+ На доску</button>
					</form>
				</details>

				<details open>
					<summary>
						Персонажи <span>{project.characters.length}</span>
					</summary>
					<form
						onSubmit={addCharacter}
						className="narrative-workspace__compact-form"
					>
						<input
							aria-label="Имя нового персонажа"
							value={characterName}
							placeholder="Например: Катя"
							onChange={event => setCharacterName(event.target.value)}
						/>
						<select
							aria-label="Уровень симуляции персонажа"
							value={cognitionTier}
							onChange={event =>
								setCognitionTier(event.target.value as CognitionTier)
							}
						>
							<option value="full">Полная модель</option>
							<option value="light">Упрощённая</option>
							<option value="background">Фоновая</option>
						</select>
						<button type="submit">+ Персонаж</button>
					</form>
					<div className="narrative-workspace__entity-list">
						{project.characters.map(character => (
							<div key={character.id}>
								<span>{character.name}</span>
								<button
									type="button"
									onClick={() => addCanvasReference('character', character.id)}
								>
									На доску
								</button>
							</div>
						))}
					</div>
				</details>

				<details>
					<summary>
						Предметы <span>{project.itemInstances.length}</span>
					</summary>
					<form
						onSubmit={addItemDefinition}
						className="narrative-workspace__compact-form"
					>
						<input
							aria-label="Название типа предмета"
							value={itemName}
							placeholder="Например: Ключ от комнаты"
							onChange={event => setItemName(event.target.value)}
						/>
						<button type="submit">+ Тип предмета</button>
					</form>
					<div className="narrative-workspace__entity-list">
						{project.itemDefinitions.map(definition => {
							const instances = project.itemInstances.filter(
								instance => instance.definitionId === definition.id
							);
							return (
								<div key={definition.id} className="narrative-workspace__item-library-entry">
									<span>
										{definition.name} · {instances.length} шт.
									</span>
									<button
										type="button"
										onClick={() => addItemInstance(definition.id)}
									>
										+ экземпляр
									</button>
									{instances.map((instance, index) => (
										<button
											key={instance.id}
											type="button"
											onClick={() => addCanvasReference('item', instance.id)}
										>
											#{index + 1} на доску
										</button>
									))}
								</div>
							);
						})}
					</div>
				</details>

				<div className="narrative-workspace__library-row">
					<span>Факты / знания</span>
					<small>раздельные модели — следующий слой</small>
				</div>
			</aside>

			<div
				className="narrative-workspace__canvas-shell"
				role="region"
				aria-label="Story Canvas"
			>
				<div className="narrative-workspace__breadcrumbs">
					История <span>›</span> Главная доска
					{connectionSourceId && (
						<strong>
							{' '}· {edgeModeLabels[connectionMode]} связь · выбери следующий блок
						</strong>
					)}
				</div>
				<div
					ref={storyViewportRef}
					className="narrative-workspace__canvas"
					onWheel={handleStoryWheel}
					onMouseDown={handleStoryPanStart}
				>
					<div
						className="narrative-workspace__canvas-world"
						style={{
							width: storyWorldWidth,
							height: storyWorldHeight,
							transform: `translate(${storyViewport.x}px, ${storyViewport.y}px) scale(${storyViewport.zoom})`
						}}
					>
						<svg
							className="narrative-workspace__connections"
							width={storyWorldWidth}
							height={storyWorldHeight}
							aria-hidden="true"
						>
							{project.storyConnections.map(connection => {
								const source = visualNodeByStoryId.get(connection.sourceNodeId);
								const target = visualNodeByStoryId.get(connection.targetNodeId);
								if (!source || !target) {
									return null;
								}
								const sourceX = source.position.x + storyNodeWidth;
								const sourceY = source.position.y + storyNodeHeight / 2;
								const targetX = target.position.x;
								const targetY = target.position.y + storyNodeHeight / 2;
								const bend = Math.max(
									60,
									Math.abs(targetX - sourceX) * 0.45
								);
								const dimmed =
									highlightedStoryIds !== undefined &&
									(!highlightedStoryIds.has(connection.sourceNodeId) ||
										!highlightedStoryIds.has(connection.targetNodeId));
								return (
									<path
										key={connection.id}
										className={`narrative-workspace__connection is-${connection.kind} is-${connection.mode}${dimmed ? ' is-dimmed' : ' is-highlighted'}`}
										d={`M ${sourceX} ${sourceY} C ${sourceX + bend} ${sourceY}, ${targetX - bend} ${targetY}, ${targetX} ${targetY}`}
									/>
								);
							})}
						</svg>

						{storyCanvas.nodes.map(node => {
							const character =
								node.entityRef?.type === 'character'
									? charactersById.get(node.entityRef.id)
									: undefined;
							const storyNode =
								node.entityRef?.type === 'storyNode'
									? storyNodesById.get(node.entityRef.id)
									: undefined;
							const itemInstance =
								node.entityRef?.type === 'item'
									? itemInstancesById.get(node.entityRef.id)
									: undefined;
							const itemDefinition = itemInstance
								? itemDefinitionsById.get(itemInstance.definitionId)
								: undefined;
							if (!character && !storyNode && !itemInstance && !node.title) {
								return null;
							}
							const isSelected = selectedStoryEntity?.canvasNodeId === node.id;
							const dimmed =
								highlightedStoryIds !== undefined &&
								(!storyNode || !highlightedStoryIds.has(storyNode.id));
							return (
								<button
									key={node.id}
									type="button"
									className={`narrative-workspace__node ${storyNode ? storyNodeClass(storyNode.kind) : itemInstance ? 'narrative-workspace__node--item' : 'narrative-workspace__node--character'}${isSelected ? ' is-selected' : ''}${connectionSourceId === storyNode?.id ? ' is-connecting' : ''}${dimmed ? ' is-dimmed' : ''}`}
									style={{
										left: node.position.x,
										top: node.position.y,
										width: storyNodeWidth,
										minHeight: storyNodeHeight
									}}
									onMouseDown={event => startNodeDrag(event, node)}
									onClick={event => {
										event.stopPropagation();
										selectCanvasNode(node);
									}}
								>
									<span className="narrative-workspace__node-kind">
										{storyNode
											? storyKindLabels[storyNode.kind]
											: itemInstance
												? 'ITEM INSTANCE'
												: 'PERSONA REFERENCE'}
									</span>
									<strong>
										{storyNode?.title ??
											itemDefinition?.name ??
											character?.name ??
											node.title}
									</strong>
									<small>
										{storyNode
											? storyNode.placement?.day !== undefined
												? `День ${storyNode.placement.day}`
												: 'без времени и места'
											: itemInstance
												? 'индивидуальный предмет'
												: 'ссылка на персонажа'}
									</small>
									<i className="narrative-workspace__port narrative-workspace__port--left" />
									<i className="narrative-workspace__port narrative-workspace__port--right" />
								</button>
							);
						})}
					</div>

					{storyCanvas.nodes.length === 0 && (
						<div className="narrative-workspace__canvas-empty">
							<strong>Story Canvas</strong>
							<p>
								Создавай сюжетные блоки слева. Они могут существовать без дня
								 и локации, пока ты только ищешь форму истории.
							</p>
						</div>
					)}

					<div className="narrative-workspace__canvas-toolbar">
						<button
							type="button"
							onClick={() =>
								execute({
									type: 'editor/setStoryViewport',
									viewport: {
										...storyViewport,
										zoom: storyViewport.zoom / 1.25
									}
								})
							}
						>
							−
						</button>
						<span>{Math.round(storyViewport.zoom * 100)}%</span>
						<button
							type="button"
							onClick={() =>
								execute({
									type: 'editor/setStoryViewport',
									viewport: {
										...storyViewport,
										zoom: storyViewport.zoom * 1.25
									}
								})
							}
						>
							+
						</button>
						<button type="button" onClick={resetStoryViewport}>
							100% / центр
						</button>
					</div>
				</div>
			</div>

			<aside
				className="narrative-workspace__inspector"
				aria-label="Инспектор истории"
			>
				<div className="narrative-workspace__panel-heading">
					<span>INSPECTOR</span>
					<small>story</small>
				</div>
				{inspectedStoryNode ? (
					<div className="narrative-workspace__inspection">
						<span className="narrative-workspace__node-kind">
							{storyKindLabels[inspectedStoryNode.kind]}
						</span>
						<h2>{inspectedStoryNode.title}</h2>
						<p>
							{inspectedStoryNode.placement?.day !== undefined
								? `Привязано: День ${inspectedStoryNode.placement.day}${inspectedStoryNode.placement.minuteOfDay !== undefined ? ` · ${Math.floor(inspectedStoryNode.placement.minuteOfDay / 60).toString().padStart(2, '0')}:${(inspectedStoryNode.placement.minuteOfDay % 60).toString().padStart(2, '0')}` : ''}`
								: 'Черновик: день, время и локацию можно назначить позже.'}
						</p>
						<div className="narrative-workspace__placement-controls">
							<button type="button" onClick={placeSelectedStoryNodeNow}>
								Привязать к текущему времени
							</button>
							<select
								aria-label="Локация сюжетного блока"
								value={inspectedStoryNode.placement?.locationId ?? ''}
								onChange={event =>
									execute({
										type: 'story/setPlacement',
										id: inspectedStoryNode.id,
										placement: {
											...inspectedStoryNode.placement,
											locationId: event.target.value || undefined
										}
									})
								}
							>
								<option value="">Без локации</option>
								{project.locations.map(location => (
									<option key={location.id} value={location.id}>
										{location.name}
									</option>
								))}
							</select>
							{inspectedStoryNode.placement?.day !== undefined &&
								inspectedStoryNode.placement.minuteOfDay !== undefined && (
									<button
										type="button"
										onClick={openSelectedStoryNodeInWorldTime}
									>
										Показать во «Время и мир»
									</button>
								)}
							{inspectedStoryNode.placement && (
								<button
									type="button"
									onClick={() =>
										execute({
											type: 'story/setPlacement',
											id: inspectedStoryNode.id,
											placement: undefined
										})
									}
								>
									Сделать черновиком без времени
								</button>
							)}
						</div>
						<div className="narrative-workspace__edge-mode-controls">
							<span>Новая связь</span>
							<div>
								{(['reference', 'executable'] as StoryEdgeMode[]).map(mode => (
									<button
										key={mode}
										type="button"
										className={connectionMode === mode ? 'is-active' : undefined}
										onClick={() => setConnectionMode(mode)}
									>
										{edgeModeLabels[mode]}
									</button>
								))}
							</div>
							<small>
								Смысловая линия ничего не исполняет. Исполняемая участвует в
								 причинной логике Story и Continuity.
							</small>
						</div>
						<div className="narrative-workspace__inspection-actions">
							<button
								type="button"
								className={
									connectionSourceId === inspectedStoryNode.id
										? 'is-active'
										: undefined
								}
								onClick={() =>
									setConnectionSourceId(
										connectionSourceId === inspectedStoryNode.id
											? undefined
											: inspectedStoryNode.id
									)
								}
							>
								{connectionSourceId === inspectedStoryNode.id
									? 'Отменить связь'
									: 'Связать дальше'}
							</button>
							<button
								type="button"
								onClick={() => {
									execute({
										type: 'story/removeNode',
										id: inspectedStoryNode.id
									});
									setSelectedStoryEntity(undefined);
								}}
							>
								Удалить блок
							</button>
						</div>
					</div>
				) : inspectedCharacter ? (
					<div className="narrative-workspace__inspection">
						<span className="narrative-workspace__node-kind">CHARACTER</span>
						<h2>{inspectedCharacter.name}</h2>
						<p>
							На доске это визуальная ссылка. Сам персонаж живёт в Project
							 Library и может появляться на нескольких canvas.
						</p>
						<button
							type="button"
							onClick={() => {
								execute({
									type: 'editor/removeCanvasNode',
									canvasNodeId: selectedStoryEntity!.canvasNodeId
								});
								setSelectedStoryEntity(undefined);
							}}
						>
							Убрать с доски
						</button>
					</div>
				) : inspectedItem ? (
					<div className="narrative-workspace__inspection">
						<span className="narrative-workspace__node-kind">ITEM INSTANCE</span>
						<h2>{inspectedItemDefinition?.name ?? 'Предмет'}</h2>
						<p>
							Это конкретный физический экземпляр. Его положение в мире не
							 смешивается с определением типа предмета.
						</p>
						<button
							type="button"
							onClick={() => {
								execute({
									type: 'editor/removeCanvasNode',
									canvasNodeId: selectedStoryEntity!.canvasNodeId
								});
								setSelectedStoryEntity(undefined);
							}}
						>
							Убрать с доски
						</button>
					</div>
				) : (
					<div className="narrative-workspace__inspection narrative-workspace__inspection--empty">
						<strong>Выбери ноду</strong>
						<p>
							Drag двигает ноды, колесо масштабирует, drag по пустому месту
							 перемещает canvas. Выбор сюжетной ноды подсвечивает всю её
							 связанную цепочку.
						</p>
					</div>
				)}

				<div className="narrative-workspace__continuity">
					<strong>Continuity</strong>
					<div>
						<span>Без исполняемых связей</span>
						<b>{continuity.isolatedNodeIds.length}</b>
					</div>
					<div>
						<span>Без времени</span>
						<b>{continuity.unscheduledNodeIds.length}</b>
					</div>
					<div>
						<span>Концы веток</span>
						<b>{continuity.terminalNodeIds.length}</b>
					</div>
					{continuity.earlyTerminalNodeIds.length > 0 && (
						<p>
							⚠ {continuity.earlyTerminalNodeIds.length} размещённых веток
							 заканчиваются раньше 93-го дня и пока не имеют продолжения.
						</p>
					)}
				</div>

				<div className="narrative-workspace__stats">
					<div>
						<span>Сюжетные блоки</span>
						<strong>{project.storyNodes.length}</strong>
					</div>
					<div>
						<span>Связи</span>
						<strong>{project.storyConnections.length}</strong>
					</div>
					<div>
						<span>Предметы</span>
						<strong>{project.itemInstances.length}</strong>
					</div>
				</div>
			</aside>
		</div>
	);
};
