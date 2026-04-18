const axios = require('axios');
const xml2js = require('xml2js');

const BASE_SEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const BASE_FETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const BATCH_SIZE = 50; // IDs to fetch details for (after getting up to 100 from search)

/**
 * Fetches and normalizes PubMed publications.
 * @param {string} query - Expanded query string (boolean syntax supported)
 * @param {number} maxResults - How many IDs to retrieve (50–100 recommended)
 * @returns {Promise<Array>} Normalized publication objects
 */
async function fetchPubMed(query, maxResults = 80) {
  try {
    // ── Step 1: Get article IDs ──────────────────────────────────────────────
    const searchParams = {
      db: 'pubmed',
      term: query,
      retmax: maxResults,
      sort: 'pub date',
      retmode: 'json',
    };
    if (process.env.NCBI_API_KEY) {
      searchParams.api_key = process.env.NCBI_API_KEY;
    }

    const searchRes = await axios.get(BASE_SEARCH, {
      params: searchParams,
      timeout: 10000,
    });

    const idList = searchRes.data?.esearchresult?.idlist || [];
    if (idList.length === 0) return [];

    // ── Step 2: Fetch article details in batches ─────────────────────────────
    const results = [];
    for (let i = 0; i < Math.min(idList.length, BATCH_SIZE); i += 25) {
      const batchIds = idList.slice(i, i + 25).join(',');
      const fetchRes = await axios.get(BASE_FETCH, {
        params: {
          db: 'pubmed',
          id: batchIds,
          retmode: 'xml',
          ...(process.env.NCBI_API_KEY && { api_key: process.env.NCBI_API_KEY }),
        },
        timeout: 15000,
      });

      const parsed = await xml2js.parseStringPromise(fetchRes.data, {
        explicitArray: false,
        ignoreAttrs: false,
      });

      const articles = parsed?.PubmedArticleSet?.PubmedArticle;
      if (!articles) continue;

      const articleArray = Array.isArray(articles) ? articles : [articles];

      for (const article of articleArray) {
        const normalized = normalizePubMedArticle(article);
        if (normalized) results.push(normalized);
      }
    }

    return results;
  } catch (err) {
    console.error('[PubMed] Fetch error:', err.message);
    return [];
  }
}

/**
 * Extracts and normalizes a single PubMed article into the common schema.
 */
function normalizePubMedArticle(article) {
  try {
    const medline = article?.MedlineCitation;
    const articleData = medline?.Article;
    if (!articleData) return null;

    // Title
    const title =
      typeof articleData.ArticleTitle === 'string'
        ? articleData.ArticleTitle
        : articleData.ArticleTitle?._ || 'No title';

    // Abstract — may have multiple sections
    const abstractObj = articleData?.Abstract?.AbstractText;
    let abstract = '';
    if (typeof abstractObj === 'string') {
      abstract = abstractObj;
    } else if (Array.isArray(abstractObj)) {
      abstract = abstractObj
        .map((a) => (typeof a === 'string' ? a : a?._ || ''))
        .join(' ');
    } else if (abstractObj?._) {
      abstract = abstractObj._;
    }

    // Authors
    const authorList = articleData?.AuthorList?.Author;
    let authors = [];
    if (authorList) {
      const arr = Array.isArray(authorList) ? authorList : [authorList];
      authors = arr
        .map((a) => {
          const last = a?.LastName || '';
          const fore = a?.ForeName || a?.Initials || '';
          return `${last}${fore ? ' ' + fore : ''}`.trim();
        })
        .filter(Boolean)
        .slice(0, 5); // Cap at 5 authors for display
    }

    // Year
    const pubDate = articleData?.Journal?.JournalIssue?.PubDate;
    const year =
      pubDate?.Year ||
      pubDate?.MedlineDate?.substring(0, 4) ||
      new Date().getFullYear();

    // PMID for URL
    const pmid = medline?.PMID?._ || medline?.PMID || '';
    const url = pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '';

    // Journal
    const journal = articleData?.Journal?.Title || '';

    return {
      title,
      abstract: abstract.substring(0, 1000) || 'Abstract not available.',
      authors,
      year: parseInt(year) || new Date().getFullYear(),
      journal,
      source: 'PubMed',
      url,
      pmid: String(pmid),
      relevanceScore: 0, // Will be set by re-ranker
    };
  } catch {
    return null;
  }
}

module.exports = { fetchPubMed };