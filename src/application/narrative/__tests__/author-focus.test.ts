import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	authorFocusEquals,
	canvasNodeRepresentsAuthorFocus,
	resolveAuthorFocus,
	validateAuthorFocus
} from '../author-focus';

function projectFixture() {
	const project = createNarrativeProject(
		'story-a67-focus',
		'A67 Focus',
		ninetyThreeDaysTemplate
	);
	project.characters.push({
		id: 'katya',
		name: 'Катя',
		cognitionTier: 'full',
		defaultBehaviorProfileId: 'katya-profile'
	});
	project.storyNodes.push({
		id: 'reveal',
		kind: 'event',
		title: 'Разговор',
		participantIds: ['katya'],
		activationState: 'draft'
	});
	return project;
}

describe('A67 author focus', () => {
	test('resolves and validates canonical Story and Character identity', () => {
		const project = projectFixture();

		expect(resolveAuthorFocus(project, {type: 'story-node', id: 'reveal'})).toEqual(
			expect.objectContaining({
				focus: {type: 'story-node', id: 'reveal'},
				storyNode: expect.objectContaining({id: 'reveal'})
			})
		);
		expect(resolveAuthorFocus(project, {type: 'character', id: 'katya'})).toEqual(
			expect.objectContaining({
				focus: {type: 'character', id: 'katya'},
				character: expect.objectContaining({id: 'katya'})
			})
		);
		expect(validateAuthorFocus(project, {type: 'story-node', id: 'missing'})).toBeUndefined();
		expect(validateAuthorFocus(project, {type: 'character', id: 'missing'})).toBeUndefined();
	});

	test('identity equality ignores entity display data', () => {
		const project = projectFixture();
		const focus = {type: 'story-node' as const, id: 'reveal'};

		expect(authorFocusEquals(focus, {...focus})).toBe(true);
		expect(authorFocusEquals(focus, {type: 'character', id: 'reveal'})).toBe(false);

		project.storyNodes[0].title = 'Переименованный разговор';
		expect(validateAuthorFocus(project, focus)).toEqual(focus);
	});

	test('matches all Canvas copies of the same canonical Focus and never Item', () => {
		const storyFocus = {type: 'story-node' as const, id: 'reveal'};
		const characterFocus = {type: 'character' as const, id: 'katya'};
		const copies = [
			{
				id: 'story-copy-a',
				kind: 'entity' as const,
				entityRef: {type: 'storyNode' as const, id: 'reveal'},
				position: {x: 10, y: 20}
			},
			{
				id: 'story-copy-b',
				kind: 'entity' as const,
				entityRef: {type: 'storyNode' as const, id: 'reveal'},
				position: {x: 30, y: 40}
			}
		];

		expect(copies.map(node => canvasNodeRepresentsAuthorFocus(node, storyFocus))).toEqual([
			true,
			true
		]);
		expect(
			canvasNodeRepresentsAuthorFocus(
				{
					id: 'character-copy',
					kind: 'entity',
					entityRef: {type: 'character', id: 'katya'},
					position: {x: 0, y: 0}
				},
				characterFocus
			)
		).toBe(true);
		expect(
			canvasNodeRepresentsAuthorFocus(
				{
					id: 'item-copy',
					kind: 'entity',
					entityRef: {type: 'item', id: 'reveal'},
					position: {x: 0, y: 0}
				},
				storyFocus
			)
		).toBe(false);
	});
});
