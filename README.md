# JIN — class schedule + task tracker

Personal, single-user, fully offline. No account, no server, no data leaving your phone.
Data is stored in the browser's localStorage on your device.

## Run it from Termux

```
cd ~/downloads/mysched
python -m http.server 8080
```

Then in Chrome on your phone, go to:

```
http://localhost:8080
```

## Install it as an app icon (PWA)

1. Open the `http://localhost:8080` link above in **Chrome**.
2. Tap the ⋮ menu → **Add to Home screen** → **Install**.
3. It now opens full-screen from your home screen like a normal app, no browser bar.
4. It keeps working offline after the first load (service worker caches it).

Note: you'll need to run the `python -m http.server` command once per boot
(or set it up in Termux:Boot / a background service) since Android won't keep
Termux running forever in the background. Once installed to your home screen
though, the app itself still opens instantly — it just needs the server
running once to load fresh, and after that the service worker serves it from
cache even if the server isn't running.

## Using it

- **Today** — shows today's classes and anything due today.
- **Week** — tap a day to see that day's class list.
- **Tasks** — every assignment, filterable by Open / Done / All. Tap the
  checkbox to mark done, tap the row to edit.
- **+ button** — add a new class or task. Classes can repeat across multiple
  days and get a color tag. Tasks can optionally link to a class and get a
  priority (Low/Med/High) that also decides sort order.

## Files

```
index.html      structure
css/style.css   ledger/gradebook theme (dark, gold + oxblood accents)
js/app.js       all logic — data model lives in localStorage under key "ledger_data_v1"
manifest.json   PWA install config
sw.js           offline caching
icons/          app icons
```

Everything is plain HTML/CSS/JS — no build step, no npm install needed.
