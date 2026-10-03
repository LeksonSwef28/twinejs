import {narrativePlayerArtifactScriptId} from '../../application/narrative/player-package';
import {
	narrativePlayerDevelopmentHandoffKey,
	readNarrativePlayerArtifactSource
} from '../artifact-source';

describe('A54 browser artifact source', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		window.localStorage.clear();
		window.history.replaceState(null, '', '/player.html');
	});

	test('prefers the artifact embedded in standalone player HTML', () => {
		const element = document.createElement('script');
		element.id = narrativePlayerArtifactScriptId;
		element.type = 'application/json';
		element.textContent = '{"format":"embedded"}';
		document.body.appendChild(element);
		window.localStorage.setItem(
			narrativePlayerDevelopmentHandoffKey,
			'{"format":"handoff"}'
		);
		window.location.hash = 'handoff=development';

		expect(readNarrativePlayerArtifactSource()).toEqual({
			status: 'found',
			source: 'inline',
			serializedArtifact: '{"format":"embedded"}'
		});
	});

	test('reads and consumes development handoff only when explicitly requested', () => {
		window.localStorage.setItem(
			narrativePlayerDevelopmentHandoffKey,
			'{"format":"handoff"}'
		);

		expect(readNarrativePlayerArtifactSource().status).toBe('missing');
		expect(
			window.localStorage.getItem(narrativePlayerDevelopmentHandoffKey)
		).toBe('{"format":"handoff"}');

		window.location.hash = 'handoff=development';
		expect(readNarrativePlayerArtifactSource()).toEqual({
			status: 'found',
			source: 'development-handoff',
			serializedArtifact: '{"format":"handoff"}'
		});
		expect(
			window.localStorage.getItem(narrativePlayerDevelopmentHandoffKey)
		).toBeNull();
	});
});
