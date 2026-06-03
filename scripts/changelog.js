#!/usr/bin/env node
/**
 * Life OS — Changelog Appender
 *
 * Interactive:     node scripts/changelog.js
 * Non-interactive: node scripts/changelog.js <version> <type> <title> <description> <files>
 *
 * Appends a new entry to both:
 *   - CHANGELOG.md                          (master — full history)
 *   - changelogs/CHANGELOG-YYYY-MM-DD.md    (dated — appended to if it already exists today)
 */

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const ROOT        = path.join(__dirname, '..');
const MASTER_PATH = path.join(ROOT, 'CHANGELOG.md');
const DATED_DIR   = path.join(ROOT, 'changelogs');
const TYPES       = ['FEAT', 'FIX', 'STYLE', 'INFRA', 'DOCS', 'SECURITY', 'REFACTOR'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayDisplay() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const HEADER = (title) =>
  `# Life OS — ${title}\n\n| # | Date | Version | Type | Change | Description | Files |\n|---|------|---------|------|--------|-------------|-------|\n`;

function getNextEntryNum() {
  if (!fs.existsSync(MASTER_PATH)) return 1;
  const matches = fs.readFileSync(MASTER_PATH, 'utf8').match(/^\| (\d{3}) \|/gm);
  if (!matches || matches.length === 0) return 1;
  return Math.max(...matches.map(m => parseInt(m.replace(/\D/g, '')))) + 1;
}

function ensureMaster() {
  if (!fs.existsSync(MASTER_PATH)) {
    fs.writeFileSync(MASTER_PATH, HEADER('Project Changelog — Master'));
    console.log('  Created CHANGELOG.md (master)\n');
  }
}

function ensureDated(isoDate) {
  if (!fs.existsSync(DATED_DIR)) fs.mkdirSync(DATED_DIR, { recursive: true });
  const p = path.join(DATED_DIR, `CHANGELOG-${isoDate}.md`);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, HEADER(`Changelog — ${todayDisplay()}`));
    console.log(`  Created changelogs/CHANGELOG-${isoDate}.md\n`);
  } else {
    console.log(`  Appending to changelogs/CHANGELOG-${isoDate}.md\n`);
  }
  return p;
}

async function promptAll() {
  const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(res => rl.question(q, res));
  const version = (await ask('  Version (e.g. v0.1): ')).trim();
  console.log(`\n  Types: ${TYPES.join(' | ')}`);
  const type    = (await ask('  Type: ')).toUpperCase().trim();
  const title   = (await ask('  Change title (short): ')).trim();
  const desc    = (await ask('  Description (one sentence): ')).trim();
  const files   = (await ask('  Files changed (comma-separated): ')).trim();
  rl.close();
  return { version, type, title, desc, files };
}

async function main() {
  console.log('\n  Life OS — Changelog Appender\n');

  ensureMaster();
  const isoDate = todayISO();
  const dated   = ensureDated(isoDate);
  const num     = getNextEntryNum();
  const date    = todayDisplay();

  console.log(`  Entry #${String(num).padStart(3,'0')}  —  ${date}`);
  console.log(`  Writing to: CHANGELOG.md + changelogs/CHANGELOG-${isoDate}.md\n`);

  const args = process.argv.slice(2);
  let version, type, title, desc, files;

  if (args.length >= 5) {
    [version, type, title, desc, files] = args.map(a => a.trim());
    type = type.toUpperCase();
    console.log(`  Running non-interactively from CLI args.\n`);
  } else {
    ({ version, type, title, desc, files } = await promptAll());
  }

  if (!TYPES.includes(type)) {
    console.warn(`\n  Warning: "${type}" is not a standard type. Valid types: ${TYPES.join(', ')}`);
  }

  const row = `| ${String(num).padStart(3,'0')} | ${date} | ${version} | ${type} | ${title} | ${desc} | ${files} |\n`;

  fs.appendFileSync(MASTER_PATH, row);
  fs.appendFileSync(dated, row);

  console.log('\n  Entry added to both files\n');
  console.log('  Preview:');
  console.log(' ', row.trim());
  console.log('');
  console.log(`  Master:  CHANGELOG.md  (${getNextEntryNum() - 1} total entries)`);
  console.log(`  Dated:   changelogs/CHANGELOG-${isoDate}.md`);
  console.log('');
}

main().catch(err => {
  console.error('  Error:', err.message);
  process.exit(1);
});
