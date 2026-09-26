import https from 'https';
import http from 'http';
import fs from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { makeFileNameSafe, makeHashFilename } from './utils.js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the date parameters from command line arguments
const startDate = process.argv[2];
const endDate = process.argv[3];
const dateRegion = process.argv[4] || 'tcg'; // Default to TCG

const YUGIOH_API_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const OUTPUT_DIRECTORY = join(__dirname, '..', 'design');

// Create a safe identifier from dates
const setCode = process.argv[5] || `${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}_${dateRegion}`;
const LUA_CARDS_DIRECTORY = join(__dirname, '..', 'lua', 'ce_expansion_yugioh_' + setCode, 'cards');
const LUA_LANGUAGES_DIRECTORY = join(__dirname, '..', 'lua', 'ce_expansion_yugioh_' + setCode, 'languages');

if (!startDate || !endDate) {
  console.error('Usage: node download.js <start_date> <end_date> [date_region]');
  console.error('Example: node download.js 1999-02-04 1999-02-04 ocg');
  console.error('Date format: YYYY-MM-DD');
  console.error('Date region: ocg or tcg (default: tcg)');
  process.exit(1);
}

function downloadFile(url, filepath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    // Prevent infinite redirect loops
    if (redirectCount > 10) {
      reject(new Error('Too many redirects'));
      return;
    }

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // Handle all redirect status codes (301, 302, 303, 307, 308)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const redirectUrl = response.headers.location;
        downloadFile(redirectUrl, filepath, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      // Detect actual file extension from content-type header
      const contentType = response.headers['content-type'] || '';
      let actualExt = extname(filepath);

      if (contentType.includes('image/webp')) {
        actualExt = '.webp';
      } else if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
        actualExt = '.jpg';
      } else if (contentType.includes('image/png')) {
        actualExt = '.png';
      } else if (contentType.includes('image/gif')) {
        actualExt = '.gif';
      }

      // Update filepath with correct extension
      const filepathWithoutExt = filepath.replace(/\.[^/.]+$/, '');
      const correctedFilepath = filepathWithoutExt + actualExt;

      const fileStream = fs.createWriteStream(correctedFilepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(correctedFilepath); // Return the filepath for conversion
      });

      fileStream.on('error', (err) => {
        fs.unlink(correctedFilepath, () => { }); // Delete the file on error
        reject(err);
      });
    }).on('error', reject);
  });
}

function downloadJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Failed to fetch data: ${response.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function convertToPNG(inputPath, outputPath) {
  try {
    // Read the file into a buffer first so sharp doesn't lock the original file
    const buffer = await fs.promises.readFile(inputPath);

    // Convert the buffer to PNG
    await sharp(buffer)
      .png()
      .toFile(outputPath);

    // Now we can safely delete the original file
    await fs.promises.unlink(inputPath);
  } catch (err) {
    throw new Error(`Failed to convert to PNG: ${err.message}`);
  }
}

// Convert snake_case or camelCase to PascalCase
function toPascalCase(str) {
  return str
    .replace(/[_-](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (_, char) => char.toUpperCase());
}

// Recursively convert object keys to PascalCase and convert to Lua table format
function convertToLuaValue(value, indent = '    ') {
  if (value === null || value === undefined) {
    return 'nil';
  }

  if (typeof value === 'string') {
    // Escape special characters in strings
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return `"${escaped}"`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '{}';
    }
    const items = value.map(item => `${indent}    ${convertToLuaValue(item, indent + '    ')}`);
    return `{\n${items.join(',\n')}\n${indent}}`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    const items = entries.map(([key, val]) => {
      const pascalKey = toPascalCase(key);
      return `${indent}    ${pascalKey} = ${convertToLuaValue(val, indent + '    ')}`;
    });
    return `{\n${items.join(',\n')}\n${indent}}`;
  }

  return 'nil';
}

// Generate Lua card file
function generateCardLuaFile(card, textureFileName) {
  const cardId = `ce_expansion_yugioh_${setCode}_${makeFileNameSafe(card.name)}`;
  const texturePath = `card_engine/expansions/ce_expansion_yugioh_${setCode}/${textureFileName}`;
  const backTexturePath = `card_engine/expansions/ce_expansion_yugioh_${setCode}/back`;

  // Create attributes object from all card properties
  const attributes = {};
  for (const [key, value] of Object.entries(card)) {
    if (key !== 'name' && key !== 'card_images') {
      attributes[key] = value;
    }
  }

  const luaContent = `local CARD = CARD
CARD.Name = "${cardId}"
CARD.Description = "${cardId}_description"
CARD.Texture = "${texturePath}"
CARD.RearTexture = "${backTexturePath}"
CARD.CardSize = CardEngine.DEFAULT_CARD_MODELS.JAPANESE_ROUNDED
CARD.Attributes = ${convertToLuaValue(attributes)}
`;

  return luaContent;
}

// Generate or update language file
function generateLanguageFile(cards) {
  const languageEntries = {
    expansionSet: `["expansion_set_ce_expansion_yugioh_${setCode}"] = "Yu-Gi-Oh! ${startDate} to ${endDate} (${dateRegion.toUpperCase()})"`,
    cards: []
  };

  for (const card of cards) {
    if (!card.name) continue;

    const cardId = `ce_expansion_yugioh_${setCode}_${makeFileNameSafe(card.name)}`;
    const cardName = card.name.replace(/"/g, '\\"');
    const cardDescription = (card.desc || '')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');

    languageEntries.cards.push(`    ["${cardId}"] = "${cardName}"`);
    languageEntries.cards.push(`    ["${cardId}_description"] = "${cardDescription}"`);
  }

  const luaContent = `return {
    --[[
        Expansion Sets
    --]]

    ${languageEntries.expansionSet},

    --[[
        Cards
    --]]
${languageEntries.cards.join(',\n')}
}
`;

  return luaContent;
}

async function main() {
  try {
    console.log(`Downloading Yu-Gi-Oh! card data from ${startDate} to ${endDate} (${dateRegion})...`);

    // Build API URL with parameters
    const apiUrl = `${YUGIOH_API_URL}?startdate=${startDate}&enddate=${endDate}&dateregion=${dateRegion}`;
    console.log(`Fetching from: ${apiUrl}`);

    const jsonData = await downloadJSON(apiUrl);
    const data = JSON.parse(jsonData);
    const allCards = data.data || [];

    console.log(`\nTotal cards found: ${allCards.length}`);

    // Save combined data.json
    const combinedData = { cards: allCards };
    const jsonOutput = join(OUTPUT_DIRECTORY, 'data.json');
    fs.writeFileSync(jsonOutput, JSON.stringify(combinedData, null, 2));
    console.log(`✓ Saved combined card data to ${jsonOutput}`);

    // Ensure unprocessed directory exists and is empty
    const unprocessedDir = join(OUTPUT_DIRECTORY, 'unprocessed');

    if (fs.existsSync(unprocessedDir)) {
      fs.rmSync(unprocessedDir, { recursive: true, force: true });
    }

    fs.mkdirSync(unprocessedDir, { recursive: true });

    // Ensure Lua directories exist
    fs.mkdirSync(LUA_CARDS_DIRECTORY, { recursive: true });
    fs.mkdirSync(LUA_LANGUAGES_DIRECTORY, { recursive: true });

    // Download all images and generate Lua files
    let downloaded = 0;
    let skipped = 0;
    const processedCards = [];

    for (let i = 0; i < allCards.length; i++) {
      const card = allCards[i];

      // Yu-Gi-Oh API has card_images array with image_url
      const imageUrl = card.card_images && card.card_images.length > 0 ? card.card_images[0].image_url : null;

      if (imageUrl && card.name) {
        let safeFilename = makeFileNameSafe(card.name); // Final PNG filename
        let finalPath = join(unprocessedDir, safeFilename + '.png');
        const tempPath = join(unprocessedDir, makeHashFilename(imageUrl) + '.temp');

        // If the final PNG already exists, append a hash to avoid overwriting
        if (fs.existsSync(finalPath)) {
          safeFilename = makeFileNameSafe(card.name) + '_' + makeHashFilename(imageUrl);
          finalPath = join(unprocessedDir, safeFilename + '.png');
        }

        try {
          console.log(`[${i + 1}/${allCards.length}] Downloading: ${card.name}`);
          const downloadedPath = await downloadFile(imageUrl, tempPath);

          // Convert to PNG if it's not already a PNG
          if (!downloadedPath.endsWith('.png')) {
            console.log(`  Converting to PNG...`);
            await convertToPNG(downloadedPath, finalPath);
          } else {
            // If already PNG, just rename it
            fs.renameSync(downloadedPath, finalPath);
          }

          downloaded++;

          // Generate Lua card file
          const luaCardContent = generateCardLuaFile(card, safeFilename);
          const luaCardPath = join(LUA_CARDS_DIRECTORY, `yugioh_${setCode}_${safeFilename}.lua`);
          fs.writeFileSync(luaCardPath, luaCardContent);
          console.log(`  Generated Lua file: ${luaCardPath}`);

          processedCards.push(card);
        } catch (err) {
          console.error(`Failed to process ${card.name}: ${err.message}`);
        }
      } else {
        skipped++;
      }
    }

    // Generate language file
    console.log('\nGenerating language file...');
    const languageContent = generateLanguageFile(processedCards);
    const languagePath = join(LUA_LANGUAGES_DIRECTORY, 'en.lua');
    fs.writeFileSync(languagePath, languageContent);
    console.log(`✓ Generated language file: ${languagePath}`);

    console.log('\n✓ Download, conversion, and Lua generation complete!');
    console.log(`\t- Total cards: ${allCards.length}`);
    console.log(`\t- Downloaded and converted: ${downloaded} images to PNG`);
    console.log(`\t- Generated: ${downloaded} Lua card files`);
    console.log(`\t- Skipped: ${skipped} cards (no image URL)`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
