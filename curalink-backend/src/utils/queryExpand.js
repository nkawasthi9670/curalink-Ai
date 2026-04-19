/**
 * Expands a raw user query using the disease context.
 * e.g. query="deep brain stimulation", disease="Parkinson's disease"
 *   => "deep brain stimulation Parkinson's disease"
 *
 * Also appends common synonyms for known conditions to broaden retrieval.
 */

const DISEASE_SYNONYMS = {
  "parkinson's disease": ["parkinson's", "parkinsonism", "PD", "dopamine deficiency"],
  "alzheimer's disease": ["alzheimer's", "dementia", "AD", "amyloid plaques"],
  "lung cancer": ["pulmonary carcinoma", "NSCLC", "SCLC", "bronchogenic carcinoma"],
  "breast cancer": ["mammary carcinoma", "breast tumor", "breast neoplasm"],
  "diabetes": ["diabetes mellitus", "type 2 diabetes", "T2DM", "hyperglycemia", "insulin resistance"],
  "heart disease": ["cardiovascular disease", "coronary artery disease", "CAD", "myocardial infarction"],
  "multiple sclerosis": ["MS", "demyelinating disease", "autoimmune neurological"],
  "depression": ["major depressive disorder", "MDD", "clinical depression", "unipolar depression"],
};

/**
 * @param {string} query    - Raw user message or additional query
 * @param {string} disease  - Disease from session context or structured input
 * @returns {{ pubmed: string, openalex: string, trials: string }}
 */
function expandQuery(query, disease = '') {
  const normalizedDisease = disease.toLowerCase().trim();

  // Get synonyms if we recognise the disease
  const synonyms = DISEASE_SYNONYMS[normalizedDisease] || [];

  // Build the combined base query
  // If the query already contains the disease name, don't repeat it
  const queryContainsDisease =
    query.toLowerCase().includes(normalizedDisease) || normalizedDisease === '';

  const combined = queryContainsDisease
    ? query.trim()
    : `${query.trim()} ${disease.trim()}`;

  // PubMed uses boolean AND syntax
  const pubmedTerms = [combined];
  if (synonyms.length > 0) {
    // Add top 2 synonyms as OR alternatives for broader recall
    pubmedTerms.push(`(${synonyms.slice(0, 2).join(' OR ')})`);
  }
  const pubmed = pubmedTerms.join(' AND ');

  // OpenAlex uses free-text search — keep it natural
  const openalex = combined + (synonyms[0] ? ` ${synonyms[0]}` : '');

  // ClinicalTrials uses the disease condition separately
  const trials = disease || query;

  return { pubmed, openalex, trials, combined };
}

module.exports = { expandQuery };