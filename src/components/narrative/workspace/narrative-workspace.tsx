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

type SelectedEntity =
	| {type: 'character'; id: string}
	| {type: 'location'; id: string}
	| undefined;

export const NarrativeWorkspace: React.FC = () => {
	const {project, execute, undo, redo, canUndo, canRedo, saveStatus, createId} =
		useNarrativeProject();
	const [locationName, setLocationName] = React.useState('');
	const [characterName, setCharacterName] = React.useState('');
	const [cognitionTier, setCognitionTier] = React.useState<CognitionTier>('full');
	const [selectedEntity, setSelectedEntity] = React.useState<SelectedEntity>();
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
		selectedEntity?.type === 'character'
			? project.characters.find(character => character.id === selectedEntity.id)
			: undefined;
	const inspectedLocation =
		selectedEntity?.type === 'location'
			? project.locations.find(location => location.id === selectedEntity.id)
			: undefined;

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

	function moveDay(deltaDays: number) {
		execute({
			type: 'editor/selectMoment',
			day: project.editor.selectedDay + deltaDays,
			minuteOfDay: selectedMinuteOfDay
		});
	}

	function actualOccupants(locationId: string) {
		if (
			project.simulation.day !== project.editor.selectedDay ||
			project.simulation.minuteOfDay !== selectedMinuteOfDay
		) {
			return [];
		}

		return project.characters.filter(
			character => project.simulation.actualLocationByCharacter[character.id] === locationId
		);
	}

	return (
		<section className="narrative-workspace">
			<header className="narrative-workspace__header">
				<div>
					<p className="narrative-workspace__eyebrow">93 Days · Narrative Editor</p>
					<h1>{project.name}</h1>
					<p className="narrative-workspace__meta">
						{project.template.dayCount} дней · шаг времени {minuteStep} мин · переходное окно{' '}
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
				<div className="narrative-workspace__day-controls">
					<button
						type="button"
						aria-label="Предыдущий день"
						disabled={project.editor.selectedDay <= 1}
						onClick={() => moveDay(-1)}
					>
						←
					</button>
					<strong>
						День {project.editor.selectedDay} · {weekdayLabels[weekday]}
					</strong>
					<button
						type="button"
						aria-label="Следующий день"
						disabled={project.editor.selectedDay >= project.template.dayCount}
						onClick={() => moveDay(1)}
					>
						→
					</button>
				</div>

				<div className="narrative-workspace__clock" aria-label="Текущее время редактора">
					<button
						type="button"
						disabled={absoluteMinute <= 0}
						onClick={() => moveMoment(-minuteStep)}
					>
						−5 мин
					</button>
					<time>{formatMinuteOfDay(selectedMinuteOfDay)}</time>
					<button
						type="button"
						disabled={absoluteMinute >= maximumAbsoluteMinute}
						onClick={() => moveMoment(minuteStep)}
					>
						+5 мин
					</button>
				</div>

				<div className="narrative-workspace__periods">
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
			</div>

			{workspaceMode === 'story' ? (
				<div className="narrative-workspace__studio">
					<aside className="narrative-workspace__library">
						<div className="narrative-workspace__panel-heading">
							<span>WORLD</span>
							<small>объекты проекта</small>
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

						<details open>
							<summary>Локации <span>{project.locations.length}</span></summary>
							<form onSubmit={addLocation} className="narrative-workspace__compact-form">
								<input
									aria-label="Название новой локации"
									value={locationName}
									placeholder="Например: Бар"
									onChange={event => setLocationName(event.target.value)}
								/>
								<button type="submit">+ Локация</button>
							</form>
						</details>

						<div className="narrative-workspace__library-row"><span>Предметы</span><small>следующий слой</small></div>
						<div className="narrative-workspace__library-row"><span>События</span><small>следующий слой</small></div>
						<div className="narrative-workspace__library-row"><span>Факты / память</span><small>следующий слой</small></div>
						<div className="narrative-workspace__library-row"><span>Квесты</span><small>следующий слой</small></div>
					</aside>

					<main className="narrative-workspace__canvas-shell">
						<div className="narrative-workspace__breadcrumbs">
							World <span>›</span> День {project.editor.selectedDay} <span>›</span>{' '}
							{formatMinuteOfDay(selectedMinuteOfDay)}
						</div>
						<div className="narrative-workspace__canvas">
							{project.characters.length === 0 && project.locations.length === 0 ? (
								<div className="narrative-workspace__canvas-empty">
									<strong>Living Canvas</strong>
									<p>Создай персонажа или локацию слева — объект появится здесь как нода.</p>
								</div>
							) : (
								<div className="narrative-workspace__nodes">
									{project.characters.map(character => (
										<button
											key={character.id}
											type="button"
											className={`narrative-workspace__node narrative-workspace__node--character${selectedEntity?.type === 'character' && selectedEntity.id === character.id ? ' is-selected' : ''}`}
											onClick={() => setSelectedEntity({type: 'character', id: character.id})}
										>
											<span className="narrative-workspace__node-kind">CHARACTER</span>
											<strong>{character.name}</strong>
											<small>{character.cognitionTier} mind</small>
											<i className="narrative-workspace__port narrative-workspace__port--left" />
											<i className="narrative-workspace__port narrative-workspace__port--right" />
										</button>
									))}
									{project.locations.map(location => (
										<button
											key={location.id}
											type="button"
											className={`narrative-workspace__node narrative-workspace__node--location${selectedEntity?.type === 'location' && selectedEntity.id === location.id ? ' is-selected' : ''}`}
											onClick={() => setSelectedEntity({type: 'location', id: location.id})}
										>
											<span className="narrative-workspace__node-kind">LOCATION</span>
											<strong>{location.name}</strong>
											<small>место мира</small>
											<i className="narrative-workspace__port narrative-workspace__port--left" />
											<i className="narrative-workspace__port narrative-workspace__port--right" />
										</button>
									))}
								</div>
							)}
							<div className="narrative-workspace__canvas-hint">Перетаскивание и связи нод — следующий patch</div>
						</div>
					</main>

					<aside className="narrative-workspace__inspector">
						<div className="narrative-workspace__panel-heading">
							<span>INSPECTOR</span>
							<small>{formatMinuteOfDay(selectedMinuteOfDay)}</small>
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
						) : inspectedLocation ? (
							<div className="narrative-workspace__inspection">
								<span className="narrative-workspace__node-kind">LOCATION</span>
								<h2>{inspectedLocation.name}</h2>
								<p>Локация готова стать точкой расписания, присутствия и сцен.</p>
							</div>
						) : (
							<div className="narrative-workspace__inspection narrative-workspace__inspection--empty">
								<strong>Выбери ноду</strong>
								<p>Здесь будут свойства, связи, условия и диагностика выбранного объекта.</p>
							</div>
						)}
						<div className="narrative-workspace__stats">
							<div><span>Персонажи</span><strong>{project.characters.length}</strong></div>
							<div><span>Локации</span><strong>{project.locations.length}</strong></div>
							<div><span>Сцены</span><strong>{project.scenes.length}</strong></div>
						</div>
					</aside>
				</div>
			) : (
				<section className="narrative-workspace__world-time">
					<header className="narrative-workspace__world-time-header">
						<div>
							<p className="narrative-workspace__eyebrow">World / Time</p>
							<h2>День {project.editor.selectedDay}: расположение и расписание</h2>
						</div>
						<strong>{formatMinuteOfDay(selectedMinuteOfDay)}</strong>
					</header>

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
											Добавь локации в режиме «История», чтобы построить пространственную сетку дня.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					<div className="narrative-workspace__world-time-note">
						<strong>Каркас временного экрана готов.</strong>
						<span>
							Точное присутствие появится здесь после подключения Schedule Resolver и Presence Transition Planner. Сейчас мы не подменяем отсутствующую симуляцию фиктивными данными.
						</span>
					</div>
				</section>
			)}
		</section>
	);
};
