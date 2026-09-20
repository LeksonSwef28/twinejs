import * as React from 'react';
import {
	serializeNarrativeRuntimeArtifact
} from '../../../application/narrative/export-compiler';
import {storyBrainNavigationForFinding} from '../../../application/narrative/story-brain-diagnostic-navigation';
import {
	NarrativePreparedExportDiagnostic,
	prepareNarrativeStoryExport
} from '../../../application/narrative/export-story-adapter';
import {storyCanvasViewportForNode} from '../../../domain/narrative/workspace-navigation';
import {narrativeRuntimeProofFilenameExtension} from '../../../application/narrative/runtime-proof';
import {storyFileName} from '../../../electron/shared';
import {launchNarrativePlayerDevelopment} from '../../../player/development-handoff';
import {useNarrativeProject} from '../../../store/narrative-project';
import {useNarrativePublishing} from '../../../store/use-narrative-publishing';
import {useUndoableStoriesContext} from '../../../store/undoable-stories';
import {saveHtml, saveJson} from '../../../util/save-file';
import './narrative-export-panel.css';

function diagnosticKey(diagnostic: NarrativePreparedExportDiagnostic) {
	switch (diagnostic.source) {
		case 'story-brain':
			return `story-brain:${diagnostic.finding.id}`;
		case 'compiler':
			return `compiler:${diagnostic.code}`;
		case 'adapter':
			return `adapter:${diagnostic.code}`;
	}
}

function diagnosticSummary(diagnostic: NarrativePreparedExportDiagnostic) {
	switch (diagnostic.source) {
		case 'story-brain':
			return diagnostic.finding.summary;
		case 'compiler':
		case 'adapter':
			return diagnostic.summary;
	}
}

function diagnosticKind(diagnostic: NarrativePreparedExportDiagnostic) {
	switch (diagnostic.source) {
		case 'story-brain':
			return diagnostic.finding.kind;
		case 'compiler':
		case 'adapter':
			return diagnostic.code;
	}
}

export const NarrativeExportPanel: React.FC = () => {
	const {project, execute} = useNarrativeProject();
	const {stories} = useUndoableStoriesContext();
	const {publishNarrativeProject, publishNarrativeProof} = useNarrativePublishing();
	const [operationError, setOperationError] = React.useState<string>();
	const [operationStatus, setOperationStatus] = React.useState<string>();
	const [lastPublishedFile, setLastPublishedFile] = React.useState<string>();
	const hostStory = React.useMemo(
		() => stories.find(story => story.id === project.hostStoryId),
		[project.hostStoryId, stories]
	);
	const preparation = React.useMemo(
		() =>
			hostStory ? prepareNarrativeStoryExport(project, hostStory) : undefined,
		[hostStory, project]
	);
	const diagnostics = preparation?.diagnostics ?? [];
	const blockerCount = diagnostics.filter(
		diagnostic => diagnostic.disposition === 'blocker'
	).length;
	const advisoryCount = diagnostics.filter(
		diagnostic => diagnostic.disposition === 'advisory'
	).length;

	function resetOperationFeedback() {
		setOperationError(undefined);
		setOperationStatus(undefined);
		setLastPublishedFile(undefined);
	}

	function jumpToDiagnostic(diagnostic: NarrativePreparedExportDiagnostic) {
		if (diagnostic.source !== 'story-brain') {
			return;
		}
		const navigation = storyBrainNavigationForFinding(
			project,
			diagnostic.finding
		);
		if (!navigation) {
			return;
		}

		if (
			navigation.workspace === 'world-time' &&
			navigation.worldTimeCenterAbsoluteMinute !== undefined
		) {
			execute({
				type: 'editor/setWorldTimeViewport',
				centerAbsoluteMinute: navigation.worldTimeCenterAbsoluteMinute,
				pixelsPerHour: Math.max(
					12,
					project.editor.worldTimeViewport?.pixelsPerHour ?? 12
				)
			});
			execute({type: 'editor/selectWorkspace', workspace: 'world-time'});
			return;
		}

		execute({type: 'editor/selectWorkspace', workspace: navigation.workspace});
		const canvasEntityRef = navigation.canvasEntityRef;
		if (!canvasEntityRef) {
			return;
		}
		const visual = project.editor.storyCanvas?.nodes.find(
			node =>
				node.entityRef?.type === canvasEntityRef.type &&
				node.entityRef.id === canvasEntityRef.id
		);
		if (!visual) {
			return;
		}
		execute({
			type: 'editor/setStoryViewport',
			viewport: storyCanvasViewportForNode(
				visual.position,
				project.editor.storyCanvas?.viewport.zoom
			)
		});
	}

	function launchPlayer() {
		if (preparation?.status !== 'ready') {
			return;
		}
		resetOperationFeedback();
		const result = launchNarrativePlayerDevelopment(preparation.artifact);
		if (result.status === 'rejected') {
			setOperationError(result.summary);
			return;
		}
		setOperationStatus('Canonical Player открыт с текущим runtime artifact.');
	}

	function downloadArtifact() {
		if (preparation?.status !== 'ready') {
			return;
		}
		resetOperationFeedback();
		const filename = storyFileName(
			preparation.story,
			'.runtime-artifact.json'
		);
		saveJson(
			serializeNarrativeRuntimeArtifact(preparation.artifact),
			filename
		);
		setLastPublishedFile(filename);
	}

	function publishProof() {
		if (!hostStory || preparation?.status !== 'ready') {
			return;
		}
		resetOperationFeedback();
		try {
			const result = publishNarrativeProof(project, hostStory);
			if (result.status === 'blocked') {
				setOperationError(
					'Compiler proof был заблокирован повторной проверкой.'
				);
				return;
			}
			const filename = storyFileName(
				result.story,
				narrativeRuntimeProofFilenameExtension
			);
			saveHtml(result.html, filename);
			setLastPublishedFile(filename);
		} catch (error) {
			setOperationError(
				error instanceof Error
					? error.message
					: 'Не удалось собрать compiler proof HTML.'
			);
		}
	}

	async function publish() {
		if (!hostStory || preparation?.status !== 'ready') {
			return;
		}
		resetOperationFeedback();
		try {
			const result = await publishNarrativeProject(project, hostStory);
			if (result.status === 'blocked') {
				setOperationError(
					'Экспорт был заблокирован повторной проверкой перед публикацией.'
				);
				return;
			}
			const filename = storyFileName(result.story);
			saveHtml(result.html, filename);
			setLastPublishedFile(filename);
		} catch (error) {
			setOperationError(
				error instanceof Error ? error.message : 'Не удалось собрать HTML.'
			);
		}
	}

	return (
		<section
			className="narrative-workspace__export-panel"
			aria-label="Narrative export"
		>
			<header className="narrative-workspace__export-header">
				<div>
					<span>EXPORT / COMPILER</span>
					<h2>Runtime artifact → Canonical Player / legacy export</h2>
				</div>
				<small>derived only · no Passage authoring</small>
			</header>

			<div className="narrative-workspace__export-status-grid">
				<div>
					<span>Готовность</span>
					<strong data-status={preparation?.status ?? 'blocked'}>
						{!hostStory
							? 'Host Story недоступен'
							: preparation?.status === 'ready'
								? 'Готово к сборке'
								: 'Экспорт заблокирован'}
					</strong>
				</div>
				<div>
					<span>Блокеров</span>
					<strong>{hostStory ? blockerCount : 1}</strong>
				</div>
				<div>
					<span>Советов</span>
					<strong>{advisoryCount}</strong>
				</div>
				<div>
					<span>Artifact</span>
					<strong>
						{preparation?.status === 'ready'
							? `${preparation.artifact.format} v${preparation.artifact.version}`
							: '—'}
					</strong>
				</div>
			</div>

			<p className="narrative-workspace__export-note">
				Canonical Player запускает A53 через отдельный host и общий TypeScript
				 runtime. Обычный HTML ниже остаётся legacy Story Format export. Compiler
				 proof остаётся validation-only shell A52 и не исполняет mechanics.
			</p>

			{!hostStory && (
				<p className="narrative-workspace__export-error" role="alert">
					Не найден host Story «{project.hostStoryId}». Экспорт не выполнялся.
				</p>
			)}

			{diagnostics.length > 0 ? (
				<ul className="narrative-workspace__export-diagnostics">
					{diagnostics.map(diagnostic => {
						const navigation =
							diagnostic.source === 'story-brain'
								? storyBrainNavigationForFinding(project, diagnostic.finding)
								: undefined;
						return (
							<li
								key={diagnosticKey(diagnostic)}
								data-disposition={diagnostic.disposition}
							>
								<span>{diagnostic.disposition === 'blocker' ? '✕' : '•'}</span>
								<div>
									<strong>{diagnosticSummary(diagnostic)}</strong>
									<small>{diagnosticKind(diagnostic)}</small>
								</div>
								{navigation && (
									<button
										type="button"
										onClick={() => jumpToDiagnostic(diagnostic)}
									>
										К источнику
									</button>
								)}
							</li>
						);
					})}
				</ul>
			) : (
				hostStory && (
					<p className="narrative-workspace__export-clean">
						Export diagnostics не обнаружены.
					</p>
				)
			)}

			<div className="narrative-workspace__export-actions">
				<div className="narrative-workspace__export-action-buttons">
					<button
						type="button"
						disabled={preparation?.status !== 'ready'}
						onClick={launchPlayer}
					>
						Открыть Player
					</button>
					<button
						type="button"
						disabled={preparation?.status !== 'ready'}
						onClick={downloadArtifact}
					>
						Runtime artifact JSON
					</button>
					<button
						type="button"
						disabled={preparation?.status !== 'ready'}
						onClick={publish}
					>
						Legacy Story Format HTML
					</button>
					<button
						type="button"
						disabled={preparation?.status !== 'ready'}
						onClick={publishProof}
					>
						Compiler proof HTML
					</button>
				</div>
				<small>
					Player handoff использует только ephemeral session transport.
					 Generated Story/Passage не записывается в Undo/Redo или persistence.
				</small>
			</div>

			{operationError && (
				<p className="narrative-workspace__export-error" role="alert">
					{operationError}
				</p>
			)}
			{operationStatus && (
				<p className="narrative-workspace__export-success" role="status">
					{operationStatus}
				</p>
			)}
			{lastPublishedFile && (
				<p className="narrative-workspace__export-success" role="status">
					Файл подготовлен: {lastPublishedFile}
				</p>
			)}
		</section>
	);
};
