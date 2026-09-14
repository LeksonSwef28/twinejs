from pathlib import Path

path = Path('src/components/narrative/workspace/story-brain-panel.tsx')
text = path.read_text()

old = """\t\tsetSelectedFocus(focusValue(navigation.focus));\n\t\texecute({type: 'editor/selectWorkspace', workspace: 'story'});\n\n\t\tconst canvasEntityRef = navigation.canvasEntityRef;\n"""
new = """\t\tsetSelectedFocus(focusValue(navigation.focus));\n\t\tif (\n\t\t\tnavigation.workspace === 'world-time' &&\n\t\t\tnavigation.worldTimeCenterAbsoluteMinute !== undefined\n\t\t) {\n\t\t\texecute({\n\t\t\t\ttype: 'editor/setWorldTimeViewport',\n\t\t\t\tcenterAbsoluteMinute: navigation.worldTimeCenterAbsoluteMinute,\n\t\t\t\tpixelsPerHour: Math.max(\n\t\t\t\t\t12,\n\t\t\t\t\tproject.editor.worldTimeViewport?.pixelsPerHour ?? 12\n\t\t\t\t)\n\t\t\t});\n\t\t\texecute({type: 'editor/selectWorkspace', workspace: 'world-time'});\n\t\t\treturn;\n\t\t}\n\n\t\texecute({type: 'editor/selectWorkspace', workspace: navigation.workspace});\n\n\t\tconst canvasEntityRef = navigation.canvasEntityRef;\n"""
if old not in text:
    raise SystemExit('jumpToFinding fragment not found')
text = text.replace(old, new, 1)

old = """\t\t\t\t<p>\n\t\t\t\t\tПолный read-only список структурных и authored-reference проблем проекта.\n\t\t\t\t\t Он не зависит от текущего Focus, поэтому глобальные ошибки не скрываются\n\t\t\t\t\t за одним локальным контекстом.\n\t\t\t\t</p>\n"""
new = """\t\t\t\t<p>\n\t\t\t\t\tПолный read-only список структурных, authored-reference и schedule/time\n\t\t\t\t\t проблем проекта. Он не зависит от текущего Focus, поэтому глобальные\n\t\t\t\t\t ошибки не скрываются за одним локальным контекстом.\n\t\t\t\t</p>\n"""
if old not in text:
    raise SystemExit('diagnostic copy fragment not found')
text = text.replace(old, new, 1)

old = """\t\t\t\t\t<small>Структурных и authored-reference диагностик по проекту не найдено.</small>\n"""
new = """\t\t\t\t\t<small>Структурных, authored-reference и schedule/time диагностик по проекту не найдено.</small>\n"""
if old not in text:
    raise SystemExit('empty-state fragment not found')
text = text.replace(old, new, 1)

path.write_text(text)
