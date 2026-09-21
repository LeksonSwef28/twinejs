import {
	compileNarrativeRuntimeArtifact,
	narrativeRuntimeArtifactVersion
} from '../export-compiler';
import {
	materializeNarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from '../player-runtime';
import {
	createNarrativePlayerSave,
	restoreNarrativePlayerSave
} from '../player-save';
import {executeNarrativeCashSpend} from '../economy';
import {
	NarrativeProject,
	narrativeProjectSchemaVersion
} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';

function authoredEconomyProject(): NarrativeProject {
	const project = createNarrativeProject(
		'a58-compat-story',
		'A58 compatibility',
		ninetyThreeDaysTemplate
	);
	project.projectId = 'a58-compat-project';
	project.createdAt = '2000-06-01T00:00:00.000Z';
	project.updatedAt = '2000-06-01T00:00:00.000Z';
	project.characters = [
		{
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.economy = {
		currency: {code: 'RUB', label: 'руб.', minorUnitsPerMajor: 100},
		initialCashByCharacter: {player: 12500},
		purchaseOffers: []
	};
	return project;
}

describe('A58 economy artifact/save compatibility', () => {
	test('compiler initializes runtime cash and player save restores mutations', () => {
		const compiled = compileNarrativeRuntimeArtifact(authoredEconomyProject());
		expect(compiled.status).toBe('compiled');
		if (compiled.status !== 'compiled') {
			throw new Error('Expected A58 economy project to compile.');
		}
		expect(compiled.artifact.version).toBe(narrativeRuntimeArtifactVersion);
		expect(compiled.artifact.sourceSchemaVersion).toBe(
			narrativeProjectSchemaVersion
		);
		expect(compiled.artifact.initialRuntime.cashByCharacter).toEqual({
			player: 12500
		});

		const fresh = materializeNarrativePlayerSession(compiled.artifact);
		expect(fresh.status).toBe('ready');
		if (fresh.status !== 'ready') {
			throw new Error(fresh.summary);
		}
		const spent = executeNarrativeCashSpend(
			fresh.session.currentProject,
			'player',
			2500
		);
		expect(spent.status).toBe('applied');
		if (spent.status !== 'applied') {
			throw new Error(spent.summary);
		}
		const replacement = replaceNarrativePlayerSessionProject(
			fresh.session,
			spent.project
		);
		expect(replacement.status).toBe('updated');
		if (replacement.status !== 'updated') {
			throw new Error('Expected player session replacement.');
		}

		const save = createNarrativePlayerSave(replacement.session);
		expect(save.runtime.cashByCharacter).toEqual({player: 10000});

		const restarted = materializeNarrativePlayerSession(compiled.artifact);
		expect(restarted.status).toBe('ready');
		if (restarted.status !== 'ready') {
			throw new Error(restarted.summary);
		}
		const restored = restoreNarrativePlayerSave(restarted.session, save);
		expect(restored.status).toBe('restored');
		if (restored.status !== 'restored') {
			throw new Error('Expected player save restore.');
		}
		expect(restored.session.currentProject.cashByCharacter).toEqual({
			player: 10000
		});
	});

	test('pre-A58 artifact runtime without cash state still materializes safely', () => {
		const project = authoredEconomyProject();
		project.economy = undefined;
		const compiled = compileNarrativeRuntimeArtifact(project);
		expect(compiled.status).toBe('compiled');
		if (compiled.status !== 'compiled') {
			throw new Error('Expected compatibility fixture to compile.');
		}
		const legacyLike = JSON.parse(JSON.stringify(compiled.artifact)) as {
			initialRuntime: {cashByCharacter?: Record<string, number>};
		};
		delete legacyLike.initialRuntime.cashByCharacter;

		const materialized = materializeNarrativePlayerSession(legacyLike);
		expect(materialized.status).toBe('ready');
		if (materialized.status !== 'ready') {
			throw new Error(materialized.summary);
		}
		expect(materialized.session.currentProject.cashByCharacter).toEqual({});
	});
});
