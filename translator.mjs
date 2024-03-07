function escape(wikitext) {
  return wikitext
    .replaceAll("<tt><nowiki>", "``")
    .replaceAll("</nowiki></tt>", "``")
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
      .join("\n");
    line = line.slice(match.length).trimEnd();
    while (line[line.length - 1] === "=") {
      line = line.slice(0, line.length - 1);
    }
    line = `${prefix} ${escape(line.trim())}`;
  }

  return escape(line);
}

function literateTwelfToElf(input) {
  const lines = input.split("\n");
  const output = [];
  let state = "twelf";
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (state === "twelf") {
      if (trimmedLine.startsWith("%{") && trimmedLine.endsWith("}%")) {
        const subline = trimmedLine.slice(2, trimmedLine.length - 4).trim();
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
          output.push(`%%${prefix} ${escape(heading.trim())}`);
        }
      } else if (trimmedLine.startsWith("%{")) {
        state = "wikitext";
        output.push(`%{! ${escapeLine(trimmedLine.slice(2).trim())}`);
      } else {
        output.push(line);
      }
    } else {
      if (line.trimEnd().endsWith("}%")) {
        const trimmedEndLine = line.trimEnd();
        output.push(
          `${escapeLine(
            trimmedEndLine.slice(0, trimmedEndLine.length - 2).trimEnd()
          )} !}%`
        );
        state = "twelf";
      } else {
        output.push(escapeLine(line));
      }
    }
  }
  return output.join("\n");
}

export function mediawikiToElf(title, input) {
  if (input.startsWith("%{")) {
    return `%%! title: "${title}"

${literateTwelfToElf(input)}`;
  } else {
    return `%%! title: "${title}"

%{!
${input.split("\n").map(escapeLine).join("\n")}
!}%
`;
  }
}
