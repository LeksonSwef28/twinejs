import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	compileNarrativeRuntimeArtifact
} from '../export-compiler';
import {bootstrapNarrativePlayerHost} from '../player-host';
import {
	embedNarrativeRuntimeArtifactInPlayerHtml,
	narrativePlayerArtifactScriptId
} from '../player-package';

describe('A54 standalone player package artifact embedding', () => {
	test('embeds an exact A52 artifact that the A54 host can boot', () => {
		const project = createNarrativeProject(
			'a54-package-story',
			'A54 Standalone Package',
			ninetyThreeDaysTemplate
		);
		project.projectId = 'a54-package-project';
		const compiled = compileNarrativeRuntimeArtifact(project);
		if (compiled.status !== 'compiled') {
			throw new Error('Expected package fixture to compile.');
		}

		const template =
			`<!doctype html><div id="player-root"></div>` +
			`<script id="${narrativePlayerArtifactScriptId}" type="application/json"></script>` +
			`<script src="./assets/player.js"></script>`;
		const packaged = embedNarrativeRuntimeArtifactInPlayerHtml(
			template,
			compiled.artifact
		);
		const document = new DOMParser().parseFromString(packaged, 'text/html');
		const embedded = document
			.getElementById(narrativePlayerArtifactScriptId)
			?.textContent;

		const boot = bootstrapNarrativePlayerHost(embedded);
		expect(boot.status).toBe('ready');
		if (boot.status !== 'ready') {
			throw new Error('Expected packaged artifact to boot.');
		}
		expect(boot.session.identity.projectId).toBe('a54-package-project');
	});

	test('rejects an HTML shell without the artifact marker', () => {
		const project = createNarrativeProject(
			'a54-package-story',
			'A54 Standalone Package',
			ninetyThreeDaysTemplate
		);
		const compiled = compileNarrativeRuntimeArtifact(project);
		if (compiled.status !== 'compiled') {
			throw new Error('Expected package fixture to compile.');
		}

		expect(() =>
			embedNarrativeRuntimeArtifactInPlayerHtml(
				'<html><body>No marker</body></html>',
				compiled.artifact
			)
		).toThrow(/missing the runtime artifact script marker/);
	});
});
