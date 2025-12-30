import { createHash } from 'crypto';

export function makeFileNameSafe(filename) {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

export function makeHashFilename(url) {
  return createHash('md5')
    .update(url)
    .digest('hex')
    .substring(0, 8);
}
