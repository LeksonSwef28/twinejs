import * as React from 'react';
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within
} from '@testing-library/react';
import {ScheduleException} from '../../../../domain/narrative/schedule';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {
	NarrativeProjectProvider,
	useNarrativeProject
} from '../../../../store/narrative-project';
import {createLocalStorageNarrativeProjectRepository} from '../../../../store/narrative-project/repository';
import {RoutineAuthoringPanel} from '../routine-authoring-panel';

const periodId = ninetyThreeDaysTemplate.periods[0]?.id ?? 'morning';

function modernException(
	id = 'exception-a',
	overrides: Partial<ScheduleException> = {}
): ScheduleException {
	return {
		id,
		characterId: 'katya',
		activeRange: {fromDay: 2, toDay: 2},
		timeWindow: {type: 'period', periodId},
		targetLocationId: 'home',
		priority: 1,
		reason: 'Базовое исключение',
		...overrides
	};
}

function authoringProject(exceptions: ScheduleException[] = []) {
	const project = createNarrativeProject(
		'story-a67-d3-schedule-exceptions',
		'A67-D3 Schedule Exception UI',
		ninetyThreeDaysTemplate
	);
	project.locations.push(
		{id: 'home', name: 'Дом'},
		{id: 'cafe', name: 'Кафе'}
	);
	project.characters.push(
		{
			id: 'katya',
			name: 'Катя',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'katya-profile'
		},
		{
			id: 'misha',
			name: 'Миша',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'misha-profile'
		}
	);
	project.behaviorProfiles.push(
		{id: 'katya-profile', characterId: 'katya', name: 'Катя — обычно'},
		{id: 'misha-profile', characterId: 'misha', name: 'Миша — обычно'}
	);
	project.scheduleExceptions.push(...exceptions);
	return project;
}

const ScheduleExceptionTestHarness: React.FC = () => {
	const {project, execute, replaceRuntimeProject} = useNarrativeProject();
	const [sabotageNextSave, setSabotageNextSave] = React.useState(false);

	function updateException(id: string, priority: number) {
		const current = project.scheduleExceptions.find(item => item.id === id);
		if (!current) {
			return;
		}
		execute({
			type: 'scheduleException/update',
			candidate: {
				id,
				characterId: 'katya',
				activeRange: {fromDay: 2, toDay: 2},
				timeWindow: {type: 'period', periodId},
				intent: {type: 'location', locationId: 'home'},
				priority,
				reason: current.reason
			}
		});
	}

	return (
		<div
			onClickCapture={event => {
				if (
					sabotageNextSave &&
					event.target instanceof HTMLButtonElement &&
					event.target.textContent === 'Сохранить исключение'
				) {
					setSabotageNextSave(false);
					execute({type: 'scheduleException/remove', id: 'exception-a'});
				}
			}}
		>
			<output data-testid="canonical-exceptions">
				{JSON.stringify(project.scheduleExceptions)}
			</output>
			<output data-testid="canonical-simulation">
				{`${project.simulation.day}:${project.simulation.minuteOfDay}`}
			</output>
			<button
				type="button"
				onClick={() =>
					replaceRuntimeProject({
						...project,
						simulation: {
							...project.simulation,
							day: project.simulation.day === 1 ? 2 : 1
						}
					})
				}
			>
				runtime-root-update
			</button>
			<button type="button" onClick={() => updateException('exception-b', 4)}>
				update-other-exception
			</button>
			<button type="button" onClick={() => updateException('exception-a', 2)}>
				external-target-b
			</button>
			<button type="button" onClick={() => updateException('exception-a', 1)}>
				external-target-a
			</button>
			<button type="button" onClick={() => setSabotageNextSave(true)}>
				arm-stale-save
			</button>
			<RoutineAuthoringPanel />
		</div>
	);
};

function renderPanel(exceptions: ScheduleException[] = []) {
	const project = authoringProject(exceptions);
	createLocalStorageNarrativeProjectRepository(
		project.hostStoryId,
		project.name,
		ninetyThreeDaysTemplate
	).save(project);
	return render(
		<NarrativeProjectProvider
			hostStoryId={project.hostStoryId}
			projectName={project.name}
		>
			<ScheduleExceptionTestHarness />
		</NarrativeProjectProvider>
	);
}

function canonicalExceptions(): ScheduleException[] {
	return JSON.parse(
		screen.getByTestId('canonical-exceptions').textContent ?? '[]'
	) as ScheduleException[];
}

function fillCreateLocation(priority = '1') {
	fireEvent.change(screen.getByLabelText('Персонаж исключения'), {
		target: {value: 'katya'}
	});
	fireEvent.change(screen.getByLabelText('Тип назначения исключения'), {
		target: {value: 'location'}
	});
	fireEvent.change(screen.getByLabelText('Локация исключения'), {
		target: {value: 'home'}
	});
	fireEvent.change(screen.getByLabelText('Приоритет исключения'), {
		target: {value: priority}
	});
}

function startSingleEdit() {
	fireEvent.click(
		screen.getByRole('button', {name: 'Редактировать исключение'})
	);
}

function exceptionCards() {
	return screen.getAllByRole('article');
}

describe('A67-D3 Schedule Exception authoring UI', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('renders the section and all stable form labels through explicit mode changes', () => {
		renderPanel();
		expect(
			screen.getByRole('region', {name: 'Исключения расписания'})
		).toBeInTheDocument();
		expect(screen.getByLabelText('Персонаж исключения')).toBeInTheDocument();
		expect(screen.getByLabelText('Тип диапазона исключения')).toBeInTheDocument();
		expect(screen.getByLabelText('День исключения')).toBeInTheDocument();
		expect(
			screen.getByLabelText('Тип временного окна исключения')
		).toBeInTheDocument();
		expect(screen.getByLabelText('Период исключения')).toBeInTheDocument();
		expect(screen.getByLabelText('Тип назначения исключения')).toBeInTheDocument();
		expect(screen.getByLabelText('Приоритет исключения')).toBeInTheDocument();
		expect(screen.getByLabelText('Причина исключения')).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Тип диапазона исключения'), {
			target: {value: 'bounded'}
		});
		expect(screen.getByLabelText('С дня исключения')).toBeInTheDocument();
		expect(screen.getByLabelText('По день исключения')).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Тип временного окна исключения'), {
			target: {value: 'exact'}
		});
		expect(screen.getByLabelText('Начало исключения')).toBeInTheDocument();
		expect(screen.getByLabelText('Конец исключения')).toBeInTheDocument();
		expect(screen.getByLabelText('День окончания исключения')).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Тип назначения исключения'), {
			target: {value: 'location'}
		});
		expect(screen.getByLabelText('Локация исключения')).toBeInTheDocument();
	});

	test('creates Location and Absent exceptions through canonical commands', async () => {
		renderPanel();
		fillCreateLocation();
		fireEvent.click(screen.getByRole('button', {name: '+ Исключение'}));
		await waitFor(() => expect(canonicalExceptions()).toHaveLength(1));
		expect(canonicalExceptions()[0].targetLocationId).toBe('home');
		expect(canonicalExceptions()[0].absent).toBeUndefined();

		fireEvent.change(screen.getByLabelText('Персонаж исключения'), {
			target: {value: 'misha'}
		});
		fireEvent.change(screen.getByLabelText('Тип назначения исключения'), {
			target: {value: 'absent'}
		});
		fireEvent.change(screen.getByLabelText('Приоритет исключения'), {
			target: {value: '2'}
		});
		fireEvent.click(screen.getByRole('button', {name: '+ Исключение'}));
		await waitFor(() => expect(canonicalExceptions()).toHaveLength(2));
		expect(canonicalExceptions()[1].absent).toBe(true);
		expect(canonicalExceptions()[1].targetLocationId).toBeUndefined();
	});

	test('commits explicit cross-midnight and same-time +1 exact windows', async () => {
		renderPanel();
		fillCreateLocation();
		fireEvent.change(screen.getByLabelText('Тип временного окна исключения'), {
			target: {value: 'exact'}
		});
		fireEvent.change(screen.getByLabelText('Начало исключения'), {
			target: {value: '23:00'}
		});
		fireEvent.change(screen.getByLabelText('Конец исключения'), {
			target: {value: '01:00'}
		});
		fireEvent.change(screen.getByLabelText('День окончания исключения'), {
			target: {value: '1'}
		});
		fireEvent.click(screen.getByRole('button', {name: '+ Исключение'}));
		await waitFor(() => expect(canonicalExceptions()).toHaveLength(1));
		expect(canonicalExceptions()[0].timeWindow).toEqual({
			type: 'exact',
			startMinute: 23 * 60,
			endMinute: 60,
			endDayOffset: 1
		});

		fillCreateLocation('2');
		fireEvent.change(screen.getByLabelText('Тип временного окна исключения'), {
			target: {value: 'exact'}
		});
		fireEvent.change(screen.getByLabelText('Начало исключения'), {
			target: {value: '09:00'}
		});
		fireEvent.change(screen.getByLabelText('Конец исключения'), {
			target: {value: '09:00'}
		});
		fireEvent.change(screen.getByLabelText('День окончания исключения'), {
			target: {value: '1'}
		});
		expect(screen.getByRole('button', {name: '+ Исключение'})).toBeEnabled();
		fireEvent.click(screen.getByRole('button', {name: '+ Исключение'}));
		await waitFor(() => expect(canonicalExceptions()).toHaveLength(2));
		expect(canonicalExceptions()[1].timeWindow).toEqual({
			type: 'exact',
			startMinute: 9 * 60,
			endMinute: 9 * 60,
			endDayOffset: 1
		});
	});

	test('does not coerce blank priority to zero but accepts explicit zero', async () => {
		renderPanel();
		fillCreateLocation('');
		expect(screen.getByRole('button', {name: '+ Исключение'})).toBeDisabled();
		expect(canonicalExceptions()).toHaveLength(0);

		fireEvent.change(screen.getByLabelText('Приоритет исключения'), {
			target: {value: '0'}
		});
		expect(screen.getByRole('button', {name: '+ Исключение'})).toBeEnabled();
		fireEvent.click(screen.getByRole('button', {name: '+ Исключение'}));
		await waitFor(() => expect(canonicalExceptions()).toHaveLength(1));
		expect(canonicalExceptions()[0].priority).toBe(0);
	});

	test('writes through-project-end range without materializing toDay', async () => {
		renderPanel();
		fillCreateLocation();
		fireEvent.change(screen.getByLabelText('Тип диапазона исключения'), {
			target: {value: 'through-project-end'}
		});
		fireEvent.change(screen.getByLabelText('С дня исключения'), {
			target: {value: '7'}
		});
		fireEvent.click(screen.getByRole('button', {name: '+ Исключение'}));
		await waitFor(() => expect(canonicalExceptions()).toHaveLength(1));
		expect(canonicalExceptions()[0].activeRange).toEqual({fromDay: 7});
		expect(canonicalExceptions()[0].activeRange).not.toHaveProperty('toDay');
	});

	test('edits a valid exception, disables same-value apply, and Cancel never mutates', async () => {
		renderPanel([modernException()]);
		const before = screen.getByTestId('canonical-exceptions').textContent;
		startSingleEdit();
		expect(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		).toBeDisabled();
		fireEvent.change(screen.getByLabelText('Приоритет исключения'), {
			target: {value: '3'}
		});
		fireEvent.click(
			screen.getByRole('button', {name: 'Отменить редактирование исключения'})
		);
		expect(screen.getByTestId('canonical-exceptions').textContent).toBe(before);

		startSingleEdit();
		fireEvent.change(screen.getByLabelText('Приоритет исключения'), {
			target: {value: '3'}
		});
		fireEvent.click(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		);
		await waitFor(() => expect(canonicalExceptions()[0].priority).toBe(3));
		expect(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		).toBeDisabled();
	});

	test('reads legacy period without mutation and modernizes only after meaningful edit', async () => {
		const legacy = modernException('exception-a', {
			timeWindow: undefined,
			periodId
		});
		renderPanel([legacy]);
		const before = screen.getByTestId('canonical-exceptions').textContent;
		expect(screen.getByText(/\(legacy\)/)).toBeInTheDocument();
		startSingleEdit();
		expect(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		).toBeDisabled();
		expect(screen.getByTestId('canonical-exceptions').textContent).toBe(before);

		fireEvent.change(screen.getByLabelText('Приоритет исключения'), {
			target: {value: '5'}
		});
		fireEvent.click(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		);
		await waitFor(() => expect(canonicalExceptions()[0].priority).toBe(5));
		expect(canonicalExceptions()[0].timeWindow).toEqual({
			type: 'period',
			periodId
		});
		expect(canonicalExceptions()[0].periodId).toBeUndefined();
	});

	test('keeps unresolved Character and Location records inspectable and removable', () => {
		renderPanel([
			modernException('exception-a', {characterId: 'missing-character'}),
			modernException('exception-b', {targetLocationId: 'missing-location'})
		]);
		expect(
			screen.getByText('Персонаж не найден: missing-character')
		).toBeInTheDocument();
		expect(
			screen.getByText('Локация не найдена: missing-location')
		).toBeInTheDocument();

		const cards = exceptionCards();
		fireEvent.click(
			within(cards[0]).getByRole('button', {name: 'Редактировать исключение'})
		);
		expect(screen.getByLabelText('Персонаж исключения')).toHaveValue('');
		expect(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		).toBeDisabled();
		fireEvent.click(
			screen.getByRole('button', {name: 'Отменить редактирование исключения'})
		);

		fireEvent.click(
			within(exceptionCards()[1]).getByRole('button', {
				name: 'Редактировать исключение'
			})
		);
		expect(screen.getByLabelText('Локация исключения')).toHaveValue('');
		expect(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		).toBeDisabled();
	});

	test('requires explicit repair for conflicting and unspecified intent', async () => {
		const conflicting = modernException('exception-a', {absent: true});
		const unspecified = modernException('exception-b', {
			targetLocationId: undefined,
			absent: undefined
		});
		renderPanel([conflicting, unspecified]);

		fireEvent.click(
			within(exceptionCards()[0]).getByRole('button', {
				name: 'Редактировать исключение'
			})
		);
		expect(screen.getByLabelText('Тип назначения исключения')).toHaveValue(
			'conflicting-import'
		);
		expect(
			screen.getByText('Выбери одно назначение: локацию или отсутствие.')
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		).toBeDisabled();
		fireEvent.change(screen.getByLabelText('Тип назначения исключения'), {
			target: {value: 'absent'}
		});
		fireEvent.click(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		);
		await waitFor(() => expect(canonicalExceptions()[0].targetLocationId).toBeUndefined());
		expect(canonicalExceptions()[0].absent).toBe(true);

		fireEvent.click(
			within(exceptionCards()[1]).getByRole('button', {
				name: 'Редактировать исключение'
			})
		);
		expect(screen.getByLabelText('Тип назначения исключения')).toHaveValue('unset');
		expect(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		).toBeDisabled();
		fireEvent.change(screen.getByLabelText('Тип назначения исключения'), {
			target: {value: 'absent'}
		});
		expect(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		).toBeEnabled();
	});

	test('keeps missing period safe and malformed raw exception removable', async () => {
		renderPanel([
			modernException('exception-a', {
				timeWindow: {type: 'period', periodId: 'missing-period'}
			}),
			modernException('exception-b', {activeRange: {fromDay: 0, toDay: -1}})
		]);
		expect(screen.getByText('Период не найден: missing-period')).toBeInTheDocument();
		fireEvent.click(
			within(exceptionCards()[0]).getByRole('button', {
				name: 'Редактировать исключение'
			})
		);
		expect(screen.getByLabelText('Период исключения')).toHaveValue('');
		expect(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		).toBeDisabled();
		fireEvent.click(
			screen.getByRole('button', {name: 'Отменить редактирование исключения'})
		);

		fireEvent.click(
			within(exceptionCards()[1]).getByRole('button', {name: 'Удалить исключение'})
		);
		await waitFor(() => expect(canonicalExceptions()).toHaveLength(1));
		expect(canonicalExceptions()[0].id).toBe('exception-a');
	});

	test('dirty draft survives unrelated runtime/root changes and another exception update', async () => {
		renderPanel([
			modernException('exception-a'),
			modernException('exception-b', {priority: 3})
		]);
		fireEvent.click(
			within(exceptionCards()[0]).getByRole('button', {
				name: 'Редактировать исключение'
			})
		);
		fireEvent.change(screen.getByLabelText('Приоритет исключения'), {
			target: {value: '7'}
		});
		const simulationBefore = screen.getByTestId('canonical-simulation').textContent;
		fireEvent.click(screen.getByText('runtime-root-update'));
		await waitFor(() =>
			expect(screen.getByTestId('canonical-simulation').textContent).not.toBe(
				simulationBefore
			)
		);
		expect(screen.getByLabelText('Приоритет исключения')).toHaveValue(7);

		fireEvent.click(screen.getByText('update-other-exception'));
		await waitFor(() => expect(canonicalExceptions()[1].priority).toBe(4));
		expect(screen.getByLabelText('Приоритет исключения')).toHaveValue(7);
	});

	test('same-id canonical change rebases dirty edit and A→B→A never resurrects old draft', async () => {
		renderPanel([modernException('exception-a')]);
		startSingleEdit();
		fireEvent.change(screen.getByLabelText('Приоритет исключения'), {
			target: {value: '7'}
		});
		fireEvent.click(screen.getByText('external-target-b'));
		await waitFor(() =>
			expect(screen.getByLabelText('Приоритет исключения')).toHaveValue(2)
		);
		expect(
			screen.getByText(
				'Исключение изменилось в проекте. Черновик обновлён из текущего состояния.'
			)
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText('Приоритет исключения'), {
			target: {value: '8'}
		});
		fireEvent.click(screen.getByText('external-target-a'));
		await waitFor(() =>
			expect(screen.getByLabelText('Приоритет исключения')).toHaveValue(1)
		);
		expect(screen.getByLabelText('Приоритет исключения')).not.toHaveValue(7);
	});

	test('rejected stale-target update settles without a timer and unlocks the form', async () => {
		renderPanel([modernException('exception-a')]);
		startSingleEdit();
		fireEvent.change(screen.getByLabelText('Приоритет исключения'), {
			target: {value: '7'}
		});
		fireEvent.click(screen.getByText('arm-stale-save'));
		fireEvent.click(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		);
		await waitFor(() => expect(canonicalExceptions()).toHaveLength(0));
		await waitFor(() =>
			expect(screen.getByRole('button', {name: '+ Исключение'})).toBeInTheDocument()
		);
		fillCreateLocation();
		expect(screen.getByRole('button', {name: '+ Исключение'})).toBeEnabled();
	});

	test('remove exits edit only after canonical absence is confirmed', async () => {
		renderPanel([modernException('exception-a')]);
		startSingleEdit();
		expect(
			screen.getByRole('button', {name: 'Сохранить исключение'})
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole('button', {name: 'Удалить исключение'})
		);
		await waitFor(() => expect(canonicalExceptions()).toHaveLength(0));
		await waitFor(() =>
			expect(screen.getByRole('button', {name: '+ Исключение'})).toBeInTheDocument()
		);
		expect(screen.queryByRole('button', {name: 'Сохранить исключение'})).toBeNull();
	});
});
