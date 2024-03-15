import { readFileSync, writeFileSync } from "fs";

const archive = JSON.parse(readFileSync("mediawiki-archive-recovery-map.json"));

for (const [slug, { timestamp, page }] of Object.entries(archive)) {
  if (timestamp !== "202403") {
    continue;
  }
  await fetch(`http://archive.org/wayback/available?url=twelf.org/wiki/${page}`)
    .then((response) => response.json())
    .then((response) => {
      if (!response?.archived_snapshots?.closest?.timestamp) {
        throw new Error(JSON.stringify(response));
      }
      if (
        !response?.archived_snapshots?.closest?.available ||
        response?.archived_snapshots?.closest?.status !== "200"
      ) {
        console.log(`trouble with ${title}`);
        console.log(JSON.stringify(response));
      }
      archive[slug].timestamp = response.archived_snapshots.closest.timestamp;
    });
  await new Promise((resolve) => setTimeout(resolve, 60000));
  console.log(`Archive for ${page} at ${archive[slug].timestamp}`);

  writeFileSync(
    "mediawiki-archive-recovery-map.json",
    JSON.stringify(archive, undefined, 2)
  );
}
