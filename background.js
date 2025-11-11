console.log("this is backgoud.js");
let lastUserAction = null;
const errorReports = [];

// 监听来自content script的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'USER_ACTION') {
    lastUserAction = message.data;
  }
});

// 监听网络请求
chrome.webRequest.onResponseStarted.addListener(
// chrome.webRequest.onCompleted.addListener(
  function(details) {
    // 只处理4xx和5xx响应
    if (details.statusCode >= 400) {
      const errorReport = {
        userAction: lastUserAction,
        errorRequest: {
          url: details.url,
          method: details.method,
          statusCode: details.statusCode,
          timestamp: details.timeStamp,
          requestId: details.requestId,
          type: details.type
        }
      };

      // 存储错误报告
      errorReports.push(errorReport);

      // 也可以发送到popup或者存储到chrome.storage中以便在popup中展示
      chrome.storage.local.set({ 'errorReports': errorReports });
    }
    else{
        // 非错误请求，不处理
        console.log("非错误请求，不处理");
        console.log(lastUserAction);
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);