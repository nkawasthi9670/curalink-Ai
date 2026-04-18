const axios = require('axios');

const BASE_URL = 'https://clinicaltrials.gov/api/v2/studies';

/**
 * Fetches clinical trials from ClinicalTrials.gov v2 API.
 *
 * @param {string} condition  - Disease/condition (e.g. "Parkinson's disease")
 * @param {string} query      - Additional query terms (e.g. "deep brain stimulation")
 * @param {string} location   - Optional location filter (e.g. "Toronto, Canada")
 * @param {number} maxResults - Number of trials to fetch
 * @returns {Promise<Array>}  Normalized trial objects
 */
async function fetchClinicalTrials(
  condition,
  query = '',
  location = '',
  maxResults = 50
) {
  try {
    const params = {
      'query.cond': condition,
      pageSize: Math.min(maxResults, 100),
      format: 'json',
      // Request all statuses for broad pool, re-ranker will prioritize recruiting
      'filter.overallStatus': 'RECRUITING,NOT_YET_RECRUITING,ACTIVE_NOT_RECRUITING,COMPLETED',
    };

    // Add intervention/keyword filter if extra query terms provided
    if (query && query.toLowerCase() !== condition.toLowerCase()) {
      params['query.intr'] = query;
    }

    // Add location filter if provided
    if (location) {
      params['query.locn'] = location;
    }

    const res = await axios.get(BASE_URL, { params, timeout: 12000 });
    const studies = res.data?.studies || [];

    const results = [];
    for (const study of studies) {
      const normalized = normalizeTrial(study);
      if (normalized) results.push(normalized);
    }

    return results;
  } catch (err) {
    console.error('[ClinicalTrials] Fetch error:', err.message);
    return [];
  }
}

/**
 * Normalizes a single ClinicalTrials.gov v2 study into the common schema.
 */
function normalizeTrial(study) {
  try {
    const proto = study?.protocolSection;
    if (!proto) return null;

    const id = proto?.identificationModule;
    const status = proto?.statusModule;
    const desc = proto?.descriptionModule;
    const eligibility = proto?.eligibilityModule;
    const contacts = proto?.contactsLocationsModule;
    const design = proto?.designModule;

    // Title
    const title =
      id?.briefTitle || id?.officialTitle || 'Untitled Trial';

    // NCT ID and URL
    const nctId = id?.nctId || '';
    const url = nctId
      ? `https://clinicaltrials.gov/study/${nctId}`
      : 'https://clinicaltrials.gov';

    // Status
    const recruitingStatus =
      status?.overallStatus || 'UNKNOWN';

    // Summary
    const summary =
      desc?.briefSummary?.substring(0, 800) ||
      desc?.detailedDescription?.substring(0, 800) ||
      'No description available.';

    // Eligibility
    const eligibilityCriteria =
      eligibility?.eligibilityCriteria?.substring(0, 600) || '';
    const minAge = eligibility?.minimumAge || '';
    const maxAge = eligibility?.maximumAge || '';
    const sex = eligibility?.sex || 'ALL';

    // Phase
    const phases = design?.phases || [];
    const phase = phases.length > 0 ? phases.join(', ') : 'N/A';

    // Locations — extract first 3
    const locationList = contacts?.locations || [];
    const locations = locationList.slice(0, 3).map((loc) => ({
      facility: loc?.facility || '',
      city: loc?.city || '',
      country: loc?.country || '',
      status: loc?.status || '',
    }));

    // Contact info
    const centralContacts = contacts?.centralContacts || [];
    const contact =
      centralContacts[0]
        ? {
            name: centralContacts[0]?.name || '',
            phone: centralContacts[0]?.phone || '',
            email: centralContacts[0]?.email || '',
          }
        : null;

    // Start / end dates
    const startDate = status?.startDateStruct?.date || '';
    const completionDate =
      status?.completionDateStruct?.date ||
      status?.primaryCompletionDateStruct?.date ||
      '';

    // Sponsor
    const sponsor =
      proto?.sponsorCollaboratorsModule?.leadSponsor?.name || '';

    return {
      nctId,
      title,
      summary,
      recruitingStatus,
      phase,
      eligibilityCriteria,
      eligibility: { minAge, maxAge, sex },
      locations,
      contact,
      startDate,
      completionDate,
      sponsor,
      url,
      source: 'ClinicalTrials.gov',
      relevanceScore: 0,
    };
  } catch {
    return null;
  }
}

module.exports = { fetchClinicalTrials };