from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Expected fragment missing: {label}')
    return text.replace(old, new, 1)


panel_path = Path('src/components/narrative/workspace/story-brain-panel.tsx')
text = panel_path.read_text()
text = replace_once(
    text,
    """import {\n\tqueryStoryBrain,\n\tqueryStoryBrainProjectDiagnostics,\n\tstoryBrainEntityCount,\n\tStoryBrainQueryResult\n} from '../../../application/narrative/story-brain-query';\n""",
    """import {storyBrainNavigationForFinding} from '../../../application/narrative/story-brain-diagnostic-navigation';\nimport {\n\tqueryStoryBrain,\n\tqueryStoryBrainProjectDiagnostics,\n\tstoryBrainEntityCount,\n\tStoryBrainFinding,\n\tStoryBrainQueryResult\n} from '../../../application/narrative/story-brain-query';\n""",
    'Story Brain imports'
)
text = replace_once(
    text,
    """import {useNarrativeProject} from '../../../store/narrative-project';\n""",
    """import {storyCanvasViewportForNode} from '../../../domain/narrative/workspace-navigation';\nimport {useNarrativeProject} from '../../../store/narrative-project';\n""",
    'workspace navigation import'
)
text = replace_once(
    text,
    """\tconst {project} = useNarrativeProject();\n""",
    """\tconst {project, execute} = useNarrativeProject();\n""",
    'execute hook'
)

impact_marker = """\tconst impactCounts = React.useMemo(() => {\n\t\tif (!result) {\n\t\t\treturn undefined;\n\t\t}\n\t\treturn (Object.keys(kindLabels) as StoryBrainEntityKind[]).map(kind => ({\n\t\t\tkind,\n\t\t\tcount: result.impact.hits.filter(hit => hit.entity.kind === kind).length\n\t\t}));\n\t}, [result]);\n\n"""
helper = """\tfunction jumpToFinding(finding: StoryBrainFinding) {\n\t\tconst navigation = storyBrainNavigationForFinding(project, finding);\n\t\tif (!navigation) {\n\t\t\treturn;\n\t\t}\n\t\tsetSelectedFocus(focusValue(navigation.focus));\n\t\texecute({type: 'editor/selectWorkspace', workspace: 'story'});\n\n\t\tif (!navigation.canvasEntityRef) {\n\t\t\treturn;\n\t\t}\n\t\tconst visual = project.editor.storyCanvas?.nodes.find(\n\t\t\tnode =>\n\t\t\t\tnode.entityRef?.type === navigation.canvasEntityRef?.type &&\n\t\t\t\tnode.entityRef.id === navigation.canvasEntityRef.id\n\t\t);\n\t\tif (!visual) {\n\t\t\treturn;\n\t\t}\n\t\texecute({\n\t\t\ttype: 'editor/setStoryViewport',\n\t\t\tviewport: storyCanvasViewportForNode(\n\t\t\t\tvisual.position,\n\t\t\t\tproject.editor.storyCanvas?.viewport.zoom\n\t\t\t)\n\t\t});\n\t}\n\n\tfunction renderFinding(finding: StoryBrainFinding) {\n\t\tconst navigation = storyBrainNavigationForFinding(project, finding);\n\t\treturn (\n\t\t\t<li key={finding.id} data-severity={finding.severity}>\n\t\t\t\t<span>{finding.severity === 'warning' ? '⚠' : '•'}</span>\n\t\t\t\t<div>\n\t\t\t\t\t<strong>{finding.summary}</strong>\n\t\t\t\t\t<small>{finding.kind}</small>\n\t\t\t\t</div>\n\t\t\t\t{navigation && (\n\t\t\t\t\t<button type=\"button\" onClick={() => jumpToFinding(finding)}>\n\t\t\t\t\t\tК источнику\n\t\t\t\t\t</button>\n\t\t\t\t)}\n\t\t\t</li>\n\t\t);\n\t}\n\n"""
text = replace_once(text, impact_marker, impact_marker + helper, 'jump helper insertion')

text = replace_once(
    text,
    '<option value="">Выбери Story / Move / Claim</option>',
    '<option value="">Выбери Story / Move / Claim / Character / Item</option>',
    'focus placeholder'
)
claims_group = """\t\t\t\t\t<optgroup label=\"Claims\">\n\t\t\t\t\t\t{project.claims.map(claim => (\n\t\t\t\t\t\t\t<option key={claim.id} value={focusValue({kind: 'claim', id: claim.id})}>\n\t\t\t\t\t\t\t\t{claim.text}\n\t\t\t\t\t\t\t</option>\n\t\t\t\t\t\t))}\n\t\t\t\t\t</optgroup>\n"""
extra_groups = claims_group + """\t\t\t\t\t<optgroup label=\"Персонажи\">\n\t\t\t\t\t\t{project.characters.map(character => (\n\t\t\t\t\t\t\t<option key={character.id} value={focusValue({kind: 'character', id: character.id})}>\n\t\t\t\t\t\t\t\t{character.name}\n\t\t\t\t\t\t\t</option>\n\t\t\t\t\t\t))}\n\t\t\t\t\t</optgroup>\n\t\t\t\t\t<optgroup label=\"Предметы\">\n\t\t\t\t\t\t{project.itemInstances.map(item => (\n\t\t\t\t\t\t\t<option key={item.id} value={focusValue({kind: 'item', id: item.id})}>\n\t\t\t\t\t\t\t\t{project.itemDefinitions.find(definition => definition.id === item.definitionId)?.name ?? item.id}\n\t\t\t\t\t\t\t</option>\n\t\t\t\t\t\t))}\n\t\t\t\t\t</optgroup>\n"""
text = replace_once(text, claims_group, extra_groups, 'focus entity groups')

project_list = """\t\t\t\t\t<ul className=\"narrative-workspace__story-brain-finding-list\">\n\t\t\t\t\t\t{projectDiagnostics.findings.slice(0, 12).map(finding => (\n\t\t\t\t\t\t\t<li key={finding.id} data-severity={finding.severity}>\n\t\t\t\t\t\t\t\t<span>{finding.severity === 'warning' ? '⚠' : '•'}</span>\n\t\t\t\t\t\t\t\t<div>\n\t\t\t\t\t\t\t\t\t<strong>{finding.summary}</strong>\n\t\t\t\t\t\t\t\t\t<small>{finding.kind}</small>\n\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t</li>\n\t\t\t\t\t\t))}\n\t\t\t\t\t</ul>\n"""
text = replace_once(
    text,
    project_list,
    """\t\t\t\t\t<ul className=\"narrative-workspace__story-brain-finding-list\">\n\t\t\t\t\t\t{projectDiagnostics.findings.slice(0, 12).map(renderFinding)}\n\t\t\t\t\t</ul>\n""",
    'project finding renderer'
)
text = text.replace(
    "? ' Показаны первые 12; jump-to-source станет следующим A48-срезом.'",
    "? ' Показаны первые 12.'",
    1
)

coverage_list = """\t\t\t\t\t\t\t<ul className=\"narrative-workspace__story-brain-finding-list\">\n\t\t\t\t\t\t\t\t{result.coverage.findings.slice(0, 8).map(finding => (\n\t\t\t\t\t\t\t\t\t<li key={finding.id} data-severity={finding.severity}>\n\t\t\t\t\t\t\t\t\t\t<span>{finding.severity === 'warning' ? '⚠' : '•'}</span>\n\t\t\t\t\t\t\t\t\t\t<div>\n\t\t\t\t\t\t\t\t\t\t\t<strong>{finding.summary}</strong>\n\t\t\t\t\t\t\t\t\t\t\t<small>{finding.kind}</small>\n\t\t\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t\t\t</li>\n\t\t\t\t\t\t\t\t))}\n\t\t\t\t\t\t\t</ul>\n"""
text = replace_once(
    text,
    coverage_list,
    """\t\t\t\t\t\t\t<ul className=\"narrative-workspace__story-brain-finding-list\">\n\t\t\t\t\t\t\t\t{result.coverage.findings.slice(0, 8).map(renderFinding)}\n\t\t\t\t\t\t\t</ul>\n""",
    'coverage finding renderer'
)
panel_path.write_text(text)

css_path = Path('src/components/narrative/workspace/story-brain-panel.css')
text = css_path.read_text()
text = replace_once(
    text,
    """.narrative-workspace__story-brain-finding-list li {\n\tgrid-template-columns: auto minmax(0, 1fr);\n\talign-items: start;\n}\n""",
    """.narrative-workspace__story-brain-finding-list li {\n\tgrid-template-columns: auto minmax(0, 1fr) auto;\n\talign-items: start;\n}\n\n.narrative-workspace__story-brain-finding-list li > button {\n\talign-self: center;\n\tpadding: 4px 7px;\n\tborder: 1px solid currentColor;\n\tborder-radius: 6px;\n\tbackground: transparent;\n\tcolor: inherit;\n\tfont-size: 11px;\n\tcursor: pointer;\n}\n""",
    'finding navigation styles'
)
css_path.write_text(text)

roadmap_path = Path('93DAYS_ROADMAP_A47_A52_EDITOR_PRODUCT.md')
text = roadmap_path.read_text()
text = replace_once(
    text,
    '**Status:** IN PROGRESS. Broken authored-reference diagnostics and Reaction Candidate Set reference validation are implemented. Project-wide diagnostic visibility is implemented in this branch; actionable jump-to-source is the next closure slice.',
    '**Status:** IN PROGRESS. Broken authored-reference diagnostics, Reaction Candidate Set validation and project-wide visibility are implemented. This branch adds the first actionable jump-to-source path for diagnostics whose authoring owner is represented by Story Brain / STORY canvas; unsupported owner kinds remain text-only instead of receiving misleading navigation.',
    'A48 roadmap status'
)
roadmap_path.write_text(text)
