const THEME_STORAGE_KEY = "slack-client-theme";
const SLACK_ORIGIN = "https://app.slack.com";

// Runs inside the Slack page, so it must stay self-contained.
function toggleStoredTheme(storageKey) {
  const nextValue = localStorage.getItem(storageKey) === "dark" ? "light" : "dark";
  localStorage.setItem(storageKey, nextValue);
  return nextValue;
}

async function toggleTheme() {
  const tabs = await chrome.tabs.query({ url: `${SLACK_ORIGIN}/*` });
  if (tabs.length === 0) return;

  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    func: toggleStoredTheme,
    args: [THEME_STORAGE_KEY]
  });

  const nextValue = injection?.result;
  if (nextValue !== "dark" && nextValue !== "light") {
    throw new Error(`Failed to update ${THEME_STORAGE_KEY} in localStorage.`);
  }

  const themeIndicator = nextValue === "dark" ? "⬛" : "⬜";

  await Promise.all([
    chrome.action.setBadgeText({ text: themeIndicator }),
    chrome.action.setBadgeBackgroundColor({
      color: nextValue === "dark" ? "#202938" : "#A1A1AA"
    }),
    chrome.action.setTitle({ title: themeIndicator })
  ]);

  // Slack reads the theme from localStorage on load.
  await Promise.all(tabs.map((tab) => chrome.tabs.reload(tab.id)));
}

chrome.action.onClicked.addListener(() => {
  toggleTheme().catch(async (error) => {
    console.error("Error toggling Slack theme:", error);
    await Promise.allSettled([
      chrome.action.setBadgeText({ text: "ERR" }),
      chrome.action.setBadgeBackgroundColor({ color: "#B91C1C" }),
      chrome.action.setTitle({ title: `Error toggling theme: ${error.message}` })
    ]);
  });
});
