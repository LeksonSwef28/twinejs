import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {PlayerApp} from './player-app';

ReactDOM.render(
	<React.StrictMode>
		<PlayerApp />
	</React.StrictMode>,
	document.getElementById('player-root')
);
