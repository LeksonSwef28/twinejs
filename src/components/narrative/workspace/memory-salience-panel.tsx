import * as React from 'react';
import {memorySalienceAt} from '../../../domain/narrative/memory';
import {useNarrativeProject} from '../../../store/narrative-project';

export const MemorySaliencePanel: React.FC = () => {
	const {project} = useNarrativeProject();
	const [characterId, setCharacterId] = React.useState('');
	const selectedCharacterId =
		characterId && project.characters.some(character => character.id === characterId)
			? characterId
			: project.characters[0]?.id ?? '';
	const character = project.characters.find(
		candidate => candidate.id === selectedCharacterId
	);
	const moment = {
		day: project.simulation.day,
		minuteOfDay: project.simulation.minuteOfDay
	};
	const memories = project.memories
		.filter(memory => memory.characterId === selectedCharacterId)
		.map(memory => ({memory, trace: memorySalienceAt(memory, moment)}))
		.sort(
			(a, b) =>
				b.trace.salience - a.trace.salience ||
				a.memory.id.localeCompare(b.memory.id)
		);

	return (
		<section className="narrative-workspace__move-editor" aria-label="Memory Salience">
			<h2>Memory Salience</h2>
			<p>
				Salience — производная оценка текущей доступности воспоминания. Ослабление
				 не удаляет MemoryTrace и не меняет Fact, Claim или CharacterKnowledge.
			</p>
			<select
				aria-label="Персонаж для Memory Salience"
				value={selectedCharacterId}
				onChange={event => setCharacterId(event.target.value)}
			>
				{project.characters.map(candidate => (
					<option key={candidate.id} value={candidate.id}>
						{candidate.name}
					</option>
				))}
			</select>
			{!character ? (
				<small>Сначала добавь персонажа.</small>
			) : memories.length === 0 ? (
				<small>У {character.name} пока нет runtime MemoryTrace.</small>
			) : (
				<div className="narrative-workspace__reaction-set">
					{memories.map(({memory, trace}) => (
						<div key={memory.id}>
							<strong>{memory.summary}</strong>
							<small>
								salience {trace.salience.toFixed(2)} · strength{' '}
								{trace.decayedStrength.toFixed(2)} · importance{' '}
								{trace.importance.toFixed(2)} · reinforcement{' '}
								{trace.reinforcementCount}
							</small>
							<small>
								возраст от последнего reinforcement: {trace.ageDays.toFixed(1)} дн.
							</small>
						</div>
					))}
				</div>
			)}
		</section>
	);
};
