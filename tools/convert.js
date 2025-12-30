import { convertPNGToVTF, VTF_FORMATS } from 'png-to-vtf';
import { readdir } from 'fs/promises';
import { join, basename, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const designDir = join(__dirname, '..', 'design', 'processed');
const outputDir = join(__dirname, '..', 'materials', 'card_engine', 'expansions', 'ce_expansion_yugioh_vol1');

const files = await readdir(designDir);
const pngFiles = files.filter(file => extname(file).toLowerCase() === '.png');

console.log(`Found ${pngFiles.length} PNG files to convert...`);

for (const pngFile of pngFiles) {
  const inputPath = join(designDir, pngFile);
  const outputFile = basename(pngFile, '.png') + '.vtf';
  const outputPath = join(outputDir, outputFile);

  console.log(`Converting ${pngFile} -> ${outputFile}`);
  await convertPNGToVTF(inputPath, outputPath);
}

console.log('Done!');
