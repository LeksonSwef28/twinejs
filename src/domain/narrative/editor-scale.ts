import {CanvasNodeInstance, CanvasViewport} from './editor';

export interface EditorViewportSize {
	width: number;
	height: number;
}

export interface StoryCanvasCullingOptions {
	overscanPx?: number;
	defaultNodeWidth?: number;
	defaultNodeHeight?: number;
}

export interface TimelineVirtualWindow {
	startIndex: number;
	endIndex: number;
	offsetTop: number;
	totalHeight: number;
}

/**
 * Returns a render projection for the current Story camera. Canonical canvas
 * nodes remain untouched; only off-screen visual instances are omitted from the
 * render list. Overscan prevents nodes popping while panning.
 */
export function visibleStoryCanvasNodes(
	nodes: CanvasNodeInstance[],
	viewport: CanvasViewport,
	viewportSize: EditorViewportSize,
	options: StoryCanvasCullingOptions = {}
) {
	if (viewportSize.width <= 0 || viewportSize.height <= 0) {
		return [];
	}
	const zoom = Math.max(0.01, viewport.zoom || 1);
	const overscanPx = Math.max(0, options.overscanPx ?? 160);
	const overscanWorld = overscanPx / zoom;
	const left = -viewport.x / zoom - overscanWorld;
	const top = -viewport.y / zoom - overscanWorld;
	const right = (viewportSize.width - viewport.x) / zoom + overscanWorld;
	const bottom = (viewportSize.height - viewport.y) / zoom + overscanWorld;
	const defaultNodeWidth = Math.max(1, options.defaultNodeWidth ?? 220);
	const defaultNodeHeight = Math.max(1, options.defaultNodeHeight ?? 112);

	return nodes.filter(node => {
		const width = Math.max(1, node.size?.width ?? defaultNodeWidth);
		const height = Math.max(1, node.size?.height ?? defaultNodeHeight);
		return (
			node.position.x + width >= left &&
			node.position.x <= right &&
			node.position.y + height >= top &&
			node.position.y <= bottom
		);
	});
}

/**
 * Fixed-height vertical virtualization window for large WORLD/TIME row sets.
 * The returned indexes describe presentation only and never remove locations
 * or schedules from the Narrative Project.
 */
export function timelineVirtualWindow(
	totalRows: number,
	scrollY: number,
	viewportHeight: number,
	rowHeight: number,
	overscanRows = 3
): TimelineVirtualWindow {
	const safeRows = Math.max(0, Math.floor(totalRows));
	const safeRowHeight = Math.max(1, rowHeight);
	const safeViewportHeight = Math.max(0, viewportHeight);
	const safeScrollY = Math.max(0, scrollY);
	const overscan = Math.max(0, Math.floor(overscanRows));
	const firstVisible = Math.floor(safeScrollY / safeRowHeight);
	const visibleCount = Math.ceil(safeViewportHeight / safeRowHeight);
	const startIndex = Math.max(0, firstVisible - overscan);
	const endIndex = Math.min(
		safeRows,
		Math.max(startIndex, firstVisible + visibleCount + overscan)
	);

	return {
		startIndex,
		endIndex,
		offsetTop: startIndex * safeRowHeight,
		totalHeight: safeRows * safeRowHeight
	};
}

export function virtualizedTimelineRows<T>(
	rows: T[],
	window: TimelineVirtualWindow
) {
	return rows.slice(window.startIndex, window.endIndex);
}
