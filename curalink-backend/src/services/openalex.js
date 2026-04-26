const axios = require('axios');

const BASE_URL = 'https://api.openalex.org/works';
// Polite API use — add your email so OpenAlex gives you priority access
const MAILTO = process.env.OPENALEX_MAILTO || 'research@curalink.app';

/**
 * Fetches research publications from OpenAlex.
 * Retrieves up to 2 pages (100+ results) for a broad candidate pool.
 *
 * @param {string} query - Free-text search query
 * @param {number} maxResults - Total results to fetch (up to 200)
 * @returns {Promise<Array>} Normalized publication objects
 */
async function fetchOpenAlex(query, maxResults = 100) {
  const perPage = 50; // OpenAlex max per page is 200, 50 is safe/fast
  const pages = Math.ceil(Math.min(maxResults, 100) / perPage);

  const results = [];

  for (let page = 1; page <= pages; page++) {
    try {
      const res = await axios.get(BASE_URL, {
        params: {
          search: query,
          'per-page': perPage,
          page,
          sort: 'relevance_score:desc',
          // Only return works that have abstracts — critical for LLM context
          filter: 'has_abstract:true',
          mailto: MAILTO,
        },
        timeout: 12000,
      });

      const works = res.data?.results || [];
      for (const work of works) {
        const normalized = normalizeOpenAlexWork(work);
        if (normalized) results.push(normalized);
      }

      // If fewer results than page size, no more pages exist
      if (works.length < perPage) break;
    } catch (err) {
      console.error(`[OpenAlex] Page ${page} error:`, err.message);
      break;
    }
  }

  return results;
}

/**
 * Normalizes a single OpenAlex work into the common schema.
 */
function normalizeOpenAlexWork(work) {
  try {
    if (!work?.title) return null;

    // Reconstruct abstract from inverted index
    // OpenAlex stores abstracts as { word: [position1, position2, ...] }
    let abstract = '';
    if (work.abstract_inverted_index) {
      abstract = reconstructAbstract(work.abstract_inverted_index);
    }

    // Authors — from authorships array
    const authors = (work.authorships || [])
      .slice(0, 5)
      .map((a) => a?.author?.display_name || '')
      .filter(Boolean);

    // Year
    const year =
      work.publication_year ||
      (work.publication_date ? parseInt(work.publication_date) : null) ||
      new Date().getFullYear();

    // URL — prefer DOI, fallback to OpenAlex landing page
    const url =
      work.doi ||
      work.primary_location?.landing_page_url ||
      `https://openalex.org/${work.id?.replace('https://openalex.org/', '') || ''}`;

    // Journal / venue
    const journal =
      work.primary_location?.source?.display_name ||
      work.host_venue?.display_name ||
      '';

    // Citation count — useful for credibility scoring
    const citationCount = work.cited_by_count || 0;

    return {
      title: work.title,
      abstract: abstract.substring(0, 1000) || 'Abstract not available.',
      authors,
      year: parseInt(year) || new Date().getFullYear(),
      journal,
      source: 'OpenAlex',
      url,
      citationCount,
      openAlexId: work.id || '',
      relevanceScore: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Reconstructs abstract text from OpenAlex inverted index format.
 * Format: { "word": [pos1, pos2, ...], ... }
 */
function reconstructAbstract(invertedIndex) {
  try {
    const words = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        words[pos] = word;
      }
    }
    return words.filter(Boolean).join(' ');
  } catch {
    return '';            
  }
}

module.exports = { fetchOpenAlex };