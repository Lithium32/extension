// content.js - 用户操作追踪和网络请求拦截
import elementUtils from "./utils/element.js";
import randomUtils from "./utils/random.js";

class UserActionTracker {
    constructor() {
        this.lastUserAction = null;
        this.actionHistory = [];
        this.setupEventListeners(); // 设置需要监听的事件
        this.interceptNetworkRequests();
        this.setupMessageListener();
        this.pendingRequests = new Map(); // 用于处理响应

        console.log('🎯 UserActionTracker initialized In Main World');
    }

    // 设置消息监听器，接收来自桥接的响应
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            if (event.data && event.data.source === 'BRIDGE_SCRIPT') {
                console.log('📨 收到桥接消息:', event.data);
                
                // 处理响应（如果需要）
                // this.handleBridgeResponse(event.data);
            }
        });
    }

    // 发送消息到桥接脚本
    sendToBridge(messageType, data) {
        // todo
        const messageId = randomUtils.generateId();
        const message = {
            type: messageType,
            data: data,
            source: 'PAGE_SCRIPT',
            messageId: messageId,
            timestamp: new Date().toISOString()
        };
        
        console.log('📤 发送消息到桥接:', message);
        window.postMessage(message, '*');
        
        // // 存储待处理的消息（如果需要等待响应）
        // this.pendingRequests.set(messageId, {
        //     type: messageType,
        //     data: data,
        //     timestamp: new Date().getTime()
        // });
        
        return messageId;
    }



    setupEventListeners() {
        // 点击事件监听
        document.addEventListener('click', (event) => {
            this.handleUserAction('click', event.target);
        }, true);

        // 表单提交事件
        document.addEventListener('submit', (event) => {
            this.handleUserAction('submit', event.target);
        }, true);

        // 输入变化事件（防抖）
        let inputTimeout;
        document.addEventListener('input', (event) => {
            clearTimeout(inputTimeout);
            inputTimeout = setTimeout(() => {
                this.handleUserAction('input', event.target);
            }, 1000);
        }, true);

        // 键盘事件（回车提交等）
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                const target = event.target;
                if (target.tagName !== 'TEXTAREA' && 
                    (target.tagName === 'INPUT' || target.isContentEditable)) {
                    this.handleUserAction('keydown_enter', target);
                }
            }
        }, true);

        // 页面变化监听（单页应用）
        this.setupSPAMonitoring();
    }

    setupSPAMonitoring() {
        // 监听 pushState 和 replaceState 变化（单页应用路由变化）
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = (...args) => {
            this.handleUserAction('navigation', { type: 'pushState', args });
            return originalPushState.apply(history, args);
        };

        history.replaceState = (...args) => {
            this.handleUserAction('navigation', { type: 'replaceState', args });
            return originalReplaceState.apply(history, args);
        };

        window.addEventListener('popstate', () => {
            this.handleUserAction('navigation', { type: 'popstate' });
        });
    }

    handleUserAction(type, elementOrData) {
        const actionInfo = {
            type: type,
            timestamp: new Date().toISOString(),
            pageUrl: window.location.href,
            pageTitle: document.title,
            stackTrace: this.getStackTrace()
        };

        if (typeof elementOrData === 'object' && elementOrData.nodeType === Node.ELEMENT_NODE) {
            // DOM 元素操作
            actionInfo.element = elementUtils.getElementInfo(elementOrData);
        } else {
            // 其他类型操作（如导航）
            actionInfo.data = elementOrData;
        }

        this.lastUserAction = actionInfo;
        this.actionHistory.push(actionInfo);

        // 限制历史记录长度
        if (this.actionHistory.length > 100) {
            this.actionHistory = this.actionHistory.slice(-50);
        }

        // 发送到 background script
        this.sendToBridge('USER_ACTION', {
            ...actionInfo,
        });
       
        console.log('🎯 User Action:', actionInfo);
    }

    handleAPIResponse(responseData) {
        console.log('📨 API 响应:', responseData);
        
        this.sendToBridge('API_RESPONSE', {
            ...responseData,
        });
    }

    // maskSensitiveData(value) {
    //     if (!value) return value;
        
    //     const str = String(value);
    //     if (str.length <= 2) return str;
        
    //     // 简单脱敏处理
    //     return str.substring(0, 1) + '*'.repeat(Math.min(str.length - 2, 6)) + str.substring(str.length - 1);
    // }

    getStackTrace() {
        try {
            const error = new Error();
            return error.stack ? error.stack.split('\n').slice(2).join('\n') : '';
        } catch {
            return '';
        }
    }

    interceptNetworkRequests() {
        this.interceptXHR();
        this.interceptFetch();
    }

    interceptXHR() {
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        const self = this;

       XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._method = method;
            this._url = url;
            this._startTime = Date.now();
            
            // 在 open 阶段就添加事件监听
            this.addEventListener('load', function() {
                console.log('🔍 XHR load event fired', this._url, this.status);
                // 只处理成功的HTTP请求（200-299）
                if (this.status >= 200 && this.status < 300) {
                    try {
                        const responseText = this.responseText;
                        console.log('📨 XHR Response received:', responseText);
                        if (responseText && self.isAPIRequest(this._url)) {
                            const responseData = JSON.parse(responseText);
                            
                            // 发送到background进行业务错误判断
                            self.handleAPIResponse({
                                type: 'API_RESPONSE',
                                data: {
                                    url: this._url,
                                    method: this._method,
                                    httpStatus: this.status,
                                    responseData: responseData,
                                    requestData: self.parseRequestBody(this._requestBody),
                                    responseTime: Date.now() - this._startTime,
                                    triggeredBy: self.lastUserAction,
                                    timestamp: new Date().toISOString(),
                                    type: 'xhr'
                                }
                            });
                        }
                    } catch (error) {
                        console.error('❌ XHR Response parsing error:', error);
                    }
                }
            });

            this.addEventListener('error', function() {
                console.log('❌ XHR Network error:', this._url);
                self.handleAPIResponse({
                    type: 'NETWORK_ERROR',
                    data: {
                        url: this._url,
                        method: this._method,
                        httpStatus: this.status,
                        error: 'XHR Network error',
                        triggeredBy: self.lastUserAction,
                        timestamp: new Date().toISOString(),
                        type: 'xhr'
                    }
                });
            });

            this.addEventListener('loadend', function() {
                console.log('🔚 XHR loadend event:', this._url, this.status);
            });

            return originalXHROpen.apply(this, [method, url, ...args]);
        };

        XMLHttpRequest.prototype.send = function(body) {
            console.log('📤 XHR send called:', this._method, this._url);
            this._requestBody = body; // 保存请求体
            
            // 记录发送时的用户操作
            const userAction = self.lastUserAction;
            const startTime = this._startTime;
            const method = this._method;
            const url = this._url;

            return originalXHRSend.call(this, body);
        };
    }

    

    interceptFetch() {
        const originalFetch = window.fetch;
        const self = this;

        window.fetch = function(...args) {
            const userAction = self.lastUserAction;
            const startTime = Date.now();
            const [input, init = {}] = args;
            const url = typeof input === 'string' ? input : input.url;
            const method = init.method || 'GET';

            return originalFetch.apply(this, args).then(response => {
                const clonedResponse = response.clone();
                
                // 只处理成功的HTTP请求
                if (response.status >= 200 && response.status < 300) {
                    clonedResponse.text().then(text => {
                        try {
                            if (text && self.isAPIRequest(url)) {
                                const responseData = JSON.parse(text);
                                
                                chrome.runtime.sendMessage({
                                    type: 'API_RESPONSE',
                                    data: {
                                        url: url,
                                        method: method,
                                        httpStatus: response.status,
                                        responseData: responseData,
                                        requestData: self.parseRequestBody(init.body),
                                        responseTime: Date.now() - startTime,
                                        triggeredBy: userAction,
                                        timestamp: new Date().toISOString(),
                                        type: 'fetch'
                                    }
                                });
                            }
                        } catch (error) {
                            // 不是JSON响应或解析失败，忽略
                        }
                    });
                }
                
                return response;
            }).catch(error => {
                // 网络错误处理
                chrome.runtime.sendMessage({
                    type: 'NETWORK_ERROR',
                    data: {
                        url: url,
                        method: method,
                        error: error.message,
                        triggeredBy: userAction,
                        timestamp: new Date().toISOString()
                    }
                });
                throw error;
            });
        };
    }

    isAPIRequest(url) {
        // 只监控API接口，忽略静态资源
        const ignorePatterns = [
            /\.(jpg|jpeg|png|gif|svg|css|js|woff|woff2|ttf|eot)$/i,
            /\/log\//,
            /\/analytics\//,
            /\/tracking\//,
            /\/monitoring\//
        ];

        return !ignorePatterns.some(pattern => pattern.test(url)) && 
               (url.includes('/api/') || url.includes('/v1/') || url.includes('/v2/'));
    }

    parseRequestBody(body) {
        if (!body) return null;
        
        try {
            if (typeof body === 'string') {
                return JSON.parse(body);
            } else if (body instanceof FormData) {
                const data = {};
                for (let [key, value] of body.entries()) {
                    data[key] = value;
                }
                return data;
            } else if (body instanceof URLSearchParams) {
                const data = {};
                for (let [key, value] of body.entries()) {
                    data[key] = value;
                }
                return data;
            }
        } catch (error) {
            // 解析失败，返回原始数据
            return { _raw: String(body) };
        }
        
        return null;
    }

    // filterSensitiveData(data) {
    //     if (!data || typeof data !== 'object') return data;
        
    //     const sensitiveFields = ['password', 'token', 'authorization', 'cookie', 'secret', 'credit', 'card'];
    //     const filtered = Array.isArray(data) ? [...data] : { ...data };
        
    //     sensitiveFields.forEach(field => {
    //         if (filtered[field]) {
    //             filtered[field] = '***FILTERED***';
    //         }
    //     });
        
    //     // 递归处理嵌套对象
    //     Object.keys(filtered).forEach(key => {
    //         if (filtered[key] && typeof filtered[key] === 'object') {
    //             filtered[key] = this.filterSensitiveData(filtered[key]);
    //         }
    //     });
        
    //     return filtered;
    // }

}

// 初始化
const userActionTracker = new UserActionTracker();
window.userActionTracker = userActionTracker;

console.log('🚀 Content script loaded successfully');