import * as React from 'react';
import {
	StoryInterruptionPolicy,
	StoryNodeKind,
	StoryOccurrenceMode
} from '../../../domain/narrative/story';
import {useNarrativeProject} from '../../../store/narrative-project';

const storyKindLabels: Record<StoryNodeKind, string> = {
	beat: 'Сюжетный бит',
	event: 'Событие',
	dialogue: 'Диалог',
	condition: 'Условие',
	effect: 'Последствие'
};

export const StoryMetadataPanel: React.FC = () => {
	const {project, execute} = useNarrativeProject();
	const [nodeId, setNodeId] = React.useState('');
	const selectedNodeId =
		nodeId && project.storyNodes.some(node => node.id === nodeId)
			? nodeId
			: project.storyNodes[0]?.id ?? '';
	const node = project.storyNodes.find(candidate => candidate.id === selectedNodeId);
	const [title, setTitle] = React.useState('');
	const [description, setDescription] = React.useState('');
	const [kind, setKind] = React.useState<StoryNodeKind>('beat');
	const [primaryCharacterId, setPrimaryCharacterId] = React.useState('');
	const [participantIds, setParticipantIds] = React.useState<string[]>([]);
	const [occurrenceMode, setOccurrenceMode] =
		React.useState<StoryOccurrenceMode>('one-shot');
	const [durationMinutes, setDurationMinutes] = React.useState('0');
	const [expiryEnabled, setExpiryEnabled] = React.useState(false);
	const [missAfterMinutes, setMissAfterMinutes] = React.useState('0');
	const [interruption, setInterruption] =
		React.useState<StoryInterruptionPolicy>('interruptible');

	React.useEffect(() => {
		if (!node) {
			setTitle('');
			setDescription('');
			setParticipantIds([]);
			return;
		}
		setTitle(node.title);
		setDescription(node.description ?? '');
		setKind(node.kind);
		setPrimaryCharacterId(node.primaryCharacterId ?? '');
		setParticipantIds(node.participantIds);
		setOccurrenceMode(node.runtimePolicy?.occurrenceMode ?? 'one-shot');
		setDurationMinutes(String(node.runtimePolicy?.durationMinutes ?? 0));
		setExpiryEnabled(node.runtimePolicy?.missAfterMinutes !== undefined);
		setMissAfterMinutes(String(node.runtimePolicy?.missAfterMinutes ?? 0));
		setInterruption(node.runtimePolicy?.interruption ?? 'interruptible');
	}, [node]);

	function toggleParticipant(characterId: string) {
		setParticipantIds(current =>
			current.includes(characterId)
				? current.filter(id => id !== characterId)
				: [...current, characterId]
		);
	}

	function save(event: React.FormEvent) {
		event.preventDefault();
		if (!node || !title.trim()) {
			return;
		}
		const duration = Number(durationMinutes);
		const missAfter = Number(missAfterMinutes);
		if (
			!Number.isInteger(duration) ||
			duration < 0 ||
			(expiryEnabled && (!Number.isInteger(missAfter) || missAfter < 0))
		) {
			return;
		}
		execute({
			type: 'story/updateAuthoring',
			id: node.id,
			kind,
			title,
			description,
			primaryCharacterId: primaryCharacterId || undefined,
			participantIds,
			runtimePolicy: {
				occurrenceMode,
				durationMinutes: duration,
				missAfterMinutes: expiryEnabled ? missAfter : undefined,
				interruption
			}
		});
	}

	function resetRuntimePolicy() {
		if (!node) {
			return;
		}
		execute({
			type: 'story/updateAuthoring',
			id: node.id,
			kind,
			title,
			description,
			primaryCharacterId: primaryCharacterId || undefined,
			participantIds,
			runtimePolicy: undefined
		});
	}

	return (
		<section
			className="narrative-workspace__move-editor"
			aria-label="Story metadata authoring"
		>
			<h2>Story Metadata</h2>
			<p>
				Редактирует authored definition сюжетного блока. Live state, active execution и
				 occurrence history здесь не меняются.
			</p>
			{project.storyNodes.length === 0 ? (
				<small>Сначала создай сюжетный блок.</small>
			) : (
				<>
					<label>
						Сюжетный блок
						<select
							aria-label="Сюжетный блок для Story metadata"
							value={selectedNodeId}
							onChange={event => setNodeId(event.target.value)}
						>
							{project.storyNodes.map(candidate => (
								<option key={candidate.id} value={candidate.id}>
									{candidate.title}
								</option>
							))}
						</select>
					</label>
					<form onSubmit={save} className="narrative-workspace__compact-form">
						<label>
							Название
							<input
								aria-label="Название Story metadata"
								value={title}
								onChange={event => setTitle(event.target.value)}
							/>
						</label>
						<label>
							Тип
							<select
								aria-label="Тип Story metadata"
								value={kind}
								onChange={event => setKind(event.target.value as StoryNodeKind)}
							>
								{Object.entries(storyKindLabels).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
						</label>
						<label>
							Описание
							<textarea
								aria-label="Описание Story metadata"
								value={description}
								onChange={event => setDescription(event.target.value)}
							/>
						</label>
						<label>
							Главный персонаж
							<select
								aria-label="Главный персонаж Story metadata"
								value={primaryCharacterId}
								onChange={event => setPrimaryCharacterId(event.target.value)}
							>
								<option value="">Не назначен</option>
								{project.characters.map(character => (
									<option key={character.id} value={character.id}>
										{character.name}
									</option>
								))}
							</select>
						</label>
						<fieldset>
							<legend>Участники</legend>
							{project.characters.length === 0 ? (
								<small>В проекте пока нет персонажей.</small>
							) : (
								project.characters.map(character => (
									<label key={character.id}>
										<input
											type="checkbox"
											checked={participantIds.includes(character.id)}
											onChange={() => toggleParticipant(character.id)}
										/>
										{character.name}
									</label>
								))
							)}
						</fieldset>
						<fieldset>
							<legend>Execution policy</legend>
							<label>
								Повторяемость
								<select
									aria-label="Повторяемость Story node"
									value={occurrenceMode}
									onChange={event =>
										setOccurrenceMode(event.target.value as StoryOccurrenceMode)
									}
								>
									<option value="one-shot">Один раз</option>
									<option value="repeatable">Повторяемое</option>
								</select>
							</label>
							<label>
								Длительность, минут
								<input
									aria-label="Длительность Story node"
									type="number"
									min={0}
									step={1}
									value={durationMinutes}
									onChange={event => setDurationMinutes(event.target.value)}
								/>
							</label>
							<label>
								<input
									type="checkbox"
									checked={expiryEnabled}
									onChange={event => setExpiryEnabled(event.target.checked)}
								/>
								Есть окно пропуска после назначенного момента
							</label>
							{expiryEnabled && (
								<label>
									Окно пропуска, минут
									<input
										aria-label="Окно пропуска Story node"
										type="number"
										min={0}
										step={1}
										value={missAfterMinutes}
										onChange={event => setMissAfterMinutes(event.target.value)}
									/>
								</label>
							)}
							<label>
								Прерывание
								<select
									aria-label="Политика прерывания Story node"
									value={interruption}
									onChange={event =>
										setInterruption(event.target.value as StoryInterruptionPolicy)
									}
								>
									<option value="interruptible">Можно прервать</option>
									<option value="locked">Нельзя прервать</option>
								</select>
							</label>
							<button type="button" onClick={resetRuntimePolicy}>
								Сбросить execution policy к defaults
							</button>
						</fieldset>
						<button type="submit">Сохранить Story metadata</button>
					</form>
				</>
			)}
		</section>
	);
};
