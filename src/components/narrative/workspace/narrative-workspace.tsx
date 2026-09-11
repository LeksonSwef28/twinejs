import * as React from 'react';
import {
	formatMinuteOfDay,
	minutesPerDay,
	weekdayForDay
} from '../../../domain/narrative/calendar';
import {NarrativeWorkspaceMode} from '../../../domain/narrative/project';
import {useNarrativeProject} from '../../../store/narrative-project';
import {ProjectLibrary} from './project-library';
import {StoryWorkspace} from './story-workspace';
import {WorldTimeWorkspace} from './world-time-workspace';
import './narrative-workspace.css';
import './narrative-workspace-v9.css';

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

			<ProjectLibrary
				open={projectLibraryOpen}
				onClose={() => setProjectLibraryOpen(false)}
			/>
			{workspaceMode === 'story' ? <StoryWorkspace /> : <WorldTimeWorkspace />}
		</section>
	);
};
