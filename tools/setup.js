import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function toSnakeCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toPascalCase(str) {
  return str
    .replace(/[^a-z0-9]+/gi, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);

    // Skip node_modules, .git, and tools directories
    if (file === 'node_modules' || file === '.git' || file === 'tools') {
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function replaceInFile(filePath, replacements) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    Object.entries(replacements).forEach(([placeholder, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g');
      if (content.includes(`{{ ${placeholder} }}`)) {
        modified = true;
      }
      content = content.replace(regex, value);
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated content in: ${filePath}`);
    }
  } catch (error) {
    // Skip binary files or files that can't be read as text
    if (error.code !== 'ENOENT') {
      console.log(`  Skipped (likely binary): ${filePath}`);
    }
  }
}

function removeSectionFromReadme(rootDir, marker) {
  const readmePath = path.join(rootDir, 'README.md');

  if (!fs.existsSync(readmePath)) {
    console.log(`  No README.md found, skipping ${marker} section removal`);
    return;
  }

  try {
    let content = fs.readFileSync(readmePath, 'utf8');

    const sectionRegex = new RegExp(`<!-- ${marker} START -->[\\s\\S]*?<!-- ${marker} END -->\\n*`);
    const newContent = content.replace(sectionRegex, '');

    if (content !== newContent) {
      fs.writeFileSync(readmePath, newContent, 'utf8');
      console.log(`✓ Removed ${marker} section from README.md`);
    }
  } catch (error) {
    console.error('  Could not update README.md:', error.message);
  }
}

function removeSetupWarningFromReadme(rootDir) {
  removeSectionFromReadme(rootDir, 'SETUP');
}

function removeDistributionFromReadme(rootDir) {
  removeSectionFromReadme(rootDir, 'DISTRIBUTION');
}

function renamePaths(dirPath, replacements) {
  const items = fs.readdirSync(dirPath);

  // Process files and directories
  items.forEach((item) => {
    if (item === 'node_modules' || item === '.git' || item === 'setup.js') {
      return;
    }

    const oldPath = path.join(dirPath, item);
    let newName = item;

    // Replace placeholders in the name
    Object.entries(replacements).forEach(([placeholder, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g');
      newName = newName.replace(regex, value);
    });

    const newPath = path.join(dirPath, newName);

    // Rename if necessary
    if (oldPath !== newPath) {
      fs.renameSync(oldPath, newPath);
      console.log(`✓ Renamed: ${oldPath} → ${newPath}`);
    }

    // Recursively process directories
    if (fs.statSync(newPath).isDirectory()) {
      renamePaths(newPath, replacements);
    }
  });
}

async function main() {
  console.log('🚀 Expansion Setup\n');

  // Get the root directory (one level up from tools/)
  const rootDir = path.join(__dirname, '..');

  const replacements = {};

  // Prompt for expansion name
  const expansionName = await question('Enter the expansion name (e.g., "Nice Expansion Name"): ');

  if (!expansionName.trim()) {
    console.error('❌ Expansion name is required!');
    rl.close();
    process.exit(1);
  }

  replacements['EXPANSION_NAME'] = expansionName.trim();

  // Ask if MIT License is desired, if so ask for author name, otherwise remove license file
  const wantsLicense = (await question('Do you want to include an MIT License file? (Y/n): ')).trim().toLowerCase();
  let licenseSetup = false;

  if (wantsLicense === 'y' || wantsLicense === '') {
    const authorName = await question('Enter the author name for the license: ');
    const currentYear = new Date().getFullYear();

    replacements['EXPANSION_AUTHOR'] = authorName.trim() || 'Unknown Author';
    replacements['EXPANSION_CURRENT_YEAR'] = currentYear.toString();

    licenseSetup = true;
  }

  // Prompt for remote download URL (optional)
  let remoteUrl = (await question('Enter the remote download URL (press Enter to skip): ')).trim();

  // Ensure it is either empty or a valid URL
  if (remoteUrl && !/^https?:\/\/.+/.test(remoteUrl)) {
    console.error('❌ Invalid URL format!');
    rl.close();
    process.exit(1);
  }

  if (remoteUrl.endsWith('/')) {
    remoteUrl = remoteUrl.slice(0, -1);
  }

  let isRemoteUrlR2 = false;

  // Ask the user to confirm if the URL is an R2 URL
  if (remoteUrl) {
    const isR2Answer = (await question('Is this URL a Cloudflare R2 URL? (y/N): ')).trim().toLowerCase();

    isRemoteUrlR2 = (isR2Answer === 'y');
  }

  rl.close();

  // Generate derived values
  const expansionId = `ce_expansion_${toSnakeCase(expansionName)}`;
  const expansionIdPascalCase = toPascalCase(expansionName);
  const remoteDownloadUrlLine = remoteUrl
    ? `\t\t\tRemoteDownloadURL = "${remoteUrl}",\n`
    : '';

  replacements['EXPANSION_ID'] = expansionId;
  replacements['EXPANSION_ID_PASCAL_CASE'] = expansionIdPascalCase;
  replacements['EXPANSION_REMOTE_URL'] = remoteUrl;
  replacements['EXPANSION_REMOTE_DOWNLOAD_URL_LINE'] = remoteDownloadUrlLine;

  console.log('\n📝 Generated values:');
  console.log(`   EXPANSION_NAME: ${expansionName}`);
  console.log(`   EXPANSION_ID: ${expansionId}`);
  console.log(`   EXPANSION_ID_PASCAL_CASE: ${expansionIdPascalCase}`);
  console.log(`   EXPANSION_REMOTE_DOWNLOAD_URL_LINE: ${remoteDownloadUrlLine || '(empty)'}`);

  if (licenseSetup) {
    console.log(`   EXPANSION_AUTHOR: ${replacements['EXPANSION_AUTHOR']}`);
    console.log(`   EXPANSION_CURRENT_YEAR: ${replacements['EXPANSION_CURRENT_YEAR']}`);
  }

  console.log('\n🔄 Processing files...\n');

  // Replace in file contents (starting from root)
  const files = getAllFiles(rootDir);
  files.forEach((file) => {
    replaceInFile(file, replacements);
  });

  console.log('\n🔄 Renaming files and folders...\n');

  // Rename files and folders (process from root directory)
  renamePaths(rootDir, replacements);

  console.log('\n🔄 Cleaning up...\n');

  removeSetupWarningFromReadme(rootDir);

  if (!licenseSetup) {
    const licensePath = path.join(rootDir, 'LICENSE');

    if (fs.existsSync(licensePath)) {
      fs.unlinkSync(licensePath);
      console.log('✓ Removed LICENSE file as per user request');
    }
  }

  if (!isRemoteUrlR2) {
    const workflowPath = path.join(rootDir, '.github', 'workflows', 'sync-to-r2.yml');

    if (fs.existsSync(workflowPath)) {
      fs.unlinkSync(workflowPath);
      console.log('✓ Removed sync-to-r2.yml workflow since no remote URL was provided');
    }

    removeDistributionFromReadme(rootDir);
  }

  console.log('\n✅ Setup complete!');
  console.log('💡 The setup warning has been removed from README.md');
  console.log('💡 You can now delete the tools/setup.js file if you want.');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});
