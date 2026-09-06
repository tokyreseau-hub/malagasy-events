import fs from "node:fs";
import path from "node:path";
import sharp from "/Users/toky/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/lib/index.js";

const root = "/Users/toky/Documents/Projets/projets-recuperes/malagasy-events";
const out = path.join(root, "public/social/carrousel-guide-edito");
fs.mkdirSync(out, { recursive: true });

const W = 1080;
const H = 1080;
const red = "#B20D2F";
const redDark = "#85091F";
const green = "#00843D";
const gold = "#F6C94C";
const ink = "#171717";
const soft = "#F5F2ED";
const font = "Arial, Helvetica, sans-serif";

const esc = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function logo(x = 74, y = 62, dark = false) {
  const text = dark ? "#FFFFFF" : ink;
  return `
    <g transform="translate(${x} ${y})">
      <rect width="56" height="56" rx="4" fill="#fff"/>
      <path d="M0 0h56v18H0z" fill="#fff"/>
      <path d="M0 18h56v19H0z" fill="${red}"/>
      <path d="M0 37h56v19H0z" fill="${green}"/>
      <rect x="0" y="0" width="19" height="56" fill="#fff"/>
      <text x="76" y="39" font-family="${font}" font-size="27" font-weight="800" fill="${text}" letter-spacing="1">MALAGASY EVENTS</text>
    </g>`;
}

function pageNo(n, dark = false) {
  return `<text x="964" y="96" text-anchor="end" font-family="${font}" font-size="24" font-weight="700" fill="${dark ? "#fff" : ink}" opacity=".7">0${n} / 06</text>`;
}

function base(content, n, dark = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${dark ? red : "#FFFFFF"}"/>
    ${logo(74, 62, dark)}
    ${pageNo(n, dark)}
    ${content}
  </svg>`;
}

function title(kicker, line1, line2 = "", dark = false) {
  const c = dark ? "#fff" : ink;
  return `
    <text x="74" y="220" font-family="${font}" font-size="28" font-weight="800" fill="${dark ? gold : red}" letter-spacing="3">${esc(kicker.toUpperCase())}</text>
    <text x="74" y="300" font-family="${font}" font-size="64" font-weight="800" fill="${c}">${esc(line1)}</text>
    ${line2 ? `<text x="74" y="368" font-family="${font}" font-size="64" font-weight="800" fill="${c}">${esc(line2)}</text>` : ""}
  `;
}

function illustration(kind, x, y, color = green) {
  const common = `fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"`;
  const drawings = {
    search: `<circle cx="54" cy="54" r="35" ${common}/><path d="M80 80l32 32" ${common}/><path d="M38 54h32M54 38v32" ${common} opacity=".35"/>`,
    account: `<circle cx="58" cy="42" r="24" ${common}/><path d="M14 118c5-30 22-45 44-45s39 15 44 45" ${common}/><path d="M123 31v54M96 58h54" ${common}/>`,
    premium: `<path d="M70 12l17 35 39 6-28 27 7 39-35-18-35 18 7-39-28-27 39-6z" ${common}/><path d="M157 20v54M130 47h54" ${common}/>`,
    directory: `<rect x="8" y="18" width="62" height="62" rx="10" ${common}/><rect x="88" y="18" width="62" height="62" rx="10" ${common}/><rect x="8" y="98" width="62" height="62" rx="10" ${common}/><rect x="88" y="98" width="62" height="62" rx="10" ${common}/>`,
    shield: `<path d="M72 10l54 20v42c0 39-22 65-54 82-32-17-54-43-54-82V30z" ${common}/><path d="M45 78l19 19 38-44" ${common}/>`,
  };
  return `<g transform="translate(${x} ${y})">${drawings[kind]}</g>`;
}

function rule(y, color = "#D7D1CA") {
  return `<line x1="74" y1="${y}" x2="1006" y2="${y}" stroke="${color}" stroke-width="2"/>`;
}

function numbered(y, n, heading, body) {
  return `
    <text x="74" y="${y}" font-family="${font}" font-size="26" font-weight="800" fill="${red}">0${n}</text>
    <text x="150" y="${y}" font-family="${font}" font-size="35" font-weight="800" fill="${ink}">${esc(heading)}</text>
    <text x="150" y="${y + 42}" font-family="${font}" font-size="25" fill="#5B5855">${esc(body)}</text>
  `;
}

const slides = [
  base(`
    <path d="M0 0h1080v1080H0z" fill="${red}"/>
    <path d="M720 0h360v1080L900 1080 610 0z" fill="${redDark}" opacity=".45"/>
    <path d="M1080 700v380H690z" fill="${green}"/>
    ${logo(74, 62, true)}
    ${pageNo(1, true)}
    <text x="74" y="300" font-family="${font}" font-size="21" font-weight="800" fill="${gold}" letter-spacing="5">LE GUIDE DU SITE</text>
    <text x="74" y="425" font-family="${font}" font-size="92" font-weight="800" fill="#fff">Tout comprendre.</text>
    <text x="74" y="522" font-family="${font}" font-size="92" font-weight="800" fill="${gold}">En 1 minute.</text>
    <text x="78" y="630" font-family="${font}" font-size="31" fill="#fff">Événements, communauté, bonnes adresses</text>
    <text x="78" y="674" font-family="${font}" font-size="31" fill="#fff">et outils pour la diaspora malagasy.</text>
    <rect x="74" y="820" width="470" height="82" rx="41" fill="#fff"/>
    <text x="309" y="873" text-anchor="middle" font-family="${font}" font-size="27" font-weight="800" fill="${red}">malagasy-events.com</text>
  `, 1, true),

  base(`
    ${title("Pour commencer", "Explore tout le site", "sans créer de compte.")}
    ${illustration("search", 830, 245, green)}
    <rect x="74" y="430" width="932" height="260" rx="22" fill="${soft}"/>
    <text x="112" y="492" font-family="${font}" font-size="24" font-weight="800" fill="${red}" letter-spacing="2">TU PEUX RECHERCHER :</text>
    <g font-family="${font}" font-size="27" font-weight="700" fill="${ink}">
      <text x="112" y="555">Événements · Gastronomie · Professionnels</text>
      <text x="112" y="610">Églises · Sportifs · Boutiques</text>
      <text x="112" y="665">Guide France · Membres de la communauté</text>
    </g>
    ${numbered(760, 1, "Choisis", "Une rubrique, une ville ou une catégorie.")}
    ${numbered(870, 2, "Vérifie", "La fiche, le lieu, les horaires et les liens officiels.")}
    <rect x="74" y="950" width="932" height="70" rx="12" fill="${green}"/>
    <text x="540" y="995" text-anchor="middle" font-family="${font}" font-size="23" font-weight="800" fill="#fff">Une billetterie n’est active que lorsque son lien est confirmé.</text>
  `, 2),

  base(`
    ${title("Compte gratuit", "Pour participer,", "il suffit de se connecter.")}
    <rect x="74" y="450" width="932" height="410" rx="22" fill="${soft}"/>
    <text x="118" y="535" font-family="${font}" font-size="27" font-weight="800" fill="${red}">AVEC TON COMPTE, TU PEUX :</text>
    <g font-family="${font}" font-size="34" font-weight="700" fill="${ink}">
      <text x="118" y="620">Commenter et publier</text>
      <text x="560" y="620">Suivre des membres</text>
      <text x="118" y="710">Envoyer des messages</text>
      <text x="560" y="710">Recevoir des rappels</text>
    </g>
    <g fill="${green}">
      <circle cx="94" cy="610" r="8"/><circle cx="536" cy="610" r="8"/>
      <circle cx="94" cy="700" r="8"/><circle cx="536" cy="700" r="8"/>
    </g>
    <rect x="74" y="910" width="315" height="82" rx="41" fill="${green}"/>
    <text x="231" y="962" text-anchor="middle" font-family="${font}" font-size="27" font-weight="800" fill="#fff">CONNEXION</text>
    <text x="425" y="962" font-family="${font}" font-size="25" fill="#5B5855">L’inscription est gratuite.</text>
  `, 3),

  base(`
    ${title("Deux niveaux en plus", "Premium ou organisateur :", "à chacun son usage.")}
    <rect x="74" y="450" width="445" height="455" rx="22" fill="${red}"/>
    <text x="112" y="525" font-family="${font}" font-size="22" font-weight="800" fill="${gold}" letter-spacing="3">PREMIUM</text>
    <text x="112" y="594" font-family="${font}" font-size="43" font-weight="800" fill="#fff">Plus visible.</text>
    <text x="112" y="660" font-family="${font}" font-size="25" fill="#fff">Avantages partenaires</text>
    <text x="112" y="710" font-family="${font}" font-size="25" fill="#fff">Badge sur le profil</text>
    <text x="112" y="760" font-family="${font}" font-size="25" fill="#fff">Mise en avant 48 h</text>
    <text x="112" y="845" font-family="${font}" font-size="32" font-weight="800" fill="${gold}">2,50 € / mois</text>
    <rect x="541" y="450" width="465" height="455" rx="22" fill="${green}"/>
    <text x="579" y="525" font-family="${font}" font-size="22" font-weight="800" fill="#fff" letter-spacing="3">ORGANISATEUR</text>
    <text x="579" y="594" font-family="${font}" font-size="43" font-weight="800" fill="#fff">Pour ta structure.</text>
    <text x="579" y="660" font-family="${font}" font-size="25" fill="#fff">Créer une fiche</text>
    <text x="579" y="710" font-family="${font}" font-size="25" fill="#fff">Publier des événements</text>
    <text x="579" y="760" font-family="${font}" font-size="25" fill="#fff">Suivre ses abonnés</text>
    <text x="579" y="810" font-family="${font}" font-size="25" fill="#fff">Parler en son nom</text>
  `, 4),

  base(`
    ${title("L’annuaire", "Un seul site,", "plusieurs univers.")}
    ${illustration("directory", 825, 240, green)}
    <g font-family="${font}">
      <text x="74" y="500" font-size="26" font-weight="800" fill="${red}">01</text>
      <text x="135" y="500" font-size="34" font-weight="800" fill="${ink}">Événements</text>
      <text x="555" y="500" font-size="26" font-weight="800" fill="${green}">05</text>
      <text x="616" y="500" font-size="34" font-weight="800" fill="${ink}">Sportifs</text>
      ${rule(540)}
      <text x="74" y="610" font-size="26" font-weight="800" fill="${red}">02</text>
      <text x="135" y="610" font-size="34" font-weight="800" fill="${ink}">Gastronomie</text>
      <text x="555" y="610" font-size="26" font-weight="800" fill="${green}">06</text>
      <text x="616" y="610" font-size="34" font-weight="800" fill="${ink}">Boutiques</text>
      ${rule(650)}
      <text x="74" y="720" font-size="26" font-weight="800" fill="${red}">03</text>
      <text x="135" y="720" font-size="34" font-weight="800" fill="${ink}">Professionnels</text>
      <text x="555" y="720" font-size="26" font-weight="800" fill="${green}">07</text>
      <text x="616" y="720" font-size="34" font-weight="800" fill="${ink}">Guide France</text>
      ${rule(760)}
      <text x="74" y="830" font-size="26" font-weight="800" fill="${red}">04</text>
      <text x="135" y="830" font-size="34" font-weight="800" fill="${ink}">Églises</text>
      <text x="555" y="830" font-size="26" font-weight="800" fill="${green}">08</text>
      <text x="616" y="830" font-size="34" font-weight="800" fill="${ink}">Communauté</text>
    </g>
    <text x="74" y="955" font-family="${font}" font-size="25" fill="#5B5855">Tout est accessible depuis le menu principal.</text>
  `, 5),

  base(`
    ${title("Avant de cliquer", "Quatre réflexes", "pour rester tranquille.")}
    ${illustration("shield", 830, 240, green)}
    ${numbered(470, 1, "Garde ton mot de passe pour toi.", "")}
    ${numbered(585, 2, "Vérifie la date, le lieu et le prix.", "")}
    ${numbered(700, 3, "Utilise une billetterie confirmée.", "")}
    ${numbered(815, 4, "Bloque et signale si nécessaire.", "")}
    <rect x="0" y="920" width="1080" height="160" fill="${green}"/>
    <text x="74" y="982" font-family="${font}" font-size="22" font-weight="800" fill="#fff" letter-spacing="3">DÉCOUVRE LE SITE</text>
    <text x="74" y="1035" font-family="${font}" font-size="38" font-weight="800" fill="#fff">www.malagasy-events.com</text>
    <text x="1006" y="1015" text-anchor="end" font-family="${font}" font-size="24" font-weight="700" fill="#fff">Enregistre · Partage</text>
  `, 6),
];

for (let i = 0; i < slides.length; i++) {
  const name = `${String(i + 1).padStart(2, "0")}-${["couverture", "sans-compte", "compte-gratuit", "premium-organisateur", "rubriques", "securite"][i]}.png`;
  await sharp(Buffer.from(slides[i])).png().toFile(path.join(out, name));
}

console.log(out);
