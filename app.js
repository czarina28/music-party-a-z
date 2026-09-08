const computerArtists = [
  "ABBA", "AC/DC", "Adele", "Aerosmith", "Al Green", "Alice Cooper", "Amy Winehouse", "Arcade Fire", "Arctic Monkeys", "Aretha Franklin", "Bauhaus", "Beastie Boys", "Beck", "Bee Gees", "Beyoncé", "Billy Idol", "Billy Joel", "Black Sabbath", "Blondie", "Blur", "Bob Dylan", "Bob Marley", "Bob Mould", "Bon Iver", "Bruce Springsteen", "CAN", "Carole King", "Cat Stevens", "Cheap Trick", "Cher", "Chuck Berry", "Cocteau Twins", "Coldplay", "Cream", "Crowded House", "Curtis Mayfield", "Daft Punk", "David Bowie", "Depeche Mode", "Dinosaur Jr.", "Dire Straits", "Dolly Parton", "Donna Summer", "Duran Duran", "Eagles", "Echo & the Bunnymen", "Elton John", "Elvis Costello", "Elvis Presley", "Emmylou Harris", "Eurythmics", "Evanescence", "Fiona Apple", "Fleetwood Mac", "Foo Fighters", "Frank Sinatra", "Franz Ferdinand", "Garbage", "George Harrison", "George Michael", "Gorillaz", "Grateful Dead", "Green Day", "Haim", "Harry Styles", "Heart", "Hole", "Howard Jones", "Hüsker Dü", "Iggy Pop", "INXS", "Iron Maiden", "Jack White", "Janis Joplin", "Jefferson Airplane", "Jimi Hendrix", "Joan Baez", "Joy Division", "Judas Priest", "Kate Bush", "Kendrick Lamar", "Kraftwerk", "Kylie Minogue", "LCD Soundsystem", "Led Zeppelin", "Leonard Cohen", "Lorde", "Lou Reed", "Love", "Madonna", "Marvin Gaye", "Massive Attack", "Mazzy Star", "Metallica", "MGMT", "Michael Jackson", "Miley Cyrus", "Moby", "Morrissey", "Motörhead", "Muddy Waters", "Nancy Sinatra", "Neil Young", "New Order", "Nick Cave", "Nick Drake", "Nico", "Nirvana", "Oasis", "Olivia Rodrigo", "Otis Redding", "Outkast", "Patti Smith", "Paul McCartney", "Paul Simon", "Pearl Jam", "Pet Shop Boys", "Peter Gabriel", "PJ Harvey", "Pixies", "Pink Floyd", "Portishead", "Prince", "Pulp", "Queen", "Queens of the Stone Age", "Radiohead", "R.E.M.", "Ramones", "Rammstein", "Ray Charles", "Red Hot Chili Peppers", "Roxy Music", "Run-D.M.C.", "Santana", "Sex Pistols", "Sia", "Sinéad O'Connor", "Siouxsie and the Banshees", "Sleater-Kinney", "Sonic Youth", "Sparks", "Steely Dan", "Stevie Wonder", "Stone Roses", "Suede", "Supertramp", "Talking Heads", "Tame Impala", "Taylor Swift", "Tears for Fears", "The Beach Boys", "The Beatles", "The Byrds", "The Cars", "The Clash", "The Cranberries", "The Cure", "The Doors", "The Go-Go's", "The Hollies", "The Jam", "The Jesus and Mary Chain", "The Kinks", "The Monkees", "The National", "The Notwist", "The Police", "The Pretenders", "The Replacements", "The Rolling Stones", "The Shins", "The Smiths", "The Stooges", "The Strokes", "The Supremes", "The Velvet Underground", "The White Stripes", "The Who", "The Yardbirds", "Tori Amos", "Tracy Chapman", "T. Rex", "TV on the Radio", "U2", "Ultravox", "Van Morrison", "Violent Femmes", "Weezer", "Wilco", "Wire", "XTC", "Yeah Yeah Yeahs", "ZZ Top"
];

const startButton = document.getElementById("start-button");
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const computerArtistEl = document.getElementById("computer-artist");
const requiredLetterEl = document.getElementById("required-letter");
const sEscapeEl = document.getElementById("s-escape");
const artistForm = document.getElementById("artist-form");
const artistInput = document.getElementById("artist-input");
const messageEl = document.getElementById("message");
const usedArtistsEl = document.getElementById("used-artists");
const newGameButton = document.getElementById("new-game-button");
const passButton = document.getElementById("pass-button");
const scoreEl = document.getElementById("score");
const letterBox = document.querySelector(".letter-box");

let usedArtists = [];
let requiredLetter = "";
let escapeLetter = null;
let score = 0;
const validationBuckets = new Map();
const validationLoads = new Map();

function normalizeArtist(name) { return name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘`´]/g, "'").replace(/[^a-zA-Z0-9]+/g, "").toLowerCase(); }
function gameplayLetters(name) { return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().match(/[A-Z]/g) || []; }
function gameplayName(name) { return name.trim().replace(/^the\s+/i, ""); }
function firstGameplayLetter(name) { return gameplayLetters(gameplayName(name))[0] || ""; }
function getLetters(name) { const letters = gameplayLetters(gameplayName(name)); if (!letters.length) return { normal: "", escape: null }; const normal = letters[letters.length - 1]; return { normal, escape: normal === "S" && letters.length > 1 ? letters[letters.length - 2] : null }; }
function artistWasUsed(name) { const normalized = normalizeArtist(name); return usedArtists.some(a => normalizeArtist(a.name) === normalized); }
function addUsedArtist(name, player) { usedArtists.push({ name, player }); renderUsedArtists(); }
function renderUsedArtists() { usedArtistsEl.innerHTML = usedArtists.map(a => `<span class="${a.player}">${a.name}</span>`).join(""); }
function changeScore(amount) { score += amount; scoreEl.textContent = score; }

async function loadValidationBucket(letter) {
  const key = letter.toLowerCase();
  if (validationBuckets.has(key)) return validationBuckets.get(key);
  if (validationLoads.has(key)) return validationLoads.get(key);
  const load = fetch(`data/artists/${key}.txt`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); }).then(text => {
    const bucket = new Map();
    for (const name of text.split(/\r?\n/)) if (name) bucket.set(normalizeArtist(name), name);
    validationBuckets.set(key, bucket); validationLoads.delete(key); return bucket;
  }).catch(e => { validationLoads.delete(key); throw e; });
  validationLoads.set(key, load); return load;
}

async function validateArtist(name) {
  const typedWithoutThe = name.replace(/^the\s+/i, "").trim();
  const candidates = /^the\s+/i.test(name) ? [name, typedWithoutThe] : [name, `The ${name}`];
  const shards = [...new Set([firstGameplayLetter(name), firstGameplayLetter(typedWithoutThe), "T"].filter(l => /^[A-Z]$/.test(l)))];
  for (const letter of shards) {
    const bucket = await loadValidationBucket(letter);
    for (const candidate of candidates) { const canonical = bucket.get(normalizeArtist(candidate)); if (canonical) return canonical; }
    if (letter === "T") for (const canonical of bucket.values()) if (/^the\s+/i.test(canonical) && normalizeArtist(canonical.replace(/^the\s+/i, "")) === normalizeArtist(typedWithoutThe)) return canonical;
  }
  return null;
}

function prefetchValidation(letter) { if (letter && /^[A-Z]$/.test(letter)) loadValidationBucket(letter).catch(() => {}); }
function computerChoices(letter) { return computerArtists.filter(a => firstGameplayLetter(a) === letter && !artistWasUsed(a)); }
function chooseComputerArtist(letter = null, alternate = null) {
  if (!letter) { const choices = computerArtists.filter(a => !artistWasUsed(a)); return choices.length ? { artist: choices[Math.floor(Math.random() * choices.length)], usedEscape: false } : null; }
  const choices = computerChoices(letter); if (choices.length) return { artist: choices[Math.floor(Math.random() * choices.length)], usedEscape: false };
  if (alternate) { const choices2 = computerChoices(alternate); if (choices2.length) return { artist: choices2[Math.floor(Math.random() * choices2.length)], usedEscape: true }; }
  return null;
}

async function computerTurn(letter = null, alternate = null, notice = "") {
  artistInput.disabled = true; passButton.disabled = true;
  const choice = chooseComputerArtist(letter, alternate);
  if (!choice) { endGame(); return; }
  computerArtistEl.textContent = choice.artist; addUsedArtist(choice.artist, "computer");
  const letters = getLetters(choice.artist); requiredLetter = letters.normal; escapeLetter = letters.escape;
  requiredLetterEl.textContent = requiredLetter;
  if (escapeLetter) { sEscapeEl.textContent = `PLAY ${requiredLetter} — OR ESCAPE TO ${escapeLetter} (−2)`; sEscapeEl.classList.remove("hidden"); }
  else { sEscapeEl.textContent = ""; sEscapeEl.classList.add("hidden"); }
  messageEl.textContent = notice || (choice.usedEscape ? "Computer used S Escape." : "");
  artistInput.disabled = false; passButton.disabled = false; artistInput.value = ""; artistInput.focus();
  prefetchValidation(requiredLetter); if (escapeLetter) prefetchValidation(escapeLetter);
}

function endGame() {
  artistInput.disabled = true; passButton.disabled = true; artistForm.classList.add("hidden"); letterBox.classList.add("hidden");
  sEscapeEl.classList.add("hidden"); computerArtistEl.textContent = "YOU WIN";
  messageEl.textContent = `The computer is stuck. Final score: ${score}.`;
}

function startGame() {
  usedArtists = []; requiredLetter = ""; escapeLetter = null; score = 0; scoreEl.textContent = "0";
  artistForm.classList.remove("hidden"); letterBox.classList.remove("hidden"); passButton.disabled = false;
  usedArtistsEl.innerHTML = ""; messageEl.textContent = ""; sEscapeEl.classList.add("hidden");
  startScreen.classList.add("hidden"); gameScreen.classList.remove("hidden"); computerTurn();
}

async function handlePlayerTurn(event) {
  event.preventDefault(); const entry = artistInput.value.trim(); if (!entry || artistInput.disabled) return;
  artistInput.disabled = true; passButton.disabled = true; messageEl.textContent = "Checking artist…";
  let validArtist;
  try { validArtist = await validateArtist(entry); } catch { artistInput.disabled = false; passButton.disabled = false; artistInput.focus(); messageEl.textContent = "Couldn't load the local artist database."; return; }
  if (!validArtist) { artistInput.disabled = false; passButton.disabled = false; messageEl.textContent = "I couldn't verify a published artist by that name."; artistInput.focus(); return; }
  if (artistWasUsed(validArtist)) { artistInput.disabled = false; passButton.disabled = false; messageEl.textContent = `${validArtist} has already been used.`; artistInput.focus(); return; }
  const first = firstGameplayLetter(validArtist); const usedNormal = first === requiredLetter; const usedEscape = escapeLetter && first === escapeLetter;
  if (!usedNormal && !usedEscape) { artistInput.disabled = false; passButton.disabled = false; messageEl.textContent = escapeLetter ? `${validArtist} begins with ${first}. You need ${requiredLetter}, or ${escapeLetter} using S Escape.` : `${validArtist} begins with ${first}. You need ${requiredLetter}.`; artistInput.focus(); return; }
  addUsedArtist(validArtist, "player"); changeScore(1); if (usedEscape) changeScore(-2);
  const next = getLetters(validArtist);
  await computerTurn(next.normal, next.escape, usedEscape ? `${validArtist}: +1 artist, −2 S Escape.` : `${validArtist}: +1 point.`);
}

function handlePass() {
  if (passButton.disabled || !requiredLetter) return;
  changeScore(-3);
  computerTurn(requiredLetter, escapeLetter, "PASS −3");
}

startButton.addEventListener("click", startGame);
artistForm.addEventListener("submit", handlePlayerTurn);
newGameButton.addEventListener("click", startGame);
passButton.addEventListener("click", handlePass);