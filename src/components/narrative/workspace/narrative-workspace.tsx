import * as React from 'react';
import {weekdayForDay} from '../../../domain/narrative/calendar';
import {CognitionTier} from '../../../domain/narrative/entities';
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

export const NarrativeWorkspace: React.FC = () => {
	const {project, execute, undo, redo, canUndo, canRedo, saveStatus, createId} =
		useNarrativeProject();
	const [locationName, setLocationName] = React.useState('');
	const [characterName, setCharacterName] = React.useState('');
	const [cognitionTier, setCognitionTier] = React.useState<CognitionTier>('full');
	const weekday = weekdayForDay(project.editor.selectedDay, project.template.day1Weekday);

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

	return (
		<section className="narrative-workspace">
			<header className="narrative-workspace__header">
				<div>
					<p className="narrative-workspace__eyebrow">Narrative Editor</p>
					<h1>{project.name}</h1>
					<p className="narrative-workspace__meta">
						{project.template.displayName} · {project.template.dayCount} дней · переходное окно{' '}
						{project.template.presenceTransition.defaultTransitionWindowMinutes} мин
					</p>
				</div>
				<div className="narrative-workspace__actions">
					<span className={`narrative-workspace__save-status is-${saveStatus}`}>
						{saveStatus === 'saved' ? 'Сохранено' : saveStatus === 'saving' ? 'Сохраняю…' : 'Ошибка сохранения'}
					</span>
					<button type="button" onClick={undo} disabled={!canUndo}>Отменить</button>
					<button type="button" onClick={redo} disabled={!canRedo}>Повторить</button>
				</div>
			</header>

			<div className="narrative-workspace__calendar">
				<button
					type="button"
					disabled={project.editor.selectedDay <= 1}
					onClick={() => execute({type: 'editor/selectDay', day: project.editor.selectedDay - 1})}
				>
					←
				</button>
				<strong>День {project.editor.selectedDay} · {weekdayLabels[weekday]}</strong>
				<button
					type="button"
					disabled={project.editor.selectedDay >= project.template.dayCount}
					onClick={() => execute({type: 'editor/selectDay', day: project.editor.selectedDay + 1})}
				>
					→
				</button>
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

			<div className="narrative-workspace__grid">
				<section className="narrative-workspace__panel">
					<h2>Локации <span>{project.locations.length}</span></h2>
					<form onSubmit={addLocation} className="narrative-workspace__form">
						<input value={locationName} placeholder="Например: Бар" onChange={event => setLocationName(event.target.value)} />
						<button type="submit">Добавить</button>
					</form>
					<ul>{project.locations.map(location => <li key={location.id}>{location.name}</li>)}</ul>
					{project.locations.length === 0 && <p className="narrative-workspace__empty">Пока пусто.</p>}
				</section>

				<section className="narrative-workspace__panel">
					<h2>Персонажи <span>{project.characters.length}</span></h2>
					<form onSubmit={addCharacter} className="narrative-workspace__form narrative-workspace__form--character">
						<input value={characterName} placeholder="Например: Катя" onChange={event => setCharacterName(event.target.value)} />
						<select value={cognitionTier} onChange={event => setCognitionTier(event.target.value as CognitionTier)}>
							<option value="full">Full mind</option>
							<option value="light">Light mind</option>
							<option value="background">Background</option>
						</select>
						<button type="submit">Добавить</button>
					</form>
					<ul>{project.characters.map(character => <li key={character.id}>{character.name} <small>{character.cognitionTier}</small></li>)}</ul>
					{project.characters.length === 0 && <p className="narrative-workspace__empty">Пока пусто.</p>}
				</section>
			</div>
		</section>
	);
};
