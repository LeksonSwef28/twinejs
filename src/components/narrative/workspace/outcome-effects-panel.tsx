import * as React from 'react';
import {NarrativeEffectDefinition} from '../../../domain/narrative/interaction';
import {KnowledgeAttitude} from '../../../domain/narrative/knowledge';
import {StoryNodeActivationState} from '../../../domain/narrative/story';
import {useNarrativeProject} from '../../../store/narrative-project';

type EffectMode =
	| 'character-learns-claim'
	| 'relationship-adjust'
	| 'character-mood-set'
	| 'item-set-placement'
	| 'story-node-set-state'
	| 'character-remembers';

type KnowledgeRecipientMode = 'character' | 'move-target';
type KnowledgeClaimMode = 'claim' | 'communicated-claim';
type KnowledgeSourceMode = 'authored' | 'move-actor' | 'observed' | 'inferred';
type ItemDestination = 'unplaced' | 'character' | 'location';
type MemorySourceMode =
	| 'current-move'
	| 'owning-story-node'
	| 'communicated-claim';

const knowledgeAttitudeLabels: Record<KnowledgeAttitude, string> = {
	knows: 'Знает / уверен',
	believes: 'Верит',
	doubts: 'Сомневается',
	disbelieves: 'Не верит'
};

const storyStates: StoryNodeActivationState[] = [
	'draft',
	'dormant',
	'available',
	'active',
	'blocked',
	'completed'
];

export const OutcomeEffectsPanel: React.FC = () => {
	const {project, execute, createId} = useNarrativeProject();
	const [moveId, setMoveId] = React.useState('');
	const [outcomeId, setOutcomeId] = React.useState('');
	const [effectMode, setEffectMode] = React.useState<EffectMode>('relationship-adjust');
	const [knowledgeRecipientMode, setKnowledgeRecipientMode] =
		React.useState<KnowledgeRecipientMode>('character');
	const [knowledgeCharacterId, setKnowledgeCharacterId] = React.useState('');
	const [knowledgeTargetIndex, setKnowledgeTargetIndex] = React.useState(0);
	const [knowledgeClaimMode, setKnowledgeClaimMode] =
		React.useState<KnowledgeClaimMode>('claim');
	const [knowledgeClaimId, setKnowledgeClaimId] = React.useState('');
	const [knowledgeAttitude, setKnowledgeAttitude] =
		React.useState<KnowledgeAttitude>('believes');
	const [knowledgeConfidence, setKnowledgeConfidence] = React.useState(0.75);
	const [knowledgeSource, setKnowledgeSource] =
		React.useState<KnowledgeSourceMode>('authored');
	const [fromCharacterId, setFromCharacterId] = React.useState('');
	const [toCharacterId, setToCharacterId] = React.useState('');
	const [relationshipAxis, setRelationshipAxis] = React.useState('trust');
	const [relationshipDelta, setRelationshipDelta] = React.useState(1);
	const [moodCharacterId, setMoodCharacterId] = React.useState('');
	const [mood, setMood] = React.useState('');
	const [itemInstanceId, setItemInstanceId] = React.useState('');
	const [itemDestination, setItemDestination] = React.useState<ItemDestination>('unplaced');
	const [itemDestinationId, setItemDestinationId] = React.useState('');
	const [storyNodeId, setStoryNodeId] = React.useState('');
	const [storyState, setStoryState] = React.useState<StoryNodeActivationState>('available');
	const [memoryCharacterId, setMemoryCharacterId] = React.useState('');
	const [memorySummary, setMemorySummary] = React.useState('');
	const [memoryImportance, setMemoryImportance] = React.useState(0.7);
	const [memoryBaseStrength, setMemoryBaseStrength] = React.useState(0.7);
	const [memoryTags, setMemoryTags] = React.useState('');
	const [memorySource, setMemorySource] = React.useState<MemorySourceMode>('current-move');
	const [message, setMessage] = React.useState('');

	const move = project.narrativeMoves.find(candidate => candidate.id === moveId);
	const outcome = move?.outcomes.find(candidate => candidate.id === outcomeId);

	React.useEffect(() => {
		if (!moveId && project.narrativeMoves[0]) {
			setMoveId(project.narrativeMoves[0].id);
		}
	}, [moveId, project.narrativeMoves]);

	React.useEffect(() => {
		const selectedMove = project.narrativeMoves.find(candidate => candidate.id === moveId);
		setOutcomeId(selectedMove?.outcomes[0]?.id ?? '');
		setKnowledgeTargetIndex(0);
		if (!selectedMove?.communicatedClaimId) {
			setKnowledgeClaimMode('claim');
		}
		if (!selectedMove?.actorCharacterId) {
			setKnowledgeSource('authored');
		}
		setMessage('');
	}, [moveId, project.narrativeMoves]);

	function addEffect(event: React.FormEvent) {
		event.preventDefault();
		if (!move || !outcome) {
			return;
		}

		let effect: NarrativeEffectDefinition | undefined;
		switch (effectMode) {
			case 'character-learns-claim':
				if (
					(knowledgeRecipientMode === 'character' && !knowledgeCharacterId) ||
					(knowledgeRecipientMode === 'move-target' &&
						!move.targetCharacterIds[knowledgeTargetIndex]) ||
					(knowledgeClaimMode === 'claim' && !knowledgeClaimId) ||
					(knowledgeClaimMode === 'communicated-claim' && !move.communicatedClaimId) ||
					(knowledgeSource === 'move-actor' && !move.actorCharacterId) ||
					!Number.isFinite(knowledgeConfidence) ||
					knowledgeConfidence < 0 ||
					knowledgeConfidence > 1
				) {
					return;
				}
				effect = {
					id: createId('knowledge-effect'),
					type: 'character-learns-claim',
					recipient:
						knowledgeRecipientMode === 'character'
							? {type: 'character', characterId: knowledgeCharacterId}
							: {type: 'move-target', targetIndex: knowledgeTargetIndex},
					claim:
						knowledgeClaimMode === 'claim'
							? {type: 'claim', claimId: knowledgeClaimId}
							: {type: 'communicated-claim'},
					attitude: knowledgeAttitude,
					confidence: knowledgeConfidence,
					source: {type: knowledgeSource}
				};
				break;
			case 'relationship-adjust':
				if (
					!fromCharacterId ||
					!toCharacterId ||
					!relationshipAxis.trim() ||
					!Number.isFinite(relationshipDelta)
				) {
					return;
				}
				effect = {
					id: createId('relationship-effect'),
					type: 'relationship-adjust',
					from: {type: 'character', characterId: fromCharacterId},
					to: {type: 'character', characterId: toCharacterId},
					axis: relationshipAxis.trim(),
					delta: relationshipDelta
				};
				break;
			case 'character-mood-set':
				if (!moodCharacterId || !mood.trim()) {
					return;
				}
				effect = {
					id: createId('mood-effect'),
					type: 'character-mood-set',
					character: {type: 'character', characterId: moodCharacterId},
					mood: mood.trim()
				};
				break;
			case 'item-set-placement':
				if (!itemInstanceId) {
					return;
				}
				if (itemDestination === 'character' && !itemDestinationId) {
					return;
				}
				if (itemDestination === 'location' && !itemDestinationId) {
					return;
				}
				effect = {
					id: createId('item-effect'),
					type: 'item-set-placement',
					itemInstanceId,
					placement:
						itemDestination === 'unplaced'
							? {type: 'unplaced'}
							: itemDestination === 'location'
								? {type: 'location', locationId: itemDestinationId}
								: {
										type: 'character',
										character: {
											type: 'character',
											characterId: itemDestinationId
										}
								  }
				};
				break;
			case 'story-node-set-state':
				if (!storyNodeId) {
					return;
				}
				effect = {
					id: createId('story-state-effect'),
					type: 'story-node-set-state',
					storyNodeId,
					state: storyState
				};
				break;
			case 'character-remembers': {
				if (
					!memoryCharacterId ||
					!memorySummary.trim() ||
					!Number.isFinite(memoryImportance) ||
					memoryImportance < 0 ||
					memoryImportance > 1 ||
					!Number.isFinite(memoryBaseStrength) ||
					memoryBaseStrength < 0 ||
					memoryBaseStrength > 1 ||
					(memorySource === 'communicated-claim' && !move.communicatedClaimId)
				) {
					return;
				}
				effect = {
					id: createId('memory-effect'),
					type: 'character-remembers',
					character: {type: 'character', characterId: memoryCharacterId},
					summary: memorySummary.trim(),
					importance: memoryImportance,
					baseStrength: memoryBaseStrength,
					tags: [
						...new Set(
							memoryTags
								.split(',')
								.map(tag => tag.trim())
								.filter(Boolean)
						)
					],
					source: {type: memorySource}
				};
				break;
			}
		}

		execute({type: 'move/addEffect', moveId: move.id, outcomeId: outcome.id, effect});
		setMessage('Эффект добавлен к выбранному Outcome. Он сработает только при разрешении этого исхода.');
	}

	return (
		<section className="narrative-workspace__move-editor" aria-label="Outcome Effects">
			<h2>Outcome Effects</h2>
			<p>
				Последствия типизированы отдельно от Outcome: знания, отношения, настроение,
				 предмет, Story state и память. Редактирование здесь не меняет текущий preview.
			</p>
			<form className="narrative-workspace__compact-form" onSubmit={addEffect}>
				<select aria-label="Narrative Move для эффекта" value={moveId} onChange={event => setMoveId(event.target.value)}>
					<option value="">Выбери Narrative Move</option>
					{project.narrativeMoves.map(candidate => (
						<option key={candidate.id} value={candidate.id}>{candidate.label}</option>
					))}
				</select>
				<select aria-label="Outcome для эффекта" value={outcomeId} onChange={event => setOutcomeId(event.target.value)} disabled={!move}>
					{move?.outcomes.map(candidate => (
						<option key={candidate.id} value={candidate.id}>{candidate.label}</option>
					))}
				</select>
				<select aria-label="Тип Outcome effect" value={effectMode} onChange={event => setEffectMode(event.target.value as EffectMode)}>
					<option value="character-learns-claim">Персонаж узнаёт / принимает Claim</option>
					<option value="relationship-adjust">Изменить отношение</option>
					<option value="character-mood-set">Изменить настроение</option>
					<option value="item-set-placement">Переместить предмет</option>
					<option value="story-node-set-state">Изменить Story state</option>
					<option value="character-remembers">Создать / усилить воспоминание</option>
				</select>


				{effectMode === 'character-learns-claim' && (
					<>
						<select
							aria-label="Получатель знания"
							value={knowledgeRecipientMode}
							onChange={event =>
								setKnowledgeRecipientMode(event.target.value as KnowledgeRecipientMode)
							}
						>
							<option value="character">Конкретный персонаж</option>
							<option value="move-target">Цель текущего Move</option>
						</select>
						{knowledgeRecipientMode === 'character' ? (
							<select
								aria-label="Персонаж получает Claim"
								value={knowledgeCharacterId}
								onChange={event => setKnowledgeCharacterId(event.target.value)}
							>
								<option value="">Выбери персонажа</option>
								{project.characters.map(character => (
									<option key={character.id} value={character.id}>
										{character.name}
									</option>
								))}
							</select>
						) : (
							<select
								aria-label="Цель Move получает Claim"
								value={knowledgeTargetIndex}
								onChange={event => setKnowledgeTargetIndex(Number(event.target.value))}
							>
								{move.targetCharacterIds.length === 0 ? (
									<option value={0}>У Move нет целей</option>
								) : (
									move.targetCharacterIds.map((characterId, index) => (
										<option key={`${characterId}:${index}`} value={index}>
											Цель {index + 1}:{' '}
											{project.characters.find(character => character.id === characterId)?.name ??
												characterId}
										</option>
									))
								)}
							</select>
						)}
						<select
							aria-label="Claim для knowledge effect"
							value={knowledgeClaimMode}
							onChange={event =>
								setKnowledgeClaimMode(event.target.value as KnowledgeClaimMode)
							}
						>
							<option value="claim">Конкретный Claim</option>
							<option value="communicated-claim" disabled={!move.communicatedClaimId}>
								Claim, который передаёт текущий Move
							</option>
						</select>
						{knowledgeClaimMode === 'claim' && (
							<select
								aria-label="Конкретный Claim knowledge effect"
								value={knowledgeClaimId}
								onChange={event => setKnowledgeClaimId(event.target.value)}
							>
								<option value="">Выбери Claim</option>
								{project.claims.map(claim => (
									<option key={claim.id} value={claim.id}>
										{claim.text}
									</option>
								))}
							</select>
						)}
						<select
							aria-label="Отношение к Claim"
							value={knowledgeAttitude}
							onChange={event =>
								setKnowledgeAttitude(event.target.value as KnowledgeAttitude)
							}
						>
							{Object.entries(knowledgeAttitudeLabels).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
						<label>
							Уверенность 0–1
							<input
								aria-label="Уверенность в Claim"
								type="number"
								min={0}
								max={1}
								step={0.05}
								value={knowledgeConfidence}
								onChange={event => setKnowledgeConfidence(Number(event.target.value))}
							/>
						</label>
						<select
							aria-label="Источник knowledge effect"
							value={knowledgeSource}
							onChange={event =>
								setKnowledgeSource(event.target.value as KnowledgeSourceMode)
							}
						>
							<option value="authored">Авторское знание / убеждение</option>
							<option value="move-actor" disabled={!move.actorCharacterId}>
								Актор текущего Move
							</option>
							<option value="observed">Наблюдение</option>
							<option value="inferred">Вывод персонажа</option>
						</select>
					</>
				)}

				{effectMode === 'relationship-adjust' && (
					<>
						<select aria-label="Отношение от персонажа" value={fromCharacterId} onChange={event => setFromCharacterId(event.target.value)}>
							<option value="">Кто меняет отношение</option>
							{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
						</select>
						<select aria-label="Отношение к персонажу" value={toCharacterId} onChange={event => setToCharacterId(event.target.value)}>
							<option value="">К кому</option>
							{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
						</select>
						<input aria-label="Ось отношения" value={relationshipAxis} onChange={event => setRelationshipAxis(event.target.value)} placeholder="trust" />
						<input aria-label="Изменение отношения" type="number" value={relationshipDelta} onChange={event => setRelationshipDelta(Number(event.target.value))} />
					</>
				)}

				{effectMode === 'character-mood-set' && (
					<>
						<select aria-label="Персонаж для mood" value={moodCharacterId} onChange={event => setMoodCharacterId(event.target.value)}>
							<option value="">Выбери персонажа</option>
							{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
						</select>
						<input aria-label="Новое настроение" value={mood} onChange={event => setMood(event.target.value)} placeholder="angry / relieved / afraid" />
					</>
				)}

				{effectMode === 'item-set-placement' && (
					<>
						<select aria-label="ItemInstance для эффекта" value={itemInstanceId} onChange={event => setItemInstanceId(event.target.value)}>
							<option value="">Выбери экземпляр предмета</option>
							{project.itemInstances.map(item => <option key={item.id} value={item.id}>{project.itemDefinitions.find(definition => definition.id === item.definitionId)?.name ?? item.id}</option>)}
						</select>
						<select aria-label="Куда переместить предмет" value={itemDestination} onChange={event => {setItemDestination(event.target.value as ItemDestination); setItemDestinationId('');}}>
							<option value="unplaced">Убрать из размещения</option>
							<option value="character">Передать персонажу</option>
							<option value="location">Переместить в локацию</option>
						</select>
						{itemDestination === 'character' && (
							<select aria-label="Получатель предмета" value={itemDestinationId} onChange={event => setItemDestinationId(event.target.value)}>
								<option value="">Выбери персонажа</option>
								{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
							</select>
						)}
						{itemDestination === 'location' && (
							<select aria-label="Локация предмета" value={itemDestinationId} onChange={event => setItemDestinationId(event.target.value)}>
								<option value="">Выбери локацию</option>
								{project.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
							</select>
						)}
					</>
				)}

				{effectMode === 'story-node-set-state' && (
					<>
						<select aria-label="Story node для state effect" value={storyNodeId} onChange={event => setStoryNodeId(event.target.value)}>
							<option value="">Выбери Story node</option>
							{project.storyNodes.map(node => <option key={node.id} value={node.id}>{node.title}</option>)}
						</select>
						<select aria-label="Новый Story state" value={storyState} onChange={event => setStoryState(event.target.value as StoryNodeActivationState)}>
							{storyStates.map(state => <option key={state} value={state}>{state}</option>)}
						</select>
					</>
				)}

				{effectMode === 'character-remembers' && (
					<>
						<select aria-label="Персонаж для воспоминания" value={memoryCharacterId} onChange={event => setMemoryCharacterId(event.target.value)}>
							<option value="">Кто запомнит</option>
							{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
						</select>
						<input aria-label="Содержание воспоминания" value={memorySummary} onChange={event => setMemorySummary(event.target.value)} placeholder="Что персонаж запомнит" />
						<label>
							Важность памяти 0–1
							<input aria-label="Важность воспоминания" type="number" min={0} max={1} step={0.05} value={memoryImportance} onChange={event => setMemoryImportance(Number(event.target.value))} />
						</label>
						<label>
							Начальная сила 0–1
							<input aria-label="Сила воспоминания" type="number" min={0} max={1} step={0.05} value={memoryBaseStrength} onChange={event => setMemoryBaseStrength(Number(event.target.value))} />
						</label>
						<input aria-label="Теги воспоминания" value={memoryTags} onChange={event => setMemoryTags(event.target.value)} placeholder="страх, семья, обещание" />
						<select aria-label="Источник воспоминания" value={memorySource} onChange={event => setMemorySource(event.target.value as MemorySourceMode)}>
							<option value="current-move">Текущий Move / Outcome</option>
							<option value="owning-story-node">Story node</option>
							<option value="communicated-claim" disabled={!move?.communicatedClaimId}>Переданный Claim</option>
						</select>
					</>
				)}

				<button type="submit" disabled={!move || !outcome}>Добавить эффект</button>
				{outcome && <small>Эффектов в Outcome: {outcome.effects?.length ?? 0}</small>}
				{message && <small>{message}</small>}
			</form>
		</section>
	);
};
