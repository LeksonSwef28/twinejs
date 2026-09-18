import * as React from 'react';
import {
	PreviewFromHereFocus,
	PreviewFromHereRequest,
	createPreviewFromHereRequest
} from '../../../application/narrative/preview-from-here';
import {
	formatMinuteOfDay,
	minutesPerDay,
	weekdayForDay
} from '../../../domain/narrative/calendar';
import {NarrativeWorkspaceMode} from '../../../domain/narrative/project';
import {workspacePanelsForMode} from '../../../domain/narrative/workspace-navigation';
import {useNarrativeProject} from '../../../store/narrative-project';
import {CrossWorkspaceNavigator} from './cross-workspace-navigator';
import {InteractionTemplatePanel} from './interaction-template-panel';
import {MemorySaliencePanel} from './memory-salience-panel';
import {NarrativeExportPanel} from './narrative-export-panel';
import {MoveConditionsPanel} from './move-conditions-panel';
import {NarrativeMovePanel} from './narrative-move-panel';
import {OutcomeEffectsPanel} from './outcome-effects-panel';
import {PreviewFromHereContextCard, PreviewThisViewButton} from './preview-from-here-controls';
import {ProjectIdentityPanel} from './project-identity-panel';
import {ProjectLibrary} from './project-library';
import {ProjectSearchPanel} from './project-search-panel';
import {ReactionCandidatesPanel} from './reaction-candidates-panel';
import {RoutineAuthoringPanel} from './routine-authoring-panel';
import {SimulationDebugPanel} from './simulation-debug-panel';
import {StoryBrainPanel} from './story-brain-panel';
import {StoryMetadataPanel} from './story-metadata-panel';
import {StoryWorkspace} from './story-workspace';
import {WorldTimeWorkspace} from './world-time-workspace';
import './narrative-workspace.css';
import './narrative-workspace-v9.css';
import './narrative-workspace-a50.css';
import './workspace-navigation.css';

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

export const NarrativeWorkspace: React.FC = () => {
	const {project, execute, undo, redo, canUndo, canRedo, saveStatus} =
		useNarrativeProject();
	const [projectLibraryOpen, setProjectLibraryOpen] = React.useState(false);
	const [exportOpen, setExportOpen] = React.useState(false);
	const [splitView, setSplitView] = React.useState(false);
	const [simulationDebugOpen, setSimulationDebugOpen] = React.useState(false);
	const [previewFromHereRequest, setPreviewFromHereRequest] =
		React.useState<PreviewFromHereRequest>();
	const previewRequestCounter = React.useRef(1);
	const selectedPeriod =
		project.template.periods.find(
			period => period.id === project.editor.selectedPeriodId
		) ?? project.template.periods[0];
	const selectedMinuteOfDay =
		project.editor.selectedMinuteOfDay ?? selectedPeriod?.startMinute ?? 0;
	const workspaceMode: NarrativeWorkspaceMode =
		project.editor.workspaceMode ?? 'story';
	const visiblePanels = workspacePanelsForMode(workspaceMode, splitView);
	const weekday = weekdayForDay(
		project.editor.selectedDay,
		project.template.day1Weekday
	);
	const absoluteMinute =
		(project.editor.selectedDay - 1) * minutesPerDay + selectedMinuteOfDay;
	const maximumAbsoluteMinute = project.template.dayCount * minutesPerDay - 1;
	const viewMatchesSimulationPlayhead =
		project.simulation.day === project.editor.selectedDay &&
		project.simulation.minuteOfDay === selectedMinuteOfDay;

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

	function openPreviewFromHere(focus: PreviewFromHereFocus) {
		const request = createPreviewFromHereRequest(
			project,
			previewRequestCounter.current++,
			focus
		);
		setPreviewFromHereRequest(request);
		setSimulationDebugOpen(true);
	}

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
					<button type="button" onClick={() => setProjectLibraryOpen(true)}>
						Библиотека
					</button>
					<button
						type="button"
						aria-pressed={exportOpen}
						className={exportOpen ? 'is-active' : undefined}
						onClick={() => setExportOpen(current => !current)}
					>
						{exportOpen ? 'Закрыть экспорт' : 'Экспорт'}
					</button>
					<button
						type="button"
						aria-pressed={simulationDebugOpen}
						className={simulationDebugOpen ? 'is-active' : undefined}
						onClick={() => {
							if (simulationDebugOpen) {
								setSimulationDebugOpen(false);
								return;
							}
							setPreviewFromHereRequest(undefined);
							setSimulationDebugOpen(true);
						}}
					>
						{simulationDebugOpen ? 'Закрыть Playtest' : 'Playtest / Debug'}
					</button>
					<button
						type="button"
						aria-pressed={splitView}
						className={splitView ? 'is-active' : undefined}
						onClick={() => setSplitView(current => !current)}
					>
						{splitView ? 'Закрыть Split View' : 'Split View'}
					</button>
					<button type="button" onClick={undo} disabled={!canUndo}>
						Отменить
					</button>
					<button type="button" onClick={redo} disabled={!canRedo}>
						Повторить
					</button>
				</div>
			</header>

			<ProjectIdentityPanel />
			{exportOpen && <NarrativeExportPanel />}

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
				{splitView && <small>Split View — это линза, не третье workspace.</small>}
			</div>

			<div className="narrative-workspace__timebar">
				<div className="narrative-workspace__view-moment">
					<span>Просмотр</span>
					<strong>
						День {project.editor.selectedDay} · {weekdayLabels[weekday]}
					</strong>
					<time>{formatMinuteOfDay(selectedMinuteOfDay)}</time>
					<PreviewThisViewButton
						day={project.editor.selectedDay}
						minuteOfDay={selectedMinuteOfDay}
						onPreviewFromHere={openPreviewFromHere}
					/>
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

			{simulationDebugOpen && previewFromHereRequest && (
				<PreviewFromHereContextCard request={previewFromHereRequest} />
			)}
			<SimulationDebugPanel
				key={
					previewFromHereRequest
						? `preview-from-here:${previewFromHereRequest.requestId}`
						: 'manual-playtest'
				}
				open={simulationDebugOpen}
				onClose={() => setSimulationDebugOpen(false)}
			/>

			<ProjectSearchPanel />
			<CrossWorkspaceNavigator
				splitView={splitView}
				onPreviewFromHere={openPreviewFromHere}
			/>
			<ProjectLibrary
				open={projectLibraryOpen}
				onClose={() => setProjectLibraryOpen(false)}
			/>

			{splitView ? (
				<div
					className="narrative-workspace__split-view"
					aria-label="Split View Story и World Time"
				>
					<div className="narrative-workspace__split-pane is-story">
						<div className="narrative-workspace__split-pane-heading">
							<strong>Story</strong>
							<small>authoring</small>
						</div>
						<StoryWorkspace />
					</div>
					<div className="narrative-workspace__split-pane is-world-time">
						<div className="narrative-workspace__split-pane-heading">
							<strong>World / Time</strong>
							<small>same view cursor, simulation unchanged</small>
						</div>
						<WorldTimeWorkspace />
					</div>
				</div>
			) : (
				<>
					{visiblePanels.showStory && <StoryWorkspace />}
					{visiblePanels.showWorldTime && <WorldTimeWorkspace />}
				</>
			)}

			{visiblePanels.showWorldTime && <RoutineAuthoringPanel />}

			{visiblePanels.showStory && (
				<>
					<StoryMetadataPanel />
					<StoryBrainPanel />
					<NarrativeMovePanel />
					<MoveConditionsPanel />
					<OutcomeEffectsPanel />
					<MemorySaliencePanel />
					<InteractionTemplatePanel />
					<ReactionCandidatesPanel />
				</>
			)}
		</section>
	);
};
