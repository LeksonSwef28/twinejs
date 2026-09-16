import * as React from 'react';
import {
	PREVIEW_CHECKPOINT_LIMIT,
	PreviewCheckpoint,
	capturePreviewCheckpoint,
	removePreviewCheckpoint,
	restorePreviewCheckpoint
} from '../../../application/narrative/preview-checkpoints';
import {PreviewScenario} from '../../../application/narrative/preview-laboratory';

export interface PreviewCheckpointControlsProps {
	scenario: PreviewScenario;
	hidden?: boolean;
	onRestore(scenario: PreviewScenario): void;
}

export const PreviewCheckpointControls: React.FC<PreviewCheckpointControlsProps> = ({
	scenario,
	hidden = false,
	onRestore
}) => {
	const [checkpointsByScenario, setCheckpointsByScenario] = React.useState<
		Record<string, PreviewCheckpoint[]>
	>({});
	const [label, setLabel] = React.useState('');
	const checkpointCounter = React.useRef(1);
	const baselinesByScenario = React.useRef<Record<string, PreviewScenario['baselineProject']>>(
		{}
	);
	const checkpoints = checkpointsByScenario[scenario.id] ?? [];

	React.useEffect(() => {
		const previousBaseline = baselinesByScenario.current[scenario.id];
		if (previousBaseline && previousBaseline !== scenario.baselineProject) {
			setCheckpointsByScenario(current => ({...current, [scenario.id]: []}));
		}
		baselinesByScenario.current[scenario.id] = scenario.baselineProject;
		setLabel('');
	}, [scenario.id, scenario.baselineProject]);

	if (hidden) {
		return null;
	}

	function createCheckpoint() {
		const id = `checkpoint-${checkpointCounter.current++}`;
		const checkpoint = capturePreviewCheckpoint(scenario, checkpoints, id, label);
		setCheckpointsByScenario(current => ({
			...current,
			[scenario.id]: [...(current[scenario.id] ?? []), checkpoint]
		}));
		setLabel('');
	}

	function removeCheckpoint(checkpointId: string) {
		setCheckpointsByScenario(current => ({
			...current,
			[scenario.id]: removePreviewCheckpoint(
				current[scenario.id] ?? [],
				checkpointId
			)
		}));
	}

	return (
		<section className="simulation-debug__card" aria-label="Preview checkpoints">
			<h3>Checkpoints · sandbox only</h3>
			<p className="simulation-debug__hint">
				Restore меняет только изолированный Preview sandbox. Это не authoring Undo/Redo и не
				 rewind live Playtest.
			</p>
			<label className="preview-lab__select-field">
				Checkpoint label
				<input
					value={label}
					onChange={event => setLabel(event.target.value)}
					placeholder={`Checkpoint ${checkpoints.length + 1}`}
				/>
			</label>
			<div className="preview-lab__button-row">
				<button
					type="button"
					disabled={checkpoints.length >= PREVIEW_CHECKPOINT_LIMIT}
					onClick={createCheckpoint}
				>
					Create checkpoint
				</button>
				<small>
					{checkpoints.length} / {PREVIEW_CHECKPOINT_LIMIT} checkpoints
				</small>
			</div>
			{checkpoints.length ? (
				<ul aria-label="Preview checkpoint list">
					{checkpoints.map(checkpoint => (
						<li key={checkpoint.id}>
							<strong>{checkpoint.label}</strong>{' '}
							<small>after {checkpoint.sourceActionCount} lab action(s)</small>{' '}
							<button
								type="button"
								onClick={() => onRestore(restorePreviewCheckpoint(scenario, checkpoint))}
							>
								Restore
							</button>{' '}
							<button type="button" onClick={() => removeCheckpoint(checkpoint.id)}>
								Remove
							</button>
						</li>
					))}
				</ul>
			) : (
				<p className="simulation-debug__empty">Checkpoints ещё не созданы.</p>
			)}
		</section>
	);
};
