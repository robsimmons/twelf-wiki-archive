// deno run --allow-read --allow-write converter.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { mediawikiToElf } from "./translator.mjs";

const REDIRECTS = JSON.parse(readFileSync("twelfwiki-all-redirects.json"));
const CONTENT = JSON.parse(readFileSync("twelfwiki-all-content.json"));

const MAP_SLUG_TO_NEW_NAME = new Map();
const MAP_TITLE_TO_SLUG = new Map();
const MAP_LOWERCASE_TITLE_TO_SLUG = new Map();

function convertTitle(title) {
  let converted =
    title === "%."
      ? "percent-eof"
      : title[0] === "%"
      ? `percent-${title.slice(1)}`
      : title
          .toLowerCase()
          .replaceAll("'", "")
          .replaceAll(/[ :\-()%/.,*?]/g, "_")
          .replaceAll(/_+/g, "-");
  if (!converted.match(/^[0-9a-z\-]+$/)) {
    throw new Error(`Nonstandard: ${converted}`);
  }
  if (converted[0] === "-") throw new Error(`${title} ${converted}`);
  if (converted[converted.length - 1] === "-") {
    converted = converted.slice(0, converted.length - 1);
  }
  if (title.includes("_")) {
    // Nice! We never have a title that has underscores to start off with
    throw new Error(title);
  }
  return converted;
}

for (const { title } of CONTENT) {
  const slug = convertTitle(title);
  if (MAP_SLUG_TO_NEW_NAME.has(slug)) {
    // This scheme fails if there are two pages that automap to the same slug
    throw new Error(
      `${slug} applies to both "${title}" and "${MAP_SLUG_TO_NEW_NAME.get(
        slug
      )}"`
    );
  }
  if (
    MAP_TITLE_TO_SLUG.has(title) ||
    MAP_LOWERCASE_TITLE_TO_SLUG.has(title.toLowerCase()) ||
    MAP_LOWERCASE_TITLE_TO_SLUG.has(title.replaceAll(" ", "").toLowerCase())
  ) {
    throw new Error(title);
  }
  MAP_SLUG_TO_NEW_NAME.set(slug, title);
  MAP_TITLE_TO_SLUG.set(title, slug);
  MAP_TITLE_TO_SLUG.set(title.replaceAll(" ", "_"), slug);
  MAP_LOWERCASE_TITLE_TO_SLUG.set(
    title.replaceAll(" ", "").toLowerCase(),
    slug
  );
}

for (const { src, dst } of REDIRECTS) {
  const slugFromTitle = convertTitle(src);
  const slugFromLookup = MAP_TITLE_TO_SLUG.get(dst);
  if (
    MAP_SLUG_TO_NEW_NAME.has(slugFromTitle) &&
    slugFromTitle !== slugFromLookup
  ) {
    throw new Error(
      `Something unexpected with ${slugFromTitle} / ${slugFromLookup}`
    );
  }
  MAP_TITLE_TO_SLUG.set(src, slugFromLookup);
  MAP_TITLE_TO_SLUG.set(src.replaceAll(" ", "_"), slugFromLookup);
  if (!MAP_LOWERCASE_TITLE_TO_SLUG.has(src.replaceAll(" ", "").toLowerCase())) {
    MAP_LOWERCASE_TITLE_TO_SLUG.set(
      src.replaceAll(" ", "").toLowerCase(),
      slugFromLookup
    );
  }
}

const DEAD_LINKS = new Set();
for (const { title, filename } of CONTENT) {
  const file = readFileSync(filename).toString("utf-8");
  const segments = file.split("[[");
  const output = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    const linky = segment.split("]]");
    if (linky.length < 2) {
      throw new Error(`Bad wikilink ${segment}`);
    }
    const linkyparts = linky[0].split("|");
    if (linkyparts.length > 2) {
      // Leave unconverted
      output.push("[[", segment);
    } else {
      const [linkTitle, linkText] =
        // Just sacrificing any relative links within pages
        linkyparts.length === 2
          ? [linkyparts[0].trim().split("#")[0].trim(), linkyparts[1].trim()]
          : [linky[0].trim().split("#")[0].trim(), linky[0].trim()];
      if (linkText.includes("\n")) {
        throw new Error(linkText);
      }
      if (MAP_TITLE_TO_SLUG.has(linkTitle)) {
        output.push(
          "[",
          linkTitle,
          "](/wiki/",
          MAP_TITLE_TO_SLUG.get(linkTitle),
          "/)",
          linky[1]
        );
      } else {
        const normalizedTitleSlug = MAP_LOWERCASE_TITLE_TO_SLUG.get(
          linkTitle.replaceAll(" ", "").replaceAll("_", "").toLowerCase()
        );
        if (normalizedTitleSlug) {
          // Discovered a new variant mapping!
          MAP_TITLE_TO_SLUG.set(linkTitle, normalizedTitleSlug);
          output.push(
            "[",
            linkTitle,
            "](/wiki/",
            MAP_TITLE_TO_SLUG.get(linkTitle),
            "/)",
            linky[1]
          );
        } else if (!DEAD_LINKS.has(linkTitle)) {
          DEAD_LINKS.add(linkTitle);
          output.push(segment);
        }
      }
    }
  }

  const slug = MAP_TITLE_TO_SLUG.get(title);
  writeFileSync(
    `../twelf/wiki/src/content/twelf/${slug}.elf`,
    mediawikiToElf(title, output.join(""))
  );
}

// console.log([...MAP_SLUG_TO_NEW_NAME.keys()].sort().join("\n"));
