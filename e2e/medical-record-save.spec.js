// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Tests d'acceptance — Historique clinique : pas de double enregistrement
 *
 * Verifie que le fix du double-save est en place :
 * - MedicalRecordsModule.handleFormSubmit ne fait PAS d'appel API
 *   (c'est MedicalRecordForm qui appelle l'API, pas le module)
 * - MedicalRecordForm appelle bien l'API directement
 * - Le callback onSave transmet le record sauvegarde sans re-sauvegarder
 *
 * Ces tests analysent le code source pour garantir qu'une regression
 * ne reintroduise pas le double appel API.
 */

const MODULE_PATH = path.resolve(__dirname, '../src/components/dashboard/modules/MedicalRecordsModule.js');
const FORM_PATH = path.resolve(__dirname, '../src/components/medical/MedicalRecordForm.js');

test.describe('MED-01: Pas de double enregistrement — verification structurelle', () => {

  let moduleSource;
  let formSource;

  test.beforeAll(() => {
    moduleSource = fs.readFileSync(MODULE_PATH, 'utf-8');
    formSource = fs.readFileSync(FORM_PATH, 'utf-8');
  });

  // ─── Module: ne doit PAS appeler l'API ─────────────────────

  test('MED-01.1: useMedicalRecords ne destructure pas createRecord', () => {
    const destructureMatch = moduleSource.match(/useMedicalRecords\(\)[^}]*\}/s);
    expect(destructureMatch).not.toBeNull();
    expect(destructureMatch[0]).not.toContain('createRecord');
  });

  test('MED-01.2: useMedicalRecords ne destructure pas updateRecord', () => {
    const destructureMatch = moduleSource.match(/useMedicalRecords\(\)[^}]*\}/s);
    expect(destructureMatch).not.toBeNull();
    expect(destructureMatch[0]).not.toContain('updateRecord');
  });

  test('MED-01.3: handleFormSubmit ne contient pas d\'appel createRecord', () => {
    // Extract from handleFormSubmit to the next top-level const/function
    const fnStart = moduleSource.indexOf('const handleFormSubmit');
    expect(fnStart).toBeGreaterThan(-1);

    // Find end: next top-level declaration (2-space indent const/let/function)
    const afterStart = moduleSource.substring(fnStart + 30);
    const fnEnd = afterStart.search(/\n  (const |let |function |\/\/ =)/);
    const fnBody = afterStart.substring(0, fnEnd > 0 ? fnEnd : 500);

    expect(fnBody).not.toContain('createRecord(');
    expect(fnBody).not.toContain('createMedicalRecord(');
  });

  test('MED-01.4: handleFormSubmit ne contient pas d\'appel updateRecord', () => {
    const fnStart = moduleSource.indexOf('const handleFormSubmit');
    expect(fnStart).toBeGreaterThan(-1);

    const afterStart = moduleSource.substring(fnStart + 30);
    const fnEnd = afterStart.search(/\n  (const |let |function |\/\/ =)/);
    const fnBody = afterStart.substring(0, fnEnd > 0 ? fnEnd : 500);

    expect(fnBody).not.toContain('updateRecord(');
    expect(fnBody).not.toContain('updateMedicalRecord(');
  });

  test('MED-01.5: handleFormSubmit est documente comme callback post-API', () => {
    // The comment above handleFormSubmit should document the contract
    const commentIdx = moduleSource.indexOf('handleFormSubmit');
    const contextBefore = moduleSource.substring(Math.max(0, commentIdx - 200), commentIdx);
    expect(contextBefore).toMatch(/ne refait PAS|APRÈS.*API|post.*sauv|already saved/i);
  });

  test('MED-01.6: handleFormSubmit appelle refreshRecords pour rafraichir la liste', () => {
    const fnStart = moduleSource.indexOf('const handleFormSubmit');
    const afterStart = moduleSource.substring(fnStart);
    const fnEnd = afterStart.search(/\n  (const |let |function |\/\/ =)/);
    const fnBody = afterStart.substring(0, fnEnd > 0 ? fnEnd : 500);

    expect(fnBody).toContain('refreshRecords');
  });

  test('MED-01.7: handleFormSubmit recoit savedRecord (pas formData)', () => {
    // The parameter should be named savedRecord, not formData
    const fnSignature = moduleSource.match(/const handleFormSubmit\s*=\s*async\s*\((\w+)\)/);
    expect(fnSignature).not.toBeNull();
    expect(fnSignature[1]).toBe('savedRecord');
  });

  // ─── Form: DOIT appeler l'API ──────────────────────────────

  test('MED-01.8: MedicalRecordForm appelle createMedicalRecord pour les nouveaux dossiers', () => {
    expect(formSource).toContain('medicalRecordsApi.createMedicalRecord(');
  });

  test('MED-01.9: MedicalRecordForm appelle updateMedicalRecord pour les editions', () => {
    expect(formSource).toContain('medicalRecordsApi.updateMedicalRecord(');
  });

  test('MED-01.10: MedicalRecordForm notifie le parent via handleSaveCallback', () => {
    // After API call, the form calls the parent callback with the saved record
    expect(formSource).toContain('handleSaveCallback');

    // Verify the callback is called AFTER the API save, not before
    const submitFn = formSource.match(/handleSubmitInternal[\s\S]*?finally/);
    expect(submitFn).not.toBeNull();
    const submitBody = submitFn[0];

    // createMedicalRecord must come BEFORE handleSaveCallback
    const createIdx = submitBody.indexOf('createMedicalRecord');
    const callbackIdx = submitBody.indexOf('handleSaveCallback');
    expect(createIdx).toBeGreaterThan(-1);
    expect(callbackIdx).toBeGreaterThan(-1);
    expect(createIdx).toBeLessThan(callbackIdx);
  });

  // ─── Integration: le flux est coherent ─────────────────────

  test('MED-01.11: Le module passe handleFormSubmit comme onSave au formulaire', () => {
    // MedicalRecordsModule should pass onSave={handleFormSubmit} to MedicalRecordForm
    expect(moduleSource).toMatch(/onSave\s*=\s*\{handleFormSubmit\}/);
  });

  test('MED-01.12: MedicalRecordForm accepte onSave dans ses props', () => {
    expect(formSource).toMatch(/onSave/);
    // And aliases it to handleSaveCallback
    expect(formSource).toMatch(/handleSaveCallback\s*=\s*onSave/);
  });
});
