const artists = [
  "ABBA", "Aerosmith", "Aretha Franklin", "Bauhaus", "Beastie Boys",
  "Blondie", "Bob Dylan", "Bob Mould", "Carole King", "David Bowie",
  "Depeche Mode", "Elvis Costello", "Fleetwood Mac", "George Harrison",
  "Iggy Pop", "Jefferson Airplane", "Jimi Hendrix", "Kate Bush",
  "Led Zeppelin", "Lou Reed", "Madonna", "Marvin Gaye", "Neil Young",
  "Nico", "Otis Redding", "Patti Smith", "Paul Simon", "Prince",
  "Radiohead", "Roxy Music", "Sparks", "Stevie Wonder", "Talking Heads",
  "The Beatles", "The Cars", "The Clash", "The Cure", "The Doors",
  "The Hollies", "The Kinks", "The Rolling Stones", "The Shins",
  "The Strokes", "The Velvet Underground", "The Who", "Violent Femmes",
  "XTC", "Yardbirds"
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
const stuckButton = document.getElementById("stuck-button");
const letterBox = document.querySelector(".letter-box");

let usedArtists = [];
let requiredLetter = "";
let escapeLetter = null;
const validatedArtists = new Map();
const publishedArtists = new Map();
const computerPools = new Map();

let lastMusicBrainzRequest = 0;
let musicBrainzQueue = Promise.resolve();
const MUSICBRAINZ_DELAY = 1100;

function normalizeArtist(name) {
  return name.trim().toLowerCase();
}

function getLetters(name) {
  const cleaned = name.trim();
  const lastLetter = cleaned.charAt(cleaned.length - 1).toUpperCase();
  const sEscapeLetter = lastLetter === "S" && cleaned.length > 1
    ? cleaned.charAt(cleaned.length - 2).toUpperCase()
    : null;
  return { normal: lastLetter, escape: sEscapeLetter };
}

function localArtist(name) {
  const normalized = normalizeArtist(name);
  return artists.find(artist => normalizeArtist(artist) === normalized) || null;
}

function artistWasUsed(name) {
  const normalized = normalizeArtist(name);
  return usedArtists.some(artist => normalizeArtist(artist.name) === normalized);
}

function availableLocalArtists(letter) {
  return artists.filter(artist => artist.charAt(0).toUpperCase() === letter && !artistWasUsed(artist));
}

function addUsedArtist(artist, player) {
  usedArtists.push({ name: artist, player });
  renderUsedArtists();
}

function renderUsedArtists() {
  usedArtistsEl.innerHTML = usedArtists
    .map(artist => `<span class="${artist.player}">${artist.name}</span>`)
    .join("");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function queuedMusicBrainzFetch(url) {
  const task = async () => {
    const wait = Math.max(0, MUSICBRAINZ_DELAY - (Date.now() - lastMusicBrainzRequest));
    if (wait) await sleep(wait);

    let response = await fetch(url);
    lastMusicBrainzRequest = Date.now();

    if (response.status === 429 || response.status >= 500) {
      await sleep(1500);
      response = await fetch(url);
      lastMusicBrainzRequest = Date.now();
    }

    if (!response.ok) throw new Error(`MusicBrainz returned HTTP ${response.status}`);
    return response.json();
  };

  const result = musicBrainzQueue.then(task, task);
  musicBrainzQueue = result.catch(() => {});
  return result;
}

async function searchMusicBrainz(query, limit = 25) {
  return queuedMusicBrainzFetch(
    `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`
  );
}

async function hasOfficialRelease(artistId) {
  if (publishedArtists.has(artistId)) return publishedArtists.get(artistId);

  const data = await queuedMusicBrainzFetch(
    `https://musicbrainz.org/ws/2/release/?artist=${encodeURIComponent(artistId)}&status=official&limit=1&fmt=json`
  );
  const published = (data["release-count"] || 0) > 0 || (data.releases || []).length > 0;
  publishedArtists.set(artistId, published);
  return published;
}

async function findMusicBrainzArtist(name) {
  const normalized = normalizeArtist(name);
  if (validatedArtists.has(normalized)) return validatedArtists.get(normalized);

  const data = await searchMusicBrainz(`artist:${name}`, 10);
  const candidates = (data.artists || []).filter(artist =>
    normalizeArtist(artist.name) === normalized ||
    (artist.aliases || []).some(alias => normalizeArtist(alias.name) === normalized)
  );

  for (const candidate of candidates) {
    if (await hasOfficialRelease(candidate.id)) {
      const result = { name: candidate.name, id: candidate.id };
      validatedArtists.set(normalized, result);
      validatedArtists.set(normalizeArtist(candidate.name), result);
      return result;
    }
  }

  validatedArtists.set(normalized, null);
  return null;
}

async function validateArtist(name) {
  const known = localArtist(name);
  if (known) return { name: known, source: "local" };
  const match = await findMusicBrainzArtist(name);
  return match ? { ...match, source: "musicbrainz" } : null;
}

async function musicBrainzArtistsForLetter(letter) {
  if (computerPools.has(letter)) {
    return computerPools.get(letter).filter(name => !artistWasUsed(name));
  }

  const data = await searchMusicBrainz(`artist:${letter}*`, 25);
  const candidates = (data.artists || []).filter(artist =>
    artist.name && artist.name.charAt(0).toUpperCase() === letter && !artistWasUsed(artist.name)
  );

  const published = [];
  for (const artist of candidates) {
    if (await hasOfficialRelease(artist.id)) {
      published.push(artist.name);
      if (published.length >= 3) break;
    }
  }

  computerPools.set(letter, published);
  return published;
}

async function chooseComputerArtist(letter = null, alternateLetter = null) {
  if (!letter) {
    const choices = artists.filter(artist => !artistWasUsed(artist));
    return choices.length
      ? { artist: choices[Math.floor(Math.random() * choices.length)], usedEscape: false }
      : null;
  }

  let choices = availableLocalArtists(letter);

  if (choices.length === 0) {
    try {
      choices = await musicBrainzArtistsForLetter(letter);
    } catch (error) {
      choices = [];
    }
  }

  if (choices.length) {
    return { artist: choices[Math.floor(Math.random() * choices.length)], usedEscape: false };
  }

  if (alternateLetter) {
    let escapeChoices = availableLocalArtists(alternateLetter);

    if (escapeChoices.length === 0) {
      try {
        escapeChoices = await musicBrainzArtistsForLetter(alternateLetter);
      } catch (error) {
        escapeChoices = [];
      }
    }

    if (escapeChoices.length) {
      return { artist: escapeChoices[Math.floor(Math.random() * escapeChoices.length)], usedEscape: true };
    }
  }

  return null;
}

async function computerTurn(letter = null, alternateLetter = null) {
  artistInput.disabled = true;
  messageEl.textContent = letter ? "Computer is thinking…" : "";
  const choice = await chooseComputerArtist(letter, alternateLetter);

  if (!choice) {
    endGame("player");
    return;
  }

  const artist = choice.artist;
  computerArtistEl.textContent = artist;
  addUsedArtist(artist, "computer");

  const letters = getLetters(artist);
  requiredLetter = letters.normal;
  escapeLetter = letters.escape;
  requiredLetterEl.textContent = requiredLetter;
  messageEl.textContent = choice.usedEscape ? "COMPUTER S ESCAPE · −2" : "";

  if (escapeLetter) {
    sEscapeEl.textContent = `S ESCAPE → ${escapeLetter} · −2`;
    sEscapeEl.classList.remove("hidden");
  } else {
    sEscapeEl.textContent = "";
    sEscapeEl.classList.add("hidden");
  }

  artistInput.disabled = false;
  artistInput.value = "";
  artistInput.focus();
}

function endGame(winner) {
  artistInput.disabled = true;
  artistForm.classList.add("hidden");
  letterBox.classList.add("hidden");
  sEscapeEl.textContent = "";
  sEscapeEl.classList.add("hidden");

  const artistCount = usedArtists.length;
  if (winner === "computer") {
    computerArtistEl.textContent = "COMPUTER WINS";
    messageEl.textContent = `You're stuck. ${artistCount} artists played.`;
  } else {
    computerArtistEl.textContent = "YOU WIN";
    messageEl.textContent = `The computer is stuck. ${artistCount} artists played.`;
  }
  stuckButton.classList.add("hidden");
}

function startGame() {
  usedArtists = [];
  requiredLetter = "";
  escapeLetter = null;
  artistInput.disabled = true;
  artistInput.value = "";
  artistForm.classList.remove("hidden");
  letterBox.classList.remove("hidden");
  stuckButton.classList.remove("hidden");
  usedArtistsEl.innerHTML = "";
  messageEl.textContent = "";
  sEscapeEl.textContent = "";
  sEscapeEl.classList.add("hidden");
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  computerTurn();
}

async function handlePlayerTurn(event) {
  event.preventDefault();
  const entry = artistInput.value.trim();
  if (!entry || artistInput.disabled) return;

  const entryFirstLetter = entry.charAt(0).toUpperCase();
  const couldUseNormalLetter = entryFirstLetter === requiredLetter;
  const couldUseEscapeLetter = escapeLetter && entryFirstLetter === escapeLetter;

  if (!couldUseNormalLetter && !couldUseEscapeLetter) {
    messageEl.textContent = escapeLetter
      ? `Artist must begin with ${requiredLetter}, or ${escapeLetter} using S Escape.`
      : `Artist must begin with ${requiredLetter}.`;
    return;
  }

  artistInput.disabled = true;
  messageEl.textContent = localArtist(entry) ? "" : "Checking artist + release…";

  let validation;
  try {
    validation = await validateArtist(entry);
  } catch (error) {
    artistInput.disabled = false;
    artistInput.focus();
    messageEl.textContent = "MusicBrainz is busy. Try that artist again.";
    return;
  }

  if (!validation) {
    artistInput.disabled = false;
    messageEl.textContent = "I couldn't verify an official release for that artist.";
    artistInput.focus();
    return;
  }

  const validArtist = validation.name;
  if (artistWasUsed(validArtist)) {
    artistInput.disabled = false;
    messageEl.textContent = `${validArtist} has already been used.`;
    artistInput.focus();
    return;
  }

  const firstLetter = validArtist.charAt(0).toUpperCase();
  const usedNormalLetter = firstLetter === requiredLetter;
  const usedEscapeLetter = escapeLetter && firstLetter === escapeLetter;

  if (!usedNormalLetter && !usedEscapeLetter) {
    artistInput.disabled = false;
    messageEl.textContent = escapeLetter
      ? `Artist must begin with ${requiredLetter}, or ${escapeLetter} using S Escape.`
      : `Artist must begin with ${requiredLetter}.`;
    artistInput.focus();
    return;
  }

  addUsedArtist(validArtist, "player");
  const nextLetters = getLetters(validArtist);
  await computerTurn(nextLetters.normal, nextLetters.escape);

  if (usedEscapeLetter && !artistInput.disabled) {
    messageEl.textContent = "S ESCAPE · −2";
  }
}

startButton.addEventListener("click", startGame);
artistForm.addEventListener("submit", handlePlayerTurn);
newGameButton.addEventListener("click", startGame);
stuckButton.addEventListener("click", () => endGame("computer"));