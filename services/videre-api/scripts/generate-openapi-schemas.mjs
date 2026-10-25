#!/usr/bin/env node
/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertSync } from '@openapi-contrib/json-schema-to-openapi-schema';
import ts from 'typescript';
import { buildGenerator } from 'typescript-json-schema';

const require = createRequire(import.meta.url);
const serviceRoot = fileURLToPath(new URL('../', import.meta.url));
const buildDirectory = path.join(serviceRoot, 'build');
const models = {
  'src/db/queries/products/getProducts.d.ts': { IProduct: 'Product' },
  'src/db/queries/cards/types.d.ts': { ICardFace: 'CardFace', CardColorSymbol: 'CardColor' },
  'src/api/cards.d.ts': { CardResponseRow: 'Card' },
  'src/api/cardCollection.d.ts': { CardCollectionRequest: 'CardCollection', CardSearchRequest: 'CardSearchRequest' },
  'src/db/queries/sets/getSets.d.ts': { ISet: 'Set' },
  'src/api/prices.d.ts': {
    PriceResponseRow: 'Price', PriceBatchResponse: 'PriceBatchResponse',
    PriceCollectionRequest: 'PriceCollection', PriceRequest: 'PriceRequest',
  },
  'src/api/mtgo.d.ts': { DeploymentManifest: 'DeploymentManifest' },
  'src/responses.d.ts': { ErrorResponse: 'Error', ListResponse: 'ListResponse' },
  'src/db/helpers.d.ts': { QueryResponse: 'QueryResponse' },
  'src/db/queries/events/types.d.ts': {
    IEvent: 'Event', IEventDeck: 'EventDeck', IEventMatch: 'EventMatch', IEventStanding: 'EventStanding',
    IDeckStatistics: 'DeckStatistics', IMetagame: 'Metagame', IMatchupMatrix: 'MatchupMatrix',
    IMatchupSummary: 'MatchupSummary', ISideboarding: 'Sideboarding',
    ISideboardingSummary: 'SideboardingMatchup', ISideboardingMatrix: 'SideboardingMatrix',
  },
};
const names = Object.fromEntries(Object.values(models).flatMap(Object.entries));
const schemaName = name => names[name] ?? name.replace(/[^\w.-]/g, '_');

// Read types and annotations from declarations so the schema library does not
// evaluate source initializers while looking for property defaults.
// Typechecking follows generation so a clean build needs no existing schema module.
execFileSync(process.execPath, [
  require.resolve('typescript/bin/tsc'), '-p', path.join(serviceRoot, 'tsconfig.json'),
  '--declaration', '--emitDeclarationOnly', '--noEmit', 'false', '--noCheck',
  '--rootDir', serviceRoot,
  '--outDir', path.join(buildDirectory, 'types'),
], { stdio: 'inherit' });

const configPath = path.join(serviceRoot, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, serviceRoot);
const files = Object.keys(models).map(source => path.join(buildDirectory, 'types', source));
// Resolve aliases within the declaration output, not back into source modules.
const program = ts.createProgram(files, {
  ...options, paths: { '@/*': [path.join(buildDirectory, 'types', 'src', '*')] },
});
const generator = buildGenerator(program, { required: true }, files);
if (!generator) throw new Error('Could not generate API schemas from TypeScript declarations.');
for (const type of Object.keys(names)) {
  if (generator.getSymbols(type).length !== 1) throw new Error(`Missing or ambiguous API type: ${type}`);
}
const converted = convertSync(generator.getSchemaForSymbols(Object.keys(names)));
const schemas = {};
for (const [name, schema] of Object.entries(converted.definitions)) {
  const key = schemaName(name);
  if (key in schemas) throw new Error(`Conflicting API schema name: ${key}`);
  schemas[key] = schema;
}

const output = JSON.stringify(schemas, (key, value) => {
  // Expose nullable schemas hidden in redundant unions. Empty-string enums
  // need a string wrapper for .NET clients; anyOf retains their allowed values.
  if (value?.anyOf?.length === 1 && Object.keys(value).length === 1) {
    const schema = value.anyOf[0];
    value = schema.enum?.includes('')
      ? { ...value, type: schema.type, nullable: schema.nullable }
      : schema;
  }
  // typescript-json-schema 0.67 excludes decimals from our two percentage
  // templates. Limit the correction to those complete generated patterns.
  if (key === 'pattern' && (value === '^[0-9]*%$' || value === '^±[0-9]*%$')) {
    return value.replace('[0-9]*', '-?[0-9]+(?:\\.[0-9]+)?');
  }
  if (key === '$ref' && value.startsWith('#/definitions/')) {
    const definition = decodeURIComponent(value.slice('#/definitions/'.length));
    return `#/components/schemas/${schemaName(definition)}`;
  }
  // OpenAPI keeps enum constraints when nullable is true, so null must also
  // be an allowed enum value after converting a nullable TypeScript union.
  if (value?.nullable && Array.isArray(value.enum) && !value.enum.includes(null)) {
    return { ...value, enum: [...value.enum, null] };
  }
  // A number constrained to multiples of one is an integer. Retain its
  // inferred nullable flag rather than overriding the TypeScript union type.
  if (value?.type === 'number' && value.multipleOf === 1) {
    const schema = { ...value, type: 'integer' };
    delete schema.multipleOf;
    return schema;
  }
  return value;
}, 2);

await mkdir(buildDirectory, { recursive: true });
const keys = Object.keys(schemas).map(name => JSON.stringify(name)).join(' | ');
await writeFile(path.join(buildDirectory, 'openapi-schemas.g.ts'),
  `// Generated by scripts/generate-openapi-schemas.mjs.\nimport type { OpenAPIV3 } from 'openapi-types';\nexport const schemas: Record<${keys}, OpenAPIV3.SchemaObject> = ${output};\n`);
