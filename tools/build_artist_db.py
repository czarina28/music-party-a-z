#!/usr/bin/env python3
"""Build a compact published-artist database from a MusicBrainz mbdump folder.

Usage (PowerShell, from the music-party-a-z repo):
    py tools/build_artist_db.py "$HOME\Downloads\mbdump\mbdump"

The script reads the MusicBrainz core dump files directly and writes:
    data/artists.json

Only artists linked to at least one Official release are included.
"""

from __future__ import annotations

import argparse
import json
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
        "--output",
        type=Path,
        default=Path("data/artists.json"),
        help="Output JSON path (default: data/artists.json)",
    )
    args = parser.parse_args()

    folder = args.mbdump.expanduser().resolve()
    artist_file = require(folder, "artist")
    release_file = require(folder, "release")
    artist_credit_name_file = require(folder, "artist_credit_name")

    print("Reading artist credits…")
    credit_to_artists: dict[str, set[str]] = {}
    for row in rows(artist_credit_name_file):
        if len(row) < 3:
            continue
        artist_credit_id = row[0]
        artist_id = row[2]
        credit_to_artists.setdefault(artist_credit_id, set()).add(artist_id)

    print("Finding artists with Official releases…")
    published_artist_ids: set[str] = set()
    official_release_count = 0

    # MusicBrainz release dump columns begin:
    # id, gid, name, artist_credit, release_group, status, ...
    # Status 1 is Official.
    for row in rows(release_file):
        if len(row) < 6 or row[5] != "1":
            continue
        official_release_count += 1
        published_artist_ids.update(credit_to_artists.get(row[3], ()))

    print(f"Official releases found: {official_release_count:,}")
    print(f"Published artist IDs found: {len(published_artist_ids):,}")

    print("Reading artist names…")
    output = []
    for row in rows(artist_file):
        if len(row) < 3:
            continue
        artist_id, gid, name = row[0], row[1], row[2]
        if artist_id in published_artist_ids and name and name != "\\N":
            output.append({"name": name, "mbid": gid})

    output.sort(key=lambda item: item["name"].casefold())

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=False, separators=(",", ":"))

    print(f"Wrote {len(output):,} published artists to {args.output}")


if __name__ == "__main__":
    main()
