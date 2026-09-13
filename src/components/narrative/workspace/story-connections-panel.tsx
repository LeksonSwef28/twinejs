import * as React from 'react';
import {
	StoryEdgeMode,
	storyConnectionKindCanExecute,
	storyConnectionMode
} from '../../../domain/narrative/story';
import {useNarrativeProject} from '../../../store/narrative-project';

export const StoryConnectionsPanel: React.FC = () => {
	const {project, execute} = useNarrativeProject();
	const nodesById = React.useMemo(
		() => new Map(project.storyNodes.map(node => [node.id, node])),
		[project.storyNodes]
	);

	return (
		<section
			className="narrative-workspace__move-editor"
			aria-label="Story connections authoring"
		>
			<h2>Story Connections</h2>
			<p>
				Reference edge остаётся только авторской связью. Executable edge участвует в
				 причинной логике и поэтому требует исполняемый kind и typed ports.
			</p>
			{project.storyConnections.length === 0 ? (
				<small>Связей пока нет — создай их на Story Canvas.</small>
			) : (
				<div className="narrative-workspace__reaction-set">
					{project.storyConnections.map(connection => {
						const source = nodesById.get(connection.sourceNodeId);
						const target = nodesById.get(connection.targetNodeId);
						const canExecute =
							storyConnectionKindCanExecute(connection.kind) &&
							Boolean(connection.sourcePortId) &&
							Boolean(connection.targetPortId);
						const effectiveMode = storyConnectionMode(connection);
						return (
							<div key={connection.id}>
								<strong>
									{source?.title ?? connection.sourceNodeId} →{' '}
									{target?.title ?? connection.targetNodeId}
								</strong>
								<small>
									{connection.kind} · {connection.sourcePortId ?? 'без source port'} →{' '}
									{connection.targetPortId ?? 'без target port'}
								</small>
								<select
									aria-label={`Режим Story connection ${connection.id}`}
									value={effectiveMode}
									onChange={event =>
										execute({
											type: 'story/setConnectionMode',
											id: connection.id,
											mode: event.target.value as StoryEdgeMode
										})
									}
								>
									<option value="reference">Reference</option>
									<option value="executable" disabled={!canExecute}>
										Executable
									</option>
								</select>
								{!canExecute && (
									<small>
										Эта связь не может стать executable без поддерживаемого kind и
										 typed ports.
									</small>
								)}
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
};
