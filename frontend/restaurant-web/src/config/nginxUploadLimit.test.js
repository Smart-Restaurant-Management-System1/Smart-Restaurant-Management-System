import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Guards SR-213: the API accepts menu photos up to 5 MB, but nginx rejects request bodies over
// 1 MB (413) unless the upload route raises client_max_body_size.

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const API_MAX_BYTES = 5 * 1024 * 1024; // MenuItemsController.UploadImage limit
const UPLOAD_PATH = '/reservation-api/MenuItems/upload-image';

const toBytes = (value) => {
  const match = /^(\d+)([kKmMgG]?)$/.exec(value);
  assert.ok(match, `unparseable size: ${value}`);
  const unit = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[match[2].toLowerCase()];
  return Number(match[1]) * unit;
};

// Returns the body of the nginx block that starts with the given header, using brace matching.
const extractBlock = (conf, header) => {
  const start = conf.indexOf(header);
  if (start === -1) return null;
  const open = conf.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < conf.length; i += 1) {
    if (conf[i] === '{') depth += 1;
    if (conf[i] === '}') {
      depth -= 1;
      if (depth === 0) return conf.slice(open + 1, i);
    }
  }
  return null;
};

for (const file of ['nginx.azure.conf', 'nginx.conf']) {
  const conf = readFileSync(path.join(root, file), 'utf8');
  const uncommented = conf
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');

  test(`${file}: upload route has an exact-match location`, () => {
    assert.ok(
      extractBlock(uncommented, `location = ${UPLOAD_PATH}`),
      `missing "location = ${UPLOAD_PATH}"`,
    );
  });

  test(`${file}: upload limit covers the 5 MB API limit plus multipart overhead, but stays bounded`, () => {
    const block = extractBlock(uncommented, `location = ${UPLOAD_PATH}`);
    const match = /client_max_body_size\s+(\S+?);/.exec(block ?? '');
    assert.ok(match, 'client_max_body_size not set on the upload location');
    const bytes = toBytes(match[1]);
    assert.ok(bytes > API_MAX_BYTES, `limit ${match[1]} does not exceed the 5 MB API limit`);
    assert.ok(bytes <= 10 * 1024 * 1024, `limit ${match[1]} is larger than needed`);
  });

  test(`${file}: upload location proxies to the API upload route`, () => {
    const block = extractBlock(uncommented, `location = ${UPLOAD_PATH}`);
    assert.match(block, /proxy_pass\s+\S+\/api\/MenuItems\/upload-image;/);
  });

  test(`${file}: no other location or server-level body-size override`, () => {
    const occurrences = uncommented.match(/client_max_body_size/g) ?? [];
    assert.equal(occurrences.length, 1, 'client_max_body_size must appear only on the upload location');
  });
}
