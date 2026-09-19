import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {readNarrativePlayerArtifactSource} from './artifact-source';
import {PlayerApp} from './player-app';

const artifactSource = readNarrativePlayerArtifactSource();

ReactDOM.render(
	<React.StrictMode>
		<PlayerApp artifactSource={artifactSource} />
	</React.StrictMode>,
	document.getElementById('player-root')
);
