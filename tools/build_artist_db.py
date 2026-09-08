#!/usr/bin/env python3
"""Build compact Music Party A-Z data from a MusicBrainz mbdump folder.

Usage (PowerShell, from the music-party-a-z repo):
    py tools/build_artist_db.py "$HOME\Downloads\mbdump\mbdump"

Outputs:
    data/artists/a.txt ... z.txt   Published names, sharded for fast validation.
    data/computer.json             Smaller computer vocabulary by release count.
"""

from __future__ import annotations

import argparse
import json
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


def rows(path: Path):
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            yield line.rstrip("\n").split("\t")


def require(folder: Path, name: str) -> Path:
    path = folder / name
    if not path.exists():
        raise SystemExit(f"Missing MusicBrainz dump file: {path}")
    return path


def gameplay_letter(name: str) -> str:
    if not name:
        return ""
    first = unicodedata.normalize("NFD", name.strip()[0])
    first = "".join(ch for ch in first if unicodedata.category(ch) != "Mn")
    return first.upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mbdump", type=Path, help="Path to extracted mbdump folder")
    parser.add_argument("--computer-size", type=int, default=20000)
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    args = parser.parse_args()

    folder = args.mbdump.expanduser().resolve()
    artist_file = require(folder, "artist")
    release_file = require(folder, "release")
    artist_credit_name_file = require(folder, "artist_credit_name")

    print("Reading artist credits…")
    temp_credits: dict[str, list[str]] = {}
    for row in rows(artist_credit_name_file):
        if len(row) >= 3:
            temp_credits.setdefault(row[0], []).append(row[2])
    credit_to_artists = {key: tuple(value) for key, value in temp_credits.items()}
    del temp_credits

    print("Counting Official releases…")
    release_counts: Counter[str] = Counter()
    official_release_count = 0
    for row in rows(release_file):
        if len(row) < 6 or row[5] != "1":
            continue
        official_release_count += 1
        for artist_id in credit_to_artists.get(row[3], ()):
            release_counts[artist_id] += 1

    print(f"Official releases found: {official_release_count:,}")
    print(f"Published artist IDs found: {len(release_counts):,}")

    print("Reading artist names…")
    names_by_id: dict[str, str] = {}
    for row in rows(artist_file):
        if len(row) >= 3 and row[0] in release_counts and row[2] and row[2] != "\\N":
            names_by_id[row[0]] = row[2]

    args.data_dir.mkdir(parents=True, exist_ok=True)
    artist_dir = args.data_dir / "artists"
    artist_dir.mkdir(parents=True, exist_ok=True)

    validation_names = sorted(set(names_by_id.values()), key=str.casefold)
    buckets: dict[str, list[str]] = defaultdict(list)
    for name in validation_names:
        letter = gameplay_letter(name)
        if len(letter) == 1 and "A" <= letter <= "Z":
            buckets[letter].append(name)

    total_sharded = 0
    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        names = buckets.get(letter, [])
        path = artist_dir / f"{letter.lower()}.txt"
        path.write_text("\n".join(names) + ("\n" if names else ""), encoding="utf-8")
        total_sharded += len(names)

    ranked = sorted(names_by_id.items(), key=lambda item: (-release_counts[item[0]], item[1].casefold()))
    computer_names = []
    seen = set()
    for artist_id, name in ranked:
        letter = gameplay_letter(name)
        key = name.casefold()
        if len(letter) != 1 or not ("A" <= letter <= "Z") or key in seen:
            continue
        seen.add(key)
        computer_names.append(name)
        if len(computer_names) >= args.computer_size:
            break

    computer_path = args.data_dir / "computer.json"
    computer_path.write_text(json.dumps(computer_names, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    for obsolete in (args.data_dir / "artists.json", args.data_dir / "artists.txt"):
        if obsolete.exists():
            obsolete.unlink()
            print(f"Removed old {obsolete}")

    shard_bytes = sum((artist_dir / f"{letter.lower()}.txt").stat().st_size for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    print(f"Wrote {total_sharded:,} A-Z published names across 26 validation files")
    print(f"Wrote {len(computer_names):,} computer artists to {computer_path}")
    print(f"Validation data size: {shard_bytes / 1024 / 1024:.1f} MB total (loaded one letter at a time)")
    print(f"Computer file size: {computer_path.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
