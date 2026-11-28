// Where uploaded files live.
//  - A private Backblaze B2 bucket when the B2_* variables are set (use this in production:
//    the disk of free hosts like Render is wiped on every restart/redeploy).
//  - The local Uploads/ and profile_upload/ folders otherwise (fine for local development).
//
// The database stores a path: "/Uploads/123.png" for local files, or "/media/Uploads/123.png"
// for B2. The bucket is private: middleware/presignMedia.js swaps each B2 path for a temporary
// signed URL in API responses, so the browser downloads straight from B2 and the keys never
// leave the server. B2 is reached through its S3-compatible API.
const fs = require('fs');
const os = require('os');
const path = require('path');
// routes load this file before index.js runs dotenv, so read the .env here too
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const FOLDERS = ['Uploads', 'profile_upload'];

const { B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET, B2_ENDPOINT } = process.env;
const MEDIA_PREFIX = '/media/';

const enabled = Boolean(B2_KEY_ID && B2_APPLICATION_KEY && B2_BUCKET && B2_ENDPOINT);
const endpoint = enabled ? B2_ENDPOINT.replace(/\/+$/, '') : '';
// "https://s3.us-west-004.backblazeb2.com" -> "us-west-004"
const region = enabled ? (endpoint.match(/s3\.([^.]+)\.backblazeb2\.com/) || [])[1] || 'us-west-004' : '';

let client;
let sdk; // aws sdk, loaded only when B2 is used
const getSdk = () => { sdk = sdk || require('@aws-sdk/client-s3'); return sdk; };
const getClient = () => {
  if (!client) {
    client = new (getSdk().S3Client)({
      region,
      endpoint,
      credentials: { accessKeyId: B2_KEY_ID, secretAccessKey: B2_APPLICATION_KEY },
      // B2 doesn't support the extra checksums newer SDK versions add by default
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return client;
};
const send = (Command, input) => getClient().send(new (getSdk()[Command])({ Bucket: B2_BUCKET, ...input }));

const localDir = (folder) => path.join(__dirname, '..', folder);

// Folder multer should write to. With B2 this is only a temporary spot.
const uploadDestination = (folder) => {
  const dir = enabled ? path.join(os.tmpdir(), 'tweetora-uploads') : localDir(folder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// Call after multer has written req.file. Returns the value to store in the database.
const saveUpload = async (file, folder) => {
  if (!enabled) return `/${folder}/${file.filename}`;
  const key = `${folder}/${file.filename}`;
  try {
    await send('PutObjectCommand', {
      Key: key,
      Body: await fs.promises.readFile(file.path),
      ContentType: file.mimetype || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    });
  } finally {
    fs.unlink(file.path, () => {}); // temp copy is no longer needed
  }
  return `${MEDIA_PREFIX}${key}`;
};

// B2 keeps old versions: a plain delete only hides the file and it still uses storage.
// So delete every version (and hide marker) of the key to really free the space.
const purgeKey = async (key) => {
  let found = false;
  let keyMarker;
  let versionMarker;
  do {
    const page = await send('ListObjectVersionsCommand', { Prefix: key, KeyMarker: keyMarker, VersionIdMarker: versionMarker });
    const items = [...(page.Versions || []), ...(page.DeleteMarkers || [])].filter((v) => v.Key === key);
    for (const v of items) {
      found = true;
      await send('DeleteObjectCommand', { Key: key, VersionId: v.VersionId });
    }
    keyMarker = page.IsTruncated ? page.NextKeyMarker : undefined;
    versionMarker = page.IsTruncated ? page.NextVersionIdMarker : undefined;
  } while (keyMarker);
  if (!found) await send('DeleteObjectCommand', { Key: key });
};

// Turns a stored database value into a bucket key, or null if it isn't one of ours.
const keyFor = (value) => {
  if (!enabled || !value.startsWith(MEDIA_PREFIX)) return null;
  const key = decodeURIComponent(value.slice(MEDIA_PREFIX.length).split('?')[0]);
  const okFolder = FOLDERS.some((f) => key.startsWith(`${f}/`));
  return okFolder && !key.includes('..') ? key : null;
};

// Deletes a stored file given the value saved in the database. Never throws.
const removeUpload = async (value) => {
  if (!value || typeof value !== 'string') return;
  try {
    const local = FOLDERS.find((f) => value.startsWith(`/${f}/`));
    if (local) {
      await fs.promises.unlink(path.join(localDir(local), path.basename(value))).catch(() => {});
      return;
    }
    const key = keyFor(value);
    if (key) await purgeKey(key);
  } catch (err) {
    console.error('Storage: could not delete', value, err.message);
  }
};

// Temporary signed download URL for a stored B2 path ("/media/Uploads/123.png"), or null if
// the value isn't a B2 path. The signing time is rounded down to the start of the day, so the
// same file gets the same URL all day (browsers can cache it) and every URL stays valid for
// at least 2 more days.
const DAY = 24 * 60 * 60 * 1000;
const urlCache = new Map();
const signedUrlFor = async (value) => {
  const key = keyFor(value);
  if (!key) return null;
  const day = Math.floor(Date.now() / DAY);
  const hit = urlCache.get(key);
  if (hit && hit.day === day) return hit.url;
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const url = await getSignedUrl(getClient(), new (getSdk().GetObjectCommand)({ Bucket: B2_BUCKET, Key: key }), {
    expiresIn: 3 * 24 * 60 * 60,
    signingDate: new Date(day * DAY),
  });
  if (urlCache.size > 5000) urlCache.clear();
  urlCache.set(key, { day, url });
  return url;
};

// Every stored file as { ref, label, size, modified, remove() }.
// `ref` is exactly what the database would contain if the file is in use.
const listUploads = async () => {
  const out = [];

  for (const folder of FOLDERS) {
    let names = [];
    try { names = await fs.promises.readdir(localDir(folder)); } catch { /* folder not created yet */ }
    for (const name of names) {
      if (name.startsWith('.')) continue; // .gitkeep etc.
      const file = path.join(localDir(folder), name);
      try {
        const stat = await fs.promises.stat(file);
        if (!stat.isFile()) continue;
        out.push({
          ref: `/${folder}/${name}`,
          label: `${folder}/${name}`,
          size: stat.size,
          modified: stat.mtimeMs,
          remove: () => fs.promises.unlink(file),
        });
      } catch (err) {
        console.error(`Storage: could not read ${folder}/${name}:`, err.message);
      }
    }
  }

  if (enabled) {
    for (const folder of FOLDERS) {
      let token;
      do {
        const page = await send('ListObjectsV2Command', { Prefix: `${folder}/`, ContinuationToken: token });
        for (const obj of page.Contents || []) {
          if (obj.Key.endsWith('/')) continue;
          out.push({
            ref: `${MEDIA_PREFIX}${obj.Key}`,
            label: `b2:${obj.Key}`,
            size: obj.Size || 0,
            modified: obj.LastModified ? new Date(obj.LastModified).getTime() : Date.now(),
            remove: () => purgeKey(obj.Key),
          });
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
    }
  }

  return out;
};

module.exports = { b2Enabled: enabled, uploadDestination, saveUpload, removeUpload, listUploads, signedUrlFor };
