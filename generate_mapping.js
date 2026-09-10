/**
 * generate_mapping.js
 *
 * Fetches Fribb anime-lists (MAL IDs -> TMDB IDs, season, episode_offset)
 * and enriches each entry with title and poster image from the Anime Offline Database.
 * Generates a compact JSON keyed by MAL ID.
 *
 * Output: mal-tmdb-mapping.json
 * Run: node generate_mapping.js
 */

const fs = require('fs/promises');

const FRIBB_URL = 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json';
const AOD_RELEASE_URL = 'https://api.github.com/repos/manami-project/anime-offline-database/releases/latest';

async function generateMapping() {
  try {
    console.log('1/4 Fetching Fribb anime-lists...');
    const fribbRes = await fetch(FRIBB_URL);
    if (!fribbRes.ok) throw new Error('Failed to fetch Fribb list: HTTP ' + fribbRes.status);
    const fribbData = await fribbRes.json();
    console.log(`Fetched ${fribbData.length} Fribb entries.`);

    console.log('2/4 Fetching Anime Offline Database release metadata...');
    const relRes = await fetch(AOD_RELEASE_URL, {
      headers: { 'User-Agent': 'node-fetch' }
    });
    if (!relRes.ok) throw new Error('Failed to fetch AOD release info: HTTP ' + relRes.status);
    const relData = await relRes.json();
    const asset = relData.assets?.find(a => a.name === 'anime-offline-database-minified.json');
    if (!asset) throw new Error('anime-offline-database-minified.json asset not found in latest release');

    console.log(`Downloading Anime Offline Database (${(asset.size / (1024 * 1024)).toFixed(1)} MB)...`);
    const aodRes = await fetch(asset.browser_download_url);
    if (!aodRes.ok) throw new Error('Failed to download AOD: HTTP ' + aodRes.status);
    const aodData = await aodRes.json();
    console.log(`Fetched ${aodData.data.length} AOD entries.`);

    console.log('3/4 Indexing Anime Offline Database by MAL ID...');
    const malDetailsMap = new Map();
    for (const item of aodData.data) {
      if (!Array.isArray(item.sources)) continue;
      for (const src of item.sources) {
        const match = src.match(/^https:\/\/myanimelist\.net\/anime\/(\d+)(?:\/|$)/);
        if (match) {
          const id = parseInt(match[1], 10);
          if (!malDetailsMap.has(id)) {
            malDetailsMap.set(id, {
              title: item.title || null,
              picture: item.picture || null,
            });
          }
        }
      }
    }
    console.log(`Indexed ${malDetailsMap.size} unique MAL anime entries.`);

    console.log('4/4 Merging into compact mapping...');
    const mapping = {};

    for (const anime of fribbData) {
      const malId = anime.mal_id;
      if (!malId) continue;

      // Only map TV entries that have a TMDB TV ID
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

      const details = malDetailsMap.get(malId);

      mapping[malId] = {
        tmdb_id: tmdbId,
        season: seasonTmdb,
        episode_offset: episodeOffset,
        title: details?.title || null,
        poster: details?.picture || null,
        type: anime.type || null,
        imdb_id: imdbId,
      };
    }

    const count = Object.keys(mapping).length;
    console.log(`Mapped ${count} MAL TV entries.`);

    const outputJson = JSON.stringify(mapping);
    await fs.writeFile('mal-tmdb-mapping.json', outputJson);
    console.log(`Done! Output: mal-tmdb-mapping.json (${(Buffer.byteLength(outputJson) / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

generateMapping();
