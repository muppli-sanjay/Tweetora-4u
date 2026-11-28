// With a private Backblaze B2 bucket the database stores paths like "/media/Uploads/123.png".
// This middleware replaces every such path in a JSON response with a temporary signed URL
// (https://...backblazeb2.com/...?X-Amz-Signature=...), so the React app can use it as is.
// It does nothing when B2 isn't configured. Keys and signing stay on the server.
const { b2Enabled, signedUrlFor } = require('../utils/storage');

const isB2Path = (v) => typeof v === 'string' && v.startsWith('/media/');

const collect = (node, found) => {
  if (!node || typeof node !== 'object') return;
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (isB2Path(v)) found.push([node, k]);
    else if (v && typeof v === 'object') collect(v, found);
  }
};

module.exports = (req, res, next) => {
  if (!b2Enabled) return next();
  const original = res.json.bind(res);
  res.json = (body) => {
    if (!body || typeof body !== 'object') return original(body);
    let plain;
    try {
      plain = JSON.parse(JSON.stringify(body)); // mongoose documents -> plain objects
    } catch {
      return original(body);
    }
    const found = [];
    collect(plain, found);
    if (!found.length) return original(plain);
    Promise.all(found.map(async ([node, k]) => {
      const url = await signedUrlFor(node[k]);
      if (url) node[k] = url;
    }))
      .catch((err) => console.error('Presign: could not sign a media URL:', err.message))
      .finally(() => original(plain));
    return res;
  };
  next();
};
