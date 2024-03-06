// usage: deno run --allow-net --allow-read --allow-write scraper.mjs

import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { parse as xmlparse } from "https://deno.land/x/xml/mod.ts";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

/*

Phase 1: Get all the page titles

*/

const PAGES = [
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=0",
  "http://twelf.org/w/index.php?title=Special:AllPages&from=Summer+school+2008%3AArithmetic+expressions+with+pairs+%28value%29",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=1",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=2",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=3",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=4",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=5",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=6",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=7",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=8",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=9",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=10",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=11",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=12",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=13",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=14",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=15",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=100",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=101",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=102",
  "http://twelf.org/w/index.php?title=Special%3AAllPages&from=&to=&namespace=103",
];
const DOOMED_SPAMMED_PAGES = new Set([
  "User:Hdeyoung/modal.elf",
  "User:Hdeyoung/subord.elf",
  "User talk:Tom7",
  "User:Rsimmons/Testtag",
  "The Best Fake cigarette Sold in the market",
]);

const parser = new DOMParser();
const REDIRECT_PAGES = new Set();
const CONTENT_PAGES = new Set();
const ALL_LISTED_PAGE_TITLES = new Set();

function convTitle(title) {
  return title
    .replaceAll(" ", "_")
    .replaceAll("%", "%25")
    .replaceAll("'", "%27")
    .replaceAll("?", "%3F");
  // return encodeURIComponent(title.replaceAll(" ", "_")).replaceAll("%3A", ":").replaceAll('%2F', "");
}

for (const page of PAGES) {
  const src = await fetch(page).then((response) => response.text());
  const doc = parser.parseFromString(src, "text/html");
  const ul =
    doc.body.children[0].children[0].children[0].children[3].children[3]
      .children[1];
  if (ul === undefined) continue;
  if (ul.tagName !== "UL")
    throw new Error(`Reading ${page}, did not find UL where expected`);

  for (const li of ul.children) {
    if (
      li.tagName !== "LI" ||
      (li.className !== "" && li.className !== "allpagesredirect") ||
      li.children.length !== 1 ||
      li.children[0].tagName !== "A"
    ) {
      throw new Error(`Reading ${page}, did not find LI as expected`);
    }

    const isRedirect = li.className === "allpagesredirect";
    const a = li.children[0];
    const href = a.getAttribute("href");
    const title = a.getAttribute("title");
    if (title !== a.innerText) {
      throw new Error("Title did not match innerText for A tag");
    }
    if (href.startsWith("/wiki/%C3%8E%E2%80%99")) {
      // Hardcoded ignore the cursed beta equivalence redirects
      continue;
    }
    if (DOOMED_SPAMMED_PAGES.has(title)) {
      // Hardcoded removal of spammy pages
      continue;
    }
    if (title === "POPL Tutorial/CPS") {
      // There was both a POPL Tutorial/CPS and POPL Tutorial/cps
      // The former was an anon contribution, and I can't even
      continue;
    }

    if (href !== `/wiki/${convTitle(title)}`) {
      throw new Error("Unexpected conversion");
    }

    // Uncommented this in order to have something to put into the text box here:
    // http://twelf.org/wiki/Special:Export
    // console.log(title);

    ALL_LISTED_PAGE_TITLES.add(title);
    if (isRedirect) {
      REDIRECT_PAGES.add(title);
    } else {
      CONTENT_PAGES.add(title);
    }
  }
}

writeFileSync(
  "twelfwiki-list-all-pages.txt",
  [...ALL_LISTED_PAGE_TITLES].join("\n")
);

/*

Phase 2: Get the XML dump of effectively the whole site

*/

const exportAllResult = await fetch("http://twelf.org/wiki/Special:Export", {
  credentials: "omit",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  referrer: "http://twelf.org/wiki/Special:Export",
  body: `catname=&pages=${encodeURIComponent(
    [...ALL_LISTED_PAGE_TITLES].join("\n")
  ).replaceAll(
    "%20",
    "+"
  )}&curonly=1&wpEditToken=%2B%5C&title=Special%3AExport`,
  method: "POST",
  mode: "cors",
}).then((response) => response.text());

const dumpJson = xmlparse(exportAllResult);
writeFileSync("twelfwiki-all.xml", exportAllResult);
writeFileSync("twelfwiki-all.json", JSON.stringify(dumpJson, 0, 2));

/*

Phase 3: Write out archive

*/

if (
  !dumpJson ||
  !dumpJson.mediawiki ||
  !dumpJson.mediawiki.page ||
  !dumpJson.mediawiki.page.length
) {
  throw new Error("XML dump not as expected");
}
const FILE_PAGES = new Set();
const PAGES_IN_DUMP = new Set();
const REDIRECTS = new Map();
const OMITTED = new Set();

if (!existsSync("archive")) {
  mkdirSync("archive");
}
for (const page of dumpJson.mediawiki.page) {
  if (!ALL_LISTED_PAGE_TITLES.has(page.title)) {
    throw new Error(`Page ${page.title} not requested`);
  }

  if (!page.revision.text) {
    throw new Error(`Page ${page.title} has no text`);
  }
  if (page.revision.text["@bytes"] === 0) {
    FILE_PAGES.add(page.title);
  } else {
    PAGES_IN_DUMP.add(page.title);
  }

  const segments = page.title.replaceAll(" ", "_").split("/");
  if (segments.length > 2) {
    throw new Error("Can only handle directories one deep");
  } else if (segments.length === 2) {
    const dirname = `archive/${segments[0]}`;
    if (!existsSync(dirname)) {
      mkdirSync(dirname);
    }
  }

  if (page.redirect) {
    REDIRECTS.set(page.title, page.redirect["@title"]);
  } else if (page.revision.text["@bytes"] > 0) {
    writeFileSync(
      `archive/${page.title.replaceAll(" ", "_")}.mediawiki`,
      page.revision.text["#text"]
    );
  } else {
    console.log(`Omitting non-text page: ${page.title}`);
    OMITTED.add(page.title);
  }
}

for (const [src, dst] of REDIRECTS.entries()) {
  if (REDIRECTS.has(dst)) {
    throw new Error(`double redirect ${src} ${dst}`);
  }
  if (!PAGES_IN_DUMP.has(dst)) {
    throw new Error(`orphan redirect ${src} ${dst}`);
  }
}

writeFileSync(
  "twelfwiki-all-redirects.json",
  JSON.stringify(
    [
      ...REDIRECTS.entries().map(([src, dst]) => ({
        src,
        dst,
        url: `wiki/${convTitle(src)}`,
      })),
    ],
    undefined,
    2
  )
);
writeFileSync(
  "twelfwiki-all-content.json",
  JSON.stringify(
    [...CONTENT_PAGES]
      .filter((page) => !OMITTED.has(page))
      .map((title) => ({
        title,
        filename: `archive/${title.replaceAll(" ", "_")}.mediawiki`,
        url: `wiki/${convTitle(title)}`,
      })),
    undefined,
    2
  )
);

for (const title of ALL_LISTED_PAGE_TITLES) {
  if (!PAGES_IN_DUMP.has(title) && !FILE_PAGES.has(title)) {
    throw new Error(`Page ${title} not accounted for in data dump`);
  }
}
