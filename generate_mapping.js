/**
 * generate_mapping.js
 *
 * Fetches Fribb anime-lists (MAL IDs -> TMDB IDs, season, episode_offset)
 * and generates a compact JSON keyed by MAL ID.
 *
 * We intentionally skip title/image fetching:
 * - Titles come from Jikan via a SEPARATE lookup (see generate_titles.js)
 *   or from TMDB in the app itself.
 * - This keeps the script fast (seconds, not hours).
 *
 * Output: mal-tmdb-mapping.json
 * Run: node generate_mapping.js
 */

const fs = require('fs/promises');

const FRIBB_URL = 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json';

async function generateMapping() {
  try {
    console.log('Fetching Fribb anime-lists...');
    const res = await fetch(FRIBB_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const fribbData = await res.json();
    console.log('Fetched ' + fribbData.length + ' entries.');

    const mapping = {};

    for (const anime of fribbData) {
      const malId = anime.mal_id;
      if (!malId) continue;

      // Only map TV entries that have a TMDB ID
      const tmdbId = anime.themoviedb_id && anime.themoviedb_id.tv
        ? anime.themoviedb_id.tv
        : null;
      if (!tmdbId) continue;

      const seasonTmdb = (anime.season && anime.season.tmdb != null) ? anime.season.tmdb : 1;
      const episodeOffset =
        (anime.episode_offset && anime.episode_offset.tmdb != null) ? anime.episode_offset.tmdb
        : (anime.episode_offset && anime.episode_offset.tvdb != null) ? anime.episode_offset.tvdb
        : 0;
      const imdbId = Array.isArray(anime.imdb_id)
        ? (anime.imdb_id[0] || null)
        : (anime.imdb_id || null);

      // title_en and image are populated by the separate title-enrichment step
      // or left as null to be resolved by the app from TMDB
      mapping[malId] = {
        tmdb_id: tmdbId,
        season: seasonTmdb,
        episode_offset: episodeOffset,
        type: anime.type || null,
        imdb_id: imdbId,
      };
    }

    const count = Object.keys(mapping).length;
    console.log('Mapped ' + count + ' MAL TV entries.');
    await fs.writeFile('mal-tmdb-mapping.json', JSON.stringify(mapping));
    console.log('Done! Output: mal-tmdb-mapping.json');
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

generateMapping();
