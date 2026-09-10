import * as React from 'react';
import {formatMinuteOfDay, minutesPerDay, weekdayForDay} from '../../../domain/narrative/calendar';
import {CognitionTier} from '../../../domain/narrative/entities';
import {NarrativeWorkspaceMode} from '../../../domain/narrative/project';
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

type SelectedStoryEntity = {type: 'character'; id: string} | undefined;

export const NarrativeWorkspace: React.FC = () => {
	const {project, execute, undo, redo, canUndo, canRedo, saveStatus, createId} =
		useNarrativeProject();
	const [locationName, setLocationName] = React.useState('');
	const [characterName, setCharacterName] = React.useState('');
	const [cognitionTier, setCognitionTier] = React.useState<CognitionTier>('full');
	const [selectedStoryEntity, setSelectedStoryEntity] = React.useState<SelectedStoryEntity>();
	const selectedPeriod =
		project.template.periods.find(period => period.id === project.editor.selectedPeriodId) ??
		project.template.periods[0];
	const selectedMinuteOfDay =
		project.editor.selectedMinuteOfDay ?? selectedPeriod?.startMinute ?? 0;
	const workspaceMode: NarrativeWorkspaceMode = project.editor.workspaceMode ?? 'story';
	const weekday = weekdayForDay(project.editor.selectedDay, project.template.day1Weekday);
	const absoluteMinute =
		(project.editor.selectedDay - 1) * minutesPerDay + selectedMinuteOfDay;
	const maximumAbsoluteMinute = project.template.dayCount * minutesPerDay - 1;
	const inspectedCharacter =
		selectedStoryEntity?.type === 'character'
			? project.characters.find(character => character.id === selectedStoryEntity.id)
			: undefined;
	const viewMatchesSimulationPlayhead =
		project.simulation.day === project.editor.selectedDay &&
		project.simulation.minuteOfDay === selectedMinuteOfDay;

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

	function actualOccupants(locationId: string) {
		if (!viewMatchesSimulationPlayhead) {
			return [];
		}

		return project.characters.filter(
			character => project.simulation.actualLocationByCharacter[character.id] === locationId
		);
	}

	function jumpToSimulationPlayhead() {
		execute({
			type: 'editor/selectMoment',
			day: project.simulation.day,
			minuteOfDay: project.simulation.minuteOfDay
		});
	}

	return (
		<section className="narrative-workspace">
			<header className="narrative-workspace__header">
				<div>
					<p className="narrative-workspace__eyebrow">93 Days · Narrative Editor</p>
					<h1>{project.name}</h1>
					<p className="narrative-workspace__meta">
						{project.template.dayCount} дней · точность времени {minuteStep} мин · переходное окно{' '}
						{project.template.presenceTransition.defaultTransitionWindowMinutes} мин
					</p>
				</div>
				<div className="narrative-workspace__actions">
					<span className={`narrative-workspace__save-status is-${saveStatus}`}>
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

			<div className="narrative-workspace__mode-bar" role="tablist" aria-label="Рабочее пространство">
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
					className={workspaceMode === 'world-time' ? 'is-active' : undefined}
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
				<div className="narrative-workspace__clock-actions" aria-label="Временный точный навигатор">
					<button type="button" disabled={absoluteMinute <= 0} onClick={() => moveMoment(-minuteStep)}>
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
				<div className="narrative-workspace__periods" aria-label="Быстрый переход к периоду">
					{project.template.periods.map(period => (
						<button
							key={period.id}
							type="button"
							className={project.editor.selectedPeriodId === period.id ? 'is-active' : undefined}
							onClick={() => execute({type: 'editor/selectPeriod', periodId: period.id})}
						>
							{period.label}
						</button>
					))}
				</div>
				<div className="narrative-workspace__playhead" data-active={viewMatchesSimulationPlayhead}>
					<span>Симуляция</span>
					<strong>
						День {project.simulation.day} · {formatMinuteOfDay(project.simulation.minuteOfDay)}
					</strong>
				</div>
			</div>

			{workspaceMode === 'story' ? (
				<div className="narrative-workspace__studio">
					<aside className="narrative-workspace__library">
						<div className="narrative-workspace__panel-heading">
							<span>STORY</span>
							<small>сюжетные сущности</small>
						</div>

						<details open>
							<summary>Персонажи <span>{project.characters.length}</span></summary>
							<form onSubmit={addCharacter} className="narrative-workspace__compact-form">
								<input
									aria-label="Имя нового персонажа"
									value={characterName}
									placeholder="Например: Катя"
									onChange={event => setCharacterName(event.target.value)}
								/>
								<select
									aria-label="Уровень симуляции персонажа"
									value={cognitionTier}
									onChange={event => setCognitionTier(event.target.value as CognitionTier)}
								>
									<option value="full">Full mind</option>
									<option value="light">Light mind</option>
									<option value="background">Background</option>
								</select>
								<button type="submit">+ Персонаж</button>
							</form>
						</details>

						<div className="narrative-workspace__library-row"><span>События</span><small>story nodes</small></div>
						<div className="narrative-workspace__library-row"><span>Диалоги</span><small>nested graph</small></div>
						<div className="narrative-workspace__library-row"><span>Условия / проверки</span><small>true / false</small></div>
						<div className="narrative-workspace__library-row"><span>Факты</span><small>истина мира</small></div>
						<div className="narrative-workspace__library-row"><span>Заметки / группы</span><small>canvas only</small></div>
					</aside>

					<main className="narrative-workspace__canvas-shell">
						<div className="narrative-workspace__breadcrumbs">
							История <span>›</span> Главная доска
						</div>
						<div className="narrative-workspace__canvas">
							{project.characters.length === 0 ? (
								<div className="narrative-workspace__canvas-empty">
									<strong>Story Canvas</strong>
									<p>Здесь будет строиться история: события, выборы, проверки, последствия и заметки. Локации живут в «Время и мир».</p>
								</div>
							) : (
								<div className="narrative-workspace__nodes">
									{project.characters.map(character => (
										<button
											key={character.id}
											type="button"
											className={`narrative-workspace__node narrative-workspace__node--character${selectedStoryEntity?.type === 'character' && selectedStoryEntity.id === character.id ? ' is-selected' : ''}`}
											onClick={() => setSelectedStoryEntity({type: 'character', id: character.id})}
										>
											<span className="narrative-workspace__node-kind">CHARACTER REFERENCE</span>
											<strong>{character.name}</strong>
											<small>{character.cognitionTier} mind</small>
											<i className="narrative-workspace__port narrative-workspace__port--left" />
											<i className="narrative-workspace__port narrative-workspace__port--right" />
										</button>
									))}
								</div>
							)}
							<div className="narrative-workspace__canvas-hint">Domain entity ≠ canvas node · свободное размещение и связи — следующий patch</div>
						</div>
					</main>

					<aside className="narrative-workspace__inspector">
						<div className="narrative-workspace__panel-heading">
							<span>INSPECTOR</span>
							<small>story</small>
						</div>
						{inspectedCharacter ? (
							<div className="narrative-workspace__inspection">
								<span className="narrative-workspace__node-kind">CHARACTER</span>
								<h2>{inspectedCharacter.name}</h2>
								<dl>
									<dt>Модель</dt><dd>{inspectedCharacter.cognitionTier}</dd>
									<dt>Behavior profile</dt><dd>{inspectedCharacter.defaultBehaviorProfileId}</dd>
								</dl>
							</div>
						) : (
							<div className="narrative-workspace__inspection narrative-workspace__inspection--empty">
								<strong>Выбери сюжетную ноду</strong>
								<p>Здесь будут свойства события, условия, связи, последствия и диагностика.</p>
							</div>
						)}
						<div className="narrative-workspace__stats">
							<div><span>Персонажи</span><strong>{project.characters.length}</strong></div>
							<div><span>Сцены</span><strong>{project.scenes.length}</strong></div>
							<div><span>Memory traces</span><strong>{project.memories.length}</strong></div>
						</div>
					</aside>
				</div>
			) : (
				<section className="narrative-workspace__world-time">
					<header className="narrative-workspace__world-time-header">
						<div>
							<p className="narrative-workspace__eyebrow">World / Time</p>
							<h2>Временная карта мира</h2>
							<p>Локации, расписания, присутствие и перемещения живут здесь. Просмотр времени не перематывает симуляцию.</p>
						</div>
					</header>

					<div className="narrative-workspace__world-time-layout">
						<aside className="narrative-workspace__world-library">
							<div className="narrative-workspace__panel-heading">
								<span>МИР</span>
								<small>{project.locations.length} локаций</small>
							</div>
							<form onSubmit={addLocation} className="narrative-workspace__compact-form">
								<input
									aria-label="Название новой локации"
									value={locationName}
									placeholder="Например: Бар"
									onChange={event => setLocationName(event.target.value)}
								/>
								<button type="submit">+ Локация</button>
							</form>
							<div className="narrative-workspace__location-list">
								{project.locations.map(location => <div key={location.id}>{location.name}</div>)}
								{project.locations.length === 0 && <p>Пока нет локаций.</p>}
							</div>
						</aside>

						<main className="narrative-workspace__world-time-main">
							<div className="narrative-workspace__viewport-banner">
								<div>
									<strong>Viewport: День {project.editor.selectedDay} · {formatMinuteOfDay(selectedMinuteOfDay)}</strong>
									<span>Следующий UI-патч заменит периодную таблицу на pan/zoom timeline: 93 дня → дни → часы → 5 минут.</span>
								</div>
								{!viewMatchesSimulationPlayhead && (
									<button type="button" onClick={jumpToSimulationPlayhead}>К playhead симуляции</button>
								)}
							</div>

							<div className="narrative-workspace__schedule-wrap">
								<table className="narrative-workspace__schedule">
									<thead>
										<tr>
											<th>Локация</th>
											{project.template.periods.map(period => (
												<th key={period.id} className={period.id === project.editor.selectedPeriodId ? 'is-active' : undefined}>
													{period.label}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{project.locations.map(location => (
											<tr key={location.id}>
												<th>{location.name}</th>
												{project.template.periods.map(period => {
													const occupants = period.id === project.editor.selectedPeriodId ? actualOccupants(location.id) : [];
													return (
														<td key={period.id} className={period.id === project.editor.selectedPeriodId ? 'is-active' : undefined}>
															{occupants.length > 0 ? occupants.map(character => (
																<span key={character.id} className="narrative-workspace__occupant">{character.name}</span>
															)) : <span className="narrative-workspace__dash">—</span>}
														</td>
													);
												})}
											</tr>
										))}
										{project.locations.length === 0 && (
											<tr>
												<td colSpan={project.template.periods.length + 1} className="narrative-workspace__schedule-empty">
													Создай локацию слева, чтобы она появилась на временной карте мира.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>

							<div className="narrative-workspace__world-time-note">
								<strong>{viewMatchesSimulationPlayhead ? 'Просмотр совпадает с playhead симуляции.' : 'Сейчас открыт другой момент времени.'}</strong>
								<span>
									Фактическое присутствие показывается только для состояния симуляции. Навигация по истории времени сама по себе не меняет мир и не создаёт событий.
								</span>
							</div>
						</main>
					</div>
				</section>
			)}
		</section>
	);
};
