import { readFileSync } from "fs";

const pages = JSON.parse(readFileSync("twelfwiki-all-content.json"));

while (pages[0].title !== "Talk:Equality") pages.shift();
for (const { title, url } of pages) {
  console.log("Archiving " + title);
  await fetch("https://web.archive.org/save/http://twelf.org/" + url)
    .then((response) => response.text())
    .then(console.log);
  await new Promise((resolve) => setTimeout(() => resolve(), 5 * 60 * 1000));
}
