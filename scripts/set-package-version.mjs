/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const semverPattern =
  /^(?:v)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const versionInput = args.find(arg => !arg.startsWith('--'));

if (!versionInput) {
  console.error('Usage: node scripts/set-package-version.mjs <version> [--dry-run]');
  process.exit(1);
}

const match = versionInput.match(semverPattern);
if (!match) {
  console.error(`Invalid release version: ${versionInput}`);
  console.error('Expected a SemVer value such as v0.3.0 or 0.3.0-rc.1.');
  process.exit(1);
}

const version = versionInput.replace(/^v/, '');
const workspaceRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packagesRoot = resolve(workspaceRoot, 'packages');
const packagePaths = (await readdir(packagesRoot, { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .map(entry => resolve(packagesRoot, entry.name, 'package.json'))
  .filter(path => {
    try {
      return JSON.parse(readFileSync(path, 'utf8')).publishConfig?.access === 'public';
    } catch {
      return false;
  }
});

const packageRecords = packagePaths.sort().map(path => ({
  path,
  packageJson: JSON.parse(readFileSync(path, 'utf8')),
}));
const publicPackageNames = new Set(packageRecords.map(({ packageJson }) => packageJson.name));

for (const { path, packageJson } of packageRecords) {
  const previousVersion = packageJson.version;
  packageJson.version = version;

  for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const name of publicPackageNames) {
      const specifier = packageJson[section]?.[name];
      if (typeof specifier === 'string' && specifier.startsWith('workspace:')) {
        packageJson[section][name] = version;
      }
    }
  }

  if (dryRun) {
    console.log(`${packageJson.name}: ${previousVersion} -> ${version}`);
    continue;
  }

  await writeFile(path, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(`${packageJson.name}: ${previousVersion} -> ${version}`);
}
