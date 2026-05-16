const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || 'Request failed.';
    const details = data?.error?.details;
    throw new Error(details ? `${message} ${formatDetails(details)}` : message);
  }

  return data;
}

export const api = {
  health: () => request('/health'),
  listCases: () => request('/cases?limit=25'),
  createCase: (payload) =>
    request('/cases', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getCase: (caseId) => request(`/cases/${caseId}`),
  listDocuments: (caseId) => request(`/cases/${caseId}/documents`),
  uploadDocuments: (caseId, files) => {
    const formData = new FormData();
    for (const file of files) formData.append('documents', file);
    return request(`/cases/${caseId}/documents`, {
      method: 'POST',
      body: formData
    });
  },
  analyzeCase: (caseId) =>
    request(`/cases/${caseId}/analyze`, {
      method: 'POST'
    }),
  latestAnalysis: (caseId) => request(`/cases/${caseId}/analysis`)
};

function formatDetails(details) {
  if (Array.isArray(details)) return details.join(' ');
  if (typeof details === 'string') return details;
  return '';
}
