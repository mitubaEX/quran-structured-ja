#!/usr/bin/env python3

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / 'data' / 'index.json'
EXPLORER_PATH = ROOT / 'explorer' / 'data.js'


def main():
    index_data = json.loads(INDEX_PATH.read_text(encoding='utf-8'))
    chapters = []

    for item in index_data['included_surahs']:
        chapter_path = ROOT / item['file']
        chapter = json.loads(chapter_path.read_text(encoding='utf-8'))
        chapters.append(chapter)

    payload = {
        'project': index_data['project'],
        'included_surahs': index_data['included_surahs'],
        'chapters': chapters,
    }

    script = 'window.quranStructuredJaData = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n'
    EXPLORER_PATH.write_text(script, encoding='utf-8')
    print(f'Wrote {EXPLORER_PATH}')


if __name__ == '__main__':
    main()
