import fs from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_DIRECTORY = join(__dirname, '..', 'design', 'unprocessed');
const OUTPUT_DIRECTORY = join(__dirname, '..', 'design', 'processed');

async function processImage(inputPath, outputPath) {
  try {
    const metadata = await sharp(inputPath).metadata();

    // Step 1: Resize to max 351px wide, maintaining aspect ratio
    let resized = sharp(inputPath);

    resized = resized.resize(351, 512, {
      fit: 'cover',
      position: 'left top',
      withoutEnlargement: false
    });

    const resizedBuffer = await resized.toBuffer();

    // Step 2: Create a 512x512 transparent canvas and composite the resized image top-left
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      }
    })
      .composite([{
        input: resizedBuffer,
        top: 0,
        left: 0
      }])
      .png()
      .toFile(outputPath);

  } catch (err) {
    throw new Error(`Failed to process image: ${err.message}`);
  }
}

async function main() {
  try {
    console.log('Processing card images...\n');

    if (!fs.existsSync(OUTPUT_DIRECTORY)) {
      fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
    }

    // Get all PNG files from input directory
    const files = fs.readdirSync(INPUT_DIRECTORY)
      .filter(file => extname(file).toLowerCase() === '.png');

    console.log(`Found ${files.length} PNG files to process\n`);

    let processed = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const inputPath = join(INPUT_DIRECTORY, filename);
      const outputPath = join(OUTPUT_DIRECTORY, filename);

      try {
        console.log(`[${i + 1}/${files.length}] Processing: ${filename}`);
        await processImage(inputPath, outputPath);
        processed++;
      } catch (err) {
        console.error(`Failed to process ${filename}: ${err.message}`);
        failed++;
      }
    }

    console.log('\n✔ Processing complete!');
    console.log(`\t- Processed: ${processed} images`);
    console.log(`\t- Failed: ${failed} images`);
    console.log(`\t- Output directory: ${OUTPUT_DIRECTORY}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
