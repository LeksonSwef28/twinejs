import * as React from 'react';
import {formatMinuteOfDay} from '../../../domain/narrative/calendar';
import {NarrativeProject} from '../../../domain/narrative/project';
import {ScheduleException} from '../../../domain/narrative/schedule';
import {useNarrativeProject} from '../../../store/narrative-project';
import {
	ResolvedScheduleExceptionForAuthoring,
	ScheduleExceptionAuthoringCandidate,
	resolveScheduleExceptionForAuthoring,
	scheduleExceptionAuthoringEquals,
	validateScheduleExceptionCandidate
} from '../../../store/narrative-project/schedule-exception-authoring';

type ScheduleExceptionRangeDraft =
	| {mode: 'one-day'; day: string}
	| {mode: 'bounded'; fromDay: string; toDay: string}
	| {mode: 'through-project-end'; fromDay: string};

type ScheduleExceptionWindowDraft =
	| {mode: 'period'; periodId: string}
	| {
			mode: 'exact';
			startTime: string;
			endTime: string;
			endDayOffset: '0' | '1';
	  };

type ScheduleExceptionIntentDraft =
	| {mode: 'unset'}
	| {mode: 'location'; locationId: string}
	| {mode: 'absent'}
	| {mode: 'conflicting-import'; storedLocationId: string};

interface ScheduleExceptionFormDraft {
	characterId: string;
	range: ScheduleExceptionRangeDraft;
	window: ScheduleExceptionWindowDraft;
	intent: ScheduleExceptionIntentDraft;
	priority: string;
	reason: string;
	windowNeedsExplicitRepair?: boolean;
}

interface ScheduleExceptionEditSource {
	id: string;
	revision: number;
	raw: ScheduleException;
}

interface ScheduleExceptionEditState {
	source: ScheduleExceptionEditSource;
	draft: ScheduleExceptionFormDraft;
}

type PendingScheduleExceptionCommit =
	| {type: 'create'; candidate: ScheduleExceptionAuthoringCandidate}
	| {
			type: 'update';
			candidate: ScheduleExceptionAuthoringCandidate;
			sourceId: string;
			sourceRevision: number;
			sourceRaw: ScheduleException;
	  }
	| {type: 'remove'; id: string};

function parseInteger(value: string) {
	if (!value.trim()) {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isInteger(parsed) ? parsed : undefined;
}

function parsePriority(value: string) {
	if (!value.trim()) {
		return undefined;
	}
	return Number(value);
}

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
	if (!Number.isInteger(minute) || minute < 0 || minute >= 24 * 60) {
		return '';
	}
	const hour = Math.floor(minute / 60)
		.toString()
		.padStart(2, '0');
	const minutePart = (minute % 60).toString().padStart(2, '0');
	return `${hour}:${minutePart}`;
}

function createScheduleExceptionDraft(
	project: NarrativeProject
): ScheduleExceptionFormDraft {
	const firstPeriodId = project.template.periods[0]?.id;
	return {
		characterId: '',
		range: {mode: 'one-day', day: '1'},
		window: firstPeriodId
			? {mode: 'period', periodId: firstPeriodId}
			: {
					mode: 'exact',
					startTime: '09:00',
					endTime: '17:00',
					endDayOffset: '0'
				  },
		intent: {mode: 'unset'},
		priority: '',
		reason: ''
	};
}

function draftFromResolvedException(
	project: NarrativeProject,
	resolved: ResolvedScheduleExceptionForAuthoring
): ScheduleExceptionFormDraft {
	const raw = resolved.exception;
	let range: ScheduleExceptionRangeDraft;
	if (resolved.activeRange.status === 'valid') {
		switch (resolved.activeRange.mode) {
			case 'one-day':
				range = {mode: 'one-day', day: String(resolved.activeRange.fromDay)};
				break;
			case 'bounded':
				range = {
					mode: 'bounded',
					fromDay: String(resolved.activeRange.fromDay),
					toDay: String(resolved.activeRange.toDay)
				};
				break;
			case 'through-project-end':
				range = {
					mode: 'through-project-end',
					fromDay: String(resolved.activeRange.fromDay)
				};
				break;
		}
	} else if (raw.activeRange.toDay === undefined) {
		range = {
			mode: 'through-project-end',
			fromDay: String(raw.activeRange.fromDay)
		};
	} else if (raw.activeRange.toDay === raw.activeRange.fromDay) {
		range = {mode: 'one-day', day: String(raw.activeRange.fromDay)};
	} else {
		range = {
			mode: 'bounded',
			fromDay: String(raw.activeRange.fromDay),
			toDay: String(raw.activeRange.toDay)
		};
	}

	let window: ScheduleExceptionWindowDraft;
	let windowNeedsExplicitRepair = false;
	if (resolved.window.status === 'resolved') {
		window =
			resolved.window.value.type === 'period'
				? {mode: 'period', periodId: resolved.window.value.periodId}
				: {
						mode: 'exact',
						startTime: clockValue(resolved.window.value.startMinute),
						endTime: clockValue(resolved.window.value.endMinute),
						endDayOffset: String(
							resolved.window.value.endDayOffset
						) as '0' | '1'
					  };
	} else if (resolved.window.status === 'unresolved-period') {
		window = {mode: 'period', periodId: ''};
	} else if (resolved.window.status === 'invalid-exact') {
		const rawOffset = resolved.window.endDayOffset;
		window = {
			mode: 'exact',
			startTime: clockValue(resolved.window.startMinute),
			endTime: clockValue(resolved.window.endMinute),
			endDayOffset:
				rawOffset === 0 || rawOffset === 1 ? String(rawOffset) as '0' | '1' : '0'
		};
		windowNeedsExplicitRepair = rawOffset !== 0 && rawOffset !== 1;
	} else {
		window = {mode: 'period', periodId: ''};
	}

	let intent: ScheduleExceptionIntentDraft;
	switch (resolved.intent.status) {
		case 'location-resolved':
			intent = {mode: 'location', locationId: resolved.intent.locationId};
			break;
		case 'location-unresolved':
			intent = {mode: 'location', locationId: ''};
			break;
		case 'absent':
			intent = {mode: 'absent'};
			break;
		case 'conflicting':
			intent = {
				mode: 'conflicting-import',
				storedLocationId: resolved.intent.locationId
			};
			break;
		case 'unspecified':
			intent = {mode: 'unset'};
			break;
	}

	return {
		characterId:
			resolved.character.status === 'resolved'
				? resolved.character.characterId
				: '',
		range,
		window,
		intent,
		priority: String(raw.priority),
		reason: raw.reason ?? '',
		...(windowNeedsExplicitRepair ? {windowNeedsExplicitRepair: true} : {})
	};
}

function candidateFromDraft(
	id: string,
	draft: ScheduleExceptionFormDraft
): ScheduleExceptionAuthoringCandidate | undefined {
	if (!id.trim() || !draft.characterId.trim()) {
		return undefined;
	}

	let activeRange: ScheduleExceptionAuthoringCandidate['activeRange'];
	switch (draft.range.mode) {
		case 'one-day': {
			const day = parseInteger(draft.range.day);
			if (day === undefined) {
				return undefined;
			}
			activeRange = {fromDay: day, toDay: day};
			break;
		}
		case 'bounded': {
			const fromDay = parseInteger(draft.range.fromDay);
			const toDay = parseInteger(draft.range.toDay);
			if (fromDay === undefined || toDay === undefined) {
				return undefined;
			}
			activeRange = {fromDay, toDay};
			break;
		}
		case 'through-project-end': {
			const fromDay = parseInteger(draft.range.fromDay);
			if (fromDay === undefined) {
				return undefined;
			}
			activeRange = {fromDay};
			break;
		}
	}

	if (draft.windowNeedsExplicitRepair) {
		return undefined;
	}
	let timeWindow: ScheduleExceptionAuthoringCandidate['timeWindow'];
	if (draft.window.mode === 'period') {
		if (!draft.window.periodId) {
			return undefined;
		}
		timeWindow = {type: 'period', periodId: draft.window.periodId};
	} else {
		const startMinute = parseClock(draft.window.startTime);
		const endMinute = parseClock(draft.window.endTime);
		if (startMinute === undefined || endMinute === undefined) {
			return undefined;
		}
		timeWindow = {
			type: 'exact',
			startMinute,
			endMinute,
			endDayOffset: Number(draft.window.endDayOffset) as 0 | 1
		};
	}

	let intent: ScheduleExceptionAuthoringCandidate['intent'];
	switch (draft.intent.mode) {
		case 'location':
			if (!draft.intent.locationId) {
				return undefined;
			}
			intent = {type: 'location', locationId: draft.intent.locationId};
			break;
		case 'absent':
			intent = {type: 'absent'};
			break;
		case 'unset':
		case 'conflicting-import':
			return undefined;
	}

	const priority = parsePriority(draft.priority);
	if (priority === undefined) {
		return undefined;
	}

	return {
		id,
		characterId: draft.characterId,
		activeRange,
		timeWindow,
		intent,
		priority,
		reason: draft.reason
	};
}

function meaningfulRangeStart(range: ScheduleExceptionRangeDraft) {
	const value = range.mode === 'one-day' ? range.day : range.fromDay;
	return parseInteger(value) === undefined ? '1' : value;
}

function formatRange(resolved: ResolvedScheduleExceptionForAuthoring) {
	const range = resolved.activeRange;
	if (range.status === 'invalid') {
		return `Некорректный диапазон: ${range.fromDay}–${range.toDay ?? '…'}`;
	}
	switch (range.mode) {
		case 'one-day':
			return `День ${range.fromDay}`;
		case 'bounded':
			return `Дни ${range.fromDay}–${range.toDay}`;
		case 'through-project-end':
			return `С дня ${range.fromDay} до конца проекта`;
	}
}

function formatWindow(
	project: NarrativeProject,
	resolved: ResolvedScheduleExceptionForAuthoring
) {
	const window = resolved.window;
	if (window.status === 'missing') {
		return 'Временное окно не указано';
	}
	if (window.status === 'unresolved-period') {
		return `Период не найден: ${window.periodId}`;
	}
	if (window.status === 'invalid-exact') {
		return 'Некорректное точное время';
	}
	if (window.value.type === 'period') {
		const label =
			project.template.periods.find(period => period.id === window.value.periodId)
				?.label ?? window.value.periodId;
		return `Период: ${label}${window.source === 'legacy-period' ? ' (legacy)' : ''}`;
	}
	return `${formatMinuteOfDay(window.value.startMinute)}–${formatMinuteOfDay(
		window.value.endMinute
	)}${window.value.endDayOffset === 1 ? ' (+1 день)' : ''}`;
}

function formatIntent(resolved: ResolvedScheduleExceptionForAuthoring) {
	switch (resolved.intent.status) {
		case 'location-resolved':
			return resolved.intent.location.name;
		case 'location-unresolved':
			return `Локация не найдена: ${resolved.intent.locationId}`;
		case 'absent':
			return 'Отсутствует';
		case 'conflicting':
			return 'Конфликт назначения: одновременно локация и отсутствие';
		case 'unspecified':
			return 'Назначение не указано';
	}
}

interface ScheduleExceptionFormProps {
	project: NarrativeProject;
	draft: ScheduleExceptionFormDraft;
	setDraft(draft: ScheduleExceptionFormDraft): void;
	onSubmit(event: React.FormEvent): void;
	submitLabel: string;
	submitDisabled: boolean;
	onCancel?: () => void;
	cancelDisabled?: boolean;
}

const ScheduleExceptionForm: React.FC<ScheduleExceptionFormProps> = props => {
	const {draft, project} = props;
	const setDraft = (patch: Partial<ScheduleExceptionFormDraft>) =>
		props.setDraft({...draft, ...patch});

	return (
		<form className="narrative-workspace__compact-form" onSubmit={props.onSubmit}>
			<select
				aria-label="Персонаж исключения"
				value={draft.characterId}
				onChange={event => setDraft({characterId: event.target.value})}
			>
				<option value="">Выбери персонажа</option>
				{project.characters.map(character => (
					<option key={character.id} value={character.id}>
						{character.name}
					</option>
				))}
			</select>
			{project.characters.length === 0 && <small>Для исключения нужен персонаж.</small>}

			<select
				aria-label="Тип диапазона исключения"
				value={draft.range.mode}
				onChange={event => {
					const mode = event.target.value as ScheduleExceptionRangeDraft['mode'];
					const start = meaningfulRangeStart(draft.range);
					if (mode === 'one-day') {
						setDraft({range: {mode, day: start}});
					} else if (mode === 'bounded') {
						setDraft({
							range: {
								mode,
								fromDay: start,
								toDay: draft.range.mode === 'bounded' ? draft.range.toDay : start
							}
						});
					} else {
						setDraft({range: {mode, fromDay: start}});
					}
				}}
			>
				<option value="one-day">Один день</option>
				<option value="bounded">Диапазон дней</option>
				<option value="through-project-end">До конца проекта</option>
			</select>
			{draft.range.mode === 'one-day' ? (
				<label>
					День исключения
					<input
						aria-label="День исключения"
						type="number"
						min={1}
						max={project.template.dayCount}
						value={draft.range.day}
						onChange={event =>
							setDraft({range: {mode: 'one-day', day: event.target.value}})
						}
					/>
				</label>
			) : (
				<div className="narrative-workspace__skill-check-editor">
					<label>
						С дня исключения
						<input
							aria-label="С дня исключения"
							type="number"
							min={1}
							max={project.template.dayCount}
							value={draft.range.fromDay}
							onChange={event => {
								if (draft.range.mode === 'one-day') {
									return;
								}
								setDraft({
									range:
										draft.range.mode === 'bounded'
											? {
													mode: 'bounded',
													fromDay: event.target.value,
													toDay: draft.range.toDay
											  }
											: {
													mode: 'through-project-end',
													fromDay: event.target.value
											  }
								});
							}}
						/>
					</label>
					{draft.range.mode === 'bounded' && (
						<label>
							По день исключения
							<input
								aria-label="По день исключения"
								type="number"
								min={1}
								max={project.template.dayCount}
								value={draft.range.toDay}
								onChange={event => {
									if (draft.range.mode !== 'bounded') {
										return;
									}
									setDraft({
										range: {
											mode: 'bounded',
											fromDay: draft.range.fromDay,
											toDay: event.target.value
										}
									});
								}}
							/>
						</label>
					)}
				</div>
			)}

			<select
				aria-label="Тип временного окна исключения"
				value={draft.window.mode}
				onChange={event => {
					const mode = event.target.value as ScheduleExceptionWindowDraft['mode'];
					setDraft({
						window:
							mode === 'period'
								? {mode, periodId: project.template.periods[0]?.id ?? ''}
								: {
										mode,
										startTime: '09:00',
										endTime: '17:00',
										endDayOffset: '0'
									  },
						windowNeedsExplicitRepair: false
					});
				}}
			>
				<option value="period">Период суток</option>
				<option value="exact">Точное время</option>
			</select>
			{draft.window.mode === 'period' ? (
				<select
					aria-label="Период исключения"
					value={draft.window.periodId}
					onChange={event =>
						setDraft({
							window: {mode: 'period', periodId: event.target.value},
							windowNeedsExplicitRepair: false
						})
					}
				>
					<option value="">Выбери период</option>
					{project.template.periods.map(period => (
						<option key={period.id} value={period.id}>
							{period.label}
						</option>
					))}
				</select>
			) : (
				<div className="narrative-workspace__skill-check-editor">
					<label>
						Начало исключения
						<input
							aria-label="Начало исключения"
							type="time"
							value={draft.window.startTime}
							onChange={event => {
								if (draft.window.mode !== 'exact') {
									return;
								}
								setDraft({
									window: {
										mode: 'exact',
										startTime: event.target.value,
										endTime: draft.window.endTime,
										endDayOffset: draft.window.endDayOffset
									},
									windowNeedsExplicitRepair: false
								});
							}}
						/>
					</label>
					<label>
						Конец исключения
						<input
							aria-label="Конец исключения"
							type="time"
							value={draft.window.endTime}
							onChange={event => {
								if (draft.window.mode !== 'exact') {
									return;
								}
								setDraft({
									window: {
										mode: 'exact',
										startTime: draft.window.startTime,
										endTime: event.target.value,
										endDayOffset: draft.window.endDayOffset
									},
									windowNeedsExplicitRepair: false
								});
							}}
						/>
					</label>
					<select
						aria-label="День окончания исключения"
						value={draft.window.endDayOffset}
						onChange={event =>
							setDraft({
								window: {
									...draft.window,
									endDayOffset: event.target.value as '0' | '1'
								},
								windowNeedsExplicitRepair: false
							})
						}
					>
						<option value="0">В тот же день</option>
						<option value="1">На следующий день</option>
					</select>
				</div>
			)}

			<select
				aria-label="Тип назначения исключения"
				value={draft.intent.mode}
				onChange={event => {
					const mode = event.target.value as ScheduleExceptionIntentDraft['mode'];
					if (mode === 'location') {
						setDraft({intent: {mode, locationId: ''}});
					} else if (mode === 'absent') {
						setDraft({intent: {mode}});
					} else {
						setDraft({intent: {mode: 'unset'}});
					}
				}}
			>
				<option value="unset">Выбери назначение</option>
				{draft.intent.mode === 'conflicting-import' && (
					<option value="conflicting-import">
						Выбери одно назначение: локацию или отсутствие.'
				</option>
				)}
				<option value="location">Находиться в локации</option>
				<option value="absent">От