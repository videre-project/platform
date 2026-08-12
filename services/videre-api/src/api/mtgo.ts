/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Router } from 'itty-router';


export interface AssemblyIdentity {
  name: string;
  version: string;
  file: string;
  size?: number;
  public_key?: string;
  hash?: { algorithm: string, value: string };
}

export interface DeploymentManifest {
  version: string;
  codebase: string;
  date: string;
  public_key: string;
  dependencies: AssemblyIdentity[];
}

export default Router({ base: '/mtgo' })
  .get('/manifest',
    async (_req, { params: _params }) => {
      // The deployment manifest names the active client version; the
      // application manifest lists the assemblies that make up that version.
      let response = await fetch([
        'http://mtgo.patch.daybreakgames.com/patch',
        'mtg/live/client/MTGO.application',
      ].join('/'));
      if (!response.ok) {
        return Error('Failed to fetch the MTGO deployment manifest.');
      }
      let text = await response.text();

      const version = text.match(/(?<=MTGO\b.*?version=")([^"]+)(?=")/)![0];
      const codebase = text.match(/(?<=codebase=")([^"]+)(?=\\MTGO.exe)/)![0];
      const publicKey = text.match(/(?<=publicKeyToken=")([^"]+)(?=")/)![0];

      const dateCode = codebase.match(/(?<=\d{4}.)\d+/g)![0];
      const date = [
        `${dateCode.slice(0, 4)}-${dateCode.slice(4, 6)}-${dateCode.slice(6, 8)}`,
        `${dateCode.slice(8, 10)}:${dateCode.slice(10, 12)}:${dateCode.slice(12, 14)}`,
      ].join('T');

      response = await fetch([
        'http://mtgo.patch.daybreakgames.com/patch',
        `mtg/live/client/${codebase}/MTGO.exe.manifest`,
      ].join('/'));
      if (!response.ok) {
        return Error('Failed to fetch the MTGO application manifest.');
      }
      text = await response.text();

      const dependencies = [] as AssemblyIdentity[];
      const assemblyIdentities = text.match(
        /(?<=dependentAssembly\s)(.*?)(?=<\/dependentAssembly)/sg
      )!;
      for (const idx in assemblyIdentities) {
        const assembly = assemblyIdentities[idx];

        // Skip any assembly identities that are not marked for installation.
        if (assembly.match(/(?<=dependencyType=")(.*?)(?=")/)?.[0] != 'install') {
          continue;
        }

        const entry = {} as any;

        const [name, version] = assembly.match(
          /(?<=name=")(.*?)(?=").*?(?<=version=")(.*?)(?=")/
        )!.slice(1);
        const file = assembly.match(/(?<=codebase=")(.*?)(?=")/g)![0];
        entry['name'] = name;
        entry['file'] = file;
        entry['version'] = version;

        if (assembly.includes('size=')) {
          const size = assembly.match(/(?<=size=")(.*?)(?=")/)![0];
          entry['size'] = Number(size);
        }

        if (assembly.includes('publicKeyToken=')) {
          const publicKey = assembly.match(/(?<=publicKeyToken=")(.*?)(?=")/)![0];
          entry['public_key'] = publicKey.toLowerCase();
        }

        if (assembly.includes('urn:schemas-microsoft-com:HashTransforms.Identity')) {
          const algorithm = assembly.match(/(?<=xmldsig#)(.*?)(?=")/)![0];

          const b64value = assembly.match(/(?<=DigestValue>)(.*?)(?=<)/)![0];
          const value = [...atob(b64value)]
            .map(c => c.charCodeAt(0).toString(16).padStart(2,''))
            .join('');

          entry['hash'] = { algorithm, value };
        }

        dependencies.push(entry);
      }

      const data = {
        version,
        codebase,
        date,
        public_key: publicKey,
        dependencies,
      } as DeploymentManifest;

      return data;
    }
  );
