// Manual cleanup of uploaded files that no post or profile uses any more.
// (The server also does this automatically every day.)
//   npm run cleanup              -> only lists what would be deleted
//   npm run cleanup -- --delete  -> actually deletes the files
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { cleanupUploads } = require('../utils/uploadCleanup');

const doDelete = process.argv.includes('--delete');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tweetora-4u');
  const { files, bytes } = await cleanupUploads({ dryRun: !doDelete });
  files.forEach((f) => console.log(`${doDelete ? 'deleted' : 'unused'}: ${f}`));
  console.log(`${doDelete ? 'Deleted' : 'Found'} ${files.length} unused file(s), ${(bytes / 1048576).toFixed(2)} MB`);
  if (!doDelete && files.length) console.log('Run "npm run cleanup -- --delete" to remove them.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
