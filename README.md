# anime-mapping-data

Automated daily cron job that generates a compact MAL-to-TMDB mapping JSON for the [Media Tracker](https://github.com/athanasso/media-tracker) app.

## What it does

Fetches two community-maintained databases:
1. **[Fribb/anime-lists](https://github.com/Fribb/anime-lists)** — Maps MAL IDs to TMDB IDs, season numbers, and episode offsets.
2. **[manami-project/anime-offline-database](https://github.com/manami-project/anime-offline-database)** — Provides English titles and cover art for each MAL entry.

Merges them into `mal-tmdb-mapping.json` — a single, minified JSON file updated every 24 hours via GitHub Actions.

## Output format

```json
{
  "527": {
    "tmdb_id": 46298,
    "season": 2,
    "episode_offset": 79,
    "type": "TV",
    "imdb_id": "tt0169255",
    "title": "Cardcaptor Sakura",
    "image": "https://cdn.myanimelist.net/images/anime/1171/93271.jpg"
  }
}
```

| Field | Description |
|---|---|
| `tmdb_id` | The TMDB show ID this MAL entry belongs to |
| `season` | Which TMDB season number this MAL entry corresponds to |
| `episode_offset` | How many episodes into the TMDB season this MAL entry starts |
| `type` | MAL media type (TV, OVA, MOVIE, etc.) |
| `imdb_id` | IMDb ID if available |
| `title` | English title from anime-offline-database |
| `image` | Cover image URL from MAL via anime-offline-database |

## Usage

```
https://raw.githubusercontent.com/YOUR_USERNAME/anime-mapping-data/main/mal-tmdb-mapping.json
```

## Running locally

```bash
node generate_mapping.js
```

## Schedule

Runs automatically at 02:00 UTC daily via GitHub Actions.
