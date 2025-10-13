#!/usr/bin/env node

/**
 * Lightweight runner that loads key/value pairs from local.env
 * and executes the provided command with those variables applied.
 *
 * Usage:
 *   node scripts/run-with-local-env.mjs <command> [args...]
 * Example:
 *   node scripts/run-with-local-env.mjs npm test
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/run-with-local-env.mjs <command> [args...]');
  process.exit(1);
}

const envPath = resolve(process.cwd(), 'local.env');
const envOverrides = {};

if (existsSync(envPath)) {
  const contents = readFileSync(envPath, 'utf8');
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key.length === 0) return;

    envOverrides[key] = value;
  });
} else {
  console.warn(`local.env not found at ${envPath}. Proceeding without overrides.`);
}

const child = spawn(args[0], args.slice(1), {
  stdio: 'inherit',
  env: { ...process.env, ...envOverrides }
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

child.on('error', (error) => {
  console.error('Failed to start process:', error);
  process.exit(1);
});
