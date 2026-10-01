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
server/            HTTP server, JSON API, static file serving
server/data/       Episodes, conditions and symptom weights
public/            Interface (HTML, CSS, ES modules)
```

## API

| Method | Path                  | Description                                  |
| ------ | --------------------- | -------------------------------------------- |
| GET    | /api/health           | Server status                                |
| GET    | /api/episodes         | Documentary episodes                         |
| GET    | /api/diseases         | Conditions, filter with `type` and `q`       |
| GET    | /api/diseases/:id     | One condition                                |
| GET    | /api/symptoms         | Symptoms available for assessment            |
| POST   | /api/assessments      | Body `{ "symptoms": [...] }`, returns ranking |
