# IntelliSpell
Spell checker that runs fully in the browser.

## Run in VS Code
**Option A (easiest):** open the folder in VS Code, install the "Live Server" extension, right-click `index.html` -> "Open with Live Server".
**Option B:** in the VS Code terminal run `python server.py`.
**Option C:** just double-click `index.html`.

PDF/DOCX reading needs internet the first time (loads pdf.js / mammoth from cdnjs).

## Files
- index.html - page
- style.css - styling
- app.js - engine, UI, click-to-fix, file upload
- dictionary.js / dictionary.txt - 9,844-word dictionary
- server.py - optional local server
