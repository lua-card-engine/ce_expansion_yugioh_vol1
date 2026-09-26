// Concatenates all individual card Lua files in a directory into a single
// sh_all_cards.lua file, to reduce the amount of Lua files the addon has to
// ship/include (see CardEngine.Collection.IncludeRegistrations).
//
// Usage:
//   node concat_cards.js <cardsDirectory> [outputFileName]
//
// Example:
//   node concat_cards.js ../lua/ce_expansion_yugioh_vol1/cards
//
// Each card file is expected to start with `local CARD = CARD` (the engine
// normally injects a global CARD table before including the file). In the
// concatenated output that line is replaced with `local CARD = {}` since
// there's no wrapping include() call setting up a global CARD per file
// anymore, and CARD.FileName / CARD.FilePath (also normally injected by the
// engine) are set explicitly instead.

import fs from 'fs';
import { extname, isAbsolute, join } from 'path';

const DEFAULT_OUTPUT_FILE_NAME = 'sh_all_cards.lua';
const CARD_LOCAL_LINE = 'local CARD = CARD';
const INDENT = '\t';

function resolveFromCwd(path) {
  return isAbsolute(path) ? path : join(process.cwd(), path);
}

// CARD.FilePath is the full path to the card file, relative to lua/ (see
// CardEngine.Collection.IncludeRegistrations), e.g.
// "ce_expansion_yugioh_vol1/cards/yugioh_vol1_beast_fangs.lua" - so find the
// last "lua" segment in the resolved cards directory and keep everything
// after it (the filename is appended per-card in buildCardBlock).
function getPathRelativeToLuaDirectory(absPath) {
  const segments = absPath.split(/[\\/]+/).filter(Boolean);
  const luaIndex = segments.lastIndexOf('lua');

  if (luaIndex === -1) {
    throw new Error(`Could not find a "lua" directory in path: ${absPath}`);
  }

  return `${segments.slice(luaIndex + 1).join('/')}/`;
}

function indentLines(text, indent) {
  return text
    .split('\n')
    .map((line) => (line.length > 0 ? indent + line : line))
    .join('\n');
}

function buildCardBlock(fileName, directoryPath, source) {
  const filePath = `${directoryPath}${fileName}`;
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const localCardLineIndex = lines.findIndex((line) => line.trim() === CARD_LOCAL_LINE);

  if (localCardLineIndex === -1) {
    throw new Error(`Expected to find "${CARD_LOCAL_LINE}" in ${fileName}`);
  }

  lines.splice(
    localCardLineIndex,
    1,
    // Required as local CARD = CARD only makes sense when the engine injects a global CARD table before including the file
    'local CARD = {}',

    // Copied from the CardEngine.Collection.CreateNew() so hooks function the same in the concatenated output as they do in the original individual card files
    'CARD.hooks = setmetatable({}, { __index = CARD })',

    // Since the loader cannot inject these values anymore, we set them explicitly in the concatenated output so that hooks can use them
    `CARD.FileName = "${fileName}"`,
    `CARD.FilePath = "${filePath}"`
  );

  // Trim trailing blank lines so we control the spacing ourselves
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  const body = indentLines(lines.join('\n'), INDENT);

  return `do\n${body}\n${INDENT}table.insert(ALL_CARDS, CARD)\nend`;
}

function main() {
  const [, , cardsDirectoryArg, outputFileNameArg] = process.argv;

  if (!cardsDirectoryArg) {
    console.error('Usage: node concat_cards.js <cardsDirectory> [outputFileName]');
    console.error('Example: node concat_cards.js ../lua/ce_expansion_yugioh_vol1/cards');
    process.exit(1);
  }

  const cardsDirectory = resolveFromCwd(cardsDirectoryArg);
  const outputFileName = outputFileNameArg || DEFAULT_OUTPUT_FILE_NAME;
  const outputPath = join(cardsDirectory, outputFileName);

  if (!fs.existsSync(cardsDirectory) || !fs.statSync(cardsDirectory).isDirectory()) {
    console.error(`Not a directory: ${cardsDirectory}`);
    process.exit(1);
  }

  const directoryPath = getPathRelativeToLuaDirectory(cardsDirectory);

  const cardFileNames = fs
    .readdirSync(cardsDirectory)
    .filter((fileName) => extname(fileName).toLowerCase() === '.lua' && fileName !== outputFileName)
    .sort((a, b) => a.localeCompare(b));

  if (cardFileNames.length === 0) {
    console.error(`No .lua card files found in ${cardsDirectory}`);
    process.exit(1);
  }

  console.log(`Concatenating ${cardFileNames.length} card(s) from ${cardsDirectory}\n`);

  const blocks = [];
  let failed = 0;

  for (const fileName of cardFileNames) {
    try {
      const source = fs.readFileSync(join(cardsDirectory, fileName), 'utf8');
      blocks.push(buildCardBlock(fileName, directoryPath, source));
      console.log(`  + ${fileName}`);
    } catch (err) {
      console.error(`  ! Skipping ${fileName}: ${err.message}`);
      failed++;
    }
  }

  const output = `local ALL_CARDS = {}\n\n${blocks.join('\n\n')}\n\nreturn ALL_CARDS\n`;

  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`\n✔ Wrote ${blocks.length} card(s) to ${outputPath}`);

  if (failed > 0) {
    console.log(`\t- Skipped: ${failed} card(s) due to errors`);
    process.exit(1);
  }
}

main();
