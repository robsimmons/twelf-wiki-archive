function escape(wikitext) {
  const ttMod = wikitext
    .split("<tt>")
    .map((substring, i) => {
      if (i === 0) return substring;
      const [start, ...rest] = substring.split("</tt>");
      const match = start.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match !== null) {
        return `[<tt>${match[1]}</tt>](${match[2]})` + rest.join("</tt>");
      } else {
        return `<tt>${substring}`;
      }
    })
    .join("");

  return ttMod
    .replaceAll("<tt><nowiki>", "``")
    .replaceAll("</nowiki></tt>", "``")
    .replaceAll("{{forall}}", "∀")
    .replaceAll("{{exists}}", "∃")
    .replaceAll("<tt>", "``")
    .replaceAll("</tt>", "``")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\\{", "___ESCAPED_OPEN_CURLY___")
    .replaceAll("\\}", "___ESCAPED_CLOSE_CURLY___")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("___ESCAPED_OPEN_CURLY___", "\\{")
    .replaceAll("___ESCAPED_CLOSE_CURLY___", "\\}")
    .replaceAll("'''", "**")
    .replaceAll("''", "_");
}

function escapeLine(line) {
  if (line.startsWith("#")) {
    line = "-" + line.slice(1);
  }

  const [match] = line.match(/^=*/);
  if (match.length > 0) {
    // It's a heading like %{ === h3 === }%
    const prefix = Array.from({ length: match.length })
      .map(() => "#")
      .join("");
    line = line.slice(match.length).trimEnd();
    while (line[line.length - 1] === "=") {
      line = line.slice(0, line.length - 1);
    }
    line = `${prefix} ${escape(line.trim())}`;
  }

  return escape(line);
}

function wikiTextToElf(title, input) {
  const twelfends = input
    .replaceAll("<twelflink", "``")
    .replaceAll("</twelflink>", "``")
    .replaceAll("<nowiki><twelf></nowiki>", "(twelf)")
    .replaceAll("<nowiki></twelf></nowiki>", "(/twelf)")
    .replaceAll("<nowiki><twelf discard=true></nowiki>", "(twelf discard=true)")
    .split("</twelf>");
  const end = twelfends.pop();
  const output = [];
  for (const segment of twelfends) {
    const subsegments = segment.split("<twelf");
    if (subsegments.length !== 2) {
      console.log(segment);
      throw new Error(
        `Weird twelf in ${title}, ${subsegments.length} segment(s) `
      );
    }
    const [nonTwelf, twelfWithHangingTag] = subsegments;
    const [hangingTag, ...twelf] = twelfWithHangingTag.split(">");

    output.push(`%{! ${nonTwelf
      .trim()
      .split("\n")
      .map(escapeLine)
      .join("\n")} !}%
    ${
      hangingTag.trim() === ""
        ? ""
        : `\n%{! (options removed from twelftag: ${escape(
            hangingTag.trim()
          )}) !}%\n`
    }
${twelf.join(">").trim()}
`);
  }
  if (end.trim() !== "") {
    output.push(`%{! ${end.trim().split("\n").map(escapeLine).join("\n")} !}%`);
  }

  return output.join("\n");
}

function literateTwelfToElf(input) {
  const lines = input.split("\n");
  const output = [];
  let state = "twelf";
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (state === "twelf") {
      if (trimmedLine.startsWith("%{") && trimmedLine.endsWith("}%")) {
        const subline = trimmedLine.slice(2, trimmedLine.length - 2).trim();
        const [match] = subline.match(/^=*/);
        if (match.length === 0) {
          output.push(`%{! ${escape(subline.trim())} !}%`);
        } else {
          // It's a heading like %{ === h3 === }%
          const prefix = Array.from({ length: match.length })
            .map(() => "#")
            .join("");
          let heading = subline.slice(match.length);
          while (heading[heading.length - 1] === "=") {
            heading = heading.slice(0, heading.length - 1);
          }
          output.push(`%{! ${prefix} ${escape(heading.trim())} !}%`);
        }
      } else if (trimmedLine.startsWith("%{")) {
        state = "wikitext";
        output.push(`%{! ${escapeLine(trimmedLine.slice(2).trim())}`);
      } else {
        output.push(line);
      }
    } else {
      if (line.trimEnd().endsWith("}%")) {
        if (line.startsWith("}%")) {
          output.push("!}%");
        } else {
          const trimmedEndLine = line.trimEnd();
          output.push(
            `${escapeLine(
              trimmedEndLine.slice(0, trimmedEndLine.length - 2).trimEnd()
            )} !}%`
          );
        }
        state = "twelf";
      } else {
        output.push(escapeLine(line));
      }
    }
  }
  if (state === "wikitext") {
    output.push("!}%");
  }
  return output.join("\n");
}

function wayback(oldUrl) {
  return `
-----
This page was copied from the MediaWiki version of the Twelf Wiki.
If anything looks wrong, you can refer to the
[wayback machine's version here](https://web.archive.org/web/20240303030303/http://twelf.org/${oldUrl}).
`;
}

export function mediawikiToElf(title, oldUrl, input) {
  if (input.startsWith("%{")) {
    return `%%! title: "${title}"

${literateTwelfToElf(input)}

%{!${wayback(oldUrl)}!}%`;
  } else {
    return `%%! title: "${title}"

${wikiTextToElf(title, input)}

%{!${wayback(oldUrl)}!}%
`;
  }
}
