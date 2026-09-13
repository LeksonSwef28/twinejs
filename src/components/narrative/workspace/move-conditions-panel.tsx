import * as React from 'react';
import {NarrativeConditionDefinition} from '../../../domain/narrative/interaction';
import {StoryNodeActivationState} from '../../../domain/narrative/story';
import {useNarrativeProject} from '../../../store/narrative-project';

type ConditionType = NarrativeConditionDefinition['type'];

const storyStates: StoryNodeActivationState[] = [
	'draft',
	'dormant',
	'available',
	'active',
	'blocked',
	'completed'
];

const conditionLabels: Record<ConditionType, string> = {
	'character-knows-claim': 'Персонаж знает Claim',
	'character-has-item': 'У персонажа есть предмет',
	'relationship-at-least': 'Отношение не ниже значения',
	'story-node-state': 'Story node находится в состоянии',
	'characters-share-location': 'Персонажи находятся в одной локации'
};

export const MoveConditionsPanel: React.FC = () => {
	const {project, execute, createId} = useNarrativeProject();
	const [moveId, setMoveId] = React.useState('');
	const selectedMoveId =
		moveId && project.narrativeMoves.some(move => move.id === moveId)
			? moveId
			: project.narrativeMoves[0]?.id ?? '';
	const move = project.narrativeMoves.find(candidate => candidate.id === selectedMoveId);
	const [conditionType, setConditionType] =
		React.useState<ConditionType>('character-knows-claim');
	const [characterId, setCharacterId] = React.useState('');
	const [secondCharacterId, setSecondCharacterId] = React.useState('');
	const [claimId, setClaimId] = React.useState('');
	const [itemInstanceId, setItemInstanceId] = React.useState('');
	const [relationshipAxis, setRelationshipAxis] = React.useState('trust');
	const [relationshipValue, setRelationshipValue] = React.useState(0);
	const [storyNodeId, setStoryNodeId] = React.useState('');
	const [storyState, setStoryState] =
		React.useState<StoryNodeActivationState>('available');
	const [guardLabel, setGuardLabel] = React.useState('');
	const [guardNegated, setGuardNegated] = React.useState(false);
	const [trueOutcomeId, setTrueOutcomeId] = React.useState('');
	const [falseOutcomeId, setFalseOutcomeId] = React.useState('__new__');
	const [falseOutcomeLabel, setFalseOutcomeLabel] = React.useState('Условие не выполнено');

	React.useEffect(() => {
		setTrueOutcomeId(move?.outcomes[0]?.id ?? '');
		setFalseOutcomeId(move?.outcomes[1]?.id ?? '__new__');
	}, [move]);

	function buildCondition(): NarrativeConditionDefinition | undefined {
		switch (conditionType) {
			case 'character-knows-claim':
				return characterId && claimId
					? {type: conditionType, characterId, claimId}
					: undefined;
			case 'character-has-item':
				return characterId && itemInstanceId
					? {type: conditionType, characterId, itemInstanceId}
					: undefined;
			case 'relationship-at-least':
				return characterId && secondCharacterId && relationshipAxis.trim()
					? {
							type: conditionType,
							fromCharacterId: characterId,
							toCharacterId: secondCharacterId,
							axis: relationshipAxis.trim(),
							value: relationshipValue
					  }
					: undefined;
			case 'story-node-state':
				return storyNodeId
					? {type: conditionType, storyNodeId, state: storyState}
					: undefined;
			case 'characters-share-location':
				return characterId && secondCharacterId && characterId !== secondCharacterId
					? {type: conditionType, characterIds: [characterId, secondCharacterId]}
					: undefined;
		}
	}

	function addGuard() {
		const condition = buildCondition();
		if (!move || !condition) {
			return;
		}
		execute({
			type: 'move/addGuard',
			moveId: move.id,
			guard: {
				id: createId('move-guard'),
				label: guardLabel.trim() || undefined,
				condition,
				negated: guardNegated || undefined
			}
		});
		setGuardLabel('');
		setGuardNegated(false);
	}

	function setConditionResolution() {
		const condition = buildCondition();
		if (!move || !condition || !trueOutcomeId) {
			return;
		}
		if (falseOutcomeId !== '__new__') {
			execute({
				type: 'move/setConditionResolution',
				moveId: move.id,
				condition,
				trueOutcomeId,
				falseOutcomeId
			});
			return;
		}
		const label = falseOutcomeLabel.trim();
		if (!label) {
			return;
		}
		const id = createId('condition-outcome');
		execute({
			type: 'move/setConditionResolution',
			moveId: move.id,
			condition,
			trueOutcomeId,
			falseOutcomeId: id,
			newFalseOutcome: {
				id,
				key: `condition-false-${id}`,
				label,
				effectStoryNodeIds: [],
				effects: []
			}
		});
	}

	return (
		<section className="narrative-workspace__move-editor" aria-label="Move Conditions">
			<h2>Move Conditions</h2>
			<p>
				Полный authoring Guards и condition resolver. Условия только описывают доступность
				 и ветвление Move; они не исполняют действие сами.
			</p>
			{project.narrativeMoves.length === 0 ? (
				<small>Сначала создай Narrative Move.</small>
			) : (
				<>
					<select
						aria-label="Narrative Move для условий"
						value={selectedMoveId}
						onChange={event => setMoveId(event.target.value)}
					>
						{project.narrativeMoves.map(candidate => (
							<option key={candidate.id} value={candidate.id}>
								{candidate.label}
							</option>
						))}
					</select>

					<div className="narrative-workspace__compact-form">
						<select
							aria-label="Тип условия Narrative Move"
							value={conditionType}
							onChange={event => setConditionType(event.target.value as ConditionType)}
						>
							{Object.entries(conditionLabels).map(([value, label]) => (
								<option key={value} value={value}>{label}</option>
							))}
						</select>

						{conditionType !== 'story-node-state' && (
							<select aria-label="Первый персонаж условия" value={characterId} onChange={event => setCharacterId(event.target.value)}>
								<option value="">Выбери персонажа</option>
								{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
							</select>
						)}
						{conditionType === 'character-knows-claim' && (
							<select aria-label="Claim условия" value={claimId} onChange={event => setClaimId(event.target.value)}>
								<option value="">Выбери Claim</option>
								{project.claims.map(claim => <option key={claim.id} value={claim.id}>{claim.text}</option>)}
							</select>
						)}
						{conditionType === 'character-has-item' && (
							<select aria-label="Предмет условия" value={itemInstanceId} onChange={event => setItemInstanceId(event.target.value)}>
								<option value="">Выбери экземпляр предмета</option>
								{project.itemInstances.map(item => {
									const definition = project.itemDefinitions.find(candidate => candidate.id === item.definitionId);
									return <option key={item.id} value={item.id}>{definition?.name ?? item.id}</option>;
								})}
							</select>
						)}
						{(conditionType === 'relationship-at-least' || conditionType === 'characters-share-location') && (
							<select aria-label="Второй персонаж условия" value={secondCharacterId} onChange={event => setSecondCharacterId(event.target.value)}>
								<option value="">Выбери второго персонажа</option>
								{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
							</select>
						)}
						{conditionType === 'relationship-at-least' && (
							<>
								<input aria-label="Ось отношения условия" value={relationshipAxis} onChange={event => setRelationshipAxis(event.target.value)} placeholder="trust" />
								<input aria-label="Минимум отношения" type="number" value={relationshipValue} onChange={event => setRelationshipValue(Number(event.target.value))} />
							</>
						)}
						{conditionType === 'story-node-state' && (
							<>
								<select aria-label="Story node условия" value={storyNodeId} onChange={event => setStoryNodeId(event.target.value)}>
									<option value="">Выбери Story node</option>
									{project.storyNodes.map(node => <option key={node.id} value={node.id}>{node.title}</option>)}
								</select>
								<select aria-label="Story state условия" value={storyState} onChange={event => setStoryState(event.target.value as StoryNodeActivationState)}>
									{storyStates.map(state => <option key={state} value={state}>{state}</option>)}
								</select>
							</>
						)}

						<input aria-label="Название Guard" value={guardLabel} onChange={event => setGuardLabel(event.target.value)} placeholder="Необязательное имя Guard" />
						<label>
							<input type="checkbox" checked={guardNegated} onChange={event => setGuardNegated(event.target.checked)} />
							Инвертировать Guard
						</label>
						<button type="button" onClick={addGuard}>+ Добавить Guard</button>
					</div>

					<div className="narrative-workspace__reaction-set">
						{move?.guards.map(guard => (
							<div key={guard.id}>
								<strong>{guard.label || conditionLabels[guard.condition.type]}</strong>
								<small>{guard.negated ? 'NOT · ' : ''}{guard.condition.type}</small>
								<button type="button" onClick={() => execute({type: 'move/removeGuard', moveId: move.id, guardId: guard.id})}>Удалить Guard</button>
							</div>
						))}
						{move?.guards.length === 0 && <small>У Move пока нет Guards.</small>}
					</div>

					<fieldset className="narrative-workspace__skill-check-editor">
						<legend>Condition resolver</legend>
						<select aria-label="Outcome если условие истинно" value={trueOutcomeId} onChange={event => setTrueOutcomeId(event.target.value)}>
							{move?.outcomes.map(outcome => <option key={outcome.id} value={outcome.id}>{outcome.label}</option>)}
						</select>
						<select aria-label="Outcome если условие ложно" value={falseOutcomeId} onChange={event => setFalseOutcomeId(event.target.value)}>
							<option value="__new__">Создать новый false Outcome</option>
							{move?.outcomes.filter(outcome => outcome.id !== trueOutcomeId).map(outcome => <option key={outcome.id} value={outcome.id}>{outcome.label}</option>)}
						</select>
						{falseOutcomeId === '__new__' && (
							<input aria-label="Название нового false Outcome" value={falseOutcomeLabel} onChange={event => setFalseOutcomeLabel(event.target.value)} />
						)}
						<button type="button" onClick={setConditionResolution}>Использовать это условие как resolver</button>
						{move?.outcomes.length ? (
							<button type="button" onClick={() => execute({type: 'move/setAutomaticResolution', moveId: move.id, outcomeId: trueOutcomeId || move.outcomes[0].id})}>Вернуть automatic resolver</button>
						) : null}
						<small>Текущий resolver: {move?.resolution.type ?? '—'}</small>
					</fieldset>
				</>
			)}
		</section>
	);
};
