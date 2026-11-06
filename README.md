# Slack Theme Toggle

Slack Theme Toggle is a lightweight Chromium extension (Manifest V3) that switches the Slack web client theme between `dark` and `light` with a single click on the extension icon, by updating the `slack-client-theme` key in the page's `localStorage`.

No popup window, DevTools, or preferences navigation is required. The extension directly reads and updates `localStorage` and reloads all open Slack tabs.

## Features

- Toggles the Slack theme between dark and light with a single click.
- Reads and writes the `slack-client-theme` key in `localStorage` via the `chrome.scripting` API.
- Sets `slack-client-theme=dark` if the key does not exist.
- Normalizes any value other than `dark` directly to `dark`.
- Targets open tabs on `https://app.slack.com/` from any focused tab.
- Reloads all open Slack tabs after the change so the new theme is applied.
- Updates action badge text and background color to indicate the active theme state.
- Manifest V3 compliant service worker with zero external runtime dependencies.
- No build step required.

## How it works

The extension consists of two primary runtime components:

1. `manifest.json`: Declares permissions, host permissions, action metadata, icons, and registers the service worker.
2. `background.js`: Service worker listening for toolbar icon clicks, injecting the toggle function into a Slack tab, setting the badge indicator, and reloading all open Slack tabs.

### Runtime behavior

When the extension icon is clicked:

1. Finds all open tabs on `https://app.slack.com/`. If none are open, nothing happens.
2. Injects a small function into one Slack tab with `chrome.scripting.executeScript` that reads `slack-client-theme` from `localStorage`.
3. Determines the next theme value:
   - If current value is `dark`, switches to `light`.
   - If current value is `light`, any other value, or unset, switches to `dark`.
4. Writes the new value back to `localStorage`.
5. Updates the toolbar action badge and tooltip title to display the current theme status (or `ERR` on failure).
6. Reloads all open Slack tabs so each client picks up the new theme.

## Project structure

```text
.
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── tests/
│   └── background.test.js
├── background.js
├── manifest.json
└── README.md
```

## File overview

### `manifest.json`

The Manifest V3 definition file.

It configures:

- Extension identity and metadata (name, version, description).
- Action toolbar icons in 16x16, 32x32, 48x48, and 128x128 dimensions.
- Background service worker registration (`background.js`).
- Minimal required permission: `scripting`.
- Host permissions restricted to `https://app.slack.com/*`.

### `background.js`

The background service worker running in response to action clicks.

Responsibilities:

- Listens to `chrome.action.onClicked`.
- Finds open tabs whose origin is `https://app.slack.com`.
- Injects a self-contained function that toggles `slack-client-theme` between `dark` and `light` in `localStorage`.
- Updates the extension badge text, badge background color, and tooltip title.
- Reloads all open Slack tabs via `chrome.tabs.reload`.
- Captures errors and displays an error badge (`ERR`) with red background if the update fails.

### `tests/background.test.js`

Automated test suite using Node.js built-in test runner.

Responsibilities:

- Simulates `chrome.scripting`, `chrome.tabs`, `chrome.action`, and `localStorage` in a sandbox context using `node:vm`.
- Verifies `dark -> light` and `light -> dark` toggling with a reload of all open Slack tabs.
- Verifies creation of a missing key as `dark`.
- Verifies no action is taken when no Slack tabs are open.
- Verifies injection failures propagate without reloading the tab.

## Installing in Google Chrome using Developer mode

1. Clone or download this repository:

```bash
git clone https://github.com/Chavao/slack-theme-toogle-extension.git
```

2. Open Google Chrome.
3. Navigate to:

```text
chrome://extensions
```

4. Enable **Developer mode** in the top-right corner.
5. Click **Load unpacked**.
6. Select the repository root folder (the directory containing `manifest.json`).
7. Click the Chrome extensions puzzle piece icon and pin **Slack Theme Toggle** to your toolbar.

## Installing in Brave using Developer mode

1. Clone or download this repository.
2. Open Brave.
3. Navigate to:

```text
brave://extensions
```

4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the repository root folder (the directory containing `manifest.json`).
7. Pin **Slack Theme Toggle** to your toolbar.

## Usage

Open Slack at `https://app.slack.com/` and click the extension icon in your browser toolbar:

- If current theme is `dark`, it switches to `light`.
- If current theme is `light`, it switches to `dark`.
- If no `slack-client-theme` key exists (or it holds another value), it switches to `dark`.

The badge updates to indicate the active theme state and all open Slack tabs reload automatically. You can click the icon from any tab.

## Development workflow

There is no build or compilation step. The extension runs directly from source files.

Typical workflow:

1. Edit `manifest.json` or `background.js`.
2. Navigate to `chrome://extensions` or `brave://extensions`.
3. Click the reload icon on the **Slack Theme Toggle** card.
4. Test the behavior on `https://app.slack.com/`.
5. Run automated tests to verify contract preservation.

## Testing

Automated tests require Node.js 20 or higher. Run tests with:

```bash
node --test tests/*.test.js
```

## Troubleshooting

### The extension does not appear after Load unpacked

Ensure you selected the root folder containing `manifest.json` directly, rather than an inner directory such as `icons` or `tests`.

### Nothing happens after clicking the icon

Ensure a tab at `https://app.slack.com/` is open. The extension only changes those tabs. The Slack desktop app and other Slack URLs (for example, `https://slack.com/` or `https://<workspace>.slack.com/`) are not supported.

### Incognito tabs do not change theme

Chrome disables extensions in incognito mode by default. To enable:

1. Go to `chrome://extensions` (or `brave://extensions`).
2. Click **Details** on **Slack Theme Toggle**.
3. Enable **Allow in Incognito**.

### The badge shows ERR

An error occurred while updating `localStorage`. Inspect the service worker console under `chrome://extensions` -> **Slack Theme Toggle** -> **Inspect views: service worker** to view error logs.

## Permissions and Privacy

The extension requests minimal permissions in `manifest.json`:

```json
{
  "permissions": ["scripting"],
  "host_permissions": ["https://app.slack.com/*"]
}
```

- `scripting`: Required to read and write `slack-client-theme` in the Slack page's `localStorage`.
- `https://app.slack.com/*`: Restricts script injection strictly to the Slack web client.
- Does not request the broad `tabs` permission (host permission provides access to matching tab URLs).
- No data is collected, tracked, or transmitted to any external server.

## Limitations

- Relies on Slack's `slack-client-theme` `localStorage` key. If Slack changes how it persists the theme, the extension may need updates.
- Does not change the theme stored in your Slack account preferences or in the Slack desktop app.
- Automated tests run against mock Chrome APIs.

## Icons

The icons are rendered from the official Slack logo mark ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Slack_icon_2019.svg)). Slack and the Slack logo are trademarks of Slack Technologies, LLC.

## License

This project is licensed under the MIT License.
