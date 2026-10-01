import assert from 'node:assert/strict';
import test from 'node:test';
import {
  algorithmToPlainText,
  messageWithAlgorithmToPlainText,
  parseNextStepsAlgorithm,
  splitEmbeddedClinicalPathway,
} from './nextStepsAlgorithm.js';

const sample = `ASTRA_FLOW_V1
{"type":"meta","title":"Acute pathway","summary":"Stabilize first.","maxRow":5}
{"type":"node","id":"n0","parent":null,"branch":"","row":0,"column":0,"kind":"start","title":"Assess stability","detail":"Check **airway** and circulation."}
{"type":"node","id":"n1","parent":"n0","branch":"Unstable","row":1,"column":-1,"kind":"caution","title":"Resuscitate","detail":"Begin immediate support."}
`;

test('parses complete algorithm records and derives a safe tree', () => {
  const parsed = parseNextStepsAlgorithm(sample);
  assert.equal(parsed.recognized, true);
  assert.equal(parsed.meta.title, 'Acute pathway');
  assert.equal(parsed.meta.maxRow, 5);
  assert.equal(parsed.nodes.length, 2);
  assert.equal(parsed.nodes[1].parent, 'n0');
  assert.equal(parsed.nodes[1].column, -1);
  assert.equal(parsed.pending, false);
});

test('ignores an incomplete streamed record until its newline arrives', () => {
  const parsed = parseNextStepsAlgorithm(`${sample}{"type":"node","id":"n2"`);
  assert.equal(parsed.nodes.length, 2);
  assert.equal(parsed.pending, true);
});

test('accepts a complete final record even when the stream omits a trailing newline', () => {
  const withoutTrailingNewline = sample.trimEnd();
  const parsed = parseNextStepsAlgorithm(withoutTrailingNewline);
  assert.equal(parsed.nodes.length, 2);
  assert.equal(parsed.pending, false);
});

test('falls back cleanly for legacy markdown', () => {
  const legacy = '## Next Diagnostic Steps\n- CBC';
  assert.equal(parseNextStepsAlgorithm(legacy).recognized, false);
  assert.equal(algorithmToPlainText(legacy), legacy);
});

test('produces readable copy instead of protocol JSON', () => {
  const text = algorithmToPlainText(sample);
  assert.match(text, /Acute pathway/);
  assert.match(text, /\[Unstable\] Resuscitate/);
  assert.doesNotMatch(text, /"type"/);
});

test('preserves narrative content when copying an embedded algorithm', () => {
  const text = messageWithAlgorithmToPlainText(`## Evidence summary\nEvidence first.\n\n## Clinical Pathway\n${sample}`);
  assert.match(text, /Evidence first/);
  assert.match(text, /Clinical Pathway/);
  assert.match(text, /Acute pathway/);
  assert.doesNotMatch(text, /"type"/);
});

test('splits a conditional research pathway from its evidence narrative', () => {
  const split = splitEmbeddedClinicalPathway(`## Evidence summary\nEvidence first.\n\n## Clinical Pathway\n${sample}`);
  assert.equal(split.narrative, '## Evidence summary\nEvidence first.');
  assert.match(split.pathway, /^ASTRA_FLOW_V1/);
});

test('recognizes the pathway heading before its streamed body arrives', () => {
  const split = splitEmbeddedClinicalPathway('Evidence first.\n\n## Clinical Pathway');
  assert.equal(split.narrative, 'Evidence first.');
  assert.equal(split.pathway, '');
});
