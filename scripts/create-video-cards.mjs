import fs from "node:fs";
import path from "node:path";
import sharp from "/Users/toky/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/lib/index.js";

const root = "/Users/toky/Documents/Projets/projets-recuperes/malagasy-events";
const out = path.join(root, "public/social/video-guide/cards");
fs.mkdirSync(out, { recursive: true });

const cards = [
  ["01-intro", "MALAGASY EVENTS", "Tout trouver.", "Au même endroit.", "Le guide de la communauté malagasy en France"],
  ["02-explorer", "01 — EXPLORER", "Bien plus que", "des événements.", "Gastronomie · Églises · Sport · Boutiques · Communauté"],
  ["03-guide", "02 — S’INFORMER", "Le Guide France", "pour avancer.", "Études · Travail · Installation · Aides et démarches"],
  ["04-evenement", "03 — PARTICIPER", "Une fiche claire.", "Un lien vérifié.", "Date · Lieu · Prix · Organisateur · Billetterie"],
  ["05-outro", "REJOINS LA COMMUNAUTÉ", "Malagasy Events", "est ouvert.", "www.malagasy-events.com"],
];

for (const [name, kicker, title1, title2, sub] of cards) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <rect width="1080" height="1920" fill="#B20D2F"/>
    <path d="M680 0h400v1920L830 1920 410 0z" fill="#85091F" opacity=".44"/>
    <path d="M1080 1450v470H610z" fill="#00843D"/>
    <g transform="translate(78 85)">
      <rect width="66" height="66" rx="4" fill="#fff"/>
      <path d="M22 22h44v22H22z" fill="#B20D2F"/>
      <path d="M22 44h44v22H22z" fill="#00843D"/>
      <text x="90" y="47" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="800" fill="#fff">MALAGASY EVENTS</text>
    </g>
    <text x="78" y="650" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="#F6C94C" letter-spacing="5">${kicker}</text>
    <text x="78" y="790" font-family="Arial, Helvetica, sans-serif" font-size="90" font-weight="800" fill="#fff">${title1}</text>
    <text x="78" y="900" font-family="Arial, Helvetica, sans-serif" font-size="90" font-weight="800" fill="#F6C94C">${title2}</text>
    <foreignObject x="78" y="1010" width="850" height="180">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font: 34px Arial, sans-serif; line-height:1.35; color:white">${sub}</div>
    </foreignObject>
    <rect x="78" y="1670" width="480" height="88" rx="44" fill="#fff"/>
    <text x="318" y="1727" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="800" fill="#B20D2F">malagasy-events.com</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(out, `${name}.png`));
}
