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

function harness(responses, environment = {}, issuesFile = "[]") {
  const requests = [];
  const writes = [];
  const publishedHtml = new Map();
  const originalTripHtml = '<main><!-- GENERATED_TRIP_TESTIMONIALS_START --><section class="trip-testimonials">old trip content</section><!-- GENERATED_TRIP_TESTIMONIALS_END --></main>';
  const fakeFs = {
    existsSync: () => true,
    readFileSync: (filePath) => filePath === 'issues.json' ? issuesFile
      : publishedHtml.get(filePath) || (filePath.includes('peregrinaciones-') ? originalTripHtml : originalHtml),
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
    process: { env: { GITHUB_TOKEN: 'test-token', ...environment } },
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
  assert.equal(app.writes.length, 12);
  assert.deepEqual(app.writes.slice(0, 2).map(({ filePath }) => path.basename(filePath)), ['testimonios.html', 'testimonials.html']);
  const expectedIds = Array.from({ length: 105 }, (_, index) => index + 101).filter((id) => id !== 150);
  for (const { html } of app.writes.slice(0, 2)) {
    const generatedIds = Array.from(html.matchAll(/data-testimonial-id="(\d+)"/g), (match) => Number(match[1]));
    assert.deepEqual(generatedIds, expectedIds);
    assert.ok(html.includes('class="testimonial-group"'));
    assert.ok(html.includes('id="testimonio-205"'));
  }
});

test('finishes a single page without a Link header', async () => {
  const app = harness([response([issue(1), issue(2, false)])]);
  assert.deepEqual(ids(await app.fetchVerifiedTestimonials()), [1]);
  assert.equal(app.requests.length, 1);
});

test('finishes at exactly 100 issues when there is no next link', async () => {
  const app = harness([response(Array.from({ length: 100 }, (_, index) => issue(index + 1)))]);
  assert.equal((await app.fetchVerifiedTestimonials()).length, 100);
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
  assert.equal(writes.length, 12);
  for (const { html } of writes.slice(2)) {
    assert.ok(!html.includes('old trip content'));
    assert.ok(!html.includes('class="trip-testimonials"'));
    assert.ok(html.includes('<!-- GENERATED_TRIP_TESTIMONIALS_START -->'));
    assert.ok(html.includes('<!-- GENERATED_TRIP_TESTIMONIALS_END -->'));
  }
  writes = writes.slice(0, 2);
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
  assert.equal(app.writes.length, 12, 'An unchanged empty state should not be rewritten');
  await app.main();
  assert.equal(app.writes.length, 14);
  for (const { html } of app.writes.slice(12)) {
    assert.ok(html.includes('data-testimonial-id="3"'));
    assert.ok(!html.includes('testimonials-empty'));
    assert.ok(!html.includes('old content'));
  }
});


test('preserves destination groups, trip selection, limits and links to full testimonials', async () => {
  function forTrip(number, trip) {
    return { ...issue(number), body: '---\nname: Traveler ' + number + '\ntrip: ' + trip + '\n---\nA meaningful pilgrimage.' };
  }
  const issues = [
    ...Array.from({ length: 8 }, (_, index) => forTrip(index + 1, 'Medjugorje')),
    forTrip(20, 'Italy'),
    forTrip(21, 'Lourdes'),
  ];
  const app = harness([response(issues)]);
  await app.main();
  assert.equal(app.writes.length, 12);
  for (const { html } of app.writes.slice(0, 2)) {
    for (const group of ['medjugorje', 'mariana', 'italia']) {
      assert.ok(html.includes('id="grupo-' + group + '"'));
    }
    assert.equal((html.match(/data-generated-testimonial/g) || []).length, 10);
  }
  for (const { filePath, html } of app.writes.slice(2)) {
    assert.ok(!html.includes('old trip content'));
    const linkedIds = Array.from(html.matchAll(/#testimonio-(\d+)/g), (match) => Number(match[1]));
    let expected;
    if (filePath.includes('peregrinacion-medjugorje-roma')) expected = [1, 2, 3, 4];
    else if (filePath.includes('Medjugorje')) expected = [1, 2, 3, 4, 5, 6];
    else if (filePath.includes('Italy')) expected = [20];
    else expected = [21];
    assert.deepEqual(linkedIds, expected);
    const listHtml = filePath.endsWith('-es.html') ? app.writes[0].html : app.writes[1].html;
    for (const id of linkedIds) assert.ok(listHtml.includes('id="testimonio-' + id + '"'));
  }
});

test('removes stale trip testimonials when the remaining verified issue matches no trip', async () => {
  const app = harness([response([issue(1)])]);
  await app.main();
  for (const { html } of app.writes.slice(2)) {
    assert.ok(!html.includes('old trip content'));
    assert.ok(!html.includes('class="trip-testimonials"'));
  }
});

test('local issue files are filtered and sorted once, without network requests', async () => {
  const open = { ...issue(1), state: 'open' };
  const newer = { ...issue(2), created_at: '2026-10-08T12:00:00Z' };
  const closed = { ...issue(3), state: 'closed' };
  const pull = { ...issue(4), pull_request: {} };
  const app = harness([], { ISSUES_FILE: 'issues.json' }, JSON.stringify([open, closed, pull, issue(5, false), newer]));
  assert.deepEqual(ids(await app.fetchVerifiedTestimonials()), [2, 1]);
  assert.equal(app.requests.length, 0);
});

test('an empty local issue file clears all published testimonials', async () => {
  const app = harness([], { ISSUES_FILE: 'issues.json' }, '[]');
  await app.main();
  assertEmptyPages(app.writes);
  assert.equal(app.requests.length, 0);
});

test('an invalid local issue file preserves published HTML', async () => {
  const app = harness([], { ISSUES_FILE: 'issues.json' }, '{}');
  await assert.rejects(app.main(), /Invalid issues file/);
  assert.equal(app.requests.length, 0);
  assert.equal(app.writes.length, 0);
});
