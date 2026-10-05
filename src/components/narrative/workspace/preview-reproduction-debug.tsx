import * as React from 'react';
import {
	NarrativeProjectMoveResolutionInput,
	NarrativeProjectMoveResolutionTrace
} from '../../../application/narrative/living-simulation';
import {PreviewScenario} from '../../../application/narrative/preview-laboratory';
import {describePreviewMoveTraceReproduction} from '../../../application/narrative/preview-reproduction';

export interface PreviewReproductionDebugProps {
	scenario: PreviewScenario;
	trace?: NarrativeProjectMoveResolutionTrace;
	moveId: string;
	input: NarrativeProjectMoveResolutionInput;
}

export const PreviewReproductionDebug: React.FC<PreviewReproductionDebugProps> = ({
	scenario,
	trace,
	moveId,
	input
}) => {
	const traceMetadata =
		trace && moveId
			? describePreviewMoveTraceReproduction(scenario, moveId, input, trace)
			: undefined;
	const actionMetadata = scenario.actions.filter(action => action.reproduction);

	return (
		<section className="simulation-debug__card is-wide" aria-label="Preview reproduction metadata">
			<h3>Reproduction metadata · explicit inputs</h3>
			{traceMetadata ? (
				<pre aria-label="Current trace reproduction metadata">
					{JSON.stringify(traceMetadata, null, 2)}
				</pre>
			) : (
				<p className="simulation-debug__empty">
					Запустите Trace only или Resolve + apply authored, чтобы увидеть explicit input текущего trace.
				</p>
			)}
			<h4>Completed laboratory actions</h4>
			{actionMetadata.length ? (
				<ol aria-label="Reproduction metadata history">
					{actionMetadata.map(action => (
						<li key={action.id}>
							<strong>{action.kind}</strong>
							<pre>{JSON.stringify(action.reproduction, null, 2)}</pre>
						</li>
					))}
				</ol>
			) : (
				<p className="simulation-debug__empty">
					Для завершённых laboratory actions structured metadata ещё нет.
				</p>
			)}
		</section>
	);
};
