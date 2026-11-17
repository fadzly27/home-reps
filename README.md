# Home Reps

A personal home-workout app for body recomposition: open it, see today's plan, tap **Start**.

- 3 sessions a week (any days, Monday–Sunday), alternating **Session A → B**, about 30 minutes each.
- Equipment: 2 × 10 kg dumbbells, 1 long-loop band, a sturdy chair.
- Weight is fixed, so each exercise levels up instead: **L1 Normal → L2 Tempo → L3 Pause → L4 + Band → Max (45 s rest)**.
  When every set hits the top of the rep range, the exercise levels up next time and the target resets to the bottom.
- Rest timer with a beep and a screen flash, stick-figure demos and a How To screen for every exercise.
- Meals: 1,200+ Malaysian foods with calories **and protein**, Build a plate, barcode scan, Recent, Favourites,
  Same as yesterday. Targets: calories = TDEE (Mifflin-St Jeor) − 300, protein = 1.6 g × body weight.
- Progress: waist / arm / weight every 2 weeks, plus a sessions-per-week chart. Tap any measurement in
  History to correct or delete it.

It's a static Progressive Web App (HTML, CSS, vanilla JS). No build step, no server, no login, and it works offline.

## Put it on GitHub Pages

1. Create a new repository on GitHub called **`home-reps`** (public, or private on a paid plan).
2. Upload every file in this folder, including the `icons/` folder:
   - on github.com: **Add file → Upload files**, drag everything in, **Commit changes**; or
   - from a terminal in this folder:
     ```bash
     git init -b main
     git add .
     git commit -m "Home Reps v1"
     git remote add origin https://github.com/<your-username>/home-reps.git
     git push -u origin main
     ```
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, then **Save**.
5. After a minute or two the app is live at `https://<your-username>.github.io/home-reps/`.

## Install on iPhone

1. Open the link in **Safari** (not Chrome; only Safari can add web apps to the Home Screen).
2. Tap the **Share** button (square with an arrow).
3. Scroll down, tap **Add to Home Screen**, then **Add**.
4. Open **Home Reps** from the Home Screen once while online. After that it works offline.

The first launch asks for your age, height, activity, waist, arm and weight once. After that, workouts, reps and levels
are saved automatically.

## Reminders

iPhone web apps can't send push notifications, so reminders go through Calendar instead:
**Today → ⚙︎ Settings → Add 3 weekly workouts to Calendar**. This creates 3 weekly "Workout" events
(Mon, Wed, Fri at 19:00, 30 min, alert 15 min before). Tap **Add to Calendar** / **Add All**, then drag the events to
whatever days suit you each week.

## Back up and restore

Your data is stored **only on your iPhone** (in Safari's storage for this app). Deleting the app, or clearing Safari
website data, deletes it too.

- **Back up:** Settings → **Export backup** → choose **Save to Files** (e.g. iCloud Drive). The file is called
  `home-reps-YYYY-MM-DD.json`.
- **Restore:** Settings → **Import backup** → pick the file → **Replace**. This replaces everything in the app with the
  backup.

Export a backup every few weeks, and before you delete or re-add the app.

## Updating the app

The service worker caches every file so the app works offline. **After changing any file, bump the cache version** at
the top of `sw.js` (`hr-v1` → `hr-v2` …) and push. The new version loads in the background; close and reopen the app
to see it.

## Notes and limits

- **Rest beep:** uses Web Audio. It plays only while the app is on screen, and the iPhone's silent switch can mute it,
  so the screen also flashes. Locking the phone doesn't break the timer: it is based on the clock and catches up when
  you come back.
- **Screen awake:** uses the Wake Lock API where your iOS version supports it; otherwise nothing happens.
- **Barcode scan:** needs internet the first time (the scanner library loads from a CDN and products come from
  [Open Food Facts](https://world.openfoodfacts.org); only the barcode number is sent). Scanned products then work offline.
  If a product has no calorie data, a typical value for its category is used and marked as an estimate.
- **Food values:** `foods.js` is copied from farhanahs-green-days. Every one of its 1,239 foods already has a protein
  value, so no protein values had to be added. All values are per-serving estimates (MyFCD and published hawker-food
  lists). Build a plate uses hand-size estimates.

## Files

```
home-reps/
├── index.html      # app shell, screens, tab bar
├── style.css       # iOS-style design; all colours are CSS variables (light/dark)
├── app.js          # storage, theme, Today, Workout, Rest, Complete, Progress, Measure, Settings, backup, .ics
├── exercises.js    # the 12 exercises: rep ranges, How To text, levels, stick-figure poses
├── meals.js        # Meals tab, Add Food, Build a plate, barcode scan (adapted from farhanahs-green-days)
├── foods.js        # Malaysian food list (kcal + protein per serving)
├── sw.js           # service worker (offline cache; bump the version after changes)
├── manifest.json   # PWA manifest
├── icons/          # 180 / 192 / 512 px app icons
└── README.md
```

## Data (localStorage)

| Key | Contents |
| --- | --- |
| `hr-profile` | age, height, sex, activity level |
| `hr-settings` | theme, calorie and protein targets |
| `hr-levels` | current level per exercise |
| `hr-sessions` | finished sessions with reps per set, duration, level-ups |
| `hr-active` | the session in progress (so a reload resumes it) |
| `hr-measure` | waist / arm / weight measurements |
| `hr-meals` | food log by date |
| `hr-foods` | scanned products and saved plates |
| `hr-favs` | favourite food ids |
