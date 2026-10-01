export const NEXT_STEPS_ALGORITHM_HEADER = 'ASTRA_FLOW_V1';

const NODE_KINDS = new Set(['start', 'action', 'decision', 'terminal', 'caution']);

const cleanText = (value, maxLength = 600) => (
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

const cleanId = (value) => cleanText(value, 80).replace(/[^a-zA-Z0-9_-]/g, '');

const finiteInteger = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

export const parseNextStepsAlgorithm = (content = '') => {
  const source = typeof content === 'string' ? content : '';
  const headerIndex = source.indexOf(NEXT_STEPS_ALGORITHM_HEADER);

  if (headerIndex === -1) {
    return {
      recognized: false,
      meta: { title: '', summary: '', maxRow: null },
      nodes: [],
      pending: false,
      invalidLines: 0,
    };
  }

  const payload = source.slice(headerIndex + NEXT_STEPS_ALGORITHM_HEADER.length);
  const endsWithNewline = /(?:\r?\n)\s*$/.test(payload);
  const lines = payload.split(/\r?\n/);
  const pendingLine = endsWithNewline ? '' : (lines.pop() || '').trim();
  let pending = Boolean(pendingLine);
  if (pendingLine) {
    try {
      JSON.parse(pendingLine);
      lines.push(pendingLine);
      pending = false;
    } catch {
      // A partial JSON object is expected while the response is streaming.
    }
  }
  const nodesById = new Map();
  let meta = { title: '', summary: '', maxRow: null };
  let invalidLines = 0;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line === '```' || line === '```json' || line === '```jsonl') return;

    try {
      const record = JSON.parse(line);
      if (!record || typeof record !== 'object') return;

      if (record.type === 'meta') {
        meta = {
          title: cleanText(record.title, 120),
          summary: cleanText(record.summary, 420),
          maxRow: Number.isFinite(Number(record.maxRow))
            ? finiteInteger(record.maxRow, 4, 1, 8)
            : null,
        };
        return;
      }

      if (record.type !== 'node') return;

      const id = cleanId(record.id);
      const title = cleanText(record.title, 160);
      if (!id || !title) return;

      const parent = cleanId(record.parent);
      nodesById.set(id, {
        id,
        parent: parent && parent !== id ? parent : null,
        branch: cleanText(record.branch, 48),
        row: finiteInteger(record.row, nodesById.size, 0, 12),
        column: finiteInteger(record.column, 0, -4, 4),
        kind: NODE_KINDS.has(record.kind) ? record.kind : 'action',
        title,
        detail: cleanText(record.detail, 600),
      });
    } catch {
      invalidLines += 1;
    }
  });

  const nodes = Array.from(nodesById.values()).filter((node) => (
    !node.parent || nodesById.has(node.parent)
  ));

  return {
    recognized: true,
    meta,
    nodes,
    pending,
    invalidLines,
  };
};

export const algorithmToPlainText = (content = '') => {
  const parsed = parseNextStepsAlgorithm(content);
  if (!parsed.recognized || parsed.nodes.length === 0) return content;

  const lines = [];
  if (parsed.meta.title) lines.push(parsed.meta.title);
  if (parsed.meta.summary) lines.push(parsed.meta.summary);
  if (lines.length) lines.push('');

  parsed.nodes.forEach((node) => {
    const branch = node.branch ? `[${node.branch}] ` : '';
    const detail = node.detail ? ` — ${node.detail}` : '';
    lines.push(`${branch}${node.title}${detail}`);
  });

  return lines.join('\n');
};

export const messageWithAlgorithmToPlainText = (content = '') => {
  const source = typeof content === 'string' ? content : '';
  const headerIndex = source.indexOf(NEXT_STEPS_ALGORITHM_HEADER);
  if (headerIndex === -1) return source;

  const prefix = source.slice(0, headerIndex).trimEnd();
  const algorithm = algorithmToPlainText(source.slice(headerIndex));
  return [prefix, algorithm].filter(Boolean).join('\n\n');
};

export const splitEmbeddedClinicalPathway = (content = '') => {
  const source = typeof content === 'string' ? content : '';
  const heading = source.match(/^##\s+Clinical\s+Pathway\s*$/im);
  if (!heading) return null;

  const headingIndex = heading.index ?? 0;
  const pathwayStart = headingIndex + heading[0].length;
  return {
    narrative: source.slice(0, headingIndex).trim(),
    pathway: source.slice(pathwayStart).trimStart(),
  };
};
