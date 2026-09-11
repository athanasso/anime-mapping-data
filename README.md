# anime-mapping-data

Automated daily cron job that generates a compact MAL-to-TMDB mapping JSON for the [Media Tracker](https://play.google.com/store/apps/details?id=com.athanasso.mediatracker) app.

## What it does

1. **[Fribb/anime-lists](https://github.com/Fribb/anime-lists)** — Fetches daily updated MAL-to-TMDB ID, season, and episode offset mappings.
2. **Persistent Metadata Cache (`anime-cache.json`)** — Automatically maintains a local cache of official English/Romaji titles and cover posters.
3. **Automated Auto-Enrichment** — When new anime entries are detected, automatically enriches them via Jikan & Kitsu APIs without any manual reviews or third-party database dependencies.

Merges everything into `mal-tmdb-mapping.json` — a single, minified JSON file updated daily via GitHub Actions.

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
    "poster": "https://cdn.myanimelist.net/images/anime/1171/93271.jpg"
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
| `title` | Anime title |
| `poster` | Cover image URL |

## Usage

```
https://raw.githubusercontent.com/athanasso/anime-mapping-data/master/mal-tmdb-mapping.json
```

## Running locally

```bash
node generate_mapping.js
```

## Schedule

Runs automatically at 02:00 UTC daily via GitHub Actions.
