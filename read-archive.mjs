import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const content = JSON.parse(readFileSync("./twelfwiki-all-content.json"));
const redirects = JSON.parse(readFileSync("./twelfwiki-all-redirects.json"));

const mediaWikiToSlug = {};
const slugToMediaWiki = {};
const archive = {};

function convertTitleToSlug(title) {
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

function curiouslyAssignMediaWikiToSlug(mediawiki, slug) {
  if (mediaWikiToSlug[mediawiki] && mediaWikiToSlug[mediawiki] !== slug) {
    console.log(
      `Curious! ${mediawiki} -> ${mediaWikiToSlug[mediawiki]} and ${slug}`
    );
  }
  mediaWikiToSlug[mediawiki] = slug;
}

for (const { title, url } of content) {
  const slug = convertTitleToSlug(title);
  curiouslyAssignMediaWikiToSlug(
    title.toLowerCase().replaceAll(" ", "_"),
    slug
  );
  curiouslyAssignMediaWikiToSlug(
    url.slice(5).toLowerCase().replaceAll(" ", "_"),
    slug
  );
  if (slugToMediaWiki[slug]) {
    throw new Error(`Encountered ${slug} twice`);
  }
  slugToMediaWiki[slug] = url.slice(5);
  archive[slug] = { timestamp: "202403", page: url.slice(5) };
}

for (const { src, dst, url } of redirects) {
  const slug = convertTitleToSlug(dst);
  curiouslyAssignMediaWikiToSlug(src.toLowerCase().replaceAll(" ", "_"), slug);
  curiouslyAssignMediaWikiToSlug(
    url.slice(5).toLowerCase().replaceAll(" ", "_"),
    slug
  );
}

writeFileSync(
  "mediawiki-name-recovery-map.json",
  JSON.stringify(mediaWikiToSlug, undefined, 2)
);

writeFileSync(
  "mediawiki-archive-recovery-map.json",
  JSON.stringify(archive, undefined, 2)
);

