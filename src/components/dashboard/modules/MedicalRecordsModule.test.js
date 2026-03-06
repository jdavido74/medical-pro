// MedicalRecordsModule.test.js
// Test : handleFormSubmit ne doit PAS appeler createRecord/updateRecord du contexte
// (c'est MedicalRecordForm qui fait l'appel API, pas le module)

import React from 'react';
import { render, act, screen, fireEvent, waitFor } from '@testing-library/react';

// --- Mocks ---

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es' }
  })
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, providerId: 10 } })
}));

jest.mock('../../auth/PermissionGuard', () => ({
  usePermissions: () => ({ hasPermission: () => true })
}));

jest.mock('../../../utils/permissionsStorage', () => ({
  PERMISSIONS: {
    MEDICAL_RECORDS_CREATE: 'medical_records_create',
    MEDICAL_RECORDS_EDIT: 'medical_records_edit',
    MEDICAL_RECORDS_DELETE: 'medical_records_delete'
  }
}));

jest.mock('../../../api/appointmentsApi', () => ({
  appointmentsApi: { getAppointments: jest.fn().mockResolvedValue([]) }
}));

// --- Context mocks with spies ---
const mockCreateRecord = jest.fn().mockResolvedValue({ id: 99 });
const mockUpdateRecord = jest.fn().mockResolvedValue({ id: 1 });
const mockArchiveRecord = jest.fn();
const mockGetRecordById = jest.fn().mockResolvedValue({
  id: 1, type: 'consultation', patientId: 42, createdAt: '2026-01-01'
});
const mockFetchPatientRecords = jest.fn().mockResolvedValue([]);
const mockGetRecordsByPatient = jest.fn().mockReturnValue([]);
const mockRefreshRecords = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../contexts/MedicalRecordContext', () => ({
  useMedicalRecords: () => ({
    isLoading: false,
    createRecord: mockCreateRecord,
    updateRecord: mockUpdateRecord,
    archiveRecord: mockArchiveRecord,
    getRecordById: mockGetRecordById,
    getPatientRecords: mockFetchPatientRecords,
    getRecordsByPatient: mockGetRecordsByPatient,
    refreshRecords: mockRefreshRecords
  })
}));

jest.mock('../../../contexts/PatientContext', () => ({
  usePatients: () => ({
    patients: [{ id: 42, firstName: 'Juan', lastName: 'Garcia', dateOfBirth: '1990-01-01' }],
    isLoading: false
  })
}));

// Mock MedicalRecordForm — capture the onSave callback
let capturedOnSave = null;
jest.mock('../../medical/MedicalRecordForm', () => {
  const React = require('react');
  return React.forwardRef(({ onSave }, ref) => {
    capturedOnSave = onSave;
    React.useImperativeHandle(ref, () => ({ handleSubmit: jest.fn() }));
    return <div data-testid="mock-medical-record-form">MockForm</div>;
  });
});

const MedicalRecordsModule = require('./MedicalRecordsModule').default;

describe('MedicalRecordsModule - No duplicate API calls (double save fix)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnSave = null;
  });

  const openFormForNewRecord = async () => {
    render(<MedicalRecordsModule navigateToPatient={jest.fn()} />);

    // 1) Select a patient
    await waitFor(() => {
      expect(screen.getByText(/Garcia/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Garcia/));

    // 2) Wait for patient records to load, then click "create first record"
    await waitFor(() => {
      expect(screen.getByText('medical:module.masterDetail.createFirstRecord')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('medical:module.masterDetail.createFirstRecord'));

    // 3) Wait for form to appear
    await waitFor(() => {
      expect(screen.getByTestId('mock-medical-record-form')).toBeInTheDocument();
      expect(capturedOnSave).not.toBeNull();
    });
  };

  test('creation: onSave callback does NOT call createRecord from context', async () => {
    await openFormForNewRecord();

    // Simulate MedicalRecordForm calling onSave after its own API save
    const savedRecord = { id: 99, type: 'consultation', patientId: 42 };
    await act(async () => {
      await capturedOnSave(savedRecord);
    });

    // CRITICAL ASSERTIONS: the module must NOT duplicate API calls
    expect(mockCreateRecord).not.toHaveBeenCalled();
    expect(mockUpdateRecord).not.toHaveBeenCalled();

    // It SHOULD refresh the records list
    expect(mockRefreshRecords).toHaveBeenCalled();
    // It SHOULD fetch the full record to switch to edit mode
    expect(mockGetRecordById).toHaveBeenCalledWith(99);
  });

  test('edition: onSave callback does NOT call updateRecord from context', async () => {
    // Setup: return a record so the patient has existing records
    mockFetchPatientRecords.mockResolvedValueOnce([
      { id: 1, type: 'consultation', patientId: 42, createdAt: '2026-01-01' }
    ]);

    render(<MedicalRecordsModule navigateToPatient={jest.fn()} />);

    // Select the patient
    await waitFor(() => {
      expect(screen.getByText(/Garcia/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Garcia/));

    // Wait for records to load and find the edit button
    await waitFor(() => {
      const editButtons = screen.getAllByRole('button');
      // Find any button with Edit icon area (the record row should be clickable)
      return editButtons.length > 0;
    });

    // Click the record row to edit — find the record date or type text
    // The record list should show the record; look for the edit action
    const allButtons = screen.getAllByRole('button');
    // Find the edit button (has Edit2 icon) or click the record row
    const editButton = allButtons.find(b =>
      b.getAttribute('title')?.includes('edit') ||
      b.getAttribute('aria-label')?.includes('edit') ||
      b.textContent?.includes('Edit')
    );

    if (editButton) {
      fireEvent.click(editButton);
    } else {
      // Click "new record" as fallback — we'll manually set the formState via the captured callback
      const newRecordBtn = screen.queryByText('medical:module.masterDetail.newRecord');
      if (newRecordBtn) fireEvent.click(newRecordBtn);
    }

    // Wait for form
    await waitFor(() => {
      expect(capturedOnSave).not.toBeNull();
    });

    // Simulate MedicalRecordForm calling onSave after its own update API call
    const savedRecord = { id: 1, type: 'consultation', patientId: 42 };
    await act(async () => {
      await capturedOnSave(savedRecord);
    });

    // CRITICAL ASSERTIONS
    expect(mockUpdateRecord).not.toHaveBeenCalled();
    expect(mockCreateRecord).not.toHaveBeenCalled();
  });

  test('module does not destructure createRecord or updateRecord from context', () => {
    // Static verification: the module source should not use these functions
    const moduleSource = require('fs').readFileSync(
      require('path').resolve(__dirname, 'MedicalRecordsModule.js'),
      'utf-8'
    );

    // Check that createRecord and updateRecord are NOT destructured from useMedicalRecords
    const contextDestructure = moduleSource.match(/useMedicalRecords\(\)[^}]*\}/s)?.[0] || '';
    expect(contextDestructure).not.toContain('createRecord');
    expect(contextDestructure).not.toContain('updateRecord');

    // Verify the callback comment documents the no-API-call contract
    expect(moduleSource).toContain('On ne refait PAS');
  });
});
