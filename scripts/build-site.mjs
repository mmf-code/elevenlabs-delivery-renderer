import { readFile, writeFile, copyFile, mkdir, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const site = new URL("docs/", root);
await mkdir(new URL("audio/", site), { recursive: true });
const html = (await readFile(new URL("demo/index.html", root), "utf8")).replace('data-backend="local"', 'data-backend="static"');
await writeFile(new URL("index.html", site), html);
for (const [source, target] of [
  ["demo/app.js", "app.js"], ["demo/revision.mjs", "revision.mjs"],
  ["dist/index.js", "renderer.js"], ["dist/context.js", "context.js"],
  ["examples/context-examples.json", "context-examples.json"],
  ["examples/audio/context-manifest.json", "context-manifest.json"],
]) await copyFile(new URL(source, root), new URL(target, site));
for (const name of await readdir(new URL("examples/audio/", root))) {
  if (name.endsWith(".mp3")) await copyFile(new URL(`examples/audio/${name}`, root), new URL(`audio/${name}`, site));
}
console.log("Built hosted prompt explorer with explicitly recorded results; no provider keys or generation backend.");
