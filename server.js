// A tiny Express app that uses localhost-doctor in two ways:
//   1. `npm start` runs a quick preflight check before the server boots (see package.json "prestart").
//   2. GET /doctor runs localhost-doctor with --json and shows the result as a web page.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const express = require('express');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
  }
}

const PORT = Number(process.env.PORT) || 4000;
const APP_NAME = process.env.APP_NAME || 'Demo App';
const DOCTOR_BIN = path.join(__dirname, 'node_modules', '.bin', 'localhost-doctor');

const app = express();

app.get('/', (req, res) => {
  res.send(`<h1>${APP_NAME}</h1><p>Server is running on port ${PORT}.</p>
            <p><a href="/doctor">Open the environment health report →</a></p>`);
});


function runDoctor() {
  return new Promise((resolve, reject) => {
    execFile(DOCTOR_BIN, ['--json', '--ports', '5173,8080'], { cwd: __dirname, timeout: 30000 },
      (err, stdout) => {
        try { resolve(JSON.parse(stdout)); } catch { reject(err || new Error('Could not parse report')); }
      });
  });
}

app.get('/doctor.json', async (req, res) => {
  try { res.json(await runDoctor()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/doctor', async (req, res) => {
  let report;
  try { report = await runDoctor(); } catch (err) { return res.status(500).send(`Doctor failed: ${err.message}`); }

  const icon = { success: '✔', warning: '⚠', error: '✖' };
  const color = { success: '#1a7f37', warning: '#9a6700', error: '#cf222e' };
  const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const sections = report.sections.map((section) => `
    <h2>${escape(section.title)}</h2>
    <ul>${section.results.map((r) => `
      <li style="color:${color[r.status]}">${icon[r.status]} <b>${escape(r.name)}</b>: ${escape(r.message)}</li>`).join('')}
    </ul>`).join('');

  const recs = (report.recommendations || []).map((r) =>
    `<li style="color:${color[r.status]}">${icon[r.status]} ${escape(r.text)}</li>`).join('');

  const { success, warning, error } = report.summary;
  res.send(`<!doctype html><meta charset="utf-8"><title>Health report</title>
    <body style="font-family:system-ui;max-width:800px;margin:2rem auto;padding:0 1rem">
    <h1>${APP_NAME}: environment health</h1>
    <p>Generated ${escape(report.generatedAt)} on ${escape(report.platform)} by localhost-doctor v${escape(report.version)}</p>
    <p><b>Summary:</b> ${success} passed, ${warning} warnings, ${error} errors</p>
    ${sections}
    ${recs ? `<h2>Recommendations</h2><ol>${recs}</ol>` : ''}
    <p><a href="/doctor.json">Raw JSON</a> · <a href="/">Home</a></p></body>`);
});

app.listen(PORT, () => console.log(`${APP_NAME} running at http://localhost:${PORT}`));
