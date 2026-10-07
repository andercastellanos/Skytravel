const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../testimony/js/testimonials.js'), 'utf8');

function classList() {
  const classes = new Set();
  return {
    add: (name) => classes.add(name),
    remove: (name) => classes.delete(name),
    contains: (name) => classes.has(name),
    toggle(name, force) {
      const enabled = force === undefined ? !classes.has(name) : force;
      if (enabled) classes.add(name); else classes.delete(name);
      return enabled;
    },
  };
}

function harness(language, total = 10, fullHeight = 200) {
  const cards = Array.from({ length: total }, () => ({ classList: classList() }));
  let buttonsCreated = 0;
  const bodies = cards.map((card) => ({
    classList: classList(),
    nextElementSibling: null,
    getClientRects: () => card.classList.contains('hidden') ? [] : [{}],
    get scrollHeight() { return fullHeight; },
    get clientHeight() { return this.classList.contains('is-expanded') ? fullHeight : 100; },
    insertAdjacentElement(position, button) {
      assert.equal(position, 'afterend');
      this.nextElementSibling = button;
    },
  }));
  const context = vm.createContext({
    module: { exports: {} },
    console: { log() {} },
    document: {
      addEventListener() {},
      createElement(tag) {
        assert.equal(tag, 'button');
        buttonsCreated++;
        const attributes = {};
        const listeners = [];
        return {
          classList: { contains: (name) => name === 'read-more-btn' },
          addEventListener(event, listener) {
            assert.equal(event, 'click');
            listeners.push(listener);
          },
          setAttribute: (name, value) => { attributes[name] = value; },
          getAttribute: (name) => attributes[name],
          click: () => listeners.forEach((listener) => listener()),
          get listenerCount() { return listeners.length; },
        };
      },
    },
    requestAnimationFrame: (callback) => callback(),
  });
  vm.runInContext(source, context);
  const app = Object.create(context.module.exports.prototype);
  app.config = { testimonialsPerPage: 9 };
  app.state = { language, allTestimonials: cards, currentPage: 1, loading: false };
  app.elements = {
    container: { querySelectorAll: () => bodies },
  };
  return { app, bodies, get buttonsCreated() { return buttonsCreated; } };
}

for (const [language, more, less] of [
  ['es', 'Leer m\u00e1s', 'Leer menos'],
  ['en', 'Read more', 'Read less'],
]) {
  test(language + ': loading more preserves the open card, label and accessibility state', () => {
    const fixture = harness(language);
    const { app, bodies } = fixture;
    app.displayTestimonials();
    const button = bodies[0].nextElementSibling;
    assert.equal(button.textContent, more);
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(fixture.buttonsCreated, 9);
    assert.equal(bodies[9].nextElementSibling, null);

    button.click();
    assert.ok(bodies[0].classList.contains('is-expanded'));
    assert.equal(button.textContent, less);
    assert.equal(button.getAttribute('aria-expanded'), 'true');

    app.loadMoreTestimonials();
    assert.ok(bodies[0].classList.contains('is-expanded'));
    assert.equal(bodies[0].nextElementSibling, button);
    assert.equal(button.textContent, less);
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.equal(fixture.buttonsCreated, 10);
    assert.equal(bodies[9].nextElementSibling.textContent, more);

    app.displayTestimonials();
    assert.equal(fixture.buttonsCreated, 10);
    assert.equal(button.listenerCount, 1);
    button.click();
    assert.ok(!bodies[0].classList.contains('is-expanded'));
    assert.equal(button.textContent, more);
    assert.equal(button.getAttribute('aria-expanded'), 'false');
  });
}

test('an already expanded body receives an expanded button on first preparation', () => {
  const { app, bodies } = harness('en', 1);
  bodies[0].classList.add('is-expanded');
  app.attachReadMoreToggles(app.elements.container);
  assert.ok(bodies[0].classList.contains('is-expanded'));
  assert.equal(bodies[0].nextElementSibling.textContent, 'Read less');
  assert.equal(bodies[0].nextElementSibling.getAttribute('aria-expanded'), 'true');
});

test('short testimonials do not acquire a read-more button', () => {
  const fixture = harness('en', 1, 100);
  fixture.app.displayTestimonials();
  assert.equal(fixture.buttonsCreated, 0);
  assert.ok(!fixture.bodies[0].classList.contains('is-expanded'));
});

test('hidden cards keep their open state until made visible again', () => {
  const { app, bodies } = harness('en');
  app.displayTestimonials();
  app.loadMoreTestimonials();
  const button = bodies[9].nextElementSibling;
  button.click();
  app.state.currentPage = 1;
  app.displayTestimonials();
  assert.ok(bodies[9].classList.contains('is-expanded'));
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  app.loadMoreTestimonials();
  assert.ok(bodies[9].classList.contains('is-expanded'));
  assert.equal(button.textContent, 'Read less');
});
