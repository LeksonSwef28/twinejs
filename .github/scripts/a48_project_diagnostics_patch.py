from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Expected fragment missing: {label}")
    return text.replace(old, new, 1)


query_path = Path('src/application/narrative/story-brain-query.ts')
text = query_path.read_text()
text = replace_once(
    text,
    """export interface StoryBrainCoverageResult {\n\tprojectFindingCount: number;\n\tfindings: StoryBrainFinding[];\n}\n\nexport interface StoryBrainQueryResult {\n\tfocus: StoryBrainFocusResult;\n\timpact: StoryBrainImpactResult;\n\twhy: StoryBrainWhyResult;\n\tcoverage: StoryBrainCoverageResult;\n\tbridges: StoryBridgeFinderResult;\n\treactions: ReactionCandidateSetEvaluation[];\n}\n""",
    """export interface StoryBrainCoverageResult {\n\tprojectFindingCount: number;\n\tfindings: StoryBrainFinding[];\n}\n\nexport interface StoryBrainProjectDiagnosticsResult {\n\tfindingCount: number;\n\tfindings: StoryBrainFinding[];\n}\n\nexport interface StoryBrainQueryResult {\n\tfocus: StoryBrainFocusResult;\n\timpact: StoryBrainImpactResult;\n\twhy: StoryBrainWhyResult;\n\tcoverage: StoryBrainCoverageResult;\n\tprojectDiagnostics: StoryBrainProjectDiagnosticsResult;\n\tbridges: StoryBrainBridgeFinderResult;\n\treactions: ReactionCandidateSetEvaluation[];\n}\n""".replace('StoryBrainBridgeFinderResult', 'StoryBridgeFinderResult'),
    'Story Brain result interfaces'
)

marker = """/**\n * Application-level Story Brain query. It composes the read-only authored graph\n"""
helper = """function collectProjectDiagnostics(project: NarrativeProject) {\n\tconst storyCoverage = analyzeStoryCoverage(\n\t\tproject.storyNodes,\n\t\tproject.storyConnections,\n\t\tproject.narrativeMoves,\n\t\tproject.template.dayCount\n\t);\n\tconst referenceValidation = validateNarrativeProjectReferences(project);\n\tconst findings: StoryBrainFinding[] = [\n\t\t...storyCoverage.findings,\n\t\t...referenceValidation.findings\n\t];\n\treturn {storyCoverage, referenceValidation, findings};\n}\n\n/**\n * Project-wide read-only diagnostics do not require a Story Brain Focus. This\n * keeps broken references and structural coverage visible even when the author\n * has no Story node / Move / Claim that can surface the problem contextually.\n */\nexport function queryStoryBrainProjectDiagnostics(\n\tproject: NarrativeProject\n): StoryBrainProjectDiagnosticsResult {\n\tconst diagnostics = collectProjectDiagnostics(project);\n\treturn {\n\t\tfindingCount: diagnostics.findings.length,\n\t\tfindings: diagnostics.findings\n\t};\n}\n\n"""
if marker not in text:
    raise SystemExit('Expected fragment missing: Story Brain query marker')
text = text.replace(marker, helper + marker, 1)

text = replace_once(
    text,
    """\tconst projectCoverage = analyzeStoryCoverage(\n\t\tproject.storyNodes,\n\t\tproject.storyConnections,\n\t\tproject.narrativeMoves,\n\t\tproject.template.dayCount\n\t);\n\tconst referenceValidation = validateNarrativeProjectReferences(project);\n""",
    """\tconst projectDiagnostics = collectProjectDiagnostics(project);\n\tconst projectCoverage = projectDiagnostics.storyCoverage;\n\tconst referenceValidation = projectDiagnostics.referenceValidation;\n""",
    'query diagnostic collection'
)

text = replace_once(
    text,
    """\t\tcoverage: {\n\t\t\tprojectFindingCount:\n\t\t\t\tprojectCoverage.findings.length + referenceValidation.findings.length,\n\t\t\tfindings: [...focusCoverage, ...focusReferences]\n\t\t},\n\t\tbridges,\n""",
    """\t\tcoverage: {\n\t\t\tprojectFindingCount: projectDiagnostics.findings.length,\n\t\t\tfindings: [...focusCoverage, ...focusReferences]\n\t\t},\n\t\tprojectDiagnostics: {\n\t\t\tfindingCount: projectDiagnostics.findings.length,\n\t\t\tfindings: projectDiagnostics.findings\n\t\t},\n\t\tbridges,\n""",
    'query result diagnostics'
)
query_path.write_text(text)

panel_path = Path('src/components/narrative/workspace/story-brain-panel.tsx')
text = panel_path.read_text()
text = replace_once(
    text,
    """import {\n\tqueryStoryBrain,\n\tstoryBrainEntityCount,\n\tStoryBrainQueryResult\n} from '../../../application/narrative/story-brain-query';\n""",
    """import {\n\tqueryStoryBrain,\n\tqueryStoryBrainProjectDiagnostics,\n\tstoryBrainEntityCount,\n\tStoryBrainQueryResult\n} from '../../../application/narrative/story-brain-query';\n""",
    'Story Brain panel import'
)
text = replace_once(
    text,
    """\tconst result: StoryBrainQueryResult | undefined = React.useMemo(\n\t\t() => (focus ? queryStoryBrain(project, focus) : undefined),\n\t\t[focus, project]\n\t);\n\n\tReact.useEffect(() => {\n""",
    """\tconst result: StoryBrainQueryResult | undefined = React.useMemo(\n\t\t() => (focus ? queryStoryBrain(project, focus) : undefined),\n\t\t[focus, project]\n\t);\n\tconst projectDiagnostics = React.useMemo(\n\t\t() => result?.projectDiagnostics ?? queryStoryBrainProjectDiagnostics(project),\n\t\t[project, result]\n\t);\n\n\tReact.useEffect(() => {\n""",
    'project diagnostics memo'
)
text = replace_once(
    text,
    """\t\t\t</div>\n\n\t\t\t{result ? (\n""",
    """\t\t\t</div>\n\n\t\t\t<article className=\"narrative-workspace__story-brain-project-diagnostics\">\n\t\t\t\t<h3>PROJECT DIAGNOSTICS</h3>\n\t\t\t\t<p>\n\t\t\t\t\tПолный read-only список структурных и authored-reference проблем проекта.\n\t\t\t\t\t Он не зависит от текущего Focus, поэтому глобальные ошибки не скрываются\n\t\t\t\t\t за одним локальным контекстом.\n\t\t\t\t</p>\n\t\t\t\t{projectDiagnostics.findings.length > 0 ? (\n\t\t\t\t\t<ul className=\"narrative-workspace__story-brain-finding-list\">\n\t\t\t\t\t\t{projectDiagnostics.findings.slice(0, 12).map(finding => (\n\t\t\t\t\t\t\t<li key={finding.id} data-severity={finding.severity}>\n\t\t\t\t\t\t\t\t<span>{finding.severity === 'warning' ? '⚠' : '•'}</span>\n\t\t\t\t\t\t\t\t<div>\n\t\t\t\t\t\t\t\t\t<strong>{finding.summary}</strong>\n\t\t\t\t\t\t\t\t\t<small>{finding.kind}</small>\n\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t</li>\n\t\t\t\t\t\t))}\n\t\t\t\t\t</ul>\n\t\t\t\t) : (\n\t\t\t\t\t<small>Структурных и authored-reference диагностик по проекту не найдено.</small>\n\t\t\t\t)}\n\t\t\t\t<small>\n\t\t\t\t\tВсего диагностик по проекту: {projectDiagnostics.findingCount}.\n\t\t\t\t\t{projectDiagnostics.findingCount > 12\n\t\t\t\t\t\t? ' Показаны первые 12; jump-to-source станет следующим A48-срезом.'\n\t\t\t\t\t\t: ''}\n\t\t\t\t</small>\n\t\t\t</article>\n\n\t\t\t{result ? (\n""",
    'project diagnostics UI'
)
panel_path.write_text(text)

css_path = Path('src/components/narrative/workspace/story-brain-panel.css')
text = css_path.read_text()
text = replace_once(
    text,
    """.narrative-workspace__story-brain-grid > article {\n\tmin-width: 0;\n\tpadding: 12px;\n\tborder: 1px solid rgba(127, 127, 127, 0.18);\n\tborder-radius: 8px;\n\tbackground: rgba(127, 127, 127, 0.035);\n}\n\n.narrative-workspace__story-brain-grid h3 {\n""",
    """.narrative-workspace__story-brain-grid > article,\n.narrative-workspace__story-brain-project-diagnostics {\n\tmin-width: 0;\n\tpadding: 12px;\n\tborder: 1px solid rgba(127, 127, 127, 0.18);\n\tborder-radius: 8px;\n\tbackground: rgba(127, 127, 127, 0.035);\n}\n\n.narrative-workspace__story-brain-project-diagnostics {\n\tmargin-bottom: 10px;\n}\n\n.narrative-workspace__story-brain-grid h3,\n.narrative-workspace__story-brain-project-diagnostics h3 {\n""",
    'project diagnostics article styles'
)
text = replace_once(
    text,
    """.narrative-workspace__story-brain-grid article > p {\n\tmargin: 0 0 10px;\n\topacity: 0.68;\n\tline-height: 1.45;\n}\n""",
    """.narrative-workspace__story-brain-grid article > p,\n.narrative-workspace__story-brain-project-diagnostics > p {\n\tmargin: 0 0 10px;\n\topacity: 0.68;\n\tline-height: 1.45;\n}\n""",
    'project diagnostics paragraph styles'
)
css_path.write_text(text)

test_path = Path('src/domain/narrative/__tests__/story-brain-query.test.ts')
text = test_path.read_text()
text = replace_once(
    text,
    "import {queryStoryBrain} from '../../../application/narrative/story-brain-query';\n",
    """import {\n\tqueryStoryBrain,\n\tqueryStoryBrainProjectDiagnostics\n} from '../../../application/narrative/story-brain-query';\n""",
    'Story Brain query test import'
)
new_test = """\n\ttest('exposes project-wide diagnostics outside the current Focus', () => {\n\t\tconst base = projectWithGuardedMove(true);\n\t\tconst project = {\n\t\t\t...base,\n\t\t\tclaims: [\n\t\t\t\t...base.claims,\n\t\t\t\t{\n\t\t\t\t\tid: 'orphan-claim',\n\t\t\t\t\ttext: 'Ссылка на исчезнувший факт',\n\t\t\t\t\tstance: 'unresolved' as const,\n\t\t\t\t\ttags: [],\n\t\t\t\t\taboutFactId: 'missing-fact'\n\t\t\t\t}\n\t\t\t]\n\t\t};\n\t\tconst focused = queryStoryBrain(project, {kind: 'story-node', id: 'door'});\n\t\tconst diagnostics = queryStoryBrainProjectDiagnostics(project);\n\n\t\texpect(focused.coverage.findings.some(finding => finding.id.includes('orphan-claim'))).toBe(false);\n\t\texpect(focused.projectDiagnostics.findings.some(finding => finding.id.includes('orphan-claim'))).toBe(true);\n\t\texpect(diagnostics.findings).toEqual(\n\t\t\texpect.arrayContaining([\n\t\t\t\texpect.objectContaining({\n\t\t\t\t\tkind: 'broken-authored-reference',\n\t\t\t\t\townerKind: 'claim',\n\t\t\t\t\townerId: 'orphan-claim',\n\t\t\t\t\ttargetKind: 'objective-fact',\n\t\t\t\t\ttargetId: 'missing-fact'\n\t\t\t\t})\n\t\t\t])\n\t\t);\n\t\texpect(diagnostics.findingCount).toBe(diagnostics.findings.length);\n\t});\n"""
if not text.endswith('});\n'):
    raise SystemExit('Expected fragment missing: Story Brain test suite ending')
text = text[:-4] + new_test + '});\n'
test_path.write_text(text)

roadmap_path = Path('93DAYS_ROADMAP_A47_A52_EDITOR_PRODUCT.md')
text = roadmap_path.read_text()
text = replace_once(
    text,
    '**Status:** DONE pending green CI/merge of the final Move-relative effect-reference authoring closure (2026-09-14).',
    '**Status:** DONE (2026-09-14). The final Move-relative effect-reference authoring closure passed the full branch gate and merged in PR #14.',
    'A47 roadmap status'
)
text = replace_once(
    text,
    '**Status:** IN PROGRESS. Broken authored-reference diagnostics and Reaction Candidate Set reference validation are implemented; project-wide diagnostic visibility is the next closure slice.',
    '**Status:** IN PROGRESS. Broken authored-reference diagnostics and Reaction Candidate Set reference validation are implemented. Project-wide diagnostic visibility is implemented in this branch; actionable jump-to-source is the next closure slice.',
    'A48 roadmap status'
)
roadmap_path.write_text(text)

audit_path = Path('93DAYS_A47_EDITOR_PRODUCT_AUDIT.md')
text = audit_path.read_text()
text = replace_once(
    text,
    '**A47: DONE pending this branch\'s green CI/merge.** The non-destructive authoring loops and current authored effect/reference variants are available through UI without JSON/code. Broad destructive canonical-entity deletion remains deliberately deferred behind A48 reference diagnostics/repair UX rather than being misclassified as ordinary A47 CRUD.',
    '**A47: DONE.** The non-destructive authoring loops and current authored effect/reference variants are available through UI without JSON/code. The final Move-relative reference closure passed the full branch gate and merged in PR #14. Broad destructive canonical-entity deletion remains deliberately deferred behind A48 reference diagnostics/repair UX rather than being misclassified as ordinary A47 CRUD.',
    'A47 audit final status'
)
audit_path.write_text(text)
