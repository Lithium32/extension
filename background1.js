// 在APIMonitor类中添加响应体捕获逻辑
class BusinessAPIMonitor {
  constructor() {
    this.userActions = [];
    this.businessErrors = [];
    this.lastUserAction = null;
    this.pendingRequests = new Map(); // 存储待处理的请求
    
    this.setupRequestMonitoring();
  }

  setupRequestMonitoring() {
    // 监听请求开始，准备捕获响应体
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        if (details.method === 'POST' || details.method === 'PUT') {
          this.pendingRequests.set(details.requestId, {
            url: details.url,
            method: details.method,
            startTime: Date.now(),
            requestBody: details.requestBody
          });
        } else {
          this.pendingRequests.set(details.requestId, {
            url: details.url,
            method: details.method,
            startTime: Date.now()
          });
        }
      },
      { urls: ["<all_urls>"] },
      ["requestBody"]
    );

    // 监听响应头，准备捕获响应体
    chrome.webRequest.onResponseStarted.addListener(
      (details) => {
        // 只在需要解析响应体时添加监听
        // if (this.shouldCaptureResponse(details.url)) {
          chrome.debugger.sendCommand({ tabId: details.tabId }, "Network.getResponseBody", {
            requestId: details.requestId
          }, (response) => {
            this.handleResponseBody(details, response);
          });
        // }
      },
      { urls: ["<all_urls>"] }
    );

    // 监听响应完成
    chrome.webRequest.onCompleted.addListener(
      (details) => {
        this.handleRequestCompleted(details);
      },
      { urls: ["<all_urls>"] },
      ["responseHeaders"]
    );

    // 监听用户操作
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'USER_ACTION') {
        this.lastUserAction = message.action;
        this.userActions.push(message.action);
      }
    });
  }

  shouldCaptureResponse(url) {
    // 只捕获API接口，忽略静态资源
    return !BusinessErrorConfig.ignoreUrls.some(pattern => pattern.test(url)) &&
           (url.includes('/api/') || url.includes('/v1/') || url.includes('/v2/'));
  }

  handleResponseBody(details, response) {
    if (!response) return;

    try {
      const responseData = JSON.parse(response.body);
      const pendingRequest = this.pendingRequests.get(details.requestId);
      
      if (pendingRequest && isBusinessError(details.url, responseData)) {
        this.captureBusinessError({
          type: 'BUSINESS_ERROR',
          url: details.url,
          method: details.method,
          httpStatus: details.statusCode,
          timestamp: new Date().toISOString(),
          requestId: details.requestId,
          responseData: this.filterSensitiveData(responseData),
          requestData: pendingRequest.requestBody ? 
            this.parseRequestBody(pendingRequest.requestBody) : null,
          triggeredBy: this.lastUserAction,
          responseTime: Date.now() - pendingRequest.startTime
        });
      }
    } catch (error) {
      // 响应体不是JSON，忽略
    }
  }

  handleRequestCompleted(details) {
    const pendingRequest = this.pendingRequests.get(details.requestId);
    if (pendingRequest) {
      this.pendingRequests.delete(details.requestId);
    }
  }

  parseRequestBody(requestBody) {
    if (!requestBody) return null;
    
    try {
      if (requestBody.raw) {
        const rawData = requestBody.raw[0].bytes;
        return this.filterSensitiveData(JSON.parse(String.fromCharCode(...rawData)));
      } else if (requestBody.formData) {
        return this.filterSensitiveData(requestBody.formData);
      }
    } catch (error) {
      return { _parseError: error.message };
    }
    return null;
  }

  filterSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const filtered = Array.isArray(data) ? [...data] : { ...data };
    
    BusinessErrorConfig.sensitiveFields.forEach(field => {
      if (filtered[field]) {
        filtered[field] = '***FILTERED***';
      }
    });
    
    return filtered;
  }

  captureBusinessError(errorInfo) {
    // 关联错误与用户操作
    if (this.lastUserAction) {
      errorInfo.userActionContext = {
        description: this.getActionDescription(this.lastUserAction),
        element: this.lastUserAction.element,
        pageUrl: this.lastUserAction.pageUrl,
        timestamp: this.lastUserAction.timestamp
      };
    }

    this.businessErrors.push(errorInfo);
    this.saveToStorage();
    this.sendRealTimeNotification(errorInfo);
    
    console.log('🔴 业务错误捕获:', errorInfo);
  }

  getActionDescription(action) {
    if (!action) return '未知操作';
    
    const element = action.element;
    let description = `${action.type} on `;
    
    if (element.testId) {
      description += `[data-testid="${element.testId}"]`;
    } else if (element.id) {
      description += `#${element.id}`;
    } else if (element.text && element.text.trim()) {
      description += `"${element.text.substring(0, 30)}..."`;
    } else if (element.placeholder) {
      description += `[placeholder="${element.placeholder}"]`;
    } else {
      description += element.tagName || 'element';
    }
    
    return description;
  }

  sendRealTimeNotification(error) {
    const actionDesc = this.getActionDescription(error.triggeredBy);
    const errorMsg = error.responseData?.message || error.responseData?.msg || '业务错误';
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: '🚨 业务错误告警',
      message: `操作 "${actionDesc}" 触发业务错误: ${errorMsg}`,
      priority: 2
    });
  }

  async saveToStorage() {
    const data = {
      userActions: this.userActions,
      businessErrors: this.businessErrors,
      lastUpdated: new Date().toISOString()
    };
    
    await chrome.storage.local.set({ businessMonitorData: data });
  }

  async loadFromStorage() {
    const result = await chrome.storage.local.get(['businessMonitorData']);
    return result.businessMonitorData || { userActions: [], businessErrors: [] };
  }

  generateReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalBusinessErrors: this.businessErrors.length,
        totalActions: this.userActions.length,
        errorRate: this.userActions.length > 0 ? 
          (this.businessErrors.length / this.userActions.length * 100).toFixed(2) + '%' : '0%',
        errorsByApi: this.groupErrorsByApi(),
        mostCommonErrors: this.getMostCommonErrors()
      },
      detailedErrors: this.businessErrors.map(error => ({
        timestamp: error.timestamp,
        api: error.url,
        method: error.method,
        httpStatus: error.httpStatus,
        responseTime: error.responseTime,
        actionDescription: this.getActionDescription(error.triggeredBy),
        userAction: error.userActionContext,
        requestData: error.requestData,
        responseData: error.responseData
      })),
      config: {
        errorPatterns: BusinessErrorConfig.errorCodePatterns,
        ignoredUrls: BusinessErrorConfig.ignoreUrls
      }
    };

    return report;
  }

  groupErrorsByApi() {
    const groups = {};
    this.businessErrors.forEach(error => {
      const apiPath = new URL(error.url).pathname;
      if (!groups[apiPath]) groups[apiPath] = [];
      groups[apiPath].push(error);
    });
    return groups;
  }

  getMostCommonErrors() {
    const errorMessages = {};
    this.businessErrors.forEach(error => {
      const msg = error.responseData?.message || error.responseData?.msg || '未知错误';
      errorMessages[msg] = (errorMessages[msg] || 0) + 1;
    });
    
    return Object.entries(errorMessages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

  downloadReport() {
    const report = this.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const filename = `business-error-report-${new Date().toISOString().split('T')[0]}.json`;
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
  }

  clearData() {
    this.userActions = [];
    this.businessErrors = [];
    this.pendingRequests.clear();
    chrome.storage.local.remove(['businessMonitorData']);
  }
}

// 初始化业务错误监控器
const businessMonitor = new BusinessAPIMonitor();