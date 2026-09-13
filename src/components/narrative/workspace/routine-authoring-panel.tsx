import * as React from 'react';
import {formatMinuteOfDay} from '../../../domain/narrative/calendar';
import {
	RecurrencePattern,
	RoutineRule,
	RoutineTimeWindow,
	Weekday
} from '../../../domain/narrative/schedule';
import {useNarrativeProject} from '../../../store/narrative-project';
import {routineRuleIsAuthoringValid} from '../../../store/narrative-project/routine-authoring';

const weekdayLabels: Record<Weekday, string> = {
	monday: 'Пн',
	tuesday: 'Вт',
	wednesday: 'Ср',
	thursday: 'Чт',
	friday: 'Пт',
	saturday: 'Сб',
	sunday: 'Вс'
};

const weekdays = Object.keys(weekdayLabels) as Weekday[];
type RecurrenceMode = RecurrencePattern['type'];
type WindowMode = RoutineTimeWindow['type'];
type DestinationMode = 'location' | 'absent';

function parseClock(value: string) {
	const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
	if (!match) {
		return undefined;
	}
	const hour = Number(match[1]);
	const minute = Number(match[2]);
	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
		return undefined;
	}
	return hour * 60 + minute;
}

function clockValue(minute: number) {
	const hour = Math.floor(minute / 60)
		.toString()
		.padStart(2, '0');
	const minutePart = (minute % 60).toString().padStart(2, '0');
	return `${hour}:${minutePart}`;
}

function recurrenceLabel(recurrence: RecurrencePattern) {
	switch (recurrence.type) {
		case 'everyDay':
			return 'каждый день';
		case 'weekly':
			return recurrence.weekdays.map(day => weekdayLabels[day]).join(', ');
		case 'everyNDays':
			return `раз в ${recurrence.every} дн., от дня ${recurrence.anchorDay}`;
		case 'explicitDays':
			return `дни ${recurrence.days.join(', ')}`;
	}
}

export const RoutineAuthoringPanel: React.FC = () => {
	const {project, execute, createId} = useNarrativeProject();
	const [editingRuleId, setEditingRuleId] = React.useState<string>();
	const [characterId, setCharacterId] = React.useState('');
	const [destinationMode, setDestinationMode] =
		React.useState<DestinationMode>('location');
	const [locationId, setLocationId] = React.useState('');
	const [fromDay, setFromDay] = React.useState('1');
	const [toDay, setToDay] = React.useState(String(project.template.dayCount));
	const [recurrenceMode, setRecurrenceMode] =
		React.useState<RecurrenceMode>('everyDay');
	const [weeklyDays, setWeeklyDays] = React.useState<Weekday[]>(['monday']);
	const [everyN, setEveryN] = React.useState('2');
	const [anchorDay, setAnchorDay] = React.useState('1');
	const [explicitDays, setExplicitDays] = React.useState('1');
	const [windowMode, setWindowMode] = React.useState<WindowMode>('period');
	const [periodId, setPeriodId] = React.useState(
		project.template.periods[0]?.id ?? ''
	);
	const [startTime, setStartTime] = React.useState('09:00');
	const [endTime, setEndTime] = React.useState('17:00');
	const [message, setMessage] = React.useState('');

	function resetForm() {
		setEditingRuleId(undefined);
		setCharacterId('');
		setDestinationMode('location');
		setLocationId('');
		setFromDay('1');
		setToDay(String(project.template.dayCount));
		setRecurrenceMode('everyDay');
		setWeeklyDays(['monday']);
		setEveryN('2');
		setAnchorDay('1');
		setExplicitDays('1');
		setWindowMode('period');
		setPeriodId(project.template.periods[0]?.id ?? '');
		setStartTime('09:00');
		setEndTime('17:00');
		setMessage('');
	}

	function loadRule(rule: RoutineRule) {
		setEditingRuleId(rule.id);
		setCharacterId(rule.characterId);
		setDestinationMode(rule.absent ? 'absent' : 'location');
		setLocationId(rule.targetLocationId ?? '');
		setFromDay(String(rule.activeRange.fromDay));
		setToDay(
			rule.activeRange.toDay === undefined
				? String(project.template.dayCount)
				: String(rule.activeRange.toDay)
		);
		setRecurrenceMode(rule.recurrence.type);
		if (rule.recurrence.type === 'weekly') {
			setWeeklyDays(rule.recurrence.weekdays);
		}
		if (rule.recurrence.type === 'everyNDays') {
			setEveryN(String(rule.recurrence.every));
			setAnchorDay(String(rule.recurrence.anchorDay));
		}
		if (rule.recurrence.type === 'explicitDays') {
			setExplicitDays(rule.recurrence.days.join(', '));
		}
		const window = rule.timeWindow;
		if (window?.type === 'exact') {
			setWindowMode('exact');
			setStartTime(clockValue(window.startMinute));
			setEndTime(clockValue(window.endMinute));
		} else {
			setWindowMode('period');
			setPeriodId(
				window?.type === 'period'
					? window.periodId
					: rule.periodId ?? project.template.periods[0]?.id ?? ''
			);
		}
		setMessage('Редактирование существующего правила.');
	}

	function buildRecurrence(): RecurrencePattern | undefined {
		switch (recurrenceMode) {
			case 'everyDay':
				return {type: 'everyDay'};
			case 'weekly':
				return weeklyDays.length > 0
					? {type: 'weekly', weekdays: weeklyDays}
					: undefined;
			case 'everyNDays': {
				const every = Number(everyN);
				const anchor = Number(anchorDay);
				return Number.isInteger(every) && every >= 1 && Number.isInteger(anchor)
					? {type: 'everyNDays', every, anchorDay: anchor}
					: undefined;
			}
			case 'explicitDays': {
				const days = [
					...new Set(
						explicitDays
							.split(',')
							.map(value => Number(value.trim()))
							.filter(Number.isInteger)
					)
				].sort((a, b) => a - b);
				return days.length > 0 ? {type: 'explicitDays', days} : undefined;
			}
		}
	}

	function buildWindow(): RoutineTimeWindow | undefined {
		if (windowMode === 'period') {
			return periodId ? {type: 'period', periodId} : undefined;
		}
		const startMinute = parseClock(startTime);
		const endMinute = parseClock(endTime);
		if (startMinute === undefined || endMinute === undefined) {
			return undefined;
		}
		return {
			type: 'exact',
			startMinute,
			endMinute,
			endDayOffset: endMinute < startMinute ? 1 : 0
		};
	}

	function submitRule(event: React.FormEvent) {
		event.preventDefault();
		const character = project.characters.find(
			candidate => candidate.id === characterId
		);
		const profileId = character?.defaultBehaviorProfileId;
		const startDay = Number(fromDay);
		const endDay = Number(toDay);
		const recurrence = buildRecurrence();
		const timeWindow = buildWindow();
		if (
			!character ||
			!profileId ||
			!Number.isInteger(startDay) ||
			!Number.isInteger(endDay) ||
			!recurrence ||
			!timeWindow ||
			(destinationMode === 'location' && !locationId)
		) {
			setMessage('Проверь обязательные поля расписания.');
			return;
		}

		const rule: RoutineRule = {
			id: editingRuleId ?? createId('routine'),
			characterId,
			behaviorProfileId: profileId,
			activeRange: {fromDay: startDay, toDay: endDay},
			recurrence,
			timeWindow,
			targetLocationId: destinationMode === 'location' ? locationId : undefined,
			absent: destinationMode === 'absent' ? true : undefined
		};
		if (!routineRuleIsAuthoringValid(project, rule)) {
			setMessage(
				'Расписание не сохранено: проверь диапазон дней, повтор, время и ссылки.'
			);
			return;
		}
		execute({type: editingRuleId ? 'routine/update' : 'routine/add', rule});
		resetForm();
	}

	function toggleWeekday(day: Weekday) {
		setWeeklyDays(current =>
			current.includes(day)
				? current.filter(candidate => candidate !== day)
				: [...current, day]
		);
	}

	function windowLabel(rule: RoutineRule) {
		const window = rule.timeWindow;
		if (window?.type === 'exact') {
			return `${formatMinuteOfDay(window.startMinute)}–${formatMinuteOfDay(window.endMinute)}${window.endDayOffset === 1 ? ' (+1 день)' : ''}`;
		}
		const periodId = window?.type === 'period' ? window.periodId : rule.periodId;
		return (
			project.template.periods.find(period => period.id === periodId)?.label ??
			'Период не найден'
		);
	}

	return (
		<section
			className="narrative-workspace__move-editor"
			aria-label="Расписания персонажей"
		>
			<h2>Расписания персонажей</h2>
			<p>
				Это authored intent для WORLD/TIME. Правило показывает, где персонаж
				 должен быть по плану, но никогда само не переписывает Actual Presence.
			</p>

			<form className="narrative-workspace__compact-form" onSubmit={submitRule}>
				<select
					aria-label="Персонаж расписания"
					value={characterId}
					onChange={event => setCharacterId(event.target.value)}
				>
					<option value="">Выбери персонажа</option>
					{project.characters.map(character => (
						<option key={character.id} value={character.id}>
							{character.name}
						</option>
					))}
				</select>

				<select
					aria-label="Тип назначения расписания"
					value={destinationMode}
					onChange={event =>
						setDestinationMode(event.target.value as DestinationMode)
					}
				>
					<option value="location">Находиться в локации</option>
					<option value="absent">Отсутствовать</option>
				</select>
				{destinationMode === 'location' && (
					<select
						aria-label="Локация расписания"
						value={locationId}
						onChange={event => setLocationId(event.target.value)}
					>
						<option value="">Выбери локацию</option>
						{project.locations.map(location => (
							<option key={location.id} value={location.id}>
								{location.name}
							</option>
						))}
					</select>
				)}

				<div className="narrative-workspace__skill-check-editor">
					<label>
						С дня
						<input
							type="number"
							min={1}
							max={project.template.dayCount}
							value={fromDay}
							onChange={event => setFromDay(event.target.value)}
						/>
					</label>
					<label>
						По день
						<input
							type="number"
							min={1}
							max={project.template.dayCount}
							value={toDay}
							onChange={event => setToDay(event.target.value)}
						/>
					</label>
				</div>

				<select
					aria-label="Повтор расписания"
					value={recurrenceMode}
					onChange={event =>
						setRecurrenceMode(event.target.value as RecurrenceMode)
					}
				>
					<option value="everyDay">Каждый день</option>
					<option value="weekly">По дням недели</option>
					<option value="everyNDays">Раз в N дней</option>
					<option value="explicitDays">Только указанные дни</option>
				</select>

				{recurrenceMode === 'weekly' && (
					<div className="narrative-workspace__edge-mode-controls">
						<span>Дни недели</span>
						<div>
							{weekdays.map(day => (
								<button
									key={day}
									type="button"
									className={weeklyDays.includes(day) ? 'is-active' : undefined}
									onClick={() => toggleWeekday(day)}
								>
									{weekdayLabels[day]}
								</button>
							))}
						</div>
					</div>
				)}
				{recurrenceMode === 'everyNDays' && (
					<div className="narrative-workspace__skill-check-editor">
						<label>
							Каждые N дней
							<input
								type="number"
								min={1}
								value={everyN}
								onChange={event => setEveryN(event.target.value)}
							/>
						</label>
						<label>
							Отсчёт от дня
							<input
								type="number"
								min={1}
								max={project.template.dayCount}
								value={anchorDay}
								onChange={event => setAnchorDay(event.target.value)}
							/>
						</label>
					</div>
				)}
				{recurrenceMode === 'explicitDays' && (
					<input
						aria-label="Явные дни расписания"
						value={explicitDays}
						placeholder="1, 3, 8, 21"
						onChange={event => setExplicitDays(event.target.value)}
					/>
				)}

				<select
					aria-label="Тип временного окна расписания"
					value={windowMode}
					onChange={event => setWindowMode(event.target.value as WindowMode)}
				>
					<option value="period">Период суток</option>
					<option value="exact">Точное время</option>
				</select>
				{windowMode === 'period' ? (
					<select
						aria-label="Период расписания"
						value={periodId}
						onChange={event => setPeriodId(event.target.value)}
					>
						{project.template.periods.map(period => (
							<option key={period.id} value={period.id}>
								{period.label}
							</option>
						))}
					</select>
				) : (
					<div className="narrative-workspace__skill-check-editor">
						<label>
							Начало
							<input
								type="time"
								value={startTime}
								onChange={event => setStartTime(event.target.value)}
							/>
						</label>
						<label>
							Конец
							<input
								type="time"
								value={endTime}
								onChange={event => setEndTime(event.target.value)}
							/>
						</label>
						<small>
							Если конец раньше начала, окно автоматически заканчивается на
							 следующем дне.
						</small>
					</div>
				)}

				<button type="submit">
					{editingRuleId ? 'Сохранить расписание' : '+ Расписание'}
				</button>
				{editingRuleId && (
					<button type="button" onClick={resetForm}>
						Отменить редактирование
					</button>
				)}
				{message && <small>{message}</small>}
			</form>

			<div className="narrative-workspace__move-list">
				{project.routineRules.map(rule => {
					const character = project.characters.find(
						candidate => candidate.id === rule.characterId
					);
					const location = rule.targetLocationId
						? project.locations.find(candidate => candidate.id === rule.targetLocationId)
						: undefined;
					return (
						<article key={rule.id} className="narrative-workspace__move-card">
							<strong>{character?.name ?? rule.characterId}</strong>
							<span>{rule.absent ? 'Отсутствует' : location?.name ?? 'Локация не найдена'}</span>
							<small>
								Дни {rule.activeRange.fromDay}–{rule.activeRange.toDay ?? project.template.dayCount}
								 · {recurrenceLabel(rule.recurrence)} · {windowLabel(rule)}
							</small>
							<div className="narrative-workspace__inspection-actions">
								<button type="button" onClick={() => loadRule(rule)}>
									Редактировать
								</button>
								<button
									type="button"
									onClick={() => execute({type: 'routine/remove', id: rule.id})}
								>
									Удалить
								</button>
							</div>
						</article>
					);
				})}
				{project.routineRules.length === 0 && (
					<p>Пока нет authored расписаний.</p>
				)}
			</div>
		</section>
	);
};