// Finds (and optionally deletes) uploaded files that no post or profile uses.
// Used by the automatic sweeper in index.js and by `npm run cleanup`.
const fs = require('fs');
const path = require('path');
const Post = require('../models/Post');
const User = require('../models/User');

const MIN_AGE_MS = 10 * 60 * 1000; // never touch files uploaded in the last 10 minutes

const FOLDERS = [
  { dir: 'Uploads', prefix: '/Uploads/' },
  { dir: 'profile_upload', prefix: '/profile_upload/' },
];

const sweepFolder = async ({ dir, prefix }, used, dryRun) => {
  const folder = path.join(__dirname, '..', dir);
  const result = { files: [], bytes: 0 };
  let names;
  try {
    names = await fs.promises.readdir(folder);
  } catch {
    return result; // folder doesn't exist yet
  }
  for (const name of names) {
    if (name.startsWith('.')) continue; // .gitkeep etc.
    const file = path.join(folder, name);
    try {
      const stat = await fs.promises.stat(file);
      if (!stat.isFile() || Date.now() - stat.mtimeMs < MIN_AGE_MS) continue;
      if (used.has(`${prefix}${name}`)) continue;
      if (!dryRun) await fs.promises.unlink(file);
      result.files.push(`${dir}/${name}`);
      result.bytes += stat.size;
    } catch (err) {
      console.error(`Cleanup: could not process ${dir}/${name}:`, err.message);
    }
  }
  return result;
};

// Returns { files: [...relative paths], bytes }. Throws if the database can't be read,
// so nothing is ever deleted based on an incomplete list of used files.
const cleanupUploads = async ({ dryRun = false } = {}) => {
  const used = new Set([
    ...(await Post.distinct('image')),
    ...(await User.distinct('profilePicture')),
  ].filter(Boolean));

  const total = { files: [], bytes: 0 };
  for (const folder of FOLDERS) {
    const r = await sweepFolder(folder, used, dryRun);
    total.files.push(...r.files);
    total.bytes += r.bytes;
  }
  return total;
};

// Runs a sweep now and then every `intervalHours`. Safe to call once at startup.
const startAutoCleanup = ({ intervalHours = 24 } = {}) => {
  const run = async () => {
    try {
      const { files, bytes } = await cleanupUploads();
      if (files.length) {
        console.log(`Auto-cleanup: removed ${files.length} unused file(s), ${(bytes / 1048576).toFixed(2)} MB`);
      }
    } catch (err) {
      console.error('Auto-cleanup skipped:', err.message);
    }
  };
  setTimeout(run, 60 * 1000); // shortly after startup, once the DB is connected
  const timer = setInterval(run, intervalHours * 60 * 60 * 1000);
  timer.unref();
};

module.exports = { cleanupUploads, startAutoCleanup };
