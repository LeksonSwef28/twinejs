import * as React from 'react';
import {
	evaluateReactionCandidateSet,
	ReactionCandidateSetEvaluation
} from '../../../domain/narrative/reaction';
import {useNarrativeProject} from '../../../store/narrative-project';

const availabilityLabels = {
	available: 'доступно',
	blocked: 'заблокировано',
	unknown: 'неизвестно'
};

export const ReactionCandidatesPanel: React.FC = () => {
	const {project} = useNarrativeProject();
	const [storyNodeId, setStoryNodeId] = React.useState('');
	const selectedStoryNodeId = storyNodeId || project.storyNodes[0]?.id || '';
	const evaluations = React.useMemo(() => {
		const context = {
			characterKnowledge: project.simulation.characterKnowledge,
			itemInstances: project.itemInstances,
			relationships: project.relationships,
			storyNodes: project.storyNodes,
			actualLocationByCharacter: project.simulation.actualLocationByCharacter,
			mindStates: project.mindStates,
			memories: project.memories
		};
		return project.reactionCandidateSets
			.filter(set => set.storyNodeId === selectedStoryNodeId)
			.flatMap<ReactionCandidateSetEvaluation>(set => {
				try {
					return [evaluateReactionCandidateSet(set, context)];
				} catch {
					return [];
				}
			});
	}, [project, selectedStoryNodeId]);
	const charactersById = new Map(
		project.characters.map(character => [character.id, character])
	);
	const movesById = new Map(project.narrativeMoves.map(move => [move.id, move]));

	return (
		<section className="narrative-workspace__move-editor" aria-label="Reaction Candidates">
			<h2>Reaction Candidates</h2>
			<p>
				Кандидатов может быть сколько угодно. Guards определяют доступность,
				 considerations дают объяснимый score; панель ничего не выбирает и не
				 запускает автоматически.
			</p>
			<select
				aria-label="Story node для реакций"
				value={selectedStoryNodeId}
				onChange={event => setStoryNodeId(event.target.value)}
			>
				<option value="">Выбери Story node</option>
				{project.storyNodes.map(node => (
					<option key={node.id} value={node.id}>
						{node.title}
					</option>
				))}
			</select>

			{evaluations.length === 0 ? (
				<small>
					Для этого Story node пока нет authored Reaction Candidate Set. Модель и
					 persistence уже готовы; следующий authoring-слой сможет создавать их из UI.
				</small>
			) : (
				evaluations.map(evaluation => (
					<div key={evaluation.setId} className="narrative-workspace__reaction-set">
						<strong>
							{charactersById.get(evaluation.reactingCharacterId)?.name ??
								evaluation.reactingCharacterId}
						</strong>
						{evaluation.candidates.map(candidate => (
							<div key={candidate.candidateId}>
								<span>
									{movesById.get(candidate.moveId)?.label ?? candidate.moveId}
								</span>
								<small>
									{candidate.valence} · {availabilityLabels[candidate.availability]} · score{' '}
									{candidate.score}
								</small>
								{candidate.considerationTraces
									.filter(trace => trace.status !== 'unmet')
									.slice(0, 3)
									.map(trace => (
										<small key={trace.considerationId}>
											{trace.status === 'met' ? `${trace.appliedWeight >= 0 ? '+' : ''}${trace.appliedWeight}` : '?'}{' '}
											· {trace.summary}
										</small>
									))}
							</div>
						))}
					</div>
				))
			)}
		</section>
	);
};
