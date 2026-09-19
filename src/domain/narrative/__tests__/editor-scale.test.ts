import {
	timelineVirtualWindow,
	virtualizedTimelineRows,
	visibleStoryCanvasNodes
} from '../editor-scale';

describe('A50 editor scale projections', () => {
	test('culls Story canvas visual instances outside the current viewport without mutating canonical nodes', () => {
		const nodes = [
			{id: 'near', kind: 'entity' as const, position: {x: 20, y: 30}},
			{id: 'edge', kind: 'entity' as const, position: {x: 390, y: 250}},
			{id: 'far', kind: 'entity' as const, position: {x: 1400, y: 1200}}
		];
		const visible = visibleStoryCanvasNodes(
			nodes,
			{x: 0, y: 0, zoom: 1},
			{width: 400, height: 300},
			{overscanPx: 0, defaultNodeWidth: 220, defaultNodeHeight: 112}
		);

		expect(visible.map(node => node.id)).toEqual(['near', 'edge']);
		expect(nodes).toHaveLength(3);
	});

	test('accounts for pan, zoom and overscan in Story canvas world bounds', () => {
		const nodes = [
			{id: 'left', kind: 'entity' as const, position: {x: 0, y: 0}},
			{id: 'focus', kind: 'entity' as const, position: {x: 900, y: 500}},
			{id: 'overscan', kind: 'entity' as const, position: {x: 1220, y: 500}}
		];
		const visible = visibleStoryCanvasNodes(
			nodes,
			{x: -900, y: -500, zoom: 1},
			{width: 300, height: 200},
			{overscanPx: 160, defaultNodeWidth: 100, defaultNodeHeight: 80}
		);

		expect(visible.map(node => node.id)).toEqual(['focus', 'overscan']);
		expect(
			visibleStoryCanvasNodes(nodes, {x: 0, y: 0, zoom: 1}, {width: 0, height: 200})
		).toEqual([]);
	});

	test('builds a bounded WORLD/TIME vertical virtualization window', () => {
		const window = timelineVirtualWindow(100, 500, 200, 50, 2);

		expect(window).toEqual({
			startIndex: 8,
			endIndex: 16,
			offsetTop: 400,
			totalHeight: 5000
		});
		expect(virtualizedTimelineRows(Array.from({length: 20}, (_, index) => index), window)).toEqual([
			8,
			9,
			10,
			11,
			12,
			13,
			14,
			15
		]);
	});

	test('clamps malformed virtualization inputs instead of exposing invalid ranges', () => {
		expect(timelineVirtualWindow(-3, -100, -5, 0, -2)).toEqual({
			startIndex: 0,
			endIndex: 0,
			offsetTop: 0,
			totalHeight: 0
		});
	});
});
