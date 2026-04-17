import { baseClient } from './baseClient';

export async function uploadDocuments(patientId, files, medicalRecordId) {
  const form = new FormData();
  form.append('medicalRecordId', medicalRecordId);
  for (const f of files) form.append('files', f);
  const res = await baseClient.upload(
    `/patient-documents/patients/${patientId}/documents`,
    form
  );
  return res.data;
}

export async function listDocuments(patientId, { medicalRecordId, includeDeleted = false } = {}) {
  const query = {};
  if (medicalRecordId) query.medicalRecordId = medicalRecordId;
  if (includeDeleted) query.includeDeleted = true;
  const res = await baseClient.get(
    `/patient-documents/patients/${patientId}/documents`,
    { query }
  );
  return res.data;
}

export async function updateDocumentCategory(patientId, docId, category) {
  const res = await baseClient.patch(
    `/patient-documents/patients/${patientId}/documents/${docId}`,
    { category }
  );
  return res.data;
}

export async function viewDocumentBlob(patientId, docId) {
  const { API_BASE_URL, getAuthToken } = baseClient;
  const url = `${API_BASE_URL}/patient-documents/patients/${patientId}/documents/${docId}/file`;
  const headers = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Document download failed: ${response.status} ${response.statusText}`);
  }
  return response.blob();
}

export async function deleteDocument(patientId, docId, reason) {
  await baseClient.delete(
    `/patient-documents/patients/${patientId}/documents/${docId}`,
    { body: { reason } }
  );
}
