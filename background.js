let popupWindowId = null;

async function openOrFocusPopup() {
  if (popupWindowId !== null) {
    try {
      await chrome.windows.update(popupWindowId, { focused: true });
      return;
    } catch (_) {
      popupWindowId = null;
    }
  }
  const win = await chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 900,
    height: 800
  });
  popupWindowId = win.id;
}

chrome.action.onClicked.addListener(() => {
  openOrFocusPopup().catch(() => {});
});

chrome.windows.onRemoved.addListener((id) => {
  if (id === popupWindowId) popupWindowId = null;
});

// Auto Boss diario: dispara la lista guardada todos los días a las 22:00,
// hora del reloj de la PC. chrome.alarms (no setTimeout) porque el service
// worker de MV3 se suspende y un setTimeout normal no sobreviviría hasta esa hora.
const DAILY_BOSS_ALARM = "baiakDailyBossStart";
const DAILY_BOSS_HOUR = 22;

function nextDailyBossTime() {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAILY_BOSS_HOUR, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime();
}

function scheduleDailyBossAlarm() {
  chrome.alarms.create(DAILY_BOSS_ALARM, { when: nextDailyBossTime(), periodInMinutes: 24 * 60 });
}

chrome.runtime.onInstalled.addListener(scheduleDailyBossAlarm);
chrome.runtime.onStartup.addListener(scheduleDailyBossAlarm);
scheduleDailyBossAlarm();

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== DAILY_BOSS_ALARM) return;
  (async () => {
    const st = await chrome.storage.local.get({ bossOwnQueue: [], dailyBossAutoStart: true });
    if (!st.dailyBossAutoStart) return;
    const queue = Array.isArray(st.bossOwnQueue) ? st.bossOwnQueue : [];
    if (!queue.length) return;
    const tabs = await chrome.tabs.query({ url: "https://baiakidle.com/*" });
    const tab = tabs.find(t => t.active) || tabs[0];
    if (!tab?.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "BAIAK_BOSS_START_OWN", queue });
    } catch (_) {}
  })();
});
