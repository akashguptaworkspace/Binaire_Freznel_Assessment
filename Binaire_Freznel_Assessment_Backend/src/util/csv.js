import { ValidationError } from './errors.js';

// CSV helpers for the reduce.
//
// Parsing is loose on purpose: comma / tab / semicolon / whitespace all
// separate values, blank lines and non-numeric tokens are skipped, and a
// file with no numbers at all is rejected.
//
// We don't build the number matrix in memory. The raw lines are kept and
// workers get row ranges to parse themselves, so peak memory stays near the
// file size.

const SEPARATOR = /[\s,;]+/;

export function splitLines(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export function countNumericTokens(line) {
  let count = 0;
  for (const tok of line.split(SEPARATOR)) {
    if (tok === '') continue;
    if (Number.isFinite(Number(tok))) count += 1;
  }
  return count;
}

// Reduce a set of lines to { sum, count }. Shared by the worker, the inline
// reducer and the tests.
export function reduceLines(lines) {
  let sum = 0;
  let count = 0;
  for (const line of lines) {
    for (const tok of line.split(SEPARATOR)) {
      if (tok === '') continue;
      const n = Number(tok);
      if (Number.isFinite(n)) {
        sum += n;
        count += 1;
      }
    }
  }
  return { sum, count };
}

// Parse the upload into a plan: { lines, rank: {rows, cols}, chunks }.
export function planCsv(buffer, { chunkRows }) {
  const text = buffer.toString('utf8');
  const lines = splitLines(text);
  if (lines.length === 0) {
    throw new ValidationError('CSV file is empty.');
  }

  const cols = Math.max(...lines.slice(0, 25).map((l) => l.split(SEPARATOR).filter(Boolean).length));
  const rank = { rows: lines.length, cols: cols || 0 };

  // Reject files with no numbers in the first 50 rows (e.g. prose).
  const sampledNumeric = lines
    .slice(0, 50)
    .reduce((acc, l) => acc + countNumericTokens(l), 0);
  if (sampledNumeric === 0) {
    throw new ValidationError('CSV contains no numeric values to reduce.');
  }

  const chunks = [];
  for (let start = 0, index = 0; start < lines.length; start += chunkRows, index += 1) {
    chunks.push({
      index,
      startRow: start,
      endRow: Math.min(start + chunkRows, lines.length),
    });
  }

  return { lines, rank, chunks };
}
