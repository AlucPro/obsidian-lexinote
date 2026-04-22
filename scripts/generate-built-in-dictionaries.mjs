import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "tmp", "ecdict.csv");

const outputDirectory = path.join(root, "resources", "dictionaries");
const cet4Path = path.join(outputDirectory, "cet4.json");
const cet6Path = path.join(outputDirectory, "cet6.json");

const REQUIRED_COLUMNS = ["word", "translation", "definition", "tag"];

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function cleanMeaning(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("；")
    .replace(/\s+/g, " ")
    .trim();
}

function isSupportedWord(word) {
  return /^[A-Za-z][A-Za-z'-]*$/.test(word);
}

function toEntry(row, columns, dictionaryName, difficulty) {
  const word = row[columns.word]?.trim();
  if (!word || !isSupportedWord(word)) {
    return undefined;
  }

  const translation = cleanMeaning(row[columns.translation] ?? "");
  const definition = cleanMeaning(row[columns.definition] ?? "");
  const meaning = translation || definition;

  return {
    word,
    normalizedWord: word.toLowerCase(),
    dictionaryName,
    difficulty,
    ...(meaning ? { meaning } : {}),
    source: "built-in"
  };
}

function sortEntries(entries) {
  return entries.sort((left, right) =>
    left.normalizedWord.localeCompare(right.normalizedWord, "en")
  );
}

function writeDictionary(filePath, entries) {
  fs.writeFileSync(filePath, `${JSON.stringify(sortEntries(entries), null, 2)}\n`);
}

if (!fs.existsSync(inputPath)) {
  console.error(`ECDICT CSV not found: ${inputPath}`);
  console.error("Usage: node scripts/generate-built-in-dictionaries.mjs <path-to-ecdict.csv>");
  process.exit(1);
}

const content = fs.readFileSync(inputPath, "utf8");
const [header, ...rows] = parseCsv(content).filter((row) => row.some(Boolean));
const columns = Object.fromEntries(header.map((name, index) => [name, index]));
const missingColumns = REQUIRED_COLUMNS.filter((name) => !(name in columns));

if (missingColumns.length > 0) {
  console.error(`ECDICT CSV is missing required columns: ${missingColumns.join(", ")}`);
  process.exit(1);
}

const cet4Entries = new Map();
const cet6Entries = new Map();
let skipped = 0;
let withoutMeaning = 0;

for (const row of rows) {
  const tags = new Set((row[columns.tag] ?? "").split(/\s+/).filter(Boolean));
  const isCet4 = tags.has("cet4");
  const isCet6 = tags.has("cet6");

  if (!isCet4 && !isCet6) {
    continue;
  }

  const targetName = isCet4 ? "CET4" : "CET6";
  const targetDifficulty = isCet4 ? 4 : 6;
  const entry = toEntry(row, columns, targetName, targetDifficulty);

  if (!entry) {
    skipped += 1;
    continue;
  }

  if (!entry.meaning) {
    withoutMeaning += 1;
  }

  if (isCet4) {
    cet4Entries.set(entry.normalizedWord, entry);
    continue;
  }

  if (!cet4Entries.has(entry.normalizedWord)) {
    cet6Entries.set(entry.normalizedWord, entry);
  }
}

fs.mkdirSync(outputDirectory, { recursive: true });
writeDictionary(cet4Path, [...cet4Entries.values()]);
writeDictionary(cet6Path, [...cet6Entries.values()]);

console.log(`Generated ${path.relative(root, cet4Path)}: ${cet4Entries.size} entries`);
console.log(`Generated ${path.relative(root, cet6Path)}: ${cet6Entries.size} entries`);
console.log(`Skipped unsupported rows: ${skipped}`);
console.log(`Entries without meaning: ${withoutMeaning}`);
