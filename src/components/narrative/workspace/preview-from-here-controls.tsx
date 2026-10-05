import * as React from 'react';
import {
	PreviewFromHereFocus,
	PreviewFromHereRequest
} from '../../../application/narrative/preview-from-here';
import {formatMinuteOfDay} from '../../../domain/narrative/calendar';

function momentLabel(day: number, minuteOfDay: number) {
	return `День ${day} · ${formatMinuteOfDay(minuteOfDay)}`;
}

function alignmentCopy(alignment: PreviewFromHereRequest['context']['alignment']) {
	switch (alignment) {
		case 'aligned':
			return 'Контекст совпадает с текущим Simulation Playhead.';
		case 'different-moment':
			return 'Контекст относится к другому моменту. Sandbox Playhead не изменён.';
		case 'unscheduled':
			return 'У Story нет полного authored moment. Sandbox не выдумывает время.';
	}
}

export interface PreviewThisViewButtonProps {
	day: number;
	minuteOfDay: number;
	onPreviewFromHere(focus: PreviewFromHereFocus): void;
}

export const PreviewThisViewButton: React.FC<PreviewThisViewButtonProps> = ({
	day,
	minuteOfDay,
	onPreviewFromHere
}) => (
	<button
		type="button"
		onClick={() => onPreviewFromHere({type: 'view-moment', day, minuteOfDay})}
	>
		Preview this view
	</button>
);

export const PreviewFromHereContextCard: React.FC<{
	request: PreviewFromHereRequest;
}> = ({request}) => {
	const context = request.context;
	return (
		<section
			className="simulation-debug__card is-wide"
			aria-label="Preview from here context"
		>
			<h3>Preview from here · authoring focus</h3>
			<strong>{alignmentCopy(context.alignment)}</strong>
			{context.type === 'view-moment' ? (
				<>
					<p>View Cursor: {momentLabel(context.viewMoment.day, context.viewMoment.minuteOfDay)}</p>
					<p>
						Simulation Playhead: {momentLabel(
							context.simulationMoment.day,
							context.simulationMoment.minuteOfDay
						)}
					</p>
				</>
			) : (
				<>
					<p>
						Story: <strong>{context.title}</strong> · <code>{context.storyNodeId}</code>
					</p>
					<p>
						Authored moment:{' '}
						{context.authoredDay !== undefined &&
						context.authoredMinuteOfDay !== undefined
							? momentLabel(context.authoredDay, context.authoredMinuteOfDay)
							: 'не задан полностью'}
					</p>
					<p>
						Authored location: <code>{context.authoredLocationId ?? 'не задана'}</code> · Moves:{' '}
						<strong>{context.moveIds.length}</strong>
					</p>
					<p>
						Simulation Playhead: {momentLabel(
							context.simulationMoment.day,
							context.simulationMoment.minuteOfDay
						)}
					</p>
					<p>
						Actual Presence comparison:{' '}
						{context.actualPresenceComparableToStoryMoment
							? 'canonical comparison is valid at this moment'
							: 'not comparable at this moment'}
					</p>
				</>
			)}
			<small>
				Preview opens from the current live runtime snapshot. Authored/View context never relocates characters,
				changes Knowledge or moves time automatically; use explicit test-only inputs in Analysis when needed.
			</small>
		</section>
	);
};
