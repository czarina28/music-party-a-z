const computerArtists = [
  "ABBA", "AC/DC", "Adele", "Aerosmith", "Al Green", "Alice Cooper", "Amy Winehouse", "Arcade Fire", "Arctic Monkeys", "Aretha Franklin",
  "Bauhaus", "Beastie Boys", "Beck", "Bee Gees", "Beyoncé", "Billy Idol", "Billy Joel", "Black Sabbath", "Blondie", "Blur", "Bob Dylan", "Bob Marley", "Bob Mould", "Bon Iver", "Bruce Springsteen",
  "CAN", "Carole King", "Cat Stevens", "Cheap Trick", "Cher", "Chuck Berry", "Cocteau Twins", "Coldplay", "Cream", "Crowded House", "Curtis Mayfield",
  "Daft Punk", "David Bowie", "Depeche Mode", "Dinosaur Jr.", "Dire Straits", "Dolly Parton", "Donna Summer", "Duran Duran",
  "Eagles", "Echo & the Bunnymen", "Elton John", "Elvis Costello", "Elvis Presley", "Emmylou Harris", "Eurythmics", "Evanescence",
  "Fiona Apple", "Fleetwood Mac", "Foo Fighters", "Frank Sinatra", "Franz Ferdinand",
  "Garbage", "George Harrison", "George Michael", "Gorillaz", "Grateful Dead", "Green Day",
  "Haim", "Harry Styles", "Heart", "Hole", "Howard Jones", "Hüsker Dü",
  "Iggy Pop", "INXS", "Iron Maiden",
  "Jack White", "Janis Joplin", "Jefferson Airplane", "Jimi Hendrix", "Joan Baez", "Joy Division", "Judas Priest",
  "Kate Bush", "Kendrick Lamar", "Kraftwerk", "Kylie Minogue",
  "LCD Soundsystem", "Led Zeppelin", "Leonard Cohen", "Lorde", "Lou Reed", "Love",
  "Madonna", "Marvin Gaye", "Massive Attack", "Mazzy Star", "Metallica", "MGMT", "Michael Jackson", "Miley Cyrus", "Moby", "Morrissey", "Motörhead", "Muddy Waters",
  "Nancy Sinatra", "Neil Young", "New Order", "Nick Cave", "Nick Drake", "Nico", "Nirvana",
  "Oasis", "Olivia Rodrigo", "Otis Redding", "Outkast",
  "Patti Smith", "Paul McCartney", "Paul Simon", "Pearl Jam", "Pet Shop Boys", "Peter Gabriel", "PJ Harvey", "Pixies", "Pink Floyd", "Portishead", "Prince", "Pulp",
  "Queen", "Queens of the Stone Age",
  "Radiohead", "R.E.M.", "Ramones", "Rammstein", "Ray Charles", "Red Hot Chili Peppers", "Roxy Music", "Run-D.M.C.",
  "Santana", "Sex Pistols", "Sia", "Sinéad O'Connor", "Siouxsie and the Banshees", "Sleater-Kinney", "Sonic Youth", "Sparks", "Steely Dan", "Stevie Wonder", "Stone Roses", "Suede", "Supertramp",
  "Talking Heads", "Tame Impala", "Taylor Swift", "Tears for Fears", "The Beach Boys", "The Beatles", "The Byrds", "The Cars", "The Clash", "The Cranberries", "The Cure", "The Doors", "The Go-Go's", "The Hollies", "The Jam", "The Jesus and Mary Chain", "The Kinks", "The Monkees", "The National", "The Notwist", "The Police", "The Pretenders", "The Replacements", "The Rolling Stones", "The Shins", "The Smiths", "The Stooges", "The Strokes", "The Supremes", "The Velvet Underground", "The White Stripes", "The Who", "The Yardbirds", "Tori Amos", "Tracy Chapman", "T. Rex", "TV on the Radio",
  "U2", "Ultravox",
  "Van Morrison", "Violent Femmes",
  "Weezer", "Wilco", "Wire",
  "XTC",
  "Yeah Yeah Yeahs",
  "ZZ Top"
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
const validationBuckets = new Map();
const validationLoads = new Map();

function normalizeArtist(name) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function gameplayLetters(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .match(/[A-Z]/g) || [];
}

function firstGameplayLetter(name) {
  const letters = gameplayLetters(name.trim());
  return letters[0] || "";
}

function getLetters(name) {
  const letters = gameplayLetters(name.trim());
  if (!letters.length) return { normal: "", escape: null };
  const lastLetter = letters[letters.length - 1];
  const sEscapeLetter = lastLetter === "S" && letters.length > 1
    ? letters[letters.length - 2]
    : null;
  return { normal: lastLetter, escape: sEscapeLetter };
}

function artistWasUsed(name) {
  const normalized = normalizeArtist(name);
  return usedArtists.some(artist => normalizeArtist(artist.name) === normalized);
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

async function loadValidationBucket(letter) {
  const key = letter.toLowerCase();
  if (validationBuckets.has(key)) return validationBuckets.get(key);
  if (validationLoads.has(key)) return validationLoads.get(key);

  const load = fetch(`data/artists/${key}.txt`)
    .then(response => {
      if (!response.ok) throw new Error(`Validation data HTTP ${response.status}`);
      return response.text();
    })
    .then(text => {
      const bucket = new Map();
      for (const name of text.split(/\r?\n/)) {
        if (!name) continue;
        bucket.set(normalizeArtist(name), name);
        if (/^the\s+/i.test(name)) {
          bucket.set(normalizeArtist(name.replace(/^the\s+/i, "")), name);
        }
      }
      validationBuckets.set(key, bucket);
      validationLoads.delete(key);
      return bucket;
    })
    .catch(error => {
      validationLoads.delete(key);
      throw error;
    });

  validationLoads.set(key, load);
  return load;
}

async function validateArtist(name) {
  const letter = firstGameplayLetter(name);
  if (!/^[A-Z]$/.test(letter)) return null;

  const normalized = normalizeArtist(name);
  const bucket = await loadValidationBucket(letter);
  let canonical = bucket.get(normalized);

  // If the player omits a leading "The", the canonical artist lives in the T shard.
  if (!canonical && letter !== "T") {
    const tBucket = await loadValidationBucket("T");
    const withThe = normalizeArtist(`The ${name}`);
    canonical = tBucket.get(withThe) || tBucket.get(normalized);
  }

  return canonical ? { name: canonical, source: "local-db" } : null;
}

function prefetchValidation(letter) {
  if (!letter || !/^[A-Z]$/.test(letter)) return;
  loadValidationBucket(letter).catch(() => {});
}

function computerChoices(letter) {
  return computerArtists.filter(artist =>
    firstGameplayLetter(artist) === letter && !artistWasUsed(artist)
  );
}

function chooseComputerArtist(letter = null, alternateLetter = null) {
  if (!letter) {
    const choices = computerArtists.filter(artist => !artistWasUsed(artist));
    return choices.length
      ? { artist: choices[Math.floor(Math.random() * choices.length)], usedEscape: false }
      : null;
  }

  const choices = computerChoices(letter);
  if (choices.length) {
    return { artist: choices[Math.floor(Math.random() * choices.length)], usedEscape: false };
  }

  if (alternateLetter) {
    const escapeChoices = computerChoices(alternateLetter);
    if (escapeChoices.length) {
      return { artist: escapeChoices[Math.floor(Math.random() * escapeChoices.length)], usedEscape: true };
    }
  }

  return null;
}

async function computerTurn(letter = null, alternateLetter = null) {
  artistInput.disabled = true;
  messageEl.textContent = "";
  const choice = chooseComputerArtist(letter, alternateLetter);

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

  prefetchValidation(requiredLetter);
  if (escapeLetter) prefetchValidation(escapeLetter);
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

  // Validate first because an omitted leading "The" can change the canonical gameplay letter.
  artistInput.disabled = true;
  messageEl.textContent = "Checking artist…";

  let validation;
  try {
    validation = await validateArtist(entry);
  } catch (error) {
    artistInput.disabled = false;
    artistInput.focus();
    messageEl.textContent = "Couldn't load the local artist database.";
    return;
  }

  if (!validation) {
    artistInput.disabled = false;
    messageEl.textContent = "I couldn't verify a published artist by that name.";
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

  const firstLetter = firstGameplayLetter(validArtist);
  const usedNormalLetter = firstLetter === requiredLetter;
  const usedEscapeLetter = escapeLetter && firstLetter === escapeLetter;

  if (!usedNormalLetter && !usedEscapeLetter) {
    artistInput.disabled = false;
    messageEl.textContent = escapeLetter
      ? `${validArtist} begins with ${firstLetter}. You need ${requiredLetter}, or ${escapeLetter} using S Escape.`
      : `${validArtist} begins with ${firstLetter}. You need ${requiredLetter}.`;
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