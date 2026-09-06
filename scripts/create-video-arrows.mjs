import fs from "node:fs";
import path from "node:path";
import sharp from "/Users/toky/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/lib/index.js";

const out = "/Users/toky/Documents/Projets/projets-recuperes/malagasy-events/public/social/video-guide/arrows";
fs.mkdirSync(out, { recursive: true });

const arrows = {
  "down-left": `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="150"><path d="M190 20C125 22 80 60 48 110" fill="none" stroke="white" stroke-width="22" stroke-linecap="round"/><path d="M190 20C125 22 80 60 48 110" fill="none" stroke="#F2B705" stroke-width="12" stroke-linecap="round"/><path d="M26 88l16 45 46-14" fill="#F2B705" stroke="white" stroke-width="7" stroke-linejoin="round"/></svg>`,
  "down-right": `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="150"><path d="M20 20c65 2 110 40 142 90" fill="none" stroke="white" stroke-width="22" stroke-linecap="round"/><path d="M20 20c65 2 110 40 142 90" fill="none" stroke="#F2B705" stroke-width="12" stroke-linecap="round"/><path d="M184 88l-16 45-46-14" fill="#F2B705" stroke="white" stroke-width="7" stroke-linejoin="round"/></svg>`,
  "up-right": `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="150"><path d="M20 130c65-2 110-40 142-90" fill="none" stroke="white" stroke-width="22" stroke-linecap="round"/><path d="M20 130c65-2 110-40 142-90" fill="none" stroke="#F2B705" stroke-width="12" stroke-linecap="round"/><path d="M184 62l-16-45-46 14" fill="#F2B705" stroke="white" stroke-width="7" stroke-linejoin="round"/></svg>`,
};

for (const [name, svg] of Object.entries(arrows)) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(out, `${name}.png`));
}
