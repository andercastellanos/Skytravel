const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'generate-testimonials.js'), 'utf8');
const apiUrl = 'https://api.github.com/repos/andercastellanos/Skytravel/issues';
const originalHtml = '<!-- GENERATED_TESTIMONIALS_START --><div class="testimonial-card" data-generated-testimonial data-testimonial-id="999">old content</div><!-- GENERATED_TESTIMONIALS_END -->';

function issue(number, verified = true) {
  return {
    number,
    title: 'Testimony from Traveler - Pilgrimage',
    body: 'A meaningful pilgrimage.',
    labels: [{ name: 'testimony' }, ...(verified ? [{ name: 'verified' }] : [])],
    created_at: '2026-10-07T12:00:00Z',
    html_url: 'https://github.com/andercastellanos/Skytravel/issues/' + number,
    user: { login: 'traveler' },
  };
}

function response(issues, link = '') {
  return new Response(JSON.stringify(issues), {
    headers: link ? { Link: link } : {},
  });
}

function harness(responses) {
  const requests = [];
  const writes = [];
  const publishedHtml = new Map();
  const fakeFs = {
    readFileSync: (filePath) => publishedHtml.get(filePath) || originalHtml,
    writeFileSync: (filePath, html) => {
      publishedHtml.set(filePath, html);
      writes.push({ filePath, html });
    },
  };
  const context = vm.createContext({
    module: { exports: {} },
    require: (name) => name === 'fs' ? fakeFs : require(name),
    __dirname,
    URL,
    URLSearchParams,
    process: { env: { GITHUB_TOKEN: 'test-token' } },
    console: { log() {} },
    fetch: async (url, options) => {
      requests.push({ url, options });
      assert.ok(responses.length, 'Unexpected extra request');
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    },
  });
  vm.runInContext(source, context, { filename: 'generate-testimonials.js' });
  return { ...context.module.exports, requests, writes };
}

function ids(testimonials) {
  return Array.from(testimonials, (testimonial) => testimonial.id);
}

test('generates both languages from every page, even when page one has no verified issues', async () => {
  const page2 = apiUrl + '?state=open&labels=testimony&sort=created&direction=desc&per_page=100&page=2';
  const page3 = page2.replace('page=2', 'page=3');
  const first = Array.from({ length: 100 }, (_, index) => issue(index + 1, false));
  const second = Array.from({ length: 100 }, (_, index) => issue(index + 101));
  second[49].pull_request = { url: 'https://api.github.com/pulls/150' };
  const third = Array.from({ length: 5 }, (_, index) => issue(index + 201));
  const app = harness([
    response(first, '<' + page3 + '>; rel="last", <' + page2 + '>; rel="next"'),
    response(second, '<' + apiUrl + '?page=1>; rel="prev", <' + page3 + '>; rel="next"'),
    response(third, '<' + page2 + '>; rel="prev"'),
  ]);
  await app.main();
  assert.equal(app.requests.length, 3);
  assert.equal(app.requests[1].url, page2);
  assert.equal(app.requests[2].url, page3);
  for (const request of app.requests) {
    const url = new URL(request.url);
    assert.equal(url.searchParams.get('per_page'), '100');
    assert.equal(url.searchParams.get('labels'), 'testimony');
    assert.equal(request.options.headers.Authorization, 'Bearer test-token');
  }
  assert.equal(app.writes.length, 2);
  assert.deepEqual(app.writes.map(({ filePath }) => path.basename(filePath)), ['testimonios.html', 'testimonials.html']);
  const expectedIds = Array.from({ length: 105 }, (_, index) => index + 101).filter((id) => id !== 150);
  for (const { html } of app.writes) {
    const generatedIds = Array.from(html.matchAll(/data-testimonial-id="(\d+)"/g), (match) => Number(match[1]));
    assert.deepEqual(generatedIds, expectedIds);
  }
});

test('finishes a single page without a Link header', async () => {
  const app = harness([response([issue(1), issue(2, false)])]);
  assert.deepEqual(ids(await app.fetchVerifiedIssues()), [1]);
  assert.equal(app.requests.length, 1);
});

test('finishes at exactly 100 issues when there is no next link', async () => {
  const app = harness([response(Array.from({ length: 100 }, (_, index) => issue(index + 1)))]);
  assert.equal((await app.fetchVerifiedIssues()).length, 100);
  assert.equal(app.requests.length, 1);
});

for (const [name, failure, message] of [
  ['HTTP error', new Response('Unavailable', { status: 503, statusText: 'Service Unavailable' }), /GitHub API error: 503/],
  ['network failure', new Error('Network unavailable'), /Network unavailable/],
  ['invalid response body', response({ message: 'Unexpected response' }), /invalid issues response/],
  ['malformed JSON', new Response('{invalid JSON'), /JSON/],
]) {
  test('preserves published HTML on an intermediate page ' + name, async () => {
    const app = harness([response([issue(1)], '<' + apiUrl + '?page=2>; rel="next"'), failure]);
    await assert.rejects(app.main(), message);
    assert.equal(app.requests.length, 2);
    assert.equal(app.writes.length, 0);
  });
}

function assertEmptyPages(writes) {
  assert.equal(writes.length, 2);
  assert.deepEqual(writes.map(({ filePath }) => path.basename(filePath)), ['testimonios.html', 'testimonials.html']);
  for (const { html } of writes) {
    assert.ok(!html.includes('old content'));
    assert.ok(!html.includes('data-generated-testimonial'));
    assert.ok(!html.includes('testimonial-card'));
    assert.ok(html.includes('<!-- GENERATED_TESTIMONIALS_START -->'));
    assert.ok(html.includes('<!-- GENERATED_TESTIMONIALS_END -->'));
    assert.ok(html.includes('class="testimonials-empty"'));
    assert.ok(!html.includes('class="testimonials-error"'));
    assert.ok(!html.includes('hidden'));
  }
  assert.ok(writes[0].html.includes('A\u00fan no hay testimonios publicados.'));
  assert.ok(writes[1].html.includes('No testimonials have been published yet.'));
}

test('withdraws the last published testimonial after a successful empty query', async () => {
  const app = harness([response([])]);
  await app.main();
  assert.equal(app.requests.length, 1);
  assertEmptyPages(app.writes);
});

test('withdraws published content when no issues remain verified across all pages', async () => {
  const app = harness([
    response([issue(1, false)], '<' + apiUrl + '?page=2>; rel="next"'),
    response([issue(2, false)]),
  ]);
  await app.main();
  assert.equal(app.requests.length, 2);
  assertEmptyPages(app.writes);
});

test('repeated empty generation is stable and a new verified testimonial replaces the empty message', async () => {
  const app = harness([response([]), response([]), response([issue(3)])]);
  await app.main();
  assertEmptyPages(app.writes);
  await app.main();
  assert.equal(app.writes.length, 2, 'An unchanged empty state should not be rewritten');
  await app.main();
  assert.equal(app.writes.length, 4);
  for (const { html } of app.writes.slice(2)) {
    assert.ok(html.includes('data-testimonial-id="3"'));
    assert.ok(!html.includes('testimonials-empty'));
    assert.ok(!html.includes('old content'));
  }
});
