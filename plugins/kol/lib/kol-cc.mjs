#!/usr/bin/env node
// Generated for the kol Claude Code plugin from the Kol line source (kol-cc.mjs). Don't edit this copy: it is rebuilt from the source.
/**
 * kol-cc: set up and start the Kol line for Claude Code.
 *
 *   kol-cc setup            check what you need, sign in with a code, choose who may talk to you, register with Claude Code
 *   kol-cc status           who you are, who may talk to you (and whether they allowed you), whether Claude Code knows the line
 *   kol-cc allow <name|ID>  let this person's coding agent talk to yours (someone you already talk to in Kol; they allow you back)
 *   kol-cc remove <name|ID> stop it
 *   kol-cc update           get the latest kol-cc and Kol line (git pull of the branch it runs from)
 *   kol-cc doctor           everything needed to report a problem (never message text)
 *   kol-cc mode auto|ask    auto: the two coding agents work it out (asks you after 10 in a row) · ask: confirm every message
 *   kol-cc start [--ask] [args]  start Claude Code with the Kol line on (args go to claude; --ask: confirm every message this session)
 *   kol-cc logout           sign this computer out of the Kol line
 *
 * Sign-in without a terminal (Claude Code's Bash tool, the kol plugin): two steps that never prompt.
 *   kol-cc login --start [--again]   get a code, print it and where to type it in the Kol app, and return at once
 *                                    (already signed in: says so and does nothing, unless --again)
 *   kol-cc login --wait [--timeout <sec>]   wait for that code to be confirmed (default 540 s, inside a 10-minute
 *                                    Bash limit). Exit 0 signed in · 2 not confirmed yet (run it again) · 1 expired,
 *                                    declined or nothing to wait for. The pending code is kept in cc-pair.json (0600).
 *
 * KOL_RELAY: the Kol server (default https://api.kol-ai.app; tests use the pretend server, http://127.0.0.1:8799).
 * KOL_CC_HOME: where the sign-in is kept (default ~/.kol; one folder per person when testing two on one Mac).
 * No dependencies. Later this moves into the `kol` CLI (kol-cli repo) as `kol channel …`.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { ccHome, EARLY_ACCESS_TEXT, isEarlyAccessRefusal } from './kol-channel.mjs';

const CHANNEL = fileURLToPath(new URL('./kol-channel.mjs', import.meta.url));
const HERE = dirname(CHANNEL);
const DEFAULT_RELAY = 'https://api.kol-ai.app';
const ID_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const MIN_CLAUDE = [2, 1, 287]; // MCP elicitation (the Send dialog) for user-configured servers
const MIN_NODE = 20;

const home = ccHome();
const configFile = join(home, 'cc-relay.json');
const pairFile = join(home, 'cc-pair.json');

// ---- small helpers ----------------------------------------------------------------------------------

const ok = (s) => console.log(`  ✓ ${s}`);
const warn = (s) => console.log(`  ! ${s}`);
const bad = (s) => console.log(`  ✗ ${s}`);
const step = (n, of, s) => console.log(`\nStep ${n} of ${of} · ${s}`);

function readConfig() {
  try {
    return JSON.parse(readFileSync(configFile, 'utf8'));
  } catch {
    return {};
  }
}
function saveConfig(patch) {
  const next = { ...readConfig(), ...patch };
  mkdirSync(home, { recursive: true, mode: 0o700 });
  writeFileSync(configFile, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  chmodSync(configFile, 0o600);
  return next;
}
const relayUrl = () => String(process.env.KOL_RELAY || readConfig().relay || DEFAULT_RELAY).replace(/\/$/, '');

async function api(method, path, body) {
  const c = readConfig();
  const res = await fetch(`${relayUrl()}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(c.token ? { Authorization: `Bearer ${c.token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const out = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: out };
}

let rl = null;
async function ask(q) {
  if (!process.stdin.isTTY) return '';
  rl ??= createInterface({ input: process.stdin, output: process.stdout });
  return (await rl.question(q)).trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function newer(v, min) {
  for (let i = 0; i < min.length; i++) {
    if ((v[i] ?? 0) > min[i]) return true;
    if ((v[i] ?? 0) < min[i]) return false;
  }
  return true;
}

// ---- checks -----------------------------------------------------------------------------------------

/** Prerequisites. Returns false only for blockers. */
function checks() {
  let pass = true;
  const node = Number(process.versions.node.split('.')[0]);
  if (node >= MIN_NODE) ok(`Node ${process.versions.node}`);
  else {
    bad(`Node ${process.versions.node}: needs ${MIN_NODE} or newer`);
    pass = false;
  }
  const v = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(v.stdout ?? '');
  if (!m) {
    bad('Claude Code not found (install it from https://code.claude.com)');
    pass = false;
  } else if (!newer(m.slice(1).map(Number), MIN_CLAUDE)) {
    bad(`Claude Code ${m[0]}: needs ${MIN_CLAUDE.join('.')} or newer (claude update)`);
    pass = false;
  } else ok(`Claude Code ${m[0]}`);
  // Channels need a claude.ai login; Team / Enterprise orgs must have channels turned on by an Owner.
  try {
    const acct = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8')).oauthAccount;
    const type = String(acct?.organizationType ?? '');
    if (!acct) warn('Claude Code is not signed in with a claude.ai account (channels need one: run claude, then /login)');
    else if (/team|enterprise/i.test(type)) warn('Your Claude account is in a Team / Enterprise org: an Owner must turn on Channels (Organization settings → Claude Code)');
    else ok('Claude Code signed in with a claude.ai account');
  } catch {
    warn('Could not tell how Claude Code is signed in (channels need a claude.ai login)');
  }
  ok(`Kol server: ${relayUrl()}`);
  return pass;
}

/** The `kol` MCP entry Claude Code would use in this folder: {scope, path} or null. */
function claudeEntry() {
  const r = spawnSync('claude', ['mcp', 'get', 'kol'], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const scope = /Scope:\s*(\w+)/.exec(r.stdout)?.[1]?.toLowerCase() ?? 'user';
  const args = /Args:\s*(.+)/.exec(r.stdout)?.[1]?.trim() ?? '';
  return { scope, args };
}

// ---- commands ---------------------------------------------------------------------------------------

async function login() {
  const label = `Claude Code on ${hostname().replace(/\.local$/, '')}`;
  const start = await api('POST', '/api/pair', { client: 'cc-relay', label });
  if (!start.ok || !start.body.code) {
    bad(`Kol did not give a sign-in code (${start.status})`);
    return false;
  }
  const { code, deviceCode, link, expiresInSec = 300 } = start.body;
  console.log(`  On your phone, open Kol and confirm this code:   ${code}`);
  if (link) console.log(`  (or open this link on the phone: ${link})`);
  console.log(`  Waiting for you to confirm… (the code expires in ${Math.round(expiresInSec / 60)} minutes)`);
  const until = Date.now() + expiresInSec * 1000;
  while (Date.now() < until) {
    await sleep(1500);
    const r = await fetch(`${relayUrl()}/api/pair/${code}?device=${encodeURIComponent(deviceCode)}`).catch(() => null);
    if (!r) continue;
    if (r.status === 202) continue;
    if (r.status === 200) {
      const b = await r.json();
      saveConfig({ relay: relayUrl(), token: b.token, me: b.me });
      ok(`Signed in as ${b.me.name} (${b.me.id})`);
      return true;
    }
    bad('The code expired or was declined. Run "kol-cc login" for a new one.');
    return false;
  }
  bad('The code expired. Run "kol-cc login" for a new one.');
  return false;
}

// ---- sign-in in two steps (no prompts, no terminal needed) --------------------------------------------

const WAIT_DEFAULT_SEC = 540;

function readPending() {
  try {
    const p = JSON.parse(readFileSync(pairFile, 'utf8'));
    return p?.code && p?.deviceCode && p?.relay ? p : null;
  } catch {
    return null;
  }
}
const dropPending = () => rmSync(pairFile, { force: true });

/** Step 1: a code to confirm in the Kol app. Returns at once; the code is kept for `login --wait`. */
async function loginStart(again) {
  const node = Number(process.versions.node.split('.')[0]);
  if (node < MIN_NODE) {
    bad(`Node ${process.versions.node}: needs ${MIN_NODE} or newer`);
    process.exitCode = 1;
    return;
  }
  const c = readConfig();
  if (c.token && !again) {
    const r = await api('GET', '/api/relay/me').catch(() => null);
    if (r?.ok) {
      ok(`Already signed in to Kol as ${r.body.me.name} (${r.body.me.id}) on this computer. Nothing to do.`);
      console.log('  (A new sign-in anyway: kol-cc login --start --again)');
      return;
    }
    if (r?.status === 403) {
      bad(`Signed in as ${c.me?.name ?? '?'} (${c.me?.id ?? '?'}), but Kol refused: ${isEarlyAccessRefusal(r.body.error) ? EARLY_ACCESS_TEXT : (r.body.error ?? 'the Kol line is not on for your Kol ID yet')}. A new sign-in won't change that.`);
      process.exitCode = 1;
      return;
    }
    if (!r) {
      bad(`Could not reach Kol at ${relayUrl()}`);
      process.exitCode = 1;
      return;
    }
    // 401: the saved sign-in no longer works; get a new one.
  }
  const relay = relayUrl();
  const label = `Claude Code on ${hostname().replace(/\.local$/, '')}`;
  const start = await api('POST', '/api/pair', { client: 'cc-relay', label });
  if (!start.ok || !start.body.code) {
    bad(`Kol did not give a sign-in code (${start.status})`);
    process.exitCode = 1;
    return;
  }
  const { code, deviceCode, link, expiresInSec = 300 } = start.body;
  const expiresAt = Date.now() + expiresInSec * 1000;
  mkdirSync(home, { recursive: true, mode: 0o700 });
  writeFileSync(pairFile, `${JSON.stringify({ relay, code, deviceCode, link: link ?? '', label, expiresAt }, null, 2)}\n`, { mode: 0o600 });
  chmodSync(pairFile, 0o600);
  console.log(`Kol sign-in code:  ${code}`);
  console.log(`  On your phone, open Kol → AI tab → the key button (Connect an AI app), type ${code} and confirm.`);
  if (link) console.log(`  (or open this link on the phone: ${link})`);
  console.log(`  It connects "${label}" to your Kol account. The code expires in ${Math.round(expiresInSec / 60)} minutes (${new Date(expiresAt).toTimeString().slice(0, 5)}).`);
  console.log('Then run:  kol-cc login --wait');
}

/** Step 2: wait for the code from `login --start` to be confirmed. Exit 0 signed in, 2 not yet, 1 gone. */
async function loginWait(timeoutSec) {
  const p = readPending();
  if (!p) {
    bad('No sign-in is waiting on this computer. Start one: kol-cc login --start');
    process.exitCode = 1;
    return;
  }
  const left = p.expiresAt - Date.now();
  if (left <= 0) {
    dropPending();
    bad(`The code ${p.code} expired. Get a new one: kol-cc login --start`);
    process.exitCode = 1;
    return;
  }
  const limit = Math.min(left, Math.max(1, timeoutSec) * 1000);
  console.log(`  Waiting for you to confirm ${p.code} in the Kol app (up to ${Math.round(limit / 1000)} s)…`);
  const until = Date.now() + limit;
  while (Date.now() < until) {
    const r = await fetch(`${p.relay}/api/pair/${p.code}?device=${encodeURIComponent(p.deviceCode)}`).catch(() => null);
    if (r?.status === 200) {
      const b = await r.json();
      saveConfig({ relay: p.relay, token: b.token, me: b.me });
      dropPending();
      ok(`Signed in to Kol as ${b.me.name} (${b.me.id})`);
      return;
    }
    if (r && r.status !== 202) {
      dropPending();
      bad(`The code ${p.code} expired or was declined. Get a new one: kol-cc login --start`);
      process.exitCode = 1;
      return;
    }
    await sleep(Math.min(1500, Math.max(0, until - Date.now())));
  }
  if (Date.now() >= p.expiresAt) {
    dropPending();
    bad(`The code ${p.code} expired before it was confirmed. Get a new one: kol-cc login --start`);
    console.log(`  If the Kol app said "That code didn't work", this may be why: ${EARLY_ACCESS_TEXT}.`);
    process.exitCode = 1;
    return;
  }
  warn(`Not confirmed yet. ${p.code} is still good for ${Math.round((p.expiresAt - Date.now()) / 1000)} s: type it in the Kol app (AI tab → key button), then run "kol-cc login --wait" again.`);
  process.exitCode = 2;
}

/** `--timeout 120` or `--timeout=120` in `args`, else the default. */
function timeoutArg(args) {
  const i = args.findIndex((a) => a === '--timeout' || a.startsWith('--timeout='));
  if (i < 0) return WAIT_DEFAULT_SEC;
  const v = Number(args[i].includes('=') ? args[i].split('=')[1] : args[i + 1]);
  return Number.isFinite(v) && v > 0 ? v : WAIT_DEFAULT_SEC;
}

/** `who`: the name of someone you already talk to in Kol ("Sam"), or their Kol ID. */
async function allow(who, quiet = false) {
  who = String(who ?? '').trim();
  if (!who) {
    bad('Who? Give a name (someone you talk to in Kol) or a Kol ID: kol-cc allow Sam');
    return false;
  }
  const r = await api('POST', '/api/relay/allow', { who });
  if (!r.ok) {
    bad(r.body.error ? `${r.body.error}` : `Kol refused (${r.status})`);
    return false;
  }
  const id = String(r.body.id);
  const c = readConfig();
  saveConfig({ allow: [...new Set([...(c.allow ?? []), id])], names: { ...(c.names ?? {}), [id]: r.body.name } });
  if (!quiet) {
    ok(`Allowed ${r.body.name} (${id})`);
    if (r.body.mutual) ok('You both allowed each other: your coding agents can work together');
    else warn(`Waiting for ${r.body.name} to allow you too: Kol asks them ("Let it"), or they run: kol-cc allow ${c.me?.name?.split(' ')[0] || c.me?.id || 'you'}`);
  }
  return true;
}

async function remove(who) {
  who = String(who ?? '').trim();
  const r = await api('POST', '/api/relay/disallow', { who });
  if (!r.ok) {
    bad(r.body.error ? `${r.body.error}` : `Kol refused (${r.status})`);
    return;
  }
  const c = readConfig();
  saveConfig({ allow: (c.allow ?? []).filter((x) => x !== r.body.id) });
  ok(`${r.body.name} (${r.body.id}) can no longer reach your coding agent`);
}

async function register() {
  const e = claudeEntry();
  if (e && e.args === CHANNEL) {
    ok(`Claude Code knows the Kol line (${e.scope} setting)`);
    return true;
  }
  if (e) {
    warn(`Claude Code already has a different "kol" entry here (${e.scope}): ${e.args}`);
    const yes = (await ask('  Replace it with the Kol line? [y/N] ')).toLowerCase() === 'y';
    if (!yes) {
      bad('Left as it is: the Kol line will not start in this folder');
      return false;
    }
    spawnSync('claude', ['mcp', 'remove', 'kol', '-s', e.scope], { encoding: 'utf8' });
  }
  // Local scope: only Claude Code sessions in this folder load it (and it stays off unless started with kol-cc start).
  const r = spawnSync('claude', ['mcp', 'add', '--scope', 'local', 'kol', '--', 'node', CHANNEL], { encoding: 'utf8' });
  if (r.status !== 0) {
    bad(`Could not register with Claude Code: ${(r.stderr || r.stdout).trim().slice(0, 200)}`);
    return false;
  }
  ok(`Registered the Kol line with Claude Code for this folder (${process.cwd()}). It stays off unless you start with "kol-cc start"`);
  return true;
}

async function status() {
  const c = readConfig();
  console.log(`Kol server:   ${relayUrl() || 'not set'}`);
  if (!c.token) {
    console.log('Signed in:    no (run "kol-cc setup")');
  } else {
    const r = await api('GET', '/api/relay/me').catch(() => null);
    if (!r) console.log(`Signed in:    ${c.me?.name} (${c.me?.id}), but Kol can't be reached`);
    else if (r.status === 401) console.log('Signed in:    no longer (run "kol-cc login")');
    else if (!r.ok) console.log(`Signed in:    ${c.me?.name} (${c.me?.id}); Kol answered ${r.status}${r.body.error ? `: ${r.body.error}` : ''}`);
    else {
      console.log(`Signed in:    ${r.body.me.name} (${r.body.me.id})`);
      const list = r.body.allow ?? [];
      console.log(`May talk:     ${list.length ? '' : 'nobody yet (kol-cc allow <name>)'}`);
      for (const p of list) console.log(`  ${p.mutual ? '✓' : '…'} ${p.name} (${p.id})${p.mutual ? ' both ways' : ': waiting for them to allow you'}`);
      if (r.body.rules?.version) console.log(`Rules:        ${r.body.rules.version} (the agents' working rules, from Kol)`);
    }
  }
  console.log(`Sending:      ${c.mode === 'auto' ? 'works it out on its own (asks after 10 in a row)' : 'asks before every message'}  (kol-cc mode auto | ask)`);
  const e = claudeEntry();
  console.log(`Claude Code:  ${e?.args === CHANNEL ? `Kol line registered (${e.scope})` : e ? `a different "kol" entry (${e.args})` : 'Kol line not registered (run "kol-cc setup")'}`);
}

async function setup() {
  console.log('Kol line for Claude Code: setup');
  step(1, 5, 'What you need');
  if (!checks()) {
    console.log('\nFix the ✗ above, then run "kol-cc setup" again.');
    return;
  }
  step(2, 5, 'Sign in to Kol');
  const c = readConfig();
  let signedIn = false;
  if (c.token) {
    const r = await api('GET', '/api/relay/me').catch(() => null);
    if (r?.ok) {
      ok(`Already signed in as ${r.body.me.name} (${r.body.me.id})`);
      signedIn = true;
    }
  }
  if (!signedIn && !(await login())) return;
  step(3, 5, 'Who your Claude Code works with');
  console.log('  Only people you allow, and who allow you back, can reach your coding agent.');
  for (;;) {
    const who = await ask('  Their name (someone you talk to in Kol, e.g. Sam), or Enter when done: ');
    if (!who) break;
    await allow(who);
  }
  step(4, 5, 'How your Claude Code talks to theirs');
  console.log('  1) Work it out on its own: it sends and answers by itself, tells you each message,');
  console.log('     and asks you after 10 messages in a row. It still asks before acting or agreeing for you.');
  console.log('  2) Ask me before every message (you see the exact text and press Send).');
  const pick = await ask(`  Choose 1 or 2 [${readConfig().mode === 'ask' ? '2' : '1'}]: `);
  setMode(pick === '2' || (!pick && readConfig().mode === 'ask') || (!pick && !process.stdin.isTTY) ? 'ask' : 'auto');
  step(5, 5, 'Connect it to Claude Code');
  await register();
  console.log('\nDone. Start Claude Code with the Kol line:  kol-cc start');
  console.log('Secrets are always blocked, and incoming messages are information only. Change how it talks any time: kol-cc mode auto | ask');
}

function setMode(mode) {
  saveConfig({ mode });
  ok(mode === 'auto' ? 'Your Claude Code works things out on its own (asks you after 10 in a row)' : 'Your Claude Code asks you before every message');
}

async function start(args) {
  const c = readConfig();
  if (!c.token) {
    bad('Not signed in: run "kol-cc setup" first');
    process.exitCode = 1;
    return;
  }
  const e = claudeEntry();
  if (e?.args !== CHANNEL) {
    bad('Claude Code does not know the Kol line in this folder: run "kol-cc setup"');
    process.exitCode = 1;
    return;
  }
  rl?.close();
  // `--ask`: this session asks before every message, whatever the saved choice.
  const forceAsk = args.includes('--ask');
  const mode = forceAsk ? 'ask' : c.mode === 'auto' ? 'auto' : 'ask';
  const claudeArgs = args.filter((a) => a !== '--ask');
  // Work it out: Claude Code's own "allow this tool?" prompt would stop every message, so the reply tool is
  // pre-allowed for this session only. Every other tool keeps its normal permission prompts.
  // ask_user and report_to_user only reach the user's own phone, so they never need a prompt.
  claudeArgs.unshift('--allowedTools', ...(mode === 'auto' ? ['mcp__kol__reply'] : []), 'mcp__kol__ask_user', 'mcp__kol__report_to_user');
  console.log(mode === 'auto' ? 'Kol line on: your Claude Code works things out on its own (asks you after 10 in a row).' : 'Kol line on: your Claude Code asks you before every message.');
  const r = spawnSync('claude', ['--dangerously-load-development-channels', 'server:kol', ...claudeArgs], {
    stdio: 'inherit',
    env: { ...process.env, KOL_CHANNEL: '1', KOL_CC_HOME: home, KOL_CC_MODE: mode },
  });
  process.exitCode = r.status ?? 0;
}

function git(args) {
  const r = spawnSync('git', ['-C', HERE, ...args], { encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

/** Pull the latest kol-cc and Kol line from the branch this copy runs from. */
function update() {
  const top = git(['rev-parse', '--show-toplevel']);
  if (!top.ok) {
    bad('This kol-cc is not in a git checkout, so it cannot update itself. Reinstall it (README).');
    process.exitCode = 1;
    return;
  }
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).out;
  const before = git(['rev-parse', '--short', 'HEAD']).out;
  console.log(`Updating ${top.out} (${branch}, at ${before})…`);
  const pull = git(['pull', '--ff-only']);
  if (!pull.ok) {
    bad(`git pull failed: ${(pull.err || pull.out).split('\n')[0]}`);
    console.log(`  If you changed files there, undo them (git -C ${top.out} status) and try again.`);
    process.exitCode = 1;
    return;
  }
  const after = git(['rev-parse', '--short', 'HEAD']).out;
  if (after === before) ok(`Already up to date (${after})`);
  else {
    ok(`Updated ${before} → ${after}:`);
    console.log(git(['log', '--oneline', '-10', `${before}..${after}`]).out.replace(/^/gm, '    '));
  }
  console.log('Restart Claude Code with "kol-cc start" to use it.');
}

/** Everything needed to report a problem. Never message text (the channel log has none). */
async function doctor() {
  console.log('kol-cc doctor · send this to Kol support when something breaks (it never contains message text)\n');
  const commit = git(['log', '-1', '--format=%h %cs %s']);
  console.log(`kol-cc:       ${commit.ok ? commit.out.slice(0, 90) : 'not a git checkout'} (${git(['rev-parse', '--abbrev-ref', 'HEAD']).out || '?'})`);
  console.log(`Folder:       ${process.cwd()}`);
  console.log(`System:       ${process.platform} ${process.arch}, sign-in kept in ${home}\n`);
  checks();
  console.log('');
  await status();
  const logFile = process.env.KOL_CHANNEL_LOG || join(home, 'cc-channel.log');
  console.log(`\nLast events on this computer (${logFile}):`);
  try {
    const lines = readFileSync(logFile, 'utf8').trim().split('\n').slice(-20);
    console.log(lines.map((l) => `  ${l}`).join('\n') || '  (none)');
  } catch {
    console.log('  (no log yet: the Kol line has not run on this computer)');
  }
  console.log(`Resume mark:  ${existsSync(join(home, 'cc-cursor.json')) ? 'kept' : 'none yet'}`);
}

async function logout() {
  if (readConfig().token) await api('POST', '/api/relay/logout').catch(() => null);
  saveConfig({ token: '' });
  ok('Signed out of the Kol line on this computer');
}

// ---- main -------------------------------------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === 'setup') await setup();
  else if (cmd === 'status') await status();
  else if (cmd === 'login' && rest.includes('--start')) await loginStart(rest.includes('--again'));
  else if (cmd === 'login' && rest.includes('--wait')) await loginWait(timeoutArg(rest));
  else if (cmd === 'login') {
    if (checks()) await login();
  } else if (cmd === 'allow') await allow(rest.join(' '));
  else if (cmd === 'remove') await remove(rest.join(' '));
  else if (cmd === 'update') update();
  else if (cmd === 'doctor') await doctor();
  else if (cmd === 'start') await start(rest);
  else if (cmd === 'logout') await logout();
  else if (cmd === 'mode' && (rest[0] === 'auto' || rest[0] === 'ask')) {
    setMode(rest[0]);
    console.log('  Takes effect the next time you run "kol-cc start".');
  } else console.log('kol-cc setup | status | allow <name|ID> | remove <name|ID> | mode auto|ask | start [--ask] [claude args] | update | doctor | logout\n       login | login --start [--again] | login --wait [--timeout <sec>]');
} catch (e) {
  bad(`Could not reach Kol at ${relayUrl() || '(not set)'}: ${e?.cause?.code ?? e?.message ?? e}`);
  process.exitCode = 1;
} finally {
  rl?.close();
}
