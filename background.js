// Uzantı ikonuna tıklandığında çalışır
chrome.action.onClicked.addListener((tab) => {
  // index.html dosyasını yeni bir sekmede tam sayfa olarak açar
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html")
  });
});