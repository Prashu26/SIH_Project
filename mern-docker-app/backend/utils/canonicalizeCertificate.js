const crypto = require('crypto');

/**
 * Recursively sort object keys to produce a canonical representation.
 * @param {any} value
 * @returns {any}
 */
function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === 'object') {
    const sorted = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        const child = value[key];
        if (child !== undefined) {
          sorted[key] = sortValue(child);
        }
      });
    return sorted;
  }

  return value;
}

/**
 * Deterministically stringify any JSON-compatible value.
 * @param {any} value
 * @returns {string}
 */
function canonicalStringify(value) {
  return JSON.stringify(sortValue(value));
}

/**
 * Build a canonical payload for certificate issuance and derive its SHA-256 hash.
 * @param {Object} data
 * @returns {{ canonical: Object, canonicalString: string, hash: string }}
 */
function canonicalizeCertificate(data) {
  const normalized = {
    version: '1.0',
    certificateId: data.certificateId,
    studentUniqueCode: data.studentUniqueCode,
    learnerId: normalizeId(data.learner),
    instituteId: normalizeId(data.institute),
    courseId: normalizeId(data.course),
    modulesAwarded: Array.isArray(data.modulesAwarded)
      ? [...new Set(data.modulesAwarded.filter(Boolean).map((mod) => mod.trim()))].sort()
      : [],
    issueDate: normalizeDate(data.issueDate),
    validUntil: normalizeDate(data.validUntil),
    ncvqLevel: data.ncvqLevel || null,
    ncvqQualificationCode: data.ncvqQualificationCode || null,
    ncvqQualificationTitle: data.ncvqQualificationTitle || null,
    ncvqQualificationType: data.ncvqQualificationType || null
  };

  const canonicalString = canonicalStringify(normalized);
  const hash = crypto.createHash('sha256').update(canonicalString).digest('hex');

  return { canonical: normalized, canonicalString, hash };
}

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
}

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

module.exports = {
  canonicalizeCertificate,
  canonicalStringify,
  sortValue
};
