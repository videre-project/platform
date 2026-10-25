/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import assert from 'node:assert/strict';
import test from 'node:test';
import type { OpenAPIV3 } from 'openapi-types';
import { CARD_COLORS, CARD_RARITIES } from '@videreproject/constants';
import { CARD_FACE_FIELDS } from '../src/db/queries/cards/types.ts';
import { MAX_INLINE_COLLECTION_IDS } from '../src/queryPolicy.ts';
import { getOpenAPIDocument, openApiResponse } from '../src/openapiDocument.ts';
import { apiRouters } from '../src/api/index.ts';

const document = getOpenAPIDocument(apiRouters);
function schema(name: string): OpenAPIV3.SchemaObject {
  const value = document.components?.schemas?.[name];
  assert.ok(value && !('$ref' in value), `Missing concrete schema: ${name}`);
  return value;
}
function property(model: string, name: string): OpenAPIV3.SchemaObject {
  const parent = schema(model);
  let value = parent.properties?.[name];
  for (const part of parent.allOf ?? []) {
    if (!value && !('$ref' in part)) value = part.properties?.[name];
  }
  assert.ok(value && !('$ref' in value), `Missing concrete property: ${model}.${name}`);
  return value;
}
function operation(path: string, method = 'get'): OpenAPIV3.OperationObject {
  const value = (document.paths[path] as Record<string, OpenAPIV3.OperationObject> | undefined)?.[method];
  assert.ok(value, `Missing operation: ${method} ${path}`);
  return value;
}

test('serves the generated OpenAPI 3.0 document with the OpenAPI media type', async () => {
  const response = openApiResponse(apiRouters);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/vnd.oai.openapi+json;version=3.0');
  assert.deepEqual(await response.json(), document);
  assert.equal(document.openapi, '3.0.3');
});

test('documents every route family and both forms of optional format paths', () => {
  for (const path of ['/cards', '/cards/{id}', '/products', '/sets', '/sets/{code}', '/mtgo/manifest']) operation(path);
  for (const base of ['events', 'decks', 'matches', 'standings', 'archetypes', 'metagame', 'matchups', 'sideboarding']) {
    operation(`/${base}`);
    const formatted = operation(`/${base}/{format}`);
    assert.ok(formatted.parameters?.some(value => !('$ref' in value) && value.name === 'format' && value.in === 'path' && value.required));
  }
  operation('/sideboarding/matchups');
  operation('/sideboarding/{format}/matchups');
  const ids = Object.values(document.paths).flatMap(path => Object.values(path ?? {}))
    .filter(value => value && typeof value === 'object' && 'operationId' in value)
    .map(value => (value as OpenAPIV3.OperationObject).operationId);
  assert.equal(ids.length, new Set(ids).size, 'Generated client operation names must be unique');
});

test('derives parameters from validators and shares POST and QUERY contracts', () => {
  for (const path of ['/cards/search', '/prices']) {
    const post = operation(path, 'post');
    const query = operation(path, 'x-query');
    assert.equal(query.operationId, `${post.operationId}Query`);
    assert.deepEqual(query.parameters, post.parameters);
    assert.deepEqual(query.requestBody, post.requestBody);
    assert.deepEqual(query.responses, post.responses);
  }
  const cards = operation('/cards');
  const rarity = cards.parameters?.find(value => !('$ref' in value) && value.name === 'rarity') as OpenAPIV3.ParameterObject;
  assert.deepEqual((rarity.schema as OpenAPIV3.SchemaObject).enum, [...CARD_RARITIES]);
  const format = operation('/metagame').parameters?.find(value => !('$ref' in value) && value.name === 'format') as OpenAPIV3.ParameterObject;
  assert.equal(format.in, 'query');
  assert.equal(format.required, true);
});

test('preserves nullable integers, optional properties, formats, and nested data', () => {
  assert.deepEqual(Object.keys(schema('CardFace').properties ?? {}).sort(), [...CARD_FACE_FIELDS].sort());
  assert.deepEqual(property('Product', 'id'), { type: 'integer', minimum: 1 });
  assert.deepEqual(property('Product', 'texture_number'), { type: 'integer', nullable: true });
  assert.deepEqual(property('CardFace', 'source_catalog_id'), { type: 'integer', nullable: true });
  assert.deepEqual(property('CardFace', 'face_index'), { type: 'integer', minimum: 0 });
  assert.equal(property('CardFace', 'mana_value').type, 'number');
  assert.equal(property('CardFace', 'mana_value').nullable, true);
  assert.equal(property('Product', 'image_url').format, 'uri');
  assert.ok(schema('Product').required?.includes('description'));
  assert.ok(!schema('Product').required?.includes('in_collection'));
  assert.equal(property('Price', 'sell_price').type, 'number');
  assert.equal(property('Price', 'price_date').format, 'date');
  assert.equal(property('Event', 'date').format, 'date-time');
  const board = property('EventDeck', 'mainboard');
  assert.ok([board, ...(board.anyOf ?? [])].some(value => !('$ref' in value) && value.type === 'array'));
  assert.deepEqual(new Set(schema('CardColor').enum), new Set(CARD_COLORS.map(({ symbol }) => symbol)));
  assert.equal(property('Card', 'rarity').nullable, true);
  assert.deepEqual(new Set(property('Card', 'rarity').enum), new Set([...CARD_RARITIES, null]));
  assert.equal(property('Card', 'faces').type, 'array');
  const search = schema('CatalogSearchItem');
  assert.deepEqual(search.anyOf, [{ $ref: '#/components/schemas/Card' }, { $ref: '#/components/schemas/Product' }]);
  for (const name of ['mana_cost', 'faces', 'object_type', 'description', 'is_tradable']) assert.ok(search.properties?.[name]);
});

test('documents actual query and paginated envelopes separately', () => {
  assert.ok(schema('ListResponse').properties?.object);
  assert.ok(!schema('QueryResponse').properties?.object);
  for (const [path, envelope] of [['/cards', 'ListResponse'], ['/cards/{id}', 'QueryResponse'], ['/products/{id}', 'QueryResponse'], ['/sideboarding/{format}', 'QueryResponse']]) {
    const response = operation(path).responses['200'] as OpenAPIV3.ResponseObject;
    const body = response.content?.['application/json'].schema as OpenAPIV3.SchemaObject;
    assert.deepEqual(body.allOf?.[0], { $ref: `#/components/schemas/${envelope}` });
  }
});

test('percentage schemas accept decimal statistics, including nullable postboard fields', () => {
  for (const model of ['Sideboarding', 'SideboardingMatchup']) {
    for (const name of ['game_one_winrate', 'postboard_game_winrate', 'game_one_ci', 'postboard_game_ci']) {
      const field = property(model, name);
      const value = [field, ...(field.anyOf ?? [])].find(part => !('$ref' in part) && part.type === 'string') as OpenAPIV3.SchemaObject;
      assert.ok(value?.pattern, `${model}.${name} must describe its percentage format`);
      const pattern = new RegExp(value.pattern);
      assert.ok(pattern.test(name.endsWith('_ci') ? '±12.34%' : '25.93%'));
      assert.ok(!pattern.test('not a percentage'));
    }
  }
  assert.equal(property('MatchupMatrix', 'id').type, 'integer');
});

test('documents optional collection defaults and shared catalog-ID limits', () => {
  assert.deepEqual(schema('CardCollection').required, ['ids']);
  for (const name of ['mode', 'match']) {
    const option = property('CardCollection', name);
    assert.equal(option.type, 'string');
    assert.equal(option.nullable, true);
    assert.ok(option.anyOf?.some(value => !('$ref' in value) && value.enum?.includes('')));
  }
  assert.equal(property('CardCollection', 'ids').maxItems, MAX_INLINE_COLLECTION_IDS);
  assert.equal(property('PriceRequest', 'ids').maxItems, MAX_INLINE_COLLECTION_IDS);
  assert.equal(property('PriceRequest', 'ids').minItems, 1);
  const alternatives = schema('PriceRequest').anyOf as OpenAPIV3.SchemaObject[];
  assert.deepEqual(alternatives.map(value => (value.allOf as OpenAPIV3.SchemaObject[]).flatMap(part => part.required ?? [])), [['ids'], ['collection']]);
  assert.equal(property('PriceRequest', 'date').default, 'latest');
});

test('all generated references resolve and component names are OpenAPI compatible', () => {
  for (const name of Object.keys(document.components?.schemas ?? {})) assert.match(name, /^[\w.-]+$/);
  function visit(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    if ('$ref' in value) {
      assert.equal(typeof value.$ref, 'string');
      let target: unknown = document;
      for (const part of String(value.$ref).replace(/^#\//, '').split('/')) {
        const key = decodeURIComponent(part).replace(/~1/g, '/').replace(/~0/g, '~');
        assert.ok(target && typeof target === 'object' && key in target, `Unresolved reference: ${value.$ref}`);
        target = (target as Record<string, unknown>)[key];
      }
    }
    for (const child of Object.values(value)) visit(child);
  }
  visit(document);
});
