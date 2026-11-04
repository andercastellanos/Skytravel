const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'generate-testimonials.js'), 'utf8');
// Read the generator's actual configuration without running main or changing its exports.
const tripPages = vm.runInNewContext(`${source}\nTRIP_PAGES;`, {
  require,
  module: { exports: {} },
  __dirname,
});
const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/generate-testimonials.yml'), 'utf8');

for (const [command, pattern] of [
  ['git diff --quiet', /\bgit diff --quiet -- ([^;\n]+)/g],
  ['git add -u', /\bgit add -u -- ([^\n]+)/g],
]) {
  test(`${command} covers every TRIP_PAGES folder`, () => {
    const matches = Array.from(workflow.matchAll(pattern));
    assert.equal(matches.length, 1, `Expected one ${command} path list in the workflow`);
    const folders = matches[0][1].trim().split(/\s+/).map((folder) => folder.replace(/\/$/, ''));
    assert.ok(tripPages.length > 0, 'TRIP_PAGES must not be empty');
    for (const page of tripPages) {
      const folder = path.posix.dirname(page.file);
      assert.ok(
        folders.some((covered) => folder === covered || folder.startsWith(`${covered}/`)),
        `${command} does not cover ${page.file}; add ${folder}/ to its workflow paths`,
      );
    }
  });
}
