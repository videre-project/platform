/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import assert from "node:assert/strict";
import test from "node:test";

import {
  and,
  clampInteger,
  compile,
  defineFilters,
  defineSchema,
  eq,
  exists,
  ident,
  ilikeContains,
  jsonBuildObject,
  jsonBuildObjectFromColumns,
  lowerContains,
  optional,
  or,
  orderBy,
  paramFilter,
  param,
  raw,
  select,
  selectFields,
  sql,
  tableColumnFields,
  tableColumns,
} from "../src/index.ts";

test("compiles parameterized fragments with stable placeholder order", () => {
  const query = compile(sql`
    SELECT *
    FROM cards c
    WHERE ${and([
      eq(raw("c.id"), param(605, "int")),
      ilikeContains(raw("c.name"), "bolt"),
      lowerContains(raw("c.artist"), "rush"),
    ])}
  `);

  assert.equal(query.text, [
    "SELECT *",
    "FROM cards c",
    "WHERE (c.id = $1::int)",
    "AND (c.name ILIKE '%' || $2 || '%')",
    "AND (lower(coalesce(c.artist, '')) LIKE '%' || lower($3) || '%')",
  ].join("\n"));
  assert.deepEqual(query.values, [605, "bolt", "rush"]);
});

test("omits optional predicates without disturbing later placeholders", () => {
  const query = compile(sql`
    SELECT *
    FROM cards c
    WHERE ${and([
      optional(null, eq(raw("c.name"), "Lightning Bolt")),
      optional("1E", eq(raw("c.set_code"), "1E")),
    ])}
  `);

  assert.equal(query.text, [
    "SELECT *",
    "FROM cards c",
    "WHERE (c.set_code = $1)",
  ].join("\n"));
  assert.deepEqual(query.values, ["1E"]);
});

test("builds nested EXISTS predicates", () => {
  const attributeQuery = select("1")
    .from("api_card_search_attributes", "a")
    .where(and([
      eq(raw("a.card_id"), raw("c.id")),
      lowerContains(raw("a.name_normalized"), "dizzying swoop"),
    ]));

  const query = compile(
    select("c.id", "c.name")
      .from("cards", "c")
      .where(exists(attributeQuery))
      .orderBy(raw("c.name ASC, c.id ASC"))
      .limit(5)
      .offset(10),
  );

  assert.equal(query.text, [
    "SELECT c.id, c.name",
    "FROM cards \"c\"",
    "WHERE EXISTS (",
    "SELECT 1",
    "FROM api_card_search_attributes \"a\"",
    "WHERE (a.card_id = c.id)",
    "AND (lower(coalesce(a.name_normalized, '')) LIKE '%' || lower($1) || '%')",
    ")",
    "ORDER BY c.name ASC, c.id ASC",
    "LIMIT $2::int",
    "OFFSET $3::int",
  ].join("\n"));
  assert.deepEqual(query.values, ["dizzying swoop", 5, 10]);
});

test("quotes identifiers and rejects invalid identifier input", () => {
  assert.equal(compile(ident("cards", "id")).text, "\"cards\".\"id\"");
  assert.throws(() => ident("cards; DROP TABLE cards;"), /Invalid SQL identifier/);
});

test("renders OR groups with explicit parentheses", () => {
  const query = compile(or([
    eq(raw("c.name"), "Lightning Bolt"),
    eq(raw("c.name"), "Counterspell"),
  ]));

  assert.equal(query.text, [
    "(c.name = $1)",
    "OR (c.name = $2)",
  ].join("\n"));
  assert.deepEqual(query.values, ["Lightning Bolt", "Counterspell"]);
});

test("builds typed table references from schema columns", () => {
  const db = defineSchema({
    cards: ["id", "name", "set_code"],
  } as const);
  const cards = db.table("cards", "c");

  const query = compile(
    select(cards.column("id"), cards.column("name"))
      .from(cards.source)
      .where(eq(cards.column("set_code"), "1E")),
  );

  assert.equal(query.text, [
    "SELECT \"c\".\"id\", \"c\".\"name\"",
    "FROM \"cards\" \"c\"",
    "WHERE \"c\".\"set_code\" = $1",
  ].join("\n"));
  assert.deepEqual(query.values, ["1E"]);
});

test("builds JSON objects from keyed SQL expressions", () => {
  const query = compile(jsonBuildObject({
    id: raw("c.id"),
    name: raw("c.name"),
  }));

  assert.equal(query.text, "json_build_object('id', c.id, 'name', c.name)");
  assert.deepEqual(query.values, []);
});

test("builds JSON objects from aliased column names", () => {
  const query = compile(jsonBuildObjectFromColumns("c", ["id", "name"] as const));

  assert.equal(query.text, [
    "json_build_object('id', \"c\".\"id\", 'name', \"c\".\"name\")",
  ].join("\n"));
  assert.deepEqual(query.values, []);
});

test("builds declarative typed filter sets", () => {
  type CardParams = {
    readonly id?: number | null;
    readonly name?: string | null;
  };

  const db = defineSchema({
    cards: ["id", "name_normalized"],
  } as const);
  const cards = db.table("cards", "c");
  const filters = defineFilters<CardParams>([
    paramFilter("id", (value) => eq(cards.column("id"), value)),
    paramFilter("name", (value) => lowerContains(cards.column("name_normalized"), value)),
  ]);

  const query = compile(
    select(cards.column("id"))
      .from(cards.source)
      .where(filters.where({ name: "bolt" })),
  );

  assert.equal(query.text, [
    "SELECT \"c\".\"id\"",
    "FROM \"cards\" \"c\"",
    "WHERE (lower(coalesce(\"c\".\"name_normalized\", '')) LIKE '%' || lower($1) || '%')",
  ].join("\n"));
  assert.deepEqual(query.values, ["bolt"]);
});

test("builds table column lists from typed table references", () => {
  const db = defineSchema({
    cards: ["id", "name", "set_code"],
  } as const);
  const cards = db.table("cards", "c");

  const query = compile(sql`
    SELECT ${tableColumns(cards, ["id", "name"])}
    FROM ${cards.source}
  `);

  assert.equal(query.text, [
    "SELECT \"c\".\"id\", \"c\".\"name\"",
    "FROM \"cards\" \"c\"",
  ].join("\n"));
  assert.deepEqual(query.values, []);
});

test("builds aliased select lists from typed field maps", () => {
  const db = defineSchema({
    cards: ["id", "name", "set_code"],
    sets: ["code", "name"],
  } as const);
  const cards = db.table("cards", "c");
  const sets = db.table("sets", "s");

  const query = compile(sql`
    SELECT ${selectFields({
      ...tableColumnFields(cards, ["id", "name"] as const),
      set_name: sets.column("name"),
      image_url: sql`cdn_card_image_base_url() || ${cards.column("id")}`,
    })}
    FROM ${cards.source}
  `);

  assert.equal(query.text, [
    [
      "SELECT \"c\".\"id\" AS \"id\"",
      "\"c\".\"name\" AS \"name\"",
      "\"s\".\"name\" AS \"set_name\"",
      "cdn_card_image_base_url() || \"c\".\"id\" AS \"image_url\"",
    ].join(", "),
    "FROM \"cards\" \"c\"",
  ].join("\n"));
  assert.deepEqual(query.values, []);
});

test("builds ordered fragment lists", () => {
  const query = compile(sql`
    ORDER BY ${orderBy([
      raw("c.name ASC NULLS LAST"),
      raw("c.id"),
    ])}
  `);

  assert.equal(query.text, "ORDER BY c.name ASC NULLS LAST, c.id");
  assert.deepEqual(query.values, []);
});

test("clamps integer values without owning API policy", () => {
  const options = {
    defaultValue: 100,
    min: 0,
    max: 500,
  };

  assert.equal(clampInteger(42.9, options), 42);
  assert.equal(clampInteger(-1, options), 0);
  assert.equal(clampInteger(1000, options), 500);
  assert.equal(clampInteger("25", options), 25);
  assert.equal(clampInteger(null, options), 100);
  assert.equal(clampInteger(Number.NaN, options), 100);
});
