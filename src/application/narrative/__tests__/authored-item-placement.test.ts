import {
	authoredItemPlacementEquals,
	resolveAuthoredItemPlacement,
	validateAuthoredItemPlacementTarget
} from '../authored-item-placement';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';

function placementProject() {
	const project = createNarrativeProject(
		'story-a67-d2-placement-policy',
		'A67-D2 placement policy',
		ninetyThreeDaysTemplate
	);
	project.locations.push({id: 'home', name: 'Дом'});
	project.characters.push({
		id: 'katya',
		name: 'Катя',
		cognitionTier: 'full',
		defaultBehaviorProfileId: 'katya-profile'
	});
	return project;
}

describe('A67-D2 authored item placement policy', () => {
	test('compares authored placements by discriminant and canonical target id', () => {
		expect(
			authoredItemPlacementEquals({type: 'unplaced'}, {type: 'unplaced'})
		).toBe(true);
		expect(
			authoredItemPlacementEquals(
				{type: 'location', locationId: 'home'},
				{type: 'location', locationId: 'home'}
			)
		).toBe(true);
		expect(
			authoredItemPlacementEquals(
				{type: 'location', locationId: 'home'},
				{type: 'location', locationId: 'cafe'}
			)
		).toBe(false);
		expect(
			authoredItemPlacementEquals(
				{type: 'character', characterId: 'katya'},
				{type: 'character', characterId: 'katya'}
			)
		).toBe(true);
		expect(
			authoredItemPlacementEquals(
				{type: 'character', characterId: 'katya'},
				{type: 'character', characterId: 'andrey'}
			)
		).toBe(false);
		expect(
			authoredItemPlacementEquals(
				{type: 'location', locationId: 'home'},
				{type: 'character', characterId: 'home'}
			)
		).toBe(false);
	});

	test('resolves canonical authored placement without repairing stale targets', () => {
		const project = placementProject();

		expect(resolveAuthoredItemPlacement(project, {type: 'unplaced'})).toEqual({
			type: 'unplaced'
		});
		expect(
			resolveAuthoredItemPlacement(project, {
				type: 'location',
				locationId: 'home'
			})
		).toEqual({
			type: 'location',
			status: 'resolved',
			locationId: 'home',
			location: expect.objectContaining({id: 'home', name: 'Дом'})
		});
		expect(
			resolveAuthoredItemPlacement(project, {
				type: 'location',
				locationId: 'missing-home'
			})
		).toEqual({
			type: 'location',
			status: 'unresolved',
			locationId: 'missing-home'
		});
		expect(
			resolveAuthoredItemPlacement(project, {
				type: 'character',
				characterId: 'katya'
			})
		).toEqual({
			type: 'character',
			status: 'resolved',
			characterId: 'katya',
			character: expect.objectContaining({id: 'katya', name: 'Катя'})
		});
		expect(
			resolveAuthoredItemPlacement(project, {
				type: 'character',
				characterId: 'missing-katya'
			})
		).toEqual({
			type: 'character',
			status: 'unresolved',
			characterId: 'missing-katya'
		});
	});

	test('validates requested targets independently from read-time unresolved status', () => {
		const project = placementProject();

		expect(
			validateAuthoredItemPlacementTarget(project, {type: 'unplaced'})
		).toEqual({status: 'valid'});
		expect(
			validateAuthoredItemPlacementTarget(project, {
				type: 'location',
				locationId: 'home'
			})
		).toEqual({status: 'valid'});
		expect(
			validateAuthoredItemPlacementTarget(project, {
				type: 'location',
				locationId: 'missing-home'
			})
		).toEqual({status: 'missing-location', locationId: 'missing-home'});
		expect(
			validateAuthoredItemPlacementTarget(project, {
				type: 'character',
				characterId: 'katya'
			})
		).toEqual({status: 'valid'});
		expect(
			validateAuthoredItemPlacementTarget(project, {
				type: 'character',
				characterId: 'missing-katya'
			})
		).toEqual({
			status: 'missing-character',
			characterId: 'missing-katya'
		});
	});
});
