#!/usr/bin/env node
/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '..');
const schemaOutputPath = path.join(
  monorepoRoot,
  'packages',
  'sql-schema',
  'src',
  'schema.g.ts'
);
const enumsOutputPath = path.join(
  monorepoRoot,
  'packages',
  'constants',
  'src',
  'enums.g.ts'
);
const checkOnly = process.argv.includes('--check');

loadDevVars(path.join(monorepoRoot, 'services', 'videre-api', '.dev.vars'));

const sql = postgres({
  host: requireEnv('PGHOST'),
  port: Number(process.env.PGPORT || 5432),
  database: requireEnv('PGDATABASE'),
  username: requireEnv('PGUSER'),
  password: optionalEnv('PGPASSWORD'),
  ssl: parseSsl(process.env.PGSSL),
  max: 1,
  transform: {
    undefined: null,
  },
});

try {
  await sql`SET default_transaction_read_only = on`;
  const { enumsContent, schemaContent } = await generateSchemaTypes(sql);
  const outputs = [
    { path: enumsOutputPath, content: enumsContent, label: 'domain enums' },
    { path: schemaOutputPath, content: schemaContent, label: 'table schema' },
  ];

  let stale = false;
  for (const { path: outputPath, content, label } of outputs) {
    if (checkOnly) {
      const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
      if (current !== content) {
        const relativeOutputPath = path.relative(monorepoRoot, outputPath);
        console.error(
          `${relativeOutputPath} (${label}) is out of date. Run pnpm db:generate-types.`
        );
        stale = true;
      }
    } else {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, content);
      console.log(`Wrote ${path.relative(monorepoRoot, outputPath)}`);
    }
  }

  if (checkOnly && stale) {
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}

async function generateSchemaTypes(sql) {
  const enumNames = ['formattype', 'eventtype', 'resulttype'];
  const compositeNames = ['cardquantitypair', 'gameresult'];
  const domainNames = ['recordtype'];
  const requiredTableNames = ['cards', 'card_faces', 'products', 'sets'];

  const enumRows = await sql`
    SELECT
      t.typname,
      e.enumlabel,
      e.enumsortorder
    FROM pg_type t
    INNER JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE
      t.typnamespace = 'public'::regnamespace
      AND t.typname = ANY(${enumNames})
    ORDER BY
      t.typname,
      e.enumsortorder
  `;

  const compositeRows = await sql`
    SELECT
      t.typname,
      a.attname,
      a.attnum,
      a.attndims,
      a.atttypid::regtype::text AS type_name,
      format_type(a.atttypid, a.atttypmod) AS display_type
    FROM pg_type t
    INNER JOIN pg_class c ON c.oid = t.typrelid
    INNER JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE
      t.typnamespace = 'public'::regnamespace
      AND t.typname = ANY(${compositeNames})
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY
      t.typname,
      a.attnum
  `;

  const domainRows = await sql`
    SELECT
      t.typname,
      format_type(t.typbasetype, t.typtypmod) AS base_type,
      pg_get_constraintdef(c.oid) AS constraint_definition
    FROM pg_type t
    LEFT JOIN pg_constraint c ON c.contypid = t.oid
    WHERE
      t.typnamespace = 'public'::regnamespace
      AND t.typname = ANY(${domainNames})
    ORDER BY
      t.typname
  `;

  const tableColumnRows = await sql`
    SELECT
      c.relname AS table_name,
      a.attname AS column_name,
      a.attnum
    FROM pg_class c
    INNER JOIN pg_namespace n ON n.oid = c.relnamespace
    INNER JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE
      n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY
      c.relname,
      a.attnum
  `;

  const cardColorRows = await sql`
    SELECT
      color_symbol,
      color_name,
      color_bit
    FROM card_color_constants()
    ORDER BY color_bit
  `;
  const cardTypeRows = await sql`
    SELECT
      type_name,
      type_bit
    FROM card_type_constants()
    ORDER BY type_bit
  `;
  const cardRarityRows = await sql`
    SELECT rarity_name
    FROM card_rarity_constants()
    ORDER BY rarity_rank
  `;
  const cardRarityAliasRows = await sql`
    SELECT
      rarity_alias,
      rarity_name
    FROM card_rarity_alias_constants()
    ORDER BY
      rarity_name,
      rarity_alias
  `;
  const cardRarityValueRows = await sql`
    SELECT rarity AS rarity_name
    FROM cards
    WHERE rarity IS NOT NULL
    GROUP BY rarity
    ORDER BY rarity
  `;

  assertFound(enumRows, enumNames, 'enum');
  assertFound(compositeRows, compositeNames, 'composite');
  assertFound(domainRows, domainNames, 'domain');
  const tableColumnTypenames = tableColumnRows.map((row) => ({
    typname: row.table_name,
  }));

  assertFound(tableColumnTypenames, requiredTableNames, 'table');
  assertRows(cardColorRows, 'card_color_constants()');
  assertRows(cardRarityRows, 'card_rarity_constants()');
  assertRows(cardRarityAliasRows, 'card_rarity_alias_constants()');
  assertRows(cardRarityValueRows, 'cards.rarity');

  const enums = groupBy(enumRows, 'typname');
  const composites = groupBy(compositeRows, 'typname');
  const domains = new Map(domainRows.map((row) => [row.typname, row]));
  const tableColumns = groupBy(tableColumnRows, 'table_name');
  const tableNames = [...new Set(tableColumnRows.map((row) => row.table_name))];

  const enumsContent = generateEnumsModule({
    enums,
    cardColorRows,
    cardTypeRows,
    cardRarityRows,
    cardRarityAliasRows,
    cardRarityValueRows,
  });

  const schemaContent = generateSchemaModule({
    domains,
    composites,
    tableNames,
    tableColumns,
  });

  return { enumsContent, schemaContent };
}

function generateEnumsModule({
  enums,
  cardColorRows,
  cardTypeRows,
  cardRarityRows,
  cardRarityAliasRows,
  cardRarityValueRows,
}) {
  const lines = [];
  lines.push('/** @file');
  lines.push('  Copyright (c) 2026, The Videre Project Authors. All rights reserved.');
  lines.push('  SPDX-License-Identifier: Apache-2.0');
  lines.push('**/');
  lines.push('');
  lines.push('/* @generated by scripts/generate-db-types.mjs */');
  lines.push('/* eslint-disable */');
  lines.push('/* Source of truth: mtgo-db (Postgres). Do not edit by hand. */');
  lines.push('');

  emitEnum(lines, 'FORMATS', 'FormatType', enums.get('formattype'));
  emitEnum(lines, 'EVENTS', 'EventType', enums.get('eventtype'));
  emitEnum(lines, 'RESULTS', 'ResultType', enums.get('resulttype'));
  emitCardColors(lines, cardColorRows);
  emitStringConstant(lines, 'CARD_TYPES', 'CardType', cardTypeRows.map((row) => row.type_name));
  emitStringConstant(
    lines,
    'CARD_RARITIES',
    'CardRarity',
    cardRarityValueRows.map((row) => row.rarity_name)
  );
  emitStringConstant(
    lines,
    'CARD_RARITY_LADDER',
    'RankedCardRarity',
    cardRarityRows.map((row) => row.rarity_name)
  );
  emitCardRarityAliases(lines, cardRarityAliasRows);

  while (lines.at(-1) === '') {
    lines.pop();
  }

  return `${lines.join('\n')}\n`;
}

function generateSchemaModule({ domains, composites, tableNames, tableColumns }) {
  const lines = [];
  lines.push('/** @file');
  lines.push('  Copyright (c) 2026, The Videre Project Authors. All rights reserved.');
  lines.push('  SPDX-License-Identifier: Apache-2.0');
  lines.push('**/');
  lines.push('');
  lines.push('/* @generated by scripts/generate-db-types.mjs */');
  lines.push('/* eslint-disable */');
  lines.push('');
  lines.push('import { defineSchema } from "@videreproject/sql-builder";');
  lines.push(
    'import type { EventType, FormatType, ResultType } from "@videreproject/constants";'
  );
  lines.push('');
  emitRecordType(lines, domains.get('recordtype'));
  emitComposite(lines, 'CardQuantityPair', composites.get('cardquantitypair'));
  emitComposite(lines, 'GameResult', composites.get('gameresult'));
  emitTableColumns(lines, tableNames, tableColumns);

  while (lines.at(-1) === '') {
    lines.pop();
  }

  return `${lines.join('\n')}\n`;
}

function emitEnum(lines, constName, typeName, rows) {
  lines.push(`export const ${constName} = [`);
  for (const row of rows) {
    lines.push(`  ${quote(row.enumlabel)},`);
  }
  lines.push('] as const;');
  lines.push('');
  lines.push(`export type ${typeName} = typeof ${constName}[number];`);
  lines.push('');
}

function emitRecordType(lines, row) {
  const definition = row.constraint_definition || '';
  if (!definition.includes('^[0-9]+-[0-9]+-[0-9]+$')) {
    throw new Error(`Unsupported RecordType domain constraint: ${definition}`);
  }

  lines.push('export type RecordType = `${number}-${number}-${number}`;');
  lines.push('');
}

function emitComposite(lines, typeName, rows) {
  lines.push(`export type ${typeName} = {`);
  for (const row of rows) {
    lines.push(`  ${row.attname}: ${toTypescriptType(row)};`);
  }
  lines.push('};');
  lines.push('');
}

function emitTableColumns(lines, tableNames, tableColumns) {
  lines.push('export const TABLE_COLUMNS = {');
  for (const tableName of tableNames) {
    lines.push(`  ${quote(tableName)}: [`);
    for (const row of tableColumns.get(tableName)) {
      lines.push(`    ${quote(row.column_name)},`);
    }
    lines.push('  ],');
  }
  lines.push('} as const;');
  lines.push('');
  lines.push('export type TableName = keyof typeof TABLE_COLUMNS;');
  lines.push('');
  lines.push('export type TableColumn<T extends TableName> = typeof TABLE_COLUMNS[T][number];');
  lines.push('');
  lines.push('export const DATABASE_SCHEMA = defineSchema(TABLE_COLUMNS);');
  lines.push('');
  lines.push('export const table = DATABASE_SCHEMA.table;');
  lines.push('');
}

function emitCardColors(lines, rows) {
  lines.push('export const CARD_COLORS = [');
  for (const row of rows) {
    lines.push('  {');
    lines.push(`    symbol: ${quote(row.color_symbol)},`);
    lines.push(`    name: ${quote(row.color_name)},`);
    lines.push(`    bit: ${row.color_bit},`);
    lines.push('  },');
  }
  lines.push('] as const;');
  lines.push('');
  lines.push('export type CardColor = typeof CARD_COLORS[number];');
  lines.push('');
}

function emitCardRarityAliases(lines, rows) {
  lines.push('export const CARD_RARITY_ALIASES = [');
  for (const row of rows) {
    lines.push('  {');
    lines.push(`    alias: ${quote(row.rarity_alias)},`);
    lines.push(`    rarity: ${quote(row.rarity_name)},`);
    lines.push('  },');
  }
  lines.push('] as const;');
  lines.push('');
  lines.push('export type CardRarityAlias = typeof CARD_RARITY_ALIASES[number];');
  lines.push('');
}

function emitStringConstant(lines, constName, typeName, values) {
  lines.push(`export const ${constName} = [`);
  for (const value of values) {
    lines.push(`  ${quote(value)},`);
  }
  lines.push('] as const;');
  lines.push('');
  lines.push(`export type ${typeName} = typeof ${constName}[number];`);
  lines.push('');
}

function toTypescriptType(row) {
  const typeName = row.type_name.toLowerCase();
  const displayType = row.display_type.toLowerCase();
  const mappedByTypeName = new Map([
    ['int2', 'number'],
    ['int4', 'number'],
    ['int8', 'number'],
    ['integer', 'number'],
    ['bigint', 'number'],
    ['float4', 'number'],
    ['float8', 'number'],
    ['real', 'number'],
    ['double precision', 'number'],
    ['numeric', 'number'],
    ['text', 'string'],
    ['varchar', 'string'],
    ['character varying', 'string'],
    ['bool', 'boolean'],
    ['boolean', 'boolean'],
    ['date', 'Date'],
    ['formattype', 'FormatType'],
    ['eventtype', 'EventType'],
    ['resulttype', 'ResultType'],
  ]).get(typeName);
  const mappedByDisplayType = new Map([
    ['integer', 'number'],
    ['text', 'string'],
    ['resulttype', 'ResultType'],
  ]).get(displayType);
  const baseType = mappedByTypeName || mappedByDisplayType;

  if (!baseType) {
    throw new Error(
      `Unsupported Postgres type for ${row.attname}: ${row.display_type} (${row.type_name})`
    );
  }

  return row.attndims > 0 ? `${baseType}[]` : baseType;
}

function assertFound(rows, expectedNames, kind) {
  const found = new Set(rows.map((row) => row.typname));
  const missing = expectedNames.filter((name) => !found.has(name));
  if (missing.length > 0) {
    throw new Error(`Missing ${kind} type(s): ${missing.join(', ')}`);
  }
}

function assertRows(rows, sourceName) {
  if (rows.length === 0) {
    throw new Error(`${sourceName} returned no rows`);
  }
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key];
    const group = map.get(value) || [];
    group.push(row);
    map.set(value, group);
  }
  return map;
}

function quote(value) {
  return JSON.stringify(value);
}

function parseSsl(value) {
  if (value === undefined || value === '') {
    return 'require';
  }

  if (String(value).toLowerCase() === 'false') {
    return false;
  }

  if (String(value).toLowerCase() === 'true') {
    return 'require';
  }

  return value;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name) {
  const value = process.env[name];
  return value === '' ? undefined : value;
}

function loadDevVars(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = unquote(rawValue.trim());
  }
}

function unquote(value) {
  const hasDoubleQuotes = value.startsWith('"') && value.endsWith('"');
  const hasSingleQuotes = value.startsWith("'") && value.endsWith("'");
  if (hasDoubleQuotes || hasSingleQuotes) {
    return value.slice(1, -1);
  }
  return value;
}
