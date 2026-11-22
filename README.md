# localhost-doctor demo

A tiny Express app that shows three ways to use the [`localhost-doctor`](https://www.npmjs.com/package/localhost-doctor) npm package.

## Setup

```bash
npm install
cp .env.example .env   # then fill in PORT, APP_NAME, API_KEY
```

## 1. Manual health check

```bash
npm run doctor        # full report, also checks ports 4000 and 5173
npm run doctor:json   # saves the report to report.json
```

## 2. Preflight before the server starts

`npm start` runs the `prestart` script first:

```
localhost-doctor --checks runtime,dependencies,environment,ports --ports 4000
```

If any check reports an **error** (for example, `API_KEY` from `.env.example` is missing in `.env`),
localhost-doctor exits with code 1 and npm does not start the server. Warnings (for example, a busy port)
are shown, but the server still starts.

Try it: delete `API_KEY` from `.env` and run `npm start`.

## 3. Live report in the browser

Start the server and open:

- https://localhost-doctor-demo.onrender.com/doctor: the report rendered as a web page
- https://localhost-doctor-demo.onrender.com/doctor.json: the raw JSON from `localhost-doctor --json`

The server runs the CLI with `child_process.execFile` and reads its JSON output.

## CI usage

```bash
npm run doctor:ci || exit 1
```
