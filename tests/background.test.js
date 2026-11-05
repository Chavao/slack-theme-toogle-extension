const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../background.js"), "utf8");

function createLocalStorage(initial) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value))
  };
}

function setup(initialStorage = {}, executeScriptOverride) {
  const localStorage = createLocalStorage(initialStorage);
  const injections = [];
  const reloaded = [];
  const badges = [];
  const titles = [];

  const chrome = {
    scripting: {
      executeScript: executeScriptOverride ?? (async (details) => {
        injections.push(details);
        return [{ frameId: 0, result: details.func(...details.args) }];
      })
    },
    tabs: { reload: async (id) => reloaded.push(id) },
    action: {
      onClicked: { addListener: () => {} },
      setBadgeText: async (details) => badges.push(details.text),
      setBadgeBackgroundColor: async () => {},
      setTitle: async (details) => titles.push(details.title)
    }
  };
  const context = { chrome, URL, console, localStorage };
  vm.runInNewContext(`${source}\nglobalThis.__toggleTheme = toggleTheme;`, context);
  return { toggle: context.__toggleTheme, storage: localStorage.store, injections, reloaded, badges, titles };
}

const KEY = "slack-client-theme";
const tab = { id: 42, url: "https://app.slack.com/client/T000/C000" };

test("dark -> light, targeting the clicked tab and reloading it", async () => {
  const harness = setup({ [KEY]: "dark" });
  await harness.toggle(tab);
  assert.equal(harness.storage.get(KEY), "light");
  assert.equal(harness.injections.length, 1);
  assert.equal(harness.injections[0].target.tabId, 42);
  assert.deepEqual([...harness.injections[0].args], [KEY]);
  assert.deepEqual(harness.reloaded, [42]);
  assert.deepEqual(harness.badges, ["⬜"]);
  assert.deepEqual(harness.titles, ["⬜"]);
});

test("light -> dark and reloads the Slack tab", async () => {
  const harness = setup({ [KEY]: "light" });
  await harness.toggle(tab);
  assert.equal(harness.storage.get(KEY), "dark");
  assert.deepEqual(harness.reloaded, [42]);
  assert.deepEqual(harness.badges, ["⬛"]);
  assert.deepEqual(harness.titles, ["⬛"]);
});

test("missing key is created as dark", async () => {
  const harness = setup();
  await harness.toggle(tab);
  assert.equal(harness.storage.get(KEY), "dark");
});

test("tabs outside app.slack.com are ignored", async () => {
  for (const url of [
    "https://example.com/",
    "https://slack.com/",
    "https://evil.app.slack.com/",
    "http://app.slack.com/",
    undefined
  ]) {
    const harness = setup({ [KEY]: "dark" });
    await harness.toggle({ id: 42, url });
    assert.equal(harness.storage.get(KEY), "dark");
    assert.equal(harness.injections.length, 0);
    assert.deepEqual(harness.reloaded, []);
    assert.deepEqual(harness.badges, []);
  }
});

test("missing injection result raises and does not reload", async () => {
  const harness = setup({ [KEY]: "dark" }, async () => [{ frameId: 0, result: null }]);
  await assert.rejects(harness.toggle(tab), /Failed to update slack-client-theme/);
  assert.deepEqual(harness.reloaded, []);
  assert.deepEqual(harness.badges, []);
});

test("injection errors propagate and do not reload", async () => {
  const harness = setup({ [KEY]: "dark" }, async () => {
    throw new Error("Cannot access contents of the page.");
  });
  await assert.rejects(harness.toggle(tab), /Cannot access contents/);
  assert.deepEqual(harness.reloaded, []);
});
