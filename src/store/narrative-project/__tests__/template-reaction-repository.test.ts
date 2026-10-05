import {narrativeProjectSchemaVersion} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {createLocalStorageNarrativeProjectRepository} from '../repository';

const hostStoryId = 'story-template-reaction-hydration';
const storageKey = `twine:narrative-project:v${narrativeProjectSchemaVersion}:${hostStoryId}`;

describe('template and reaction repository hydration', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('hydrates older schema-v2 projects with empty template and reaction collections', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Older v2',
			ninetyThreeDaysTemplate
		);
		const payload: Partial<typeof project> = {...project};
		delete payload.interactionTemplates;
		delete payload.reactionCandidateSets;
		window.localStorage.setItem(storageKey, JSON.stringify(payload));

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Older v2',
			ninetyThreeDaysTemplate
		);
		const loaded = repository.load();

		expect(loaded.interactionTemplates).toEqual([]);
		expect(loaded.reactionCandidateSets).toEqual([]);
	});

	test('keeps valid definitions and rejects malformed ones during hydration', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Current v2',
			ninetyThreeDaysTemplate
		);
		const payload = {
			...project,
			interactionTemplates: [
				{
					id: 'share-rumor',
					name: 'Share rumor',
					roles: [
						{id: 'speaker', label: 'Speaker'},
						{id: 'listener', label: 'Listener'}
					],
					claimSlots: [{id: 'claim', label: 'Claim', required: true}],
					moves: [
						{
							id: 'tell',
							kind: 'inform',
							label: 'Tell',
							actorRoleId: 'speaker',
							targetRoleIds: ['listener'],
							communicatedClaimSlotId: 'claim'
						}
					],
					tags: []
				},
				{id: 'broken-template', name: '', roles: [], claimSlots: [], moves: [], tags: []}
			],
			reactionCandidateSets: [
				{
					id: 'reaction-a',
					storyNodeId: 'scene-a',
					reactingCharacterId: 'katya',
					candidates: [
						{
							id: 'neutral',
							moveId: 'move-neutral',
							valence: 'neutral',
							baseScore: 0,
							guards: [],
							considerations: []
						}
					]
				},
				{id: 'broken-reaction', storyNodeId: '', reactingCharacterId: '', candidates: []}
			]
		};
		window.localStorage.setItem(storageKey, JSON.stringify(payload));

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Current v2',
			ninetyThreeDaysTemplate
		);
		const loaded = repository.load();

		expect(loaded.interactionTemplates.map(template => template.id)).toEqual([
			'share-rumor'
		]);
		expect(loaded.reactionCandidateSets.map(set => set.id)).toEqual([
			'reaction-a'
		]);
	});
});
