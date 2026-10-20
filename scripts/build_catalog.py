"""Parse source/rsandt/reports.html into data/catalog.json (topic -> description + files)."""
import re, html, json, os, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h = open(f'{ROOT}/source/rsandt/reports.html', encoding='latin-1').read()
topics = re.findall(r'<a [^>]*href="#(\w+)"[^>]*>([^<]+)</a>', h)
topics = [(i, n) for i, n in topics if i not in ('2Topic', 'top')]
ids = [i for i, _ in topics]
names = dict(topics)
pos = {i: h.find(f'id="{i}"') for i in ids}
order = sorted(ids, key=lambda i: pos[i])
files_on_disk = set(os.listdir(f'{ROOT}/source/rsandt/media'))
cat, seen = [], set()
for k, i in enumerate(order):
    end = pos[order[k + 1]] if k + 1 < len(order) else len(h)
    sec = h[pos[i]:end]
    fl = []
    for href, label in re.findall(r'<a [^>]*href="(media/[^"]+)"[^>]*>(.*?)</a>', sec, re.S | re.I):
        fn = href[6:]
        if fn not in fl: fl.append(fn)
    seen.update(fl)
    t = re.sub(r'<script.*?</script>|<[^>]+>', ' ', sec, flags=re.S)
    t = re.sub(r'\s+', ' ', html.unescape(t)).replace('Back To Topic', '').strip()
    cat.append({'id': i, 'title': names[i].strip(), 'abstract': t,
                'files': [{'name': f, 'ext': f.rsplit('.', 1)[-1].lower(), 'exists': f in files_on_disk} for f in fl]})
orphans = sorted(files_on_disk - seen)
json.dump({'source': 'http://www.rsandt.com/reports.html', 'topics': cat, 'unlisted_files': orphans},
          open(f'{ROOT}/data/catalog.json', 'w'), indent=1)
print(len(cat), 'topics;', sum(len(c['files']) for c in cat), 'file refs; missing:',
      [f['name'] for c in cat for f in c['files'] if not f['exists']], 'orphans:', orphans)
