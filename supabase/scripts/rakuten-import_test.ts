import { parseImportArgs } from "./rakuten-import.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("genre command defaults to a bounded root dry run", () => {
  const options = parseImportArgs(["genres", "--dry-run"]);
  assertEquals(options.genreIds, ["0"]);
  assertEquals(options.depth, 2);
  assertEquals(options.maxGenres, 250);
  assert(options.dryRun, "Expected dry-run mode");
});

Deno.test("product command accepts repeated seeds and page bounds", () => {
  const options = parseImportArgs([
    "products",
    "--keyword",
    "グミ",
    "--keyword",
    "抹茶 お菓子",
    "--genre-id",
    "551167",
    "--max-pages",
    "3",
    "--dry-run",
  ]);
  assertEquals(options.keywords, ["グミ", "抹茶 お菓子"]);
  assertEquals(options.genreIds, ["551167"]);
  assertEquals(options.maxPages, 3);
});

Deno.test("product command supplies conservative default keywords", () => {
  const options = parseImportArgs(["products", "--dry-run"]);
  assert(options.keywords.length > 0, "Expected default snack keywords");
  assertEquals(options.genreIds, []);
});

Deno.test("invalid flags and unsafe limits fail before network access", () => {
  for (
    const args of [
      ["products", "--max-pages", "0"],
      ["genres", "--depth", "99"],
      ["genres", "--genre-id", "not-a-number"],
      ["products", "--unknown", "value"],
    ]
  ) {
    let failed = false;
    try {
      parseImportArgs(args);
    } catch {
      failed = true;
    }
    assert(failed, `Expected arguments to fail: ${args.join(" ")}`);
  }
});
