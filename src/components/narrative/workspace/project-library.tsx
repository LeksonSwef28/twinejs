import * as React from 'react';
import {ClaimTruthStance} from '../../../domain/narrative/knowledge';
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

export const ProjectLibrary: React.FC<ProjectLibraryProps> = ({open, onClose}) => {
	const {project, execute, createId} = useNarrativeProject();
	const [factTitle, setFactTitle] = React.useState('');
	const [factDescription, setFactDescription] = React.useState('');
	const [claimText, setClaimText] = React.useState('');
	const [claimFactId, setClaimFactId] = React.useState('');
	const [claimStance, setClaimStance] =
		React.useState<ClaimTruthStance>('unresolved');

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
					<span>
						Текущие знания <b>{project.simulation.characterKnowledge.length}</b>
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

				<footer className="narrative-workspace__project-library-footer">
					<strong>Следующий слой</strong>
					<p>
						Назначение утверждений конкретным персонажам, источник слуха,
						 уверенность, повторная передача и усиление/затухание памяти будут
						 работать поверх этих определений, не смешивая их с объективной
						 истиной мира.
					</p>
				</footer>
			</aside>
		</div>
	);
};
