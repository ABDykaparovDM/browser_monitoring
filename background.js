let currentTabId = null; // id вкладки
let currentDomain = null; // главный адрес страницы
let lastTimestamp = null; // начальная точка времени
let windowFocused = true; // проверка фокуса на окне браузера

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function startTracking(tab) {
  const domain = getDomain(tab.url);
  if (!domain) return;

  currentTabId = tab.id;
  currentDomain = domain;
  lastTimestamp = Date.now();

  startCheckpoints();
}

function stopTracking() {
  if (!currentDomain || !lastTimestamp) return; // если нет currentDomain или lastTimestamp, то конец функции

  const delta = Date.now() - lastTimestamp; // разница времени между последней начальной точкой и сейчас

  browser.storage.local.get("timeData").then(data => {  // чекнуть время в локальной памяти браузера, дождаться ответа и запустить функцию, 
                                                        // передав ей содержимое из json'a timeData
    const timeData = data.timeData || {}; // если data.timeData существует то timeData = data.timeData, иначе timeData = {}
    timeData[currentDomain] = (timeData[currentDomain] || 0) + delta;   // если записи о currentDomain не было, то создается ключ для него со временем delta
                                                                        // иначе запись ключа переписывается на ее время + delta
    browser.storage.local.set({ timeData }); // сохраняет в локальную память браузера
  });

  lastTimestamp = null; // начальная точка чиститься
  stopCheckpoints();
}

browser.tabs.onActivated.addListener(async ({ tabId }) => { // запускает функцию когда какая нибудь вкладка становиться активной
  stopTracking(); // предыдущая вкладка больше не мониторится

  const tab = await browser.tabs.get(tabId); // дожидаемся получения id нашей вкладки
  if (windowFocused || tab.audible) startTracking(tab) // запускает мониторинг если ее окно браузера в фокусе или вкладка играет медиа
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { // запускает функцию при любых изменениях на какой нибудь странице
  if (tabId === currentTabId && changeInfo.url) { // если id вкладки равно currentTabId и поменялся url
    stopTracking(); // остановить и запустить мониторинг вкладки если ее окно браузера еще в фокусе
    if (windowFocused || tab.audible) startTracking(tab) // запускает мониторинг если ее окно браузера в фокусе или вкладка играет медиа
  }
});

browser.windows.onFocusChanged.addListener(windowId => {
  if (windowId === browser.windows.WINDOW_ID_NONE) { // windowId = WINDOW_ID_NONE когда окно браузера не в фокусе
    windowFocused = false;
    if (currentTabId) {
        browser.tabs.get(currentTabId).then(tab => { // останавливает мониторинг только если вкладка не играет медиа
          if (!tab.audible) stopTracking();
        });
    }
  } else {
    windowFocused = true;
    browser.tabs.query({ active: true, windowId }).then(tabs => {   // выводит лист активных вкладок, только одна из них может быть активна, 
                                                                    // поэтому выйдет лист на один элемент
      if (tabs[0]) startTracking(tabs[0]);
    });
  }
});

let minuteIntervalId = null;
function startCheckpoints() {
  if (minuteIntervalId) return; // если не null, значит уже запущен

  minuteIntervalId = setInterval(() => { // запускает функцию с интервалом в n миллисек
    if (!currentDomain || !lastTimestamp) return;

    const now = Date.now();
    const delta = now - lastTimestamp;
    lastTimestamp = now;

    browser.storage.local.get("timeData").then(data => {    // чекнуть время в локальной памяти браузера, дождаться ответа и запустить функцию, 
                                                            // передав ей содержимое из json'a timeData
        const timeData = data.timeData || {}; // если data.timeData существует то timeData = data.timeData, иначе timeData = {}
        timeData[currentDomain] = (timeData[currentDomain] || 0) + delta;   // если записи о currentDomain не было, то создается ключ для него со временем delta
                                // иначе запись ключа переписывается на ее время + delta
        browser.storage.local.set({ timeData }); // сохраняет в локальную память браузера
    });

  }, 60000); // интервал каждые 60 сек
}

function stopCheckpoints() {
  clearInterval(minuteIntervalId);
  minuteIntervalId = null;
}
