# Vitalis

A medical documentary platform with its own Node.js server. No dependencies to install.

## Run

```
npm start
```

Open http://127.0.0.1:3000. Set `PORT` and `HOST` to change the address. Use `npm run dev` to restart on changes.

## Install as an app

The site is a Progressive Web App. Open it in Chrome or Edge and use the Install app button in the header, or the install icon in the address bar. On iOS use Share, then Add to Home Screen. Installation requires HTTPS, except on localhost. Pages and data already visited keep working offline.

## Structure

```
index.html         Application page
sw.js              Service worker
manifest.json      Web app manifest
css/ js/ icons/    Styles, scripts and icons
data/              Episodes, conditions and symptom weights
server/            HTTP server and JSON API
```

The Node server only serves the files and folders above. Everything else in the project stays private.

## Static hosting

The site also works on a static host such as GitHub Pages, including project sites under a subpath. All paths are relative. When the API is not available, the interface reads `data/` directly and runs the same assessment logic in the browser.

## API

| Method | Path                  | Description                                  |
| ------ | --------------------- | -------------------------------------------- |
| GET    | /api/health           | Server status                                |
| GET    | /api/episodes         | Documentary episodes                         |
| GET    | /api/diseases         | Conditions, filter with `type` and `q`       |
| GET    | /api/diseases/:id     | One condition                                |
| GET    | /api/symptoms         | Symptoms available for assessment            |
| POST   | /api/assessments      | Body `{ "symptoms": [...] }`, returns ranking |
