/**
 * generate_mapping.js
 *
 * 100% automated anime mapping generator for Media Tracker.
 * 
 * 1. Fetches official MAL -> TMDB mappings from Fribb anime-lists.
 * 2. Uses a persistent local cache (anime-cache.json) for titles & posters.
 * 3. Automatically enriches newly announced/aired anime via Jikan & Kitsu APIs.
 *
 * No external 60MB database downloads. Completely self-contained.
 */

const fs = require('fs/promises');
const path = require('path');

const FRIBB_URL = 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json';
const CACHE_FILE = path.join(__dirname, 'anime-cache.json');
const OUTPUT_FILE = path.join(__dirname, 'mal-tmdb-mapping.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchMetadataForMalId(malId) {
  // 1. Try Jikan (Unofficial MAL API)
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, {
      headers: { 'User-Agent': 'anime-mapping-data-crawler/1.0' }
    });
    if (res.ok) {
      const data = await res.json();
      const anime = data.data;
      if (anime) {
        return {
          title: anime.title || anime.title_english || null,
          poster: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
        };
      }
    }
  } catch (err) {
    console.warn(`[Jikan] Failed for MAL ${malId}:`, err.message);
  }

  // 2. Fallback to Kitsu API
  try {
    const res = await fetch(
      `https://kitsu.io/api/edge/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`,
      { headers: { 'Accept': 'application/vnd.api+json' } }
    );
    if (res.ok) {
      const data = await res.json();
      const item = data.included?.[0];
      if (item?.attributes) {
        return {
          title: item.attributes.canonicalTitle || item.attributes.titles?.en || null,
          poster: item.attributes.posterImage?.large || item.attributes.posterImage?.original || null,
        };
      }
    }
  } catch (err) {
    console.warn(`[Kitsu] Failed for MAL ${malId}:`, err.message);
  }

  return { title: null, poster: null };
}

async function generateMapping() {
  try {
    console.log('1/4 Loading local metadata cache...');
    let cache = {};
    try {
      const cacheRaw = await fs.readFile(CACHE_FILE, 'utf8');
      cache = JSON.parse(cacheRaw);
      console.log(`Loaded ${Object.keys(cache).length} cached anime entries.`);
    } catch (e) {
      console.log('No existing cache found, starting fresh.');
    }

    console.log('2/4 Fetching Fribb anime-lists...');
    const fribbRes = await fetch(FRIBB_URL);
    if (!fribbRes.ok) throw new Error('Failed to fetch Fribb list: HTTP ' + fribbRes.status);
    const fribbData = await fribbRes.json();
    console.log(`Fetched ${fribbData.length} Fribb entries.`);

    console.log('3/4 Checking for newly added anime...');
    const missingMalIds = [];
    const validAnime = [];

    for (const anime of fribbData) {
      const malId = anime.mal_id;
      if (!malId) continue;

      const tmdbId = anime.themoviedb_id && anime.themoviedb_id.tv
        ? anime.themoviedb_id.tv
        : null;
      if (!tmdbId) continue;

      validAnime.push(anime);

      if (!cache[malId]) {
        missingMalIds.push(malId);
      }
    }

    console.log(`Found ${validAnime.length} TV-mapped entries (${missingMalIds.length} new without metadata).`);

    if (missingMalIds.length > 0) {
      console.log(`Fetching metadata for ${missingMalIds.length} new anime...`);
      const toFetch = missingMalIds.slice(0, 50);
      for (let i = 0; i < toFetch.length; i++) {
        const id = toFetch[i];
        console.log(`[${i + 1}/${toFetch.length}] Enriching MAL ID ${id}...`);
        const meta = await fetchMetadataForMalId(id);
        cache[id] = meta;
        await sleep(400); // Polite rate limit
      }

      await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
      console.log('Updated cache saved.');
    }

    console.log('4/4 Merging into compact mapping...');
    const mapping = {};

    for (const anime of validAnime) {
      const malId = anime.mal_id;
      const tmdbId = anime.themoviedb_id.tv;

      const seasonTmdb = (anime.season && anime.season.tmdb != null) ? anime.season.tmdb : 1;
      const episodeOffset =
        (anime.episode_offset && anime.episode_offset.tmdb != null) ? anime.episode_offset.tmdb
        : (anime.episode_offset && anime.episode_offset.tvdb != null) ? anime.episode_offset.tvdb
        : 0;
      const imdbId = Array.isArray(anime.imdb_id)
        ? (anime.imdb_id[0] || null)
        : (anime.imdb_id || null);

      const details = cache[malId];

      mapping[malId] = {
        tmdb_id: tmdbId,
        season: seasonTmdb,
        episode_offset: episodeOffset,
        title: details?.title || null,
        poster: details?.poster || null,
        type: anime.type || null,
        imdb_id: imdbId,
      };
    }

    const count = Object.keys(mapping).length;
    console.log(`Mapped ${count} MAL TV entries.`);

    const outputJson = JSON.stringify(mapping);
    await fs.writeFile(OUTPUT_FILE, outputJson);
    console.log(`Done! Output: mal-tmdb-mapping.json (${(Buffer.byteLength(outputJson) / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

generateMapping();
