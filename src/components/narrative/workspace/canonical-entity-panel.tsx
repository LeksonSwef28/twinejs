import * as React from 'react';
import {CognitionTier} from '../../../domain/narrative/entities';
import {ClaimTruthStance} from '../../../domain/narrative/knowledge';
import {useNarrativeProject} from '../../../store/narrative-project';

type EntityKind = 'character' | 'location' | 'fact' | 'claim' | 'item-definition';

const entityKindLabels: Record<EntityKind, string> = {
	character: 'Персонаж',
	location: 'Локация',
	fact: 'Факт',
	claim: 'Claim',
	'item-definition': 'Тип предмета'
};

export const CanonicalEntityPanel: React.FC = () => {
	const {project, execute} = useNarrativeProject();
	const [kind, setKind] = React.useState<EntityKind>('character');
	const [entityId, setEntityId] = React.useState('');
	const [name, setName] = React.useState('');
	const [description, setDescription] = React.useState('');
	const [tags, setTags] = React.useState('');
	const [cognitionTier, setCognitionTier] = React.useState<CognitionTier>('full');
	const [stance, setStance] = React.useState<ClaimTruthStance>('unresolved');
	const [aboutFactId, setAboutFactId] = React.useState('');

	const options = React.useMemo(() => {
		switch (kind) {
			case 'character':
				return project.characters.map(entity => ({id: entity.id, label: entity.name}));
			case 'location':
				return project.locations.map(entity => ({id: entity.id, label: entity.name}));
			case 'fact':
				return project.objectiveFacts.map(entity => ({id: entity.id, label: entity.title}));
			case 'claim':
				return project.claims.map(entity => ({id: entity.id, label: entity.text}));
			case 'item-definition':
				return project.itemDefinitions.map(entity => ({id: entity.id, label: entity.name}));
		}
	}, [kind, project.characters, project.claims, project.itemDefinitions, project.locations, project.objectiveFacts]);

	const selectedId = entityId && options.some(option => option.id === entityId)
		? entityId
		: options[0]?.id ?? '';

	React.useEffect(() => {
		if (!selectedId) {
			setName('');
			setDescription('');
			setTags('');
			return;
		}
		switch (kind) {
			case 'character': {
				const entity = project.characters.find(item => item.id === selectedId);
				setName(entity?.name ?? '');
				setCognitionTier(entity?.cognitionTier ?? 'full');
				setDescription('');
				setTags('');
				break;
			}
			case 'location': {
				const entity = project.locations.find(item => item.id === selectedId);
				setName(entity?.name ?? '');
				setDescription('');
				setTags('');
				break;
			}
			case 'fact': {
				const entity = project.objectiveFacts.find(item => item.id === selectedId);
				setName(entity?.title ?? '');
				setDescription(entity?.description ?? '');
				setTags(entity?.tags.join(', ') ?? '');
				break;
			}
			case 'claim': {
				const entity = project.claims.find(item => item.id === selectedId);
				setName(entity?.text ?? '');
				setDescription('');
				setTags(entity?.tags.join(', ') ?? '');
				setStance(entity?.stance ?? 'unresolved');
				setAboutFactId(entity?.aboutFactId ?? '');
				break;
			}
			case 'item-definition': {
				const entity = project.itemDefinitions.find(item => item.id === selectedId);
				setName(entity?.name ?? '');
				setDescription(entity?.description ?? '');
				setTags(entity?.tags.join(', ') ?? '');
				break;
			}
		}
	}, [kind, project.characters, project.claims, project.itemDefinitions, project.locations, project.objectiveFacts, selectedId]);

	function parsedTags() {
		return tags.split(',').map(tag => tag.trim()).filter(Boolean);
	}

	function save(event: React.FormEvent) {
		event.preventDefault();
		if (!selectedId || !name.trim()) {
			return;
		}
		switch (kind) {
			case 'character':
				execute({type: 'character/update', id: selectedId, name, cognitionTier});
				break;
			case 'location':
				execute({type: 'location/update', id: selectedId, name});
				break;
			case 'fact':
				execute({type: 'fact/update', id: selectedId, title: name, description, tags: parsedTags()});
				break;
			case 'claim':
				execute({type: 'claim/update', id: selectedId, text: name, aboutFactId: aboutFactId || undefined, stance, tags: parsedTags()});
				break;
			case 'item-definition':
				execute({type: 'item/updateDefinition', id: selectedId, name, description, tags: parsedTags()});
				break;
		}
	}

	return (
		<section className="narrative-workspace__move-editor" aria-label="Canonical entity metadata">
			<h2>Canonical Entity Metadata</h2>
			<p>
				Редактирует каноническую сущность, а не её canvas instance. ID остаётся прежним,
				 поэтому ссылки не перепривязываются.
			</p>
			<select aria-label="Тип canonical entity" value={kind} onChange={event => {setKind(event.target.value as EntityKind); setEntityId('');}}>
				{Object.entries(entityKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
			</select>
			{options.length === 0 ? (
				<small>Сущностей этого типа пока нет.</small>
			) : (
				<form className="narrative-workspace__compact-form" onSubmit={save}>
					<select aria-label="Canonical entity" value={selectedId} onChange={event => setEntityId(event.target.value)}>
						{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
					</select>
					<label>
						{kind === 'fact' ? 'Название факта' : kind === 'claim' ? 'Текст Claim' : 'Название'}
						<input aria-label="Основное имя canonical entity" value={name} onChange={event => setName(event.target.value)} />
					</label>
					{kind === 'character' && (
						<label>
							Уровень симуляции
							<select aria-label="Cognition tier canonical character" value={cognitionTier} onChange={event => setCognitionTier(event.target.value as CognitionTier)}>
								<option value="full">Полная модель</option>
								<option value="light">Упрощённая</option>
								<option value="background">Фоновая</option>
							</select>
						</label>
					)}
					{(kind === 'fact' || kind === 'item-definition') && (
						<label>
							Описание
							<textarea aria-label="Описание canonical entity" value={description} onChange={event => setDescription(event.target.value)} />
						</label>
					)}
					{kind === 'claim' && (
						<>
							<label>
								Связанный объективный факт
								<select aria-label="Факт Claim" value={aboutFactId} onChange={event => setAboutFactId(event.target.value)}>
									<option value="">Не привязан</option>
									{project.objectiveFacts.map(fact => <option key={fact.id} value={fact.id}>{fact.title}</option>)}
								</select>
							</label>
							<label>
								Связь с истиной
								<select aria-label="Truth stance Claim" value={stance} onChange={event => setStance(event.target.value as ClaimTruthStance)}>
									<option value="supports">Поддерживает факт</option>
									<option value="contradicts">Противоречит факту</option>
									<option value="unresolved">Не определено</option>
								</select>
							</label>
						</>
					)}
					{(kind === 'fact' || kind === 'claim' || kind === 'item-definition') && (
						<label>
							Теги через запятую
							<input aria-label="Теги canonical entity" value={tags} onChange={event => setTags(event.target.value)} />
						</label>
					)}
					<button type="submit">Сохранить metadata</button>
				</form>
			)}
		</section>
	);
};
