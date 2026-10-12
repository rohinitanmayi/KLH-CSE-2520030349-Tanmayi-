# IntelliSpell
A spell checker that runs fully in your browser. Paste text or open a `.txt`, `.pdf` or `.docx` file, click a red word, and fix it.

## Run it
- **Windows terminal:** `cd` into this folder, then `python server.py` (opens http://localhost:8000, this computer only).
- **VS Code:** open the folder and use the *Live Server* extension on `index.html`.
- **Or** double-click `index.html`.

PDF/DOCX reading loads pdf.js / mammoth from cdnjs the first time (needs internet). Typing and `.txt` work offline.

## Features
- 115k-word dictionary (US + British spellings), proper nouns, contractions and irregular forms
- Skips URLs, e-mails, #tags, @mentions, numbers, ALL-CAPS acronyms and mixed-case words (iPhone); accented words work
- Suggestions ranked by distance and word commonness; "alot" → "a lot"
- Replace one or all occurrences; **Fix all** shows a review list first; Undo; Ignore; Add to dictionary (saved in your browser)
- Dark mode and settings are remembered. Your text is never uploaded.

## Files
`index.html`, `style.css`, `app.js` (UI), `engine.js` (spell engine), `dictionary.js` (generated), `server.py`, `tools/build_dictionary.py` (regenerates `dictionary.js` from a Hunspell en_US list; `tools/wordlist-frequency.txt` sets word commonness).

License: MIT (see `LICENSE`). Word list: see `NOTICE.md`.
