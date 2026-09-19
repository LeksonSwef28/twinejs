import {narrativePlayerArtifactScriptId} from '../../application/narrative/player-package';
import {
	narrativePlayerDevelopmentHandoffKey,
	readNarrativePlayerArtifactSource
} from '../artifact-source';

describe('A54 browser artifact source', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		window.sessionStorage.clear();
		window.history.replaceState(null, '', '/player.html');
	});

	test('prefers the artifact embedded in standalone player HTML', () => {
		const element = document.createElement('script');
		element.id = narrativePlayerArtifactScriptId;
		element.type = 'application/json';
		element.textContent = '{"format":"embedded"}';
		document.body.appendChild(element);
		window.sessionStorage.setItem(
			narrativePlayerDevelopmentHandoffKey,
			'{"format":"session"}'
		);
		window.location.hash = 'handoff=session';

		expect(readNarrativePlayerArtifactSource()).toEqual({
			status: 'found',
			source: 'inline',
			serializedArtifact: '{"format":"embedded"}'
		});
	});

	test('reads session handoff only when the player URL explicitly requests it', () => {
		window.sessionStorage.setItem(
			narrativePlayerDevelopmentHandoffKey,
			'{"format":"session"}'
		);

		expect(readNarrativePlayerArtifactSource().status).toBe('missing');

		window.location.hash = 'handoff=session';
		expect(readNarrativePlayerArtifactSource()).toEqual({
			status: 'found',
			source: 'session-handoff',
			serializedArtifact: '{"format":"session"}'
		});
	});
});
