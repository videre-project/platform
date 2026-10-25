/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { RequestHandler } from 'itty-router';
import type { OpenAPIV3 } from 'openapi-types';
import type { schemas } from '../build/openapi-schemas.g.ts';

type Schema = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
type SchemaName = keyof typeof schemas | 'CatalogSearchItem';

export function schemaRef(name: string): OpenAPIV3.ReferenceObject {
  return { $ref: `#/components/schemas/${name}` };
}

/** Attach standard OpenAPI metadata without changing request handling. */
export function describe(operation: OpenAPIV3.OperationObject) {
  const handler: RequestHandler = () => undefined;
  return Object.assign(handler, { openapi: operation });
}

/** Reuse the actual list or query envelope, substituting its data item type. */
export function responses(item: SchemaName | Schema, envelope: 'ListResponse' | 'QueryResponse' | null = 'ListResponse'): OpenAPIV3.ResponsesObject {
  const schema = typeof item === 'string' ? schemaRef(item) : item;
  return {
    200: {
      description: 'Successful response',
      content: { 'application/json': { schema: envelope ? {
        allOf: [schemaRef(envelope), {
          type: 'object', properties: { data: { type: 'array', items: schema } },
        }],
      } : schema } },
    },
    400: { $ref: '#/components/responses/BadRequest' },
    408: { $ref: '#/components/responses/ServerError' },
    500: { $ref: '#/components/responses/ServerError' },
  };
}
