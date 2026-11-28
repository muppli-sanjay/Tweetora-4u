// Finds (and optionally deletes) uploaded files that no post or profile uses.
// Works on local folders and on Cloudflare R2 (see utils/storage.js).
// Used by the automatic sweeper in index.js and by `npm run cleanup`.
const Post = require('../models/Post');
const User = require('../models/User');
const { listUploads } = require('./storage');

const MIN_AGE_MS = 10 * 60 * 1000; // never touch files uploaded in the last 10 minutes

// Returns { files: [...labels], bytes }. Throws if the database or storage can't be read,
// so nothing is ever deleted based on an incomplete list.
const cleanupUploads = async ({ dryRun = false } = {}) => {
  const used = new Set([
    ...(await Post.distinct('image')),
    ...(await User.distinct('profilePicture')),
  ].filter(Boolean));

  const all = await listUploads();
  const total = { files: [], bytes: 0 };
  for (const f of all) {
    if (Date.now() - f.modified < MIN_AGE_MS) continue;
    if (used.has(f.ref)) continue;
    try {
      if (!dryRun) await f.remove();
      total.files.push(f.label);
      total.bytes += f.size;
    } catch (err) {
      console.error(`Cleanup: could not delete ${f.label}:`, err.message);
    }
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
