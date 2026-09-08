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
  return artists.filter(artist =>
    artist.charAt(0).toUpperCase() === letter && !artistWasUsed(artist)
  );
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

async function searchMusicBrainz(query, limit = 25) {
  const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MusicBrainz returned HTTP ${response.status}`);
  return response.json();
}

async function findMusicBrainzArtist(name) {
  const normalized = normalizeArtist(name);
  if (validatedArtists.has(normalized)) return validatedArtists.get(normalized);

  const data = await searchMusicBrainz(`artist:${name}`, 10);
  const match = (data.artists || []).find(artist =>
    normalizeArtist(artist.name) === normalized ||
    (artist.aliases || []).some(alias => normalizeArtist(alias.name) === normalized)
  );

  if (!match) {
    validatedArtists.set(normalized, null);
    return null;
  }

  const result = { name: match.name, id: match.id };
  validatedArtists.set(normalized, result);
  validatedArtists.set(normalizeArtist(match.name), result);
  return result;
}

async function validateArtist(name) {
  const known = localArtist(name);
  if (known) return { name: known, source: "local" };

  const match = await findMusicBrainzArtist(name);
  return match ? { ...match, source: "musicbrainz" } : null;
}

async function musicBrainzArtistsForLetter(letter) {
  const data = await searchMusicBrainz(`artist:${letter}*`, 25);
  return (data.artists || [])
    .map(artist => artist.name)
    .filter(name =>
      name &&
      name.charAt(0).toUpperCase() === letter &&
      !artistWasUsed(name)
    );
}

async function chooseComputerArtist(letter = null, alternateLetter = null) {
  if (!letter) {
    const choices = artists.filter(artist => !artistWasUsed(artist));
    return choices.length
      ? { artist: choices[Math.floor(Math.random() * choices.length)], usedEscape: false }
      : null;
  }

  let choices = availableLocalArtists(letter);

  try {
    const remoteChoices = await musicBrainzArtistsForLetter(letter);
    choices = [...new Set([...choices, ...remoteChoices])];
  } catch (error) {
    // If MusicBrainz is temporarily unavailable, the local pool still works.
  }

  if (choices.length) {
    return {
      artist: choices[Math.floor(Math.random() * choices.length)],
      usedEscape: false
    };
  }

  if (alternateLetter) {
    let escapeChoices = availableLocalArtists(alternateLetter);

    try {
      const remoteEscapeChoices = await musicBrainzArtistsForLetter(alternateLetter);
      escapeChoices = [...new Set([...escapeChoices, ...remoteEscapeChoices])];
    } catch (error) {
      // Fall back to the local escape pool.
    }

    if (escapeChoices.length) {
      return {
        artist: escapeChoices[Math.floor(Math.random() * escapeChoices.length)],
        usedEscape: true
      };
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
  messageEl.textContent = localArtist(entry) ? "" : "Checking artist…";

  let validation;
  try {
    validation = await validateArtist(entry);
  } catch (error) {
    artistInput.disabled = false;
    artistInput.focus();
    messageEl.textContent = "Couldn't check MusicBrainz. Try again.";
    return;
  }

  if (!validation) {
    artistInput.disabled = false;
    messageEl.textContent = "I couldn't verify that artist.";
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