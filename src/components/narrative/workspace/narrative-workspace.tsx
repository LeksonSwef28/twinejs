import * as React from 'react';
import {
	formatMinuteOfDay,
	minutesPerDay,
	weekdayForDay
} from '../../../domain/narrative/calendar';
import {CanvasNodeInstance} from '../../../domain/narrative/editor';
import {CognitionTier} from '../../../domain/narrative/entities';
import {NarrativeWorkspaceMode} from '../../../domain/narrative/project';
import {StoryNodeKind} from '../../../domain/narrative/story';
import {
	clampWorldTimeScale,
	routineWindowForDay,
	timelineTickStepMinutes,
	visibleAbsoluteMinuteRange
} from '../../../domain/narrative/world-time';
import {useNarrativeProject} from '../../../store/narrative-project';
import './narrative-workspace.css';

const weekdayLabels = {
	monday: 'Пн',
	tuesday: 'Вт',
	wednesday: 'Ср',
	thursday: 'Чт',
	friday: 'Пт',
	saturday: 'Сб',
	sunday: 'Вс'
};

const minuteStep = 5;
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

type SelectedStoryEntity =
	| {type: 'character'; id: string; canvasNodeId: string}
	| {type: 'storyNode'; id: string; canvasNodeId: string}
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

interface WorldPanState {
	startClientX: number;
	originCenterMinute: number;
	pixelsPerHour: number;
}

function absoluteMinuteLabel(absoluteMinute: number) {
	const day = Math.floor(Math.max(0, absoluteMinute) / minutesPerDay) + 1;
	const minuteOfDay = Math.floor(Math.max(0, absoluteMinute) % minutesPerDay);
	return `Д${day} ${formatMinuteOfDay(minuteOfDay)}`;
}

function storyNodeClass(kind: StoryNodeKind) {
	return `narrative-workspace__node--${kind}`;
}

export const NarrativeWorkspace: React.FC = () => {
	const {project, execute, undo, redo, canUndo, canRedo, saveStatus, createId} =
		useNarrativeProject();
	const [locationName, setLocationName] = React.useState('');
	const [characterName, setCharacterName] = React.useState('');
	const [cognitionTier, setCognitionTier] = React.useState<CognitionTier>('full');
	const [storyTitle, setStoryTitle] = React.useState('');
	const [storyKind, setStoryKind] = React.useState<StoryNodeKind>('beat');
	const [selectedStoryEntity, setSelectedStoryEntity] =
		React.useState<SelectedStoryEntity>();
	const [connectionSourceId, setConnectionSourceId] = React.useState<string>();
	const [dragState, setDragState] = React.useState<DragState>();
	const [panState, setPanState] = React.useState<PanState>();
	const [worldPanState, setWorldPanState] = React.useState<WorldPanState>();
	const [worldViewportSize, setWorldViewportSize] = React.useState({
		width: 900,
		height: 500
	});
	const storyViewportRef = React.useRef<HTMLDivElement>(null);
	const worldViewportRef = React.useRef<HTMLDivElement>(null);

	const selectedPeriod =
		project.template.periods.find(
			period => period.id === project.editor.selectedPeriodId
		) ?? project.template.periods[0];
	const selectedMinuteOfDay =
		project.editor.selectedMinuteOfDay ?? selectedPeriod?.startMinute ?? 0;
	const workspaceMode: NarrativeWorkspaceMode =
		project.editor.workspaceMode ?? 'story';
	const weekday = weekdayForDay(
		project.editor.selectedDay,
		project.template.day1Weekday
	);
	const absoluteMinute =
		(project.editor.selectedDay - 1) * minutesPerDay + selectedMinuteOfDay;
	const totalMinutes = project.template.dayCount * minutesPerDay;
	const maximumAbsoluteMinute = totalMinutes - 1;
	const storyCanvas = project.editor.storyCanvas ?? {
		activeCanvasId: 'story-root',
		viewport: {x: 0, y: 0, zoom: 1},
		nodes: []
	};
	const storyViewport = storyCanvas.viewport;
	const worldTimeViewport = project.editor.worldTimeViewport ?? {
		centerAbsoluteMinute: absoluteMinute,
		pixelsPerHour: 0.4,
		scrollY: 0
	};
	const inspectedCharacter =
		selectedStoryEntity?.type === 'character'
			? project.characters.find(
					character => character.id === selectedStoryEntity.id
			  )
			: undefined;
	const inspectedStoryNode =
		selectedStoryEntity?.type === 'storyNode'
			? project.storyNodes.find(node => node.id === selectedStoryEntity.id)
			: undefined;
	const viewMatchesSimulationPlayhead =
		project.simulation.day === project.editor.selectedDay &&
		project.simulation.minuteOfDay === selectedMinuteOfDay;
	const charactersById = React.useMemo(
		() => new Map(project.characters.map(character => [character.id, character])),
		[project.characters]
	);
	const storyNodesById = React.useMemo(
		() => new Map(project.storyNodes.map(node => [node.id, node])),
		[project.storyNodes]
	);

	React.useEffect(() => {
		function measureWorldViewport() {
			const element = worldViewportRef.current;
			if (!element) {
				return;
			}
			const rect = element.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				setWorldViewportSize({width: rect.width, height: rect.height});
			}
		}

		measureWorldViewport();
		window.addEventListener('resize', measureWorldViewport);
		return () => window.removeEventListener('resize', measureWorldViewport);
	}, [workspaceMode]);

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

	React.useEffect(() => {
		if (!worldPanState) {
			return;
		}

		function handleMove(event: MouseEvent) {
			const deltaMinutes =
				-((event.clientX - worldPanState!.startClientX) * 60) /
				worldPanState!.pixelsPerHour;
			execute({
				type: 'editor/setWorldTimeViewport',
				centerAbsoluteMinute:
					worldPanState!.originCenterMinute + deltaMinutes,
				pixelsPerHour: worldPanState!.pixelsPerHour,
				viewportWidth: worldViewportSize.width,
				viewportHeight: worldViewportSize.height
			});
		}

		function handleUp() {
			setWorldPanState(undefined);
		}

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
		return () => {
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);
		};
	}, [execute, worldPanState, worldViewportSize]);

	function addLocation(event: React.FormEvent) {
		event.preventDefault();
		const name = locationName.trim();
		if (!name) {
			return;
		}
		execute({type: 'location/add', id: createId('location'), name});
		setLocationName('');
	}

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

	function addCharacterReference(characterId: string) {
		const index = storyCanvas.nodes.length;
		execute({
			type: 'editor/addCanvasReference',
			canvasNodeId: createId('canvas-node'),
			entityRef: {type: 'character', id: characterId},
			position: {
				x: 120 + (index % 4) * 250,
				y: 100 + Math.floor(index / 4) * 160
			}
		});
	}

	function selectWorkspace(workspace: NarrativeWorkspaceMode) {
		execute({type: 'editor/selectWorkspace', workspace});
	}

	function moveMoment(deltaMinutes: number) {
		const nextAbsoluteMinute = Math.max(
			0,
			Math.min(maximumAbsoluteMinute, absoluteMinute + deltaMinutes)
		);
		const day = Math.floor(nextAbsoluteMinute / minutesPerDay) + 1;
		const minuteOfDay = nextAbsoluteMinute % minutesPerDay;
		execute({type: 'editor/selectMoment', day, minuteOfDay});
	}

	function jumpToSimulationPlayhead() {
		const simulationAbsoluteMinute =
			(project.simulation.day - 1) * minutesPerDay +
			project.simulation.minuteOfDay;
		execute({
			type: 'editor/setWorldTimeViewport',
			centerAbsoluteMinute: simulationAbsoluteMinute,
			pixelsPerHour: worldTimeViewport.pixelsPerHour,
			viewportWidth: worldViewportSize.width,
			viewportHeight: worldViewportSize.height
		});
	}

	function startNodeDrag(
		event: React.MouseEvent,
		node: CanvasNodeInstance
	) {
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

	function handleWorldWheel(event: React.WheelEvent<HTMLDivElement>) {
		event.preventDefault();
		const element = worldViewportRef.current;
		if (!element) {
			return;
		}
		const rect = element.getBoundingClientRect();
		const width = Math.max(1, rect.width);
		const height = Math.max(1, rect.height);
		const currentScale = worldTimeViewport.pixelsPerHour;
		const range = visibleAbsoluteMinuteRange(
			worldTimeViewport.centerAbsoluteMinute,
			currentScale,
			width,
			totalMinutes
		);
		const cursorX = Math.max(0, Math.min(width, event.clientX - rect.left));
		const currentPixelsPerMinute = currentScale / 60;
		const pointerAbsoluteMinute =
			range.start + cursorX / currentPixelsPerMinute;
		const nextScale = clampWorldTimeScale(
			currentScale * Math.exp(-event.deltaY * 0.0015)
		);
		const nextVisibleMinutes = (width * 60) / nextScale;
		const cursorRatio = cursorX / width;
		const nextCenter =
			pointerAbsoluteMinute + (0.5 - cursorRatio) * nextVisibleMinutes;

		execute({
			type: 'editor/setWorldTimeViewport',
			centerAbsoluteMinute: nextCenter,
			pixelsPerHour: nextScale,
			viewportWidth: width,
			viewportHeight: height
		});
	}

	function handleWorldPanStart(event: React.MouseEvent<HTMLDivElement>) {
		const target = event.target as Element;
		if (
			event.button !== 0 ||
			target.closest('button') ||
			target.closest('.narrative-workspace__schedule-block')
		) {
			return;
		}
		event.preventDefault();
		setWorldPanState({
			startClientX: event.clientX,
			originCenterMinute: worldTimeViewport.centerAbsoluteMinute,
			pixelsPerHour: worldTimeViewport.pixelsPerHour
		});
	}

	function zoomWorld(multiplier: number) {
		execute({
			type: 'editor/setWorldTimeViewport',
			centerAbsoluteMinute: worldTimeViewport.centerAbsoluteMinute,
			pixelsPerHour: clampWorldTimeScale(
				worldTimeViewport.pixelsPerHour * multiplier
			),
			viewportWidth: worldViewportSize.width,
			viewportHeight: worldViewportSize.height
		});
	}

	function fitWorldTime() {
		const fittedPixelsPerHour =
			worldViewportSize.width / (project.template.dayCount * 24);
		execute({
			type: 'editor/setWorldTimeViewport',
			centerAbsoluteMinute: totalMinutes / 2,
			pixelsPerHour: clampWorldTimeScale(fittedPixelsPerHour),
			viewportWidth: worldViewportSize.width,
			viewportHeight: worldViewportSize.height
		});
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

	const worldRange = visibleAbsoluteMinuteRange(
		worldTimeViewport.centerAbsoluteMinute,
		worldTimeViewport.pixelsPerHour,
		worldViewportSize.width,
		totalMinutes
	);
	const worldPixelsPerMinute = worldTimeViewport.pixelsPerHour / 60;
	const worldX = (minute: number) =>
		(minute - worldRange.start) * worldPixelsPerMinute;
	const tickStep = timelineTickStepMinutes(worldTimeViewport.pixelsPerHour);
	const ticks: number[] = [];
	let tick = Math.ceil(worldRange.start / tickStep) * tickStep;
	while (tick <= worldRange.end && ticks.length < 500) {
		ticks.push(tick);
		tick += tickStep;
	}
	const firstVisibleDay = Math.max(
		1,
		Math.floor(worldRange.start / minutesPerDay) + 1
	);
	const lastVisibleDay = Math.min(
		project.template.dayCount,
		Math.floor(Math.max(worldRange.start, worldRange.end - 1) / minutesPerDay) +
			1
	);
	const visibleDays = Array.from(
		{length: Math.max(0, lastVisibleDay - firstVisibleDay + 1)},
		(_, index) => firstVisibleDay + index
	);
	const simulationAbsoluteMinute =
		(project.simulation.day - 1) * minutesPerDay +
		project.simulation.minuteOfDay;
	const simulationVisible =
		simulationAbsoluteMinute >= worldRange.start &&
		simulationAbsoluteMinute <= worldRange.end;
	const cursorVisible =
		worldTimeViewport.centerAbsoluteMinute >= worldRange.start &&
		worldTimeViewport.centerAbsoluteMinute <= worldRange.end;

	return (
		<section className="narrative-workspace">
			<header className="narrative-workspace__header">
				<div>
					<p className="narrative-workspace__eyebrow">
						93 Days · Narrative Editor
					</p>
					<h1>{project.name}</h1>
					<p className="narrative-workspace__meta">
						{project.template.dayCount} дней · точность времени {minuteStep} мин ·
						 переходное окно{' '}
						{project.template.presenceTransition.defaultTransitionWindowMinutes} мин
					</p>
				</div>
				<div className="narrative-workspace__actions">
					<span
						className={`narrative-workspace__save-status is-${saveStatus}`}
					>
						{saveStatus === 'saved'
							? 'Сохранено'
							: saveStatus === 'saving'
								? 'Сохраняю…'
								: 'Ошибка сохранения'}
					</span>
					<button type="button" onClick={undo} disabled={!canUndo}>
						Отменить
					</button>
					<button type="button" onClick={redo} disabled={!canRedo}>
						Повторить
					</button>
				</div>
			</header>

			<div
				className="narrative-workspace__mode-bar"
				role="tablist"
				aria-label="Рабочее пространство"
			>
				<button
					type="button"
					role="tab"
					aria-selected={workspaceMode === 'story'}
					className={workspaceMode === 'story' ? 'is-active' : undefined}
					onClick={() => selectWorkspace('story')}
				>
					История
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={workspaceMode === 'world-time'}
					className={
						workspaceMode === 'world-time' ? 'is-active' : undefined
					}
					onClick={() => selectWorkspace('world-time')}
				>
					Время и мир
				</button>
			</div>

			<div className="narrative-workspace__timebar">
				<div className="narrative-workspace__view-moment">
					<span>Просмотр</span>
					<strong>
						День {project.editor.selectedDay} · {weekdayLabels[weekday]}
					</strong>
					<time>{formatMinuteOfDay(selectedMinuteOfDay)}</time>
				</div>
				{workspaceMode === 'story' ? (
					<>
						<div
							className="narrative-workspace__clock-actions"
							aria-label="Точный навигатор истории"
						>
							<button
								type="button"
								disabled={absoluteMinute <= 0}
								onClick={() => moveMoment(-minuteStep)}
							>
								−5 мин
							</button>
							<button
								type="button"
								disabled={absoluteMinute >= maximumAbsoluteMinute}
								onClick={() => moveMoment(minuteStep)}
							>
								+5 мин
							</button>
						</div>
						<div
							className="narrative-workspace__periods"
							aria-label="Быстрый переход к периоду"
						>
							{project.template.periods.map(period => (
								<button
									key={period.id}
									type="button"
									className={
										project.editor.selectedPeriodId === period.id
											? 'is-active'
											: undefined
									}
									onClick={() =>
										execute({
											type: 'editor/selectPeriod',
											periodId: period.id
										})
									}
								>
									{period.label}
								</button>
							))}
						</div>
					</>
				) : (
					<div className="narrative-workspace__gesture-help">
						Колесо — масштаб · drag — движение по 93 дням
					</div>
				)}
				<div
					className="narrative-workspace__playhead"
					data-active={viewMatchesSimulationPlayhead}
				>
					<span>Симуляция</span>
					<strong>
						День {project.simulation.day} ·{' '}
						{formatMinuteOfDay(project.simulation.minuteOfDay)}
					</strong>
				</div>
			</div>

			{workspaceMode === 'story' ? (
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
											onClick={() => addCharacterReference(character.id)}
										>
											На доску
										</button>
									</div>
								))}
							</div>
						</details>

						<div className="narrative-workspace__library-row">
							<span>Предметы</span>
							<small>Item library — следующий слой</small>
						</div>
						<div className="narrative-workspace__library-row">
							<span>Факты / знания</span>
							<small>раздельные модели</small>
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
								<strong> · выбери следующий сюжетный блок</strong>
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
										const source = visualNodeByStoryId.get(
											connection.sourceNodeId
										);
										const target = visualNodeByStoryId.get(
											connection.targetNodeId
										);
										if (!source || !target) {
											return null;
										}
										const sourceX = source.position.x + storyNodeWidth;
										const sourceY = source.position.y + storyNodeHeight / 2;
										const targetX = target.position.x;
										const targetY = target.position.y + storyNodeHeight / 2;
										const bend = Math.max(60, Math.abs(targetX - sourceX) * 0.45);
										return (
											<path
												key={connection.id}
												className={`narrative-workspace__connection is-${connection.kind}`}
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
									if (!character && !storyNode && !node.title) {
										return null;
									}
									const isSelected =
										selectedStoryEntity?.canvasNodeId === node.id;
									return (
										<button
											key={node.id}
											type="button"
											className={`narrative-workspace__node ${storyNode ? storyNodeClass(storyNode.kind) : 'narrative-workspace__node--character'}${isSelected ? ' is-selected' : ''}${connectionSourceId === storyNode?.id ? ' is-connecting' : ''}`}
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
													: 'PERSONA REFERENCE'}
											</span>
											<strong>{storyNode?.title ?? character?.name ?? node.title}</strong>
											<small>
												{storyNode
													? storyNode.placement
														? 'привязан к миру'
														: 'без времени и места'
													: character
														? 'ссылка на персонажа'
														: 'заметка'}
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
										Создавай сюжетные блоки слева. Они могут существовать без
										 дня и локации, пока ты только ищешь форму истории.
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
									{inspectedStoryNode.placement
										? 'У этого блока уже есть привязка к миру.'
										: 'Черновик: день, время и локацию можно назначить позже.'}
								</p>
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
									На доске это только визуальная ссылка. Сам персонаж живёт в
									 Project Library и может появляться на нескольких canvas.
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
									 перемещает canvas.
								</p>
							</div>
						)}
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
								<span>Персонажи</span>
								<strong>{project.characters.length}</strong>
							</div>
						</div>
					</aside>
				</div>
			) : (
				<section className="narrative-workspace__world-time">
					<header className="narrative-workspace__world-time-header">
						<div>
							<p className="narrative-workspace__eyebrow">World / Time</p>
							<h2>93 дня как единая карта</h2>
							<p>
								Издалека виден весь период. Колесо раскрывает дни, часы и
								 минуты; drag двигает временную карту без запуска симуляции.
							</p>
						</div>
						<div className="narrative-workspace__world-controls">
							<button type="button" onClick={() => zoomWorld(1 / 1.6)}>
								−
							</button>
							<button type="button" onClick={fitWorldTime}>
								Все 93 дня
							</button>
							<button type="button" onClick={() => zoomWorld(1.6)}>
								+
							</button>
						</div>
					</header>

					<div className="narrative-workspace__world-time-layout">
						<aside
							className="narrative-workspace__world-library"
							aria-label="Project Library мира"
						>
							<div className="narrative-workspace__panel-heading">
								<span>PROJECT LIBRARY</span>
								<small>мир</small>
							</div>
							<form
								onSubmit={addLocation}
								className="narrative-workspace__compact-form"
							>
								<input
									aria-label="Название новой локации"
									value={locationName}
									placeholder="Например: Бар"
									onChange={event => setLocationName(event.target.value)}
								/>
								<button type="submit">+ Локация</button>
							</form>
							<div className="narrative-workspace__location-list">
								{project.locations.map(location => (
									<div key={location.id}>{location.name}</div>
								))}
								{project.locations.length === 0 && <p>Пока нет локаций.</p>}
							</div>
							<div className="narrative-workspace__library-row">
								<span>Персонажи</span>
								<small>{project.characters.length}</small>
							</div>
							<div className="narrative-workspace__library-row">
								<span>Предметы</span>
								<small>следующий слой</small>
							</div>
						</aside>

						<div
							className="narrative-workspace__world-time-main"
							role="region"
							aria-label="Динамическая временная карта"
						>
							<div className="narrative-workspace__viewport-banner">
								<div>
									<strong>
										{absoluteMinuteLabel(worldRange.start)} →{' '}
										{absoluteMinuteLabel(Math.max(worldRange.start, worldRange.end - 1))}
									</strong>
									<span>
										масштаб {worldTimeViewport.pixelsPerHour.toFixed(2)} px/час
									</span>
								</div>
								{!viewMatchesSimulationPlayhead && (
									<button type="button" onClick={jumpToSimulationPlayhead}>
										К playhead симуляции
									</button>
								)}
							</div>

							<div
								ref={worldViewportRef}
								className={`narrative-workspace__timeline-viewport${worldPanState ? ' is-panning' : ''}`}
								onWheel={handleWorldWheel}
								onMouseDown={handleWorldPanStart}
							>
								<div className="narrative-workspace__timeline-ruler">
									{visibleDays.map(day => {
										const start = (day - 1) * minutesPerDay;
										const end = day * minutesPerDay;
										return (
											<div
												key={`day-${day}`}
												className="narrative-workspace__day-band"
												style={{
													left: worldX(start),
													width: Math.max(1, worldX(end) - worldX(start))
												}}
											>
												{worldTimeViewport.pixelsPerHour >= 1 && (
													<span>День {day}</span>
												)}
											</div>
										);
									})}
									{ticks.map(tickMinute => (
										<div
											key={`tick-${tickMinute}`}
											className="narrative-workspace__timeline-tick"
											style={{left: worldX(tickMinute)}}
										>
											<span>{absoluteMinuteLabel(tickMinute)}</span>
										</div>
									))}
								</div>

								<div className="narrative-workspace__timeline-body">
									{project.locations.length === 0 ? (
										<div className="narrative-workspace__timeline-empty">
											Создай локацию в Project Library. Здесь появятся её
											 временная линия, расписания и фактическое присутствие.
										</div>
									) : (
										project.locations.map(location => {
											const scheduleBlocks: React.ReactNode[] = [];
											for (const rule of project.routineRules) {
												if (
													rule.targetLocationId !== location.id ||
													rule.absent
												) {
													continue;
												}
												for (
													let day = Math.max(1, firstVisibleDay - 1);
													day <= lastVisibleDay;
													day++
												) {
													const window = routineWindowForDay(
														rule,
														day,
														project.template.periods,
														project.template.day1Weekday
													);
													if (
														!window ||
														window.end < worldRange.start ||
														window.start > worldRange.end
													) {
														continue;
													}
													const visibleStart = Math.max(
														window.start,
														worldRange.start
													);
													const visibleEnd = Math.min(
														window.end,
														worldRange.end
													);
													const character = charactersById.get(rule.characterId);
													scheduleBlocks.push(
														<div
															key={`${rule.id}-${day}`}
															className="narrative-workspace__schedule-block"
															style={{
																left: worldX(visibleStart),
																width: Math.max(
																	3,
																	worldX(visibleEnd) - worldX(visibleStart)
																)
															}}
															title={`${character?.name ?? 'Персонаж'} · ${absoluteMinuteLabel(window.start)} → ${absoluteMinuteLabel(window.end)}`}
														>
															{worldTimeViewport.pixelsPerHour >= 8 && (
																<span>{character?.name ?? 'Персонаж'}</span>
															)}
														</div>
													);
												}
											}
											const actualCharacters = project.characters.filter(
												character =>
													project.simulation.actualLocationByCharacter[
														character.id
													] === location.id
											);
											return (
												<div
													key={location.id}
													className="narrative-workspace__timeline-row"
												>
													<div className="narrative-workspace__timeline-row-label">
														{location.name}
													</div>
													<div className="narrative-workspace__timeline-track">
														{visibleDays.map(day => {
															const dayStart = (day - 1) * minutesPerDay;
															return project.template.periods.flatMap(period => {
																const segments =
																	period.endMinute > period.startMinute
																		? [
																			[
																				dayStart + period.startMinute,
																				dayStart + period.endMinute
																			]
																		  ]
																		: [
																			[dayStart, dayStart + period.endMinute],
																			[
																				dayStart + period.startMinute,
																				dayStart + minutesPerDay
																			]
																		  ];
																return segments.map((segment, segmentIndex) => {
																	const start = Math.max(segment[0], worldRange.start);
																	const end = Math.min(segment[1], worldRange.end);
																	if (end <= start) {
																		return null;
																	}
																	return (
																		<div
																			key={`${day}-${period.id}-${segmentIndex}`}
																			className={`narrative-workspace__period-band is-${period.id}`}
																			style={{
																				left: worldX(start),
																				width: Math.max(1, worldX(end) - worldX(start))
																			}}
																		/>
																	);
																});
															});
														})}
														{ticks.map(tickMinute => (
															<i
																key={`grid-${tickMinute}`}
																className="narrative-workspace__timeline-gridline"
																style={{left: worldX(tickMinute)}}
															/>
														))}
														{scheduleBlocks}
														{simulationVisible && actualCharacters.length > 0 && (
															<div
																className="narrative-workspace__actual-presence"
																style={{left: worldX(simulationAbsoluteMinute)}}
															>
																{actualCharacters.map(character => (
																	<span key={character.id}>{character.name}</span>
																))}
															</div>
														)}
													</div>
												</div>
											);
										})
									)}
									{cursorVisible && (
										<div
											className="narrative-workspace__view-cursor-line"
											style={{left: worldX(worldTimeViewport.centerAbsoluteMinute)}}
										/>
									)}
									{simulationVisible && (
										<div
											className="narrative-workspace__simulation-line"
											style={{left: worldX(simulationAbsoluteMinute)}}
										/>
									)}
								</div>
							</div>

							<div className="narrative-workspace__world-time-note">
								<strong>
									{viewMatchesSimulationPlayhead
										? 'Курсор просмотра совпадает с playhead симуляции.'
										: 'Курсор просмотра и симуляция разделены.'}
								</strong>
								<span>
									Тонкие полосы — authored schedule. Маркеры на playhead —
									 фактическое присутствие. Масштабирование само по себе мир не
									 меняет.
								</span>
							</div>
						</div>
					</div>
				</section>
			)}
		</section>
	);
};
