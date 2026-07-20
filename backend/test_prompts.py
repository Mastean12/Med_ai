import sys; sys.path.insert(0, 'app')
from services.response_formatter import format_response

text = '## Simple Explanation\n\n**Potassium** is like the battery that powers your **muscles**.\n\n## Memory Aid\nThink of potassium as the heart electrical fuel.'
result = format_response(text)
for s in result.get('sections', []):
    content = str(s.get('content', []))
    if '**Potassium**' in content:
        print('Markdown preserved: YES')
        print('Section:', s['title'])
        print('Content:', content[:120])
        break
