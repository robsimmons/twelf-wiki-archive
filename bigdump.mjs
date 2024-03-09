import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";

const dumpJson = new XMLParser().parse(readFileSync("bigdump.xml"));

console.log(Object.keys(dumpJson));
