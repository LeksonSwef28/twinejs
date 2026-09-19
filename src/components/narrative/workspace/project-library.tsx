import * as React from 'react';
import {
	ClaimTruthStance,
	KnowledgeAttitude,
	KnowledgeSource
} from '../../../domain/narrative/knowledge';
import {useNarrativeProject} from '../../../store/narrative-project';

export interface ProjectLibraryProps {
	open: boolean;
	onClose: () => void;
}

const stanceLabels: Record<ClaimTruthStance, string> = {
	supports: 'Подтверждает факт',
	contradicts: 'Противоречит факту',
	unresolved: 'Связь не определена'
};

const attitudeLabels: Record<KnowledgeAttitude, string> = {
	knows: 'Знает / уверен',
	believes: 'Верит',
	doubts: 'Сомневается',
	disbelieves: 'Не верит'
};

const sourceTypeLabels: Record<KnowledgeSource['type'], string> = {
	authored: 'Задано автором',
	observed: 'Наблюдал сам',
	told: 'Кто-то сообщил',
	inferred: 'Сделал вывод'
};

export const ProjectLibrary: React.FC<ProjectLibraryProps> = ({open, onClose}) => {
	const {project, execute, createId} = useNarrativeProject();
	const [factTitle, setFactTitle] = React.useState('');
	const [factDescription, setFactDescription] = React.useState('');
	const [claimText, setClaimText] = React.useState('');
	const [claimFactId, setClaimFactId] = React.useState('');
	const [claimStance, setClaimStance] =
		React.useState<ClaimTruthStance>('unresolved');
	const [knowledgeCharacterId, setKnowledgeCharacterId] = React.useState('');
	const [knowledgeClaimId, setKnowledgeClaimId] = React.useState('');
	const [knowledgeAttitude, setKnowledgeAttitude] =
		React.useState<KnowledgeAttitude>('believes');
	const [knowledgeConfidence, setKnowledgeConfidence] = React.useState('0.75');
	const [knowledgeSourceType, setKnowledgeSourceType] =
		React.useState<KnowledgeSource['type']>('authored');
	const [knowledgeSourceCharacterId, setKnowledgeSourceCharacterId] =
		React.useState('');

	if (!open) {
		return null;
	}

	function addFact(event: React.FormEvent) {
		event.preventDefault();
		const title = factTitle.trim();
		if (!title) {
			return;
		}

		execute({
			type: 'fact/add',
			id: createId('fact'),
			title,
			description: factDescription.trim() || undefined
		});
		setFactTitle('');
		setFactDescription('');
	}

	function addClaim(event: React.FormEvent) {
		event.preventDefault();
		const text = claimText.trim();
		if (!text) {
			return;
		}

		execute({
			type: 'claim/add',
			id: createId('claim'),
			text,
			aboutFactId: claimFactId || undefined,
			stance: claimFactId ? claimStance : 'unresolved'
		});
		setClaimText('');
	}

	function setInitialKnowledge(event: React.FormEvent) {
		event.preventDefault();
		const confidence = Number(knowledgeConfidence);
		if (
			!knowledgeCharacterId ||
			!knowledgeClaimId ||
			!Number.isFinite(confidence) ||
			confidence < 0 ||
			confidence > 1
		) {
			return;
		}

		let source: KnowledgeSource;
		switch (knowledgeSourceType) {
			case 'authored':
				source = {type: 'authored'};
				break;
			case 'observed':
				source = {type: 'observed'};
				break;
			case 'inferred':
				source = {type: 'inferred'};
				break;
			case 'told':
				source = {
					type: 'told',
					sourceCharacterId: knowledgeSourceCharacterId || undefined
				};
				break;
		}

		execute({
			type: 'knowledge/setInitial',
			id: createId('knowledge-seed'),
			characterId: knowledgeCharacterId,
			claimId: knowledgeClaimId,
			attitude: knowledgeAttitude,
			confidence,
			source
		});
	}

	function sourceDescription(source: KnowledgeSource) {
		if (source.type === 'told' && source.sourceCharacterId) {
			const character = project.characters.find(
				candidate => candidate.id === source.sourceCharacterId
			);
			return character
				? `Сообщил: ${character.name}`
				: 'Источник-персонаж не найден';
		}
		return sourceTypeLabels[source.type];
	}

	return (
		<div className="narrative-workspace__library-overlay" role="presentation">
			<button
				type="button"
				className="narrative-workspace__library-backdrop"
				aria-label="Закрыть Project Library"
				onClick={onClose}
			/>
			<aside
				className="narrative-workspace__project-library"
				role="dialog"
				aria-modal="true"
				aria-label="Project Library"
			>
				<header className="narrative-workspace__project-library-header">
					<div>
						<span>PROJECT LIBRARY</span>
						<h2>Сущности проекта</h2>
					</div>
					<button type="button" onClick={onClose} aria-label="Закрыть библиотеку">
						×
					</button>
				</header>

				<p className="narrative-workspace__project-library-help">
					Факт — то, что объективно произошло в мире. Утверждение — то, что
					 персонаж может услышать, сказать, понять неправильно или передать как
					 слух. Уверенность персонажа не меняет сам факт.
				</p>

				<div className="narrative-workspace__library-stats">
					<span>Персонажи <b>{project.characters.length}</b></span>
					<span>Локации <b>{project.locations.length}</b></span>
					<span>Предметы <b>{project.itemInstances.length}</b></span>
					<span>Факты <b>{project.objectiveFacts.length}</b></span>
					<span>Утверждения <b>{project.claims.length}</b></span>
					<span>Стартовые знания <b>{project.initialKnowledge.length}</b></span>
					<span>
						Preview-знания <b>{project.simulation.characterKnowledge.length}</b>
					</span>
				</div>

				<section className="narrative-workspace__library-section">
					<div className="narrative-workspace__library-section-heading">
						<div>
							<strong>Объективные факты</strong>
							<small>истина мира, отдельно от слухов и воспоминаний</small>
						</div>
						<span>{project.objectiveFacts.length}</span>
					</div>
					<form onSubmit={addFact} className="narrative-workspace__library-form">
						<input
							value={factTitle}
							aria-label="Название объективного факта"
							placeholder="Например: Андрей вышел из бара в 21:10"
							onChange={event => setFactTitle(event.target.value)}
						/>
						<textarea
							value={factDescription}
							aria-label="Описание объективного факта"
							placeholder="Необязательное пояснение"
							rows={2}
							onChange={event => setFactDescription(event.target.value)}
						/>
						<button type="submit">+ Факт</button>
					</form>
					<div className="narrative-workspace__library-cards">
						{project.objectiveFacts.map(fact => (
							<article key={fact.id}>
								<span>FACT</span>
								<strong>{fact.title}</strong>
								{fact.description && <p>{fact.description}</p>}
							</article>
						))}
						{project.objectiveFacts.length === 0 && (
							<p className="narrative-workspace__library-empty">
								Пока нет объективных фактов.
							</p>
						)}
					</div>
				</section>

				<section className="narrative-workspace__library-section">
					<div className="narrative-workspace__library-section-heading">
						<div>
							<strong>Утверждения / слухи</strong>
							<small>то, что можно услышать, повторить, оспорить или забыть</small>
						</div>
						<span>{project.claims.length}</span>
					</div>
					<form onSubmit={addClaim} className="narrative-workspace__library-form">
						<textarea
							value={claimText}
							aria-label="Текст утверждения"
							placeholder="Например: Андрей весь вечер не выходил из комнаты"
							rows={2}
							onChange={event => setClaimText(event.target.value)}
						/>
						<select
							value={claimFactId}
							aria-label="Связанный объективный факт"
							onChange={event => {
								setClaimFactId(event.target.value);
								if (!event.target.value) {
									setClaimStance('unresolved');
								}
							}}
						>
							<option value="">Не привязано к факту</option>
							{project.objectiveFacts.map(fact => (
								<option key={fact.id} value={fact.id}>
									{fact.title}
								</option>
							))}
						</select>
						<select
							value={claimStance}
							disabled={!claimFactId}
							aria-label="Отношение утверждения к факту"
							onChange={event =>
								setClaimStance(event.target.value as ClaimTruthStance)
							}
						>
							{Object.entries(stanceLabels).map(([stance, label]) => (
								<option key={stance} value={stance}>
									{label}
								</option>
							))}
						</select>
						<button type="submit">+ Утверждение</button>
					</form>
					<div className="narrative-workspace__library-cards">
						{project.claims.map(claim => {
							const fact = project.objectiveFacts.find(
								candidate => candidate.id === claim.aboutFactId
							);
							return (
								<article key={claim.id}>
									<span>CLAIM · {stanceLabels[claim.stance]}</span>
									<strong>{claim.text}</strong>
									{fact && <p>Связано с фактом: {fact.title}</p>}
								</article>
							);
						})}
						{project.claims.length === 0 && (
							<p className="narrative-workspace__library-empty">
								Пока нет утверждений и слухов.
							</p>
						)}
					</div>
				</section>

				<section className="narrative-workspace__library-section">
					<div className="narrative-workspace__library-section-heading">
						<div>
							<strong>Стартовые знания персонажей</strong>
							<small>
								authoring baseline; отсутствие записи означает, что персонаж Claim не знает
							</small>
						</div>
						<span>{project.initialKnowledge.length}</span>
					</div>
					<form
						onSubmit={setInitialKnowledge}
						className="narrative-workspace__library-form"
					>
						<select
							value={knowledgeCharacterId}
							aria-label="Персонаж стартового знания"
							onChange={event => setKnowledgeCharacterId(event.target.value)}
						>
							<option value="">Выбери персонажа</option>
							{project.characters.map(character => (
								<option key={character.id} value={character.id}>
									{character.name}
								</option>
							))}
						</select>
						<select
							value={knowledgeClaimId}
							aria-label="Claim стартового знания"
							onChange={event => setKnowledgeClaimId(event.target.value)}
						>
							<option value="">Выбери Claim</option>
							{project.claims.map(claim => (
								<option key={claim.id} value={claim.id}>
									{claim.text}
								</option>
							))}
						</select>
						<select
							value={knowledgeAttitude}
							aria-label="Отношение персонажа к Claim"
							onChange={event =>
								setKnowledgeAttitude(event.target.value as KnowledgeAttitude)
							}
						>
							{Object.entries(attitudeLabels).map(([attitude, label]) => (
								<option key={attitude} value={attitude}>
									{label}
								</option>
							))}
						</select>
						<input
							type="number"
							min="0"
							max="1"
							step="0.05"
							value={knowledgeConfidence}
							aria-label="Уверенность персонажа от 0 до 1"
							onChange={event => setKnowledgeConfidence(event.target.value)}
						/>
						<select
							value={knowledgeSourceType}
							aria-label="Источник стартового знания"
							onChange={event => {
								setKnowledgeSourceType(event.target.value as KnowledgeSource['type']);
								if (event.target.value !== 'told') {
									setKnowledgeSourceCharacterId('');
								}
							}}
						>
							{Object.entries(sourceTypeLabels).map(([sourceType, label]) => (
								<option key={sourceType} value={sourceType}>
									{label}
								</option>
							))}
						</select>
						{knowledgeSourceType === 'told' && (
							<select
								value={knowledgeSourceCharacterId}
								aria-label="Кто сообщил стартовое знание"
								onChange={event =>
									setKnowledgeSourceCharacterId(event.target.value)
								}
							>
								<option value="">Источник не указан</option>
								{project.characters.map(character => (
									<option key={character.id} value={character.id}>
										{character.name}
									</option>
								))}
							</select>
						)}
						<button
							type="submit"
							disabled={!knowledgeCharacterId || !knowledgeClaimId}
						>
							Задать стартовое знание
						</button>
					</form>
					<div className="narrative-workspace__library-cards">
						{project.initialKnowledge.map(seed => {
							const character = project.characters.find(
								candidate => candidate.id === seed.characterId
							);
							const claim = project.claims.find(candidate => candidate.id === seed.claimId);
							return (
								<article key={seed.id}>
									<span>KNOWLEDGE · {attitudeLabels[seed.attitude]}</span>
									<strong>{character?.name ?? seed.characterId}</strong>
									<p>{claim?.text ?? seed.claimId}</p>
									<small>
										Уверенность: {seed.confidence.toFixed(2)} · {sourceDescription(seed.source)}
									</small>
									<button
										type="button"
										onClick={() =>
											execute({type: 'knowledge/removeInitial', id: seed.id})
										}
									>
										Удалить стартовое знание
									</button>
								</article>
							);
						})}
						{project.initialKnowledge.length === 0 && (
							<p className="narrative-workspace__library-empty">
								Пока нет стартовых знаний. Любой новый персонаж использует ту же общую модель.
							</p>
						)}
					</div>
				</section>

				<footer className="narrative-workspace__project-library-footer">
					<strong>Authoring ≠ runtime</strong>
					<p>
						Стартовое знание — исходное состояние для нового preview/simulation. Само
						 редактирование записи не меняет уже запущенное runtime-состояние. Передача
						 слухов, усиление, забывание и память будут развиваться поверх этой границы.
					</p>
				</footer>
			</aside>
		</div>
	);
};
