import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { buildRequest, generateAudio } from "./provider.mjs";
import { prepareSpeech } from "./speech-pipeline.mjs";
import { modelConnection } from "./model.mjs";

const port = Number(process.env.PORT ?? 4317);
const origin = `http://127.0.0.1:${port}`;
const assets = new Map([
  ["/", ["demo/index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["demo/app.js", "text/javascript; charset=utf-8"]],
  ["/revision.mjs", ["demo/revision.mjs", "text/javascript; charset=utf-8"]],
  ["/speech-pipeline.mjs", ["demo/speech-pipeline.mjs", "text/javascript; charset=utf-8"]],
  ["/renderer.js", ["dist/index.js", "text/javascript; charset=utf-8"]],
  ["/context.js", ["dist/context.js", "text/javascript; charset=utf-8"]],
  ["/context-examples.json", ["examples/context-examples.json", "application/json"]],
  ["/context-manifest.json", ["examples/audio/context-manifest.json", "application/json"]],
  ["/situations.json", ["examples/situations.json", "application/json"]],
  ...["welcome", "delay", "discovery", "context-reassurance", "context-irritation", "context-uncertainty"].map((id) => [`/audio/${id}.mp3`, [`examples/audio/${id}.mp3`, "audio/mpeg"]]),
]);
let busy = false;
let contextBusy = false;
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; frame-ancestors 'none'");
  if (req.headers.host !== `127.0.0.1:${port}`) {
    res.writeHead(403).end("Use the printed loopback URL."); return;
  }
  try {
    if (req.method === "GET" && req.url === "/api/config") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({
        contextConfigured: modelConnection.configured,
        speechConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
      })); return;
    }
    if (req.method === "GET" && assets.has(req.url)) {
      const [file, type] = assets.get(req.url);
      const data = await readFile(new URL(`../${file}`, import.meta.url));
      res.writeHead(200, { "Content-Type": type }).end(data); return;
    }
    if (req.method !== "POST" || !["/api/preview", "/api/speech", "/api/context"].includes(req.url)) {
      res.writeHead(404).end("Not found"); return;
    }
    if (req.headers.origin !== origin || req.headers["content-type"] !== "application/json") {
      res.writeHead(403).end("Request origin or content type rejected."); return;
    }
    let raw = "";
    req.setEncoding("utf8");
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 20000) throw new Error("Request is too large.");
    }
    const input = JSON.parse(raw);
    if (req.url === "/api/context") {
      if (contextBusy) { res.writeHead(429).end(JSON.stringify({ error: "A context request is already running." })); return; }
      contextBusy = true;
      try {
        const result = await prepareSpeech(input, { generate: modelConnection.generate });
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
      } finally { contextBusy = false; }
      return;
    }
    const preview = buildRequest(input);
    if (req.url === "/api/preview") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(preview)); return;
    }
    if (busy) { res.writeHead(429).end("An audio request is already running."); return; }
    busy = true;
    try {
      const audio = await generateAudio(input, { apiKey: process.env.ELEVENLABS_API_KEY });
      res.writeHead(200, { "Content-Type": "audio/mpeg" }).end(audio);
    } finally { busy = false; }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: message }));
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Delivery playground: ${origin}`));
