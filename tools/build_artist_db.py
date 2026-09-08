#!/usr/bin/env python3
"""Build compact Music Party A-Z data from a MusicBrainz mbdump folder.

Usage (PowerShell, from the music-party-a-z repo):
    py tools/build_artist_db.py "$HOME\Downloads\mbdump\mbdump"

Outputs:
    data/artists.txt        Published artist names, one per line, for player validation.
    data/computer.json      A smaller computer vocabulary ranked by release count.

The raw MusicBrainz dump and the old 73 MB artists.json are not needed by the game.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mbdump", type=Path, help="Path to extracted mbdump folder")
    parser.add_argument(
        "--computer-size",
        type=int,
        default=20000,
        help="Number of artists in the computer vocabulary (default: 20000)",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("data"),
        help="Output directory (default: data)",
    )
    args = parser.parse_args()

    folder = args.mbdump.expanduser().resolve()
    artist_file = require(folder, "artist")
    release_file = require(folder, "release")
    artist_credit_name_file = require(folder, "artist_credit_name")

    print("Reading artist credits…")
    credit_to_artists: dict[str, tuple[str, ...]] = {}
    temp_credits: dict[str, list[str]] = {}
    for row in rows(artist_credit_name_file):
        if len(row) < 3:
            continue
        temp_credits.setdefault(row[0], []).append(row[2])
    credit_to_artists = {key: tuple(value) for key, value in temp_credits.items()}
    del temp_credits

    print("Counting Official releases…")
    release_counts: Counter[str] = Counter()
    official_release_count = 0

    # release: id, gid, name, artist_credit, release_group, status, ...
    # MusicBrainz release status 1 = Official.
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
        if len(row) < 3:
            continue
        artist_id, name = row[0], row[2]
        if artist_id in release_counts and name and name != "\\N":
            names_by_id[artist_id] = name

    args.data_dir.mkdir(parents=True, exist_ok=True)

    validation_names = sorted(set(names_by_id.values()), key=str.casefold)
    validation_path = args.data_dir / "artists.txt"
    validation_path.write_text("\n".join(validation_names) + "\n", encoding="utf-8")

    ranked = sorted(
        names_by_id.items(),
        key=lambda item: (-release_counts[item[0]], item[1].casefold()),
    )
    computer_names = []
    seen = set()
    for artist_id, name in ranked:
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        computer_names.append(name)
        if len(computer_names) >= args.computer_size:
            break

    computer_path = args.data_dir / "computer.json"
    computer_path.write_text(
        json.dumps(computer_names, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    old_json = args.data_dir / "artists.json"
    if old_json.exists():
        old_json.unlink()
        print("Removed old data/artists.json")

    print(f"Wrote {len(validation_names):,} published names to {validation_path}")
    print(f"Wrote {len(computer_names):,} computer artists to {computer_path}")
    print(f"Validation file size: {validation_path.stat().st_size / 1024 / 1024:.1f} MB")
    print(f"Computer file size: {computer_path.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
