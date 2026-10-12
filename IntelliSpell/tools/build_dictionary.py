#!/usr/bin/env python3
"""Build dictionary.js from a Hunspell en_US dictionary (SCOWL word lists).
Usage: python tools/build_dictionary.py [path/to/en_US.dic] [path/to/en_US.aff]
Word order = how common the word is (tools/wordlist-frequency.txt first); the engine uses it to rank suggestions."""
import re, sys, os, collections
here = os.path.dirname(os.path.abspath(__file__))
dic = sys.argv[1] if len(sys.argv) > 1 else '/usr/share/hunspell/en_US.dic'
aff = sys.argv[2] if len(sys.argv) > 2 else dic[:-4] + '.aff'
P, S, X = collections.defaultdict(list), collections.defaultdict(list), {}
for l in open(aff, encoding='utf8'):
    p = l.split()
    if len(p) == 4 and p[0] in ('PFX', 'SFX'): X[(p[0][0], p[1])] = p[2] == 'Y'
    elif len(p) >= 5 and p[0] in ('PFX', 'SFX'):
        c = re.compile(('^' + p[4]) if p[0] == 'PFX' else (p[4] + '$'))
        (P if p[0] == 'PFX' else S)[p[1]].append((p[2].replace('0', ''), p[3].replace('0', ''), c))
ent = []
for l in open(dic, encoding='utf8').read().split('\n')[1:]:
    if l.strip():
        w, _, f = l.split('\t')[0].partition('/'); ent.append((w, f))
base = {w for w, _ in ent}
CVC = re.compile('[^aeiou][aeiou][^aeiouwxy]$')

def expand(w, fl):
    out, sf = {w}, []
    for f in fl:
        for st, ad, c in S.get(f, []):
            if (st and not w.endswith(st)) or not c.search(w): continue
            # skip wrong doublings: "runing" when "running" is listed
            if not st and ad in ('ing', 'ed', 'er', 'est', 'ers') and CVC.search(w) and w + w[-1] + ad in base: continue
            n = w[:len(w) - len(st)] + ad
            if ad == 'ly':  # fix y/le/ue/ic stems: happily, gently, truly, basically
                if w.endswith('ic'):
                    n = w + 'ally'
                    if w == 'public': out.add('publicly')
                elif re.search('[^aeiou]y$', w): n = w[:-1] + 'ily'
                elif w.endswith('le'): n = w[:-1] + 'y'
                elif w.endswith('ue'): n = w[:-2] + 'uly'
            out.add(n)
            if X.get(('S', f)): sf.append(n)
    for f in fl:
        for st, ad, c in P.get(f, []):
            if c.match(w):
                out.add(ad + w[len(st):])
                if X.get(('P', f)): out.update(ad + s for s in sf)
    return out

common, proper = set(), set()
for w, fl in ent:
    for n in expand(w, fl):
        if "'" in n and n != w: continue          # 's forms are handled by the engine
        l = n.lower()
        if not re.fullmatch("[a-zà-ÿ']+", l) or (len(l) == 1 and l not in 'ai'): continue
        if w.islower(): common.add(l)
        elif w.isupper() or (w[0].isupper() and w[1:].islower()): proper.add(l)
common |= set("email emails online website websites webpage login logout username password passwords wifi url urls html css blog blogs podcast smartphone smartphones app apps ok okay o'clock y'all ma'am internet".split())

# British variants (always accepted, so both spellings pass)
IZ = [('ization','isation'),('izations','isations'),('izing','ising'),('ized','ised'),('izes','ises'),('izer','iser'),('izers','isers'),('ize','ise'),('yzing','ysing'),('yzed','ysed'),('yzes','yses'),('yze','yse')]
OUR = "color favor honor labor neighbor behavior harbor humor rumor flavor savior vapor odor valor vigor rigor tumor armor endeavor parlor clamor candor ardor fervor glamor splendor demeanor".split()
RE_ = dict(center='centre', theater='theatre', liter='litre', fiber='fibre', caliber='calibre', somber='sombre', luster='lustre', specter='spectre', saber='sabre', meager='meagre')
MISC = dict(defense='defence', offense='offence', pretense='pretence', fulfill='fulfil', enroll='enrol', skillful='skilful', willful='wilful', plow='plough', curb='kerb', aluminum='aluminium', pajamas='pyjamas', cozy='cosy', donut='doughnut', jewelry='jewellery', mold='mould', sulfur='sulphur', catalog='catalogue', maneuver='manoeuvre', aging='ageing', skeptic='sceptic', mom='mum')
SUF = ['', 's', 'ed', 'ing', 'er', 'ers', 'ful', 'ite', 'ites', 'less', 'able', 'ably', 'ist', 'ists', 'ly', 'y', 'al', 'ally', 'hood']
uk = set()
for w in common:
    for a, b in IZ:
        if w.endswith(a):
            if len(w) - len(a) >= 3 and w[-len(a) - 1] != 's': uk.add(w[:-len(a)] + b)
            break
for a, b in [(r, r[:-2] + 'our') for r in OUR] + list(RE_.items()) + list(MISC.items()):
    for s in SUF:
        if a in RE_ and s == 'ing': continue
        if a + s in common: uk.add(b + s)
for r in "travel cancel counsel label model fuel level marvel signal total quarrel channel panel pedal rival shovel tunnel jewel".split():
    for s in ('ed', 'ing', 'er', 'ers'):
        if r + s in common: uk.add(r + 'l' + s)
common |= uk
proper -= common

rank = {w: i for i, w in enumerate(open(os.path.join(here, 'wordlist-frequency.txt')).read().split())}
words = sorted(common, key=lambda w: (rank.get(w, 10**6), len(w), w))
def wrap(ws): return '\n'.join(' '.join(ws[i:i + 16]) for i in range(0, len(ws), 16))
out = os.path.join(os.path.dirname(here), 'dictionary.js')
open(out, 'w', encoding='utf8').write(
    '// Generated by tools/build_dictionary.py - do not edit. Source: SCOWL via Hunspell en_US (see NOTICE.md)\n'
    'window.DICTIONARY={words:`\n' + wrap(words) + '\n`.trim().split(/\\s+/),proper:`\n' + wrap(sorted(proper)) + '\n`.trim().split(/\\s+/)};\n')
print(len(words), 'words,', len(proper), 'proper nouns,', len(uk), 'British variants ->', out)
