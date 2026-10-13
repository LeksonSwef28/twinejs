import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {resolveAndApplyNarrativeProjectMove} from '../living-simulation';
import {advanceNarrativeProjectSimulation} from '../simulation';
import {createDeferredClaimInspectorSnapshot} from '../deferred-claim-inspector';

function fixture() {
	const project = createNarrativeProject('a86-inspector', 'Inspector', ninetyThreeDaysTemplate);
	project.characters = [
		{id: 'ira', name: 'Ира', cognitionTier: 'full', defaultBehaviorProfileId: 'ira-profile'},
		{id: 'misha', name: 'Миша', cognitionTier: 'full', defaultBehaviorProfileId: 'misha-profile'}
	];
	project.claims = [{id: 'rumor', text: 'Слух', stance: 'unresolved', tags: []}];
	project.storyNodes = [{
		id: 'meeting', kind: 'dialogue', title: 'Встреча',
		participantIds: ['ira', 'misha'], activationState: 'available'
	}];
	project.narrativeMoves = [{
		id: 'talk', storyNodeId: 'meeting', kind: 'inform', label: 'Рассказать',
		actorCharacterId: 'ira', targetCharacterIds: ['misha'], communicatedClaimId: 'rumor',
		guards: [], resolution: {type: 'automatic', outcomeId: 'told'},
		outcomes: [{id: 'told', key: 'continue', label: 'Рассказал', effectStoryNodeIds: [], effects: [{
			id: 'late', type: 'character-learns-claim',
			recipient: {type: 'move-target', targetIndex: 0},
			claim: {type: 'communicated-claim'},
			attitude: 'believes', confidence: 0.6, source: {type: 'move-actor'}, delayDays: 2
		}]}]
	}];
	return project;
}

describe('A86 read-only deferred Claim inspector', () => {
	test('uses full runtime journal; shows valid recipient, source, cause and due time without mutation', () => {
		const pending = resolveAndApplyNarrativeProjectMove(fixture(), 'talk').project;
		const before = JSON.stringify(pending);
		const view = createDeferredClaimInspectorSnapshot(pending);
		expect(view.pendingTotal).toBe(1);
		expect(view.appliedTotal).toBe(0);
		expect(view.pending[0]).toMatchObject({
			status: 'scheduled', definitionState: 'current', recipientName: 'Миша',
			claimText: 'Слух', sourceLabel: 'Со слов: Ира',
			dueMoment: {day: 3, minuteOfDay: 360},
			scheduledAt: {day: 1, minuteOfDay: 360}
		});
		expect(JSON.stringify(pending)).toBe(before);
	});

	test('settled journal reduces to one terminal entry; it never counts an old schedule twice', () => {
		const pending = resolveAndApplyNarrativeProjectMove(fixture(), 'talk').project;
		const done = advanceNarrativeProjectSimulation(pending, 2880).project;
		const view = createDeferredClaimInspectorSnapshot(done);
		expect(view.pendingTotal).toBe(0);
		expect(view.appliedTotal).toBe(1);
		expect(view.expiredTotal).toBe(0);
		expect(view.completed[0].status).toBe('applied');
	});

	test('editing the authored effect hides possibly misleading current labels', () => {
		const pending = resolveAndApplyNarrativeProjectMove(fixture(), 'talk').project;
		pending.narrativeMoves[0].targetCharacterIds = ['ira'];
		const view = createDeferredClaimInspectorSnapshot(pending);
		expect(view.pending[0].definitionState).toBe('changed-or-missing');
		expect(view.pending[0].recipientName).toBeUndefined();
		expect(view.pending[0].claimText).toBeUndefined();
	});

	test('missing recipient is not presented as a verified author setting', () => {
		const pending = resolveAndApplyNarrativeProjectMove(fixture(), 'talk').project;
		pending.characters = pending.characters.filter(character => character.id !== 'misha');
		const view = createDeferredClaimInspectorSnapshot(pending);
		expect(view.pending[0].definitionState).toBe('changed-or-missing');
		expect(view.pending[0].recipientName).toBeUndefined();
	});

	test('legacy journal record without signature is shown but not trusted', () => {
		const pending = resolveAndApplyNarrativeProjectMove(fixture(), 'talk').project;
		pending.runtimeOccurrences = pending.runtimeOccurrences.map(event =>
			event.type === 'deferred-claim' ? {...event, definitionSignature: undefined} : event
		);
		const view = createDeferredClaimInspectorSnapshot(pending);
		expect(view.pendingTotal).toBe(1);
		expect(view.pending[0].definitionState).toBe('legacy-unverifiable');
		expect(view.pending[0].claimText).toBeUndefined();
	});

	test('past-project-end expiration is visible even without a scheduled entry', () => {
		const project = fixture();
		project.simulation.day = 92;
		const expired = resolveAndApplyNarrativeProjectMove(project, 'talk').project;
		const view = createDeferredClaimInspectorSnapshot(expired);
		expect(view.pendingTotal).toBe(0);
		expect(view.expiredTotal).toBe(1);
		expect(view.completed[0].reason).toBe('past-project-end');
	});
});
