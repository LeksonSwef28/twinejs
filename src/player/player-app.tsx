import * as React from 'react';
import {bootstrapNarrativePlayerHost} from '../application/narrative/player-host';
import {advanceNarrativeProjectSimulation} from '../application/narrative/simulation';
import {NarrativePlayerArtifactSource} from './artifact-source';
import './player-app.css';

function formatMinute(minuteOfDay: number) {
	const hours = Math.floor(minuteOfDay / 60)
		.toString()
		.padStart(2, '0');
	const minutes = (minuteOfDay % 60).toString().padStart(2, '0');
	return `${hours}:${minutes}`;
}

export interface PlayerAppProps {
	artifactSource: NarrativePlayerArtifactSource;
}

export const PlayerApp: React.FC<PlayerAppProps> = ({artifactSource}) => {
	const bootstrap = React.useMemo(
		() =>
			bootstrapNarrativePlayerHost(
				artifactSource.status === 'found'
					? artifactSource.serializedArtifact
					: undefined
			),
		[artifactSource]
	);

	if (bootstrap.status === 'rejected') {
		return (
			<main className="narrative-player narrative-player--error">
				<p className="narrative-player__eyebrow">93 DAYS PLAYER HOST</p>
				<h1>Не удалось запустить игру</h1>
				<p role="alert">{bootstrap.summary}</p>
				<code>{bootstrap.code}</code>
				{artifactSource.status === 'missing' && (
					<small>{artifactSource.summary}</small>
				)}
			</main>
		);
	}

	const session = bootstrap.session;
	const probe = advanceNarrativeProjectSimulation(session.currentProject, 0);
	const project = session.currentProject;

	return (
		<main className="narrative-player" data-player-status="ready">
			<p className="narrative-player__eyebrow">93 DAYS PLAYER HOST</p>
			<h1>{project.name}</h1>
			<p className="narrative-player__status" role="status">
				Canonical runtime ready
			</p>
			<dl>
				<div>
					<dt>Artifact</dt>
					<dd>
						{session.identity.artifactFormat} v{session.identity.artifactVersion}
					</dd>
				</div>
				<div>
					<dt>Project</dt>
					<dd>{session.identity.projectId}</dd>
				</div>
				<div>
					<dt>World time</dt>
					<dd>
						Day {project.simulation.day} ·{' '}
						{formatMinute(project.simulation.minuteOfDay)}
					</dd>
				</div>
			</dl>
			<small>
				Runtime probe: {probe.trace.appliedMinutes} minutes applied. A55 owns
				 player presentation.
			</small>
		</main>
	);
};
