import fs from 'fs';
import { join, dirname, extname, relative, sep } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPOSITORY_ROOT = join(__dirname, '..');
const EXPANSIONS_DIRECTORY = join(REPOSITORY_ROOT, 'materials', 'card_engine', 'expansions');
const ENV_FILE = join(REPOSITORY_ROOT, '.env');

const REQUIRED_VARIABLES = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
];

const UPLOAD_CONCURRENCY = 8;
const DELETE_BATCH_SIZE = 1000;

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.vtf': 'application/octet-stream',
};

const dryRun = process.argv.includes('--dry-run');

if (fs.existsSync(ENV_FILE)) {
  // Variables that are already set in the shell take precedence over the .env file
  process.loadEnvFile(ENV_FILE);
}

const missing = REQUIRED_VARIABLES.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env in the repository root and fill in the values.');
  process.exit(1);
}

const bucket = process.env.R2_BUCKET_NAME;

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  // R2 does not support the additional checksums newer SDK versions send by default
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

function listLocalFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listLocalFiles(path) : [path];
  });
}

async function listRemoteObjects(prefix) {
  const objects = new Map();
  let continuationToken;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    for (const object of response.Contents ?? []) {
      objects.set(object.Key, { size: object.Size, etag: object.ETag?.replace(/"/g, '') });
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

async function runConcurrently(items, limit, task) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      await task(queue.shift());
    }
  });

  await Promise.all(workers);
}

// Mirrors the "Detect expansion folder" step of .github/workflows/sync-to-r2.yml
const expansionNames = fs.existsSync(EXPANSIONS_DIRECTORY)
  ? fs.readdirSync(EXPANSIONS_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  : [];

if (expansionNames.length === 0) {
  console.error(`No expansion folder found in ${EXPANSIONS_DIRECTORY}`);
  process.exit(1);
}

const expansionName = expansionNames[0];
const expansionDirectory = join(EXPANSIONS_DIRECTORY, expansionName);
const prefix = `card_engine/expansions/${expansionName}/`;

console.log(`Expansion: ${expansionName}`);
console.log(`Syncing ${expansionDirectory} -> ${bucket}/${prefix}${dryRun ? ' (dry run)' : ''}`);

const remoteObjects = await listRemoteObjects(prefix);
const localKeys = new Set();
const toUpload = [];

for (const path of listLocalFiles(expansionDirectory)) {
  const key = prefix + relative(expansionDirectory, path).split(sep).join('/');
  const body = fs.readFileSync(path);
  const remote = remoteObjects.get(key);
  localKeys.add(key);

  // For non-multipart uploads the ETag is the MD5 of the content
  const unchanged = remote
    && remote.size === body.length
    && remote.etag === createHash('md5').update(body).digest('hex');

  if (!unchanged) {
    toUpload.push({ key, body, path, isNew: !remote });
  }
}

const toDelete = [...remoteObjects.keys()].filter((key) => !localKeys.has(key));

await runConcurrently(toUpload, UPLOAD_CONCURRENCY, async ({ key, body, isNew }) => {
  console.log(`${dryRun ? 'Would upload' : 'Uploading'} (${isNew ? 'new' : 'changed'}): ${key}`);

  if (dryRun) {
    return;
  }

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: CONTENT_TYPES[extname(key).toLowerCase()] ?? 'application/octet-stream',
  }));
});

for (let i = 0; i < toDelete.length; i += DELETE_BATCH_SIZE) {
  const batch = toDelete.slice(i, i + DELETE_BATCH_SIZE);

  for (const key of batch) {
    console.log(`${dryRun ? 'Would delete' : 'Deleting'}: ${key}`);
  }

  if (!dryRun) {
    await client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: batch.map((key) => ({ Key: key })), Quiet: true },
    }));
  }
}

const unchangedCount = localKeys.size - toUpload.length;
console.log(`Done: ${toUpload.length} uploaded, ${toDelete.length} deleted, ${unchangedCount} unchanged${dryRun ? ' (dry run, nothing was changed)' : ''}`);
