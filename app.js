const artists = [
  "ABBA",
  "Aerosmith",
  "Aretha Franklin",
  "Bauhaus",
  "Beastie Boys",
  "Blondie",
  "Bob Dylan",
  "Bob Mould",
  "Carole King",
  "David Bowie",
  "Depeche Mode",
  "Elvis Costello",
  "Fleetwood Mac",
  "George Harrison",
  "Iggy Pop",
  "Jefferson Airplane",
  "Jimi Hendrix",
  "Kate Bush",
  "Led Zeppelin",
  "Lou Reed",
  "Madonna",
  "Marvin Gaye",
  "Neil Young",
  "Nico",
  "Otis Redding",
  "Patti Smith",
  "Paul Simon",
  "Prince",
  "Radiohead",
  "Roxy Music",
  "Sparks",
  "Stevie Wonder",
  "Talking Heads",
  "The Beatles",
  "The Cars",
  "The Clash",
  "The Cure",
  "The Doors",
  "The Hollies",
  "The Kinks",
  "The Rolling Stones",
  "The Shins",
  "The Strokes",
  "The Velvet Underground",
  "The Who",
  "Violent Femmes",
  "XTC",
  "Yardbirds"
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

let usedArtists = [];
let requiredLetter = "";
let escapeLetter = null;

function normalizeArtist(name) {
  return name.trim().toLowerCase();
}

function getLetters(name) {
  const cleaned = name.trim();
  const lastLetter = cleaned.charAt(cleaned.length - 1).toUpperCase();

  let sEscapeLetter = null;

  if (lastLetter === "S" && cleaned.length > 1) {
    sEscapeLetter = cleaned.charAt(cleaned.length - 2).toUpperCase();
  }

  return {
    normal: lastLetter,
    escape: sEscapeLetter
  };
}

function artistExists(name) {
  const normalized = normalizeArtist(name);

  return artists.find(
    artist => normalizeArtist(artist) === normalized
  );
}

function artistWasUsed(name) {
  const normalized = normalizeArtist(name);

  return usedArtists.some(
    artist => normalizeArtist(artist.name) === normalized
  );
}

function availableArtists(letter) {
  return artists.filter(artist => {
    return (
      artist.charAt(0).toUpperCase() === letter &&
      !artistWasUsed(artist)
    );
  });
}

function addUsedArtist(artist, player) {
  usedArtists.push({
    name: artist,
    player: player
  });

  renderUsedArtists();


}

function renderUsedArtists() {
  usedArtistsEl.innerHTML = usedArtists
    .map(artist => `
      <span class="${artist.player}">
        ${artist.name}
      </span>
    `)
    .join("");
}

function computerTurn(letter = null) {
  let choices;

  if (letter) {
    choices = availableArtists(letter);
  } else {
    choices = artists.filter(artist => !artistWasUsed(artist));
  }

  if (choices.length === 0) {
    computerArtistEl.textContent = "I'm stuck!";
    requiredLetterEl.textContent = "—";
    messageEl.textContent = "You win.";
    artistInput.disabled = true;
    return;
  }

  const artist =
    choices[Math.floor(Math.random() * choices.length)];

  computerArtistEl.textContent = artist;

  addUsedArtist(artist, "computer");

const letters = getLetters(artist);

requiredLetter = letters.normal;
escapeLetter = letters.escape;

requiredLetterEl.textContent = requiredLetter;

if (escapeLetter) {
  sEscapeEl.textContent = `S ESCAPE → ${escapeLetter} · −2`;
  sEscapeEl.classList.remove("hidden");
} else {
  sEscapeEl.textContent = "";
  sEscapeEl.classList.add("hidden");
}

  artistInput.value = "";
  artistInput.focus();
}

function startGame() {
  usedArtists = [];
  requiredLetter = "";

  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  messageEl.textContent = "";

  computerTurn();
}

function handlePlayerTurn(event) {
  event.preventDefault();

  const entry = artistInput.value.trim();

  if (!entry) {
    return;
  }

  const validArtist = artistExists(entry);

  if (!validArtist) {
    messageEl.textContent =
      "I don't know that artist yet.";
    return;
  }

  if (artistWasUsed(validArtist)) {
    messageEl.textContent =
      `${validArtist} has already been used.`;
    return;
  }

  const firstLetter = validArtist.charAt(0).toUpperCase();

const usedNormalLetter = firstLetter === requiredLetter;
const usedEscapeLetter =
  escapeLetter && firstLetter === escapeLetter;

if (!usedNormalLetter && !usedEscapeLetter) {
  if (escapeLetter) {
    messageEl.textContent =
      `Artist must begin with ${requiredLetter}, or ${escapeLetter} using S Escape.`;
  } else {
    messageEl.textContent =
      `Artist must begin with ${requiredLetter}.`;
  }

  return;
}

if (usedEscapeLetter) {
  messageEl.textContent = "S ESCAPE · −2";
} else {
  messageEl.textContent = "";
}

  messageEl.textContent = "";

  addUsedArtist(validArtist, "player");

  const nextLetters = getLetters(validArtist);

computerTurn(nextLetters.normal);
}

startButton.addEventListener("click", startGame);
artistForm.addEventListener("submit", handlePlayerTurn);