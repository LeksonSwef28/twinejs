import * as React from 'react';
import {
	formatMinuteOfDay,
	minutesPerDay
} from '../../../domain/narrative/calendar';
import {
	clampWorldTimeScale,
	routineWindowForDay,
	timelineTickStepMinutes,
	visibleAbsoluteMinuteRange
} from '../../../domain/narrative/world-time';
import {useNarrativeProject} from '../../../store/narrative-project';

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

export const WorldTimeWorkspace: React.FC = () => {
	const {project, execute, createId} = useNarrativeProject();
	const [locationName, setLocationName] = React.useState('');
	const [worldPanState, setWorldPanState] = React.useState<WorldPanState>();
	const [worldViewportSize, setWorldViewportSize] = React.useState({
		width: 900,
		height: 500
	});
	const worldViewportRef = React.useRef<HTMLDivElement>(null);

	const selectedMinuteOfDay = project.editor.selectedMinuteOfDay ?? 0;
	const absoluteMinute =
		(project.editor.selectedDay - 1) * minutesPerDay + selectedMinuteOfDay;
	const totalMinutes = project.template.dayCount * minutesPerDay;
	const worldTimeViewport = project.editor.worldTimeViewport ?? {
		centerAbsoluteMinute: absoluteMinute,
		pixelsPerHour: 0.4,
		scrollY: 0
	};
	const viewMatchesSimulationPlayhead =
		project.simulation.day === project.editor.selectedDay &&
		project.simulation.minuteOfDay === selectedMinuteOfDay;
	const charactersById = React.useMemo(
		() => new Map(project.characters.map(character => [character.id, character])),
		[project.characters]
	);
	const locationsById = React.useMemo(
		() => new Map(project.locations.map(location => [location.id, location])),
		[project.locations]
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
	}, []);

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
			target.closest('.narrative-workspace__schedule-block') ||
			target.closest('.narrative-workspace__story-marker')
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

	function openStoryNode(storyNodeId: string) {
		execute({type: 'editor/selectWorkspace', workspace: 'story'});
		const visual = project.editor.storyCanvas?.nodes.find(
			node =>
				node.entityRef?.type === 'storyNode' &&
				node.entityRef.id === storyNodeId
		);
		if (visual) {
			execute({
				type: 'editor/setStoryViewport',
				viewport: {
					x: 380 - visual.position.x,
					y: 240 - visual.position.y,
					zoom: Math.max(project.editor.storyCanvas?.viewport.zoom ?? 1, 0.8)
				}
			});
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
	const visibleStoryNodes = project.storyNodes.filter(node => {
		const placement = node.placement;
		if (placement?.day === undefined || placement.minuteOfDay === undefined) {
			return false;
		}
		const minute = (placement.day - 1) * minutesPerDay + placement.minuteOfDay;
		return minute >= worldRange.start && minute <= worldRange.end;
	});

	return (
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
						<small>{project.itemInstances.length} экземпляров</small>
					</div>
					<div className="narrative-workspace__library-row">
						<span>Сюжет на времени</span>
						<small>
							{project.storyNodes.filter(node => node.placement?.day !== undefined).length}
						</small>
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
								{absoluteMinuteLabel(
									Math.max(worldRange.start, worldRange.end - 1)
								)}
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
							<div className="narrative-workspace__timeline-row narrative-workspace__timeline-row--story">
								<div className="narrative-workspace__timeline-row-label">Сюжет</div>
								<div className="narrative-workspace__timeline-track">
									{visibleStoryNodes.map(node => {
										const placement = node.placement!;
										const storyMinute =
											(placement.day! - 1) * minutesPerDay +
											placement.minuteOfDay!;
										return (
											<button
												key={node.id}
												type="button"
												className={`narrative-workspace__story-marker is-${node.activationState}`}
												style={{left: worldX(storyMinute)}}
												title={`${node.title}${placement.locationId ? ` · ${locationsById.get(placement.locationId)?.name ?? 'Локация'}` : ''}`}
												onClick={() => openStoryNode(node.id)}
											>
												<span>{node.title}</span>
											</button>
										);
									})}
								</div>
							</div>

							{project.locations.length === 0 ? (
								<div className="narrative-workspace__timeline-empty">
									Создай локацию в Project Library. Здесь появятся её временная
									 линия, расписания и фактическое присутствие.
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
											const visibleEnd = Math.min(window.end, worldRange.end);
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
											project.simulation.actualLocationByCharacter[character.id] ===
											location.id
									);
									const locationStoryNodes = visibleStoryNodes.filter(
										node => node.placement?.locationId === location.id
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
												{locationStoryNodes.map(node => {
													const placement = node.placement!;
													const storyMinute =
														(placement.day! - 1) * minutesPerDay +
														placement.minuteOfDay!;
													return (
														<button
															key={`location-story-${node.id}`}
															type="button"
															className="narrative-workspace__location-story-marker"
															style={{left: worldX(storyMinute)}}
															title={node.title}
															onClick={() => openStoryNode(node.id)}
														/>
													);
												})}
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
							Полосы — authored schedule. Маркеры сюжета связаны с Story.
							 Маркеры на playhead — фактическое присутствие. Масштабирование
							 само по себе мир не меняет.
						</span>
					</div>
				</div>
			</div>
		</section>
	);
};
