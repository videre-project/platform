/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { RequestHandler, RouterType } from 'itty-router';
import type { OpenAPIV3 } from 'openapi-types';
import { schemas } from '../build/openapi-schemas.g.ts';
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT, MAX_INLINE_COLLECTION_IDS } from './queryPolicy.ts';
import { schemaRef as ref } from './openapi.ts';
import type { ParameterValidator } from './validation.ts';

type DocumentedHandler = RequestHandler & {
  openapi?: OpenAPIV3.OperationObject,
  validators?: Record<string, ParameterValidator>,
};

function components(): OpenAPIV3.ComponentsObject {
  const ids: OpenAPIV3.SchemaObject = {
    type: 'array', maxItems: MAX_INLINE_COLLECTION_IDS, items: { type: 'integer', minimum: 1 },
  };
  const priceCollection = {
    ...schemas.PriceCollection, properties: {
      ...schemas.PriceCollection.properties, ids: { ...ids, minItems: 1 },
    },
  };
  // Expose the union's fields to clients without union support. Its generated
  // alternatives still enforce which ID source is required.
  const priceVariant = schemas.PriceRequest.anyOf![0] as OpenAPIV3.SchemaObject;
  const priceProperties = Object.assign({},
    ...(priceVariant.allOf as OpenAPIV3.SchemaObject[]).map(part => part.properties));
  // Shared refs prevent clients from emitting separate face/color DTOs per use.
  const card = {
    ...schemas.Card,
    properties: {
      ...schemas.Card.properties,
      colors: { ...schemas.Card.properties!.colors, type: 'array' as const, items: ref('CardColor') },
      color_identity: { ...schemas.Card.properties!.color_identity, type: 'array' as const, items: ref('CardColor') },
      faces: { type: 'array' as const, items: ref('CardFace') },
    },
  };
  return {
    responses: {
      BadRequest: { description: 'Invalid request or no matching results', content: { 'application/json': { schema: ref('Error') } } },
      ServerError: { description: 'The request could not be completed', content: { 'application/json': { schema: ref('Error') } } },
    },
    schemas: {
      ...schemas,
      Card: card,
      CardFace: { ...schemas.CardFace, properties: {
        ...schemas.CardFace.properties,
        colors: { ...schemas.CardFace.properties!.colors, type: 'array', items: ref('CardColor') },
      } },
      CatalogSearchItem: {
        type: 'object', required: ['id'], anyOf: [ref('Card'), ref('Product')],
        description: 'A card or product returned by collection search.',
        // Preserve both shapes in generated clients without union-type support.
        properties: { ...card.properties, ...schemas.Product.properties },
      },
      CardCollection: { ...schemas.CardCollection, nullable: true, properties: {
        ...schemas.CardCollection.properties, ids,
      } },
      PriceCollection: priceCollection,
      PriceRequest: {
        ...schemas.PriceRequest,
        properties: {
          ...priceProperties,
          ids: { ...ids, minItems: 1 },
          collection: { ...priceCollection, nullable: true },
        },
      },
    },
  };
}

/** Build paths from the same itty-router registrations that serve requests. */
export function getOpenAPIDocument(routers: Record<string, Pick<RouterType, 'routes'>>): OpenAPIV3.Document {
  const paths: OpenAPIV3.PathsObject = {
    '/openapi.json': { get: {
      operationId: 'getOpenApiDocument', tags: ['Meta'], summary: 'Get the canonical OpenAPI document',
      responses: { 200: { description: 'The OpenAPI document' } },
    } },
  };
  for (const [group, router] of Object.entries(routers)) {
    for (const [method, , handlers, routePath] of router.routes) {
      const metadata = (handlers as DocumentedHandler[]).find(handler => handler.openapi)?.openapi;
      if (!metadata || !routePath) throw new Error(`Missing OpenAPI metadata: ${method} ${routePath}`);
      const validators = Object.assign({}, ...(handlers as DocumentedHandler[]).map(handler => handler.validators));
      let variants = [routePath];
      for (const optional of routePath.matchAll(/\/:\w+\?/g)) {
        variants = variants.flatMap(path => [path.replace(optional[0], ''), path.replace(optional[0], optional[0].slice(0, -1))]);
      }
      for (const variant of variants) {
        const path = variant.replace(/:(\w+)/g, '{$1}').replace(/\/$/, '') || '/';
        const pathNames = [...variant.matchAll(/:(\w+)/g)].map(match => match[1]);
        const parameters: OpenAPIV3.ParameterObject[] = Object.entries(validators).map(([name, value]) => {
          const validator = value as ParameterValidator;
          if (!validator.schema) throw new Error(`Missing parameter schema: ${path} ${name}`);
          const inPath = pathNames.includes(name);
          let schema: OpenAPIV3.SchemaObject = validator.schema;
          if (name === 'limit') schema = { type: 'integer', minimum: 0, maximum: MAX_LIST_LIMIT, default: DEFAULT_LIST_LIMIT };
          if (name === 'offset') schema = { type: 'integer', minimum: 0, default: 0 };
          if (inPath && name === 'id') schema = { type: 'integer', minimum: 1 };
          return { name, in: inPath ? 'path' : 'query', required: inPath || !!validator.required, schema };
        });
        for (const parameter of metadata.parameters ?? []) {
          if ('$ref' in parameter) throw new Error('Route parameter overrides must be inline.');
          const index = parameters.findIndex(current => current.name === parameter.name && current.in === parameter.in);
          if (index === -1) parameters.push(parameter); else parameters[index] = parameter;
        }
        const operation: OpenAPIV3.OperationObject = {
          tags: [group[0].toUpperCase() + group.slice(1)], ...metadata, parameters,
          operationId: `${metadata.operationId}${variant === routePath.replaceAll('?', '') ? '' : 'ByQuery'}${method === 'QUERY' ? 'Query' : ''}`,
        };
        const key = method === 'QUERY' ? 'x-query' : method.toLowerCase();
        const entry = paths[path] ??= {};
        Object.assign(entry, { [key]: operation });
      }
    }
  }
  return {
    openapi: '3.0.3', info: { title: 'Videre API', version: '1.0.0', description: 'Public API for Magic Online catalog and tournament data.' },
    servers: [{ url: 'https://api.videreproject.com' }], paths, components: components(),
  };
}

export function openApiResponse(routers: Record<string, Pick<RouterType, 'routes'>>): Response {
  return new Response(JSON.stringify(getOpenAPIDocument(routers)), {
    headers: { 'Content-Type': 'application/vnd.oai.openapi+json;version=3.0' },
  });
}
