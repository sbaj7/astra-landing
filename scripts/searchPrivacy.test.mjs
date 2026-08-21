import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeSearchQuery } from '../supabase/functions/quick-api/searchPrivacy.js';

test('preserves medical terms containing letters and numbers', () => {
  const query = 'SARS-CoV-2 H1N1 BRCA1 HER2-positive CYP2C19 5-fluorouracil 17-hydroxyprogesterone';
  assert.equal(sanitizeSearchQuery(query), query);
});

test('preserves long medical words', () => {
  const query = 'hyponatremia hypoglycemia cholecystitis pancreatitis pyelonephritis';
  assert.equal(sanitizeSearchQuery(query), query);
});

test('does not treat a medication name label as a patient name', () => {
  const query = 'drug name: Sodium Chloride dosing in hyponatremia';
  assert.equal(sanitizeSearchQuery(query), query);
});

test('removes explicit direct identifiers', () => {
  const query = 'Patient name: John Smith, DOB: January 2, 1940, MRN: AB12_34. Call 212-555-0199 or john.smith@example.com about hyponatremia.';
  assert.equal(sanitizeSearchQuery(query), 'patient, , . Call or about hyponatremia.');
});

test('removes appended vision analysis and caps search length', () => {
  const query = `${'hyponatremia '.repeat(40)}=== VISION ANALYSIS private image text`;
  const sanitized = sanitizeSearchQuery(query);
  assert.equal(sanitized.length, 300);
  assert.equal(sanitized.includes('private image text'), false);
});
