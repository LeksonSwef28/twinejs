import * as React from 'react';
import {formatMinuteOfDay} from '../../../domain/narrative/calendar';
import {PreviewScenario} from '../../../application/narrative/preview-laboratory';
import {
	PreviewWatchDefinition,
	PreviewWatchResult,
	inspectPreviewWatch,
	previewWatchId
} from '../../../application/narrative/preview-watches';

export interface PreviewTypedWatchesProps {
	scenario: PreviewScenario;
	hidden?: boolean;
}

type PreviewWatchKind = PreviewWatchDefinition['type'];

const watchKinds: Array<{type: PreviewWatchKind; label: string}> = [
	{type: 'moment', label: 'Simulation moment'},
	{type: 'actual-location', label: 'Actual location'},
	{type: 'knowledge', label: 'Character knowledge'},
	{type: 'relationship-axis', label: 'Relationship axis'},
	{type: 'story-node-state', label: 'Story node state'}
];

function characterName(scenario: PreviewScenario, characterId: string) {
	return scenario.project.characters.find(character => character.id === characterId)?.name ?? characterId;
}

function locationName(scenario: PreviewScenario, locationId?: string) {
	if (!locationId) {
		return 'unset';
	}
	return scenario.project.locations.find(location => location.id === locationId)?.name ?? locationId;
}

function watchLabel(scenario: PreviewScenario, watch: PreviewWatchDefinition) {
	switch (watch.type) {
		case 'moment':
			return 'Simulation moment';
		case 'actual-location':
			return `Actual location · ${characterName(scenario, watch.characterId)}`;
		case 'knowledge': {
			const claim = scenario.project.claims.find(candidate => candidate.id === watch.claimId);
			return `Knowledge · ${characterName(scenario, watch.characterId)} · ${claim?.text ?? watch.claimId}`;
		}
		case 'relationship-axis':
			return `Relationship · ${characterName(scenario, watch.fromCharacterId)} → ${characterName(
				scenario,
				watch.toCharacterId
			)} · ${watch.axis}`;
		case 'story-node-state': {
			const node = scenario.project.storyNodes.find(candidate => candidate.id === watch.storyNodeId);
			return `Story state · ${node?.title ?? watch.storyNodeId}`;
		}
	}
}

function watchValue(scenario: PreviewScenario, result: PreviewWatchResult) {
	switch (result.type) {
		case 'moment':
			return `день ${result.day} · ${formatMinuteOfDay(result.minuteOfDay)}`;
		case 'actual-location':
			return locationName(scenario, result.locationId);
		case 'knowledge':
			return result.attitude
				? `${result.attitude} · confidence ${result.confidence} · heard ${result.timesHeard}`
				: 'no runtime knowledge state';
		case 'relationship-axis':
			return result.value === undefined ? 'no runtime value' : String(result.value);
		case 'story-node-state':
			return result.state;
	}
}

export const PreviewTypedWatches: React.FC<PreviewTypedWatchesProps> = ({scenario, hidden}) => {
	const [watches, setWatches] = React.useState<PreviewWatchDefinition[]>([]);
	const [watchType, setWatchType] = React.useState<PreviewWatchKind>('moment');
	const [characterId, setCharacterId] = React.useState(scenario.project.characters[0]?.id ?? '');
	const [claimId, setClaimId] = React.useState(scenario.project.claims[0]?.id ?? '');
	const [fromCharacterId, setFromCharacterId] = React.useState(
		scenario.project.characters[0]?.id ?? ''
	);
	const [toCharacterId, setToCharacterId] = React.useState(
		scenario.project.characters[1]?.id ?? scenario.project.characters[0]?.id ?? ''
	);
	const relationshipAxes = React.useMemo(
		() =>
			Array.from(
				new Set(scenario.project.relationships.flatMap(relationship => Object.keys(relationship.values)))
			).sort(),
		[scenario.project.relationships]
	);
	const [axis, setAxis] = React.useState(relationshipAxes[0] ?? '');
	const [storyNodeId, setStoryNodeId] = React.useState(scenario.project.storyNodes[0]?.id ?? '');

	React.useEffect(() => {
		if (axis && relationshipAxes.includes(axis)) {
			return;
		}
		setAxis(relationshipAxes[0] ?? '');
	}, [axis, relationshipAxes]);

	function pendingWatch(): PreviewWatchDefinition | undefined {
		switch (watchType) {
			case 'moment':
				return {type: 'moment'};
			case 'actual-location':
				return characterId ? {type: 'actual-location', characterId} : undefined;
			case 'knowledge':
				return characterId && claimId ? {type: 'knowledge', characterId, claimId} : undefined;
			case 'relationship-axis':
				return fromCharacterId && toCharacterId && axis
					? {type: 'relationship-axis', fromCharacterId, toCharacterId, axis}
					: undefined;
			case 'story-node-state':
				return storyNodeId ? {type: 'story-node-state', storyNodeId} : undefined;
		}
	}

	const candidate = pendingWatch();

	function addWatch() {
		if (!candidate) {
			return;
		}
		const id = previewWatchId(candidate);
		setWatches(current =>
			current.some(watch => previewWatchId(watch) === id) ? current : [...current, candidate]
		);
	}

	return (
		<section className="simulation-debug__card is-wide" hidden={hidden} aria-label="Typed Watches">
			<h3>Typed Watches</h3>
			<p className="simulation-debug__hint">
				Read-only runtime projections. Watches use supported typed concepts only; arbitrary object paths are not accepted.
			</p>
			<div className="preview-lab__fields">
				<label>
					Watch type
					<select value={watchType} onChange={event => setWatchType(event.target.value as PreviewWatchKind)}>
						{watchKinds.map(kind => (
							<option key={kind.type} value={kind.type}>{kind.label}</option>
						))}
					</select>
				</label>

				{(watchType === 'actual-location' || watchType === 'knowledge') && (
					<label>
						Watch character
						<select value={characterId} onChange={event => setCharacterId(event.target.value)}>
							{scenario.project.characters.map(character => (
								<option key={character.id} value={character.id}>{character.name}</option>
							))}
						</select>
					</label>
				)}

				{watchType === 'knowledge' && (
					<label>
						Watch claim
						<select value={claimId} onChange={event => setClaimId(event.target.value)}>
							{scenario.project.claims.map(claim => (
								<option key={claim.id} value={claim.id}>{claim.text}</option>
							))}
						</select>
					</label>
				)}

				{watchType === 'relationship-axis' && (
					<>
						<label>
							From character
							<select value={fromCharacterId} onChange={event => setFromCharacterId(event.target.value)}>
								{scenario.project.characters.map(character => (
									<option key={character.id} value={character.id}>{character.name}</option>
								))}
							</select>
						</label>
						<label>
							To character
							<select value={toCharacterId} onChange={event => setToCharacterId(event.target.value)}>
								{scenario.project.characters.map(character => (
									<option key={character.id} value={character.id}>{character.name}</option>
								))}
							</select>
						</label>
						<label>
							Relationship axis
							<select value={axis} onChange={event => setAxis(event.target.value)}>
								{relationshipAxes.length ? relationshipAxes.map(value => (
									<option key={value} value={value}>{value}</option>
								)) : <option value="">No authored/runtime axes</option>}
							</select>
						</label>
					</>
				)}

				{watchType === 'story-node-state' && (
					<label>
						Story node
						<select value={storyNodeId} onChange={event => setStoryNodeId(event.target.value)}>
							{scenario.project.storyNodes.map(node => (
								<option key={node.id} value={node.id}>{node.title}</option>
							))}
						</select>
					</label>
				)}
			</div>
			<button type="button" disabled={!candidate} onClick={addWatch}>Add watch</button>

			{watches.length ? (
				<ul aria-label="Typed watch values">
					{watches.map(watch => {
						const id = previewWatchId(watch);
						try {
							const result = inspectPreviewWatch(scenario, watch);
							return (
								<li key={id}>
									<strong>{watchLabel(scenario, watch)}</strong>: {watchValue(scenario, result)}{' '}
									<button
										type="button"
										aria-label={`Remove watch ${watchLabel(scenario, watch)}`}
										onClick={() => setWatches(current => current.filter(entry => previewWatchId(entry) !== id))}
									>
										Remove
									</button>
								</li>
							);
						} catch (caught) {
							return (
								<li key={id}>
									<strong>{watchLabel(scenario, watch)}</strong>: unavailable · {caught instanceof Error ? caught.message : String(caught)}
								</li>
							);
						}
					})}
				</ul>
			) : (
				<p className="simulation-debug__empty">Добавьте typed Watch для текущего sandbox.</p>
			)}
		</section>
	);
};
