// background.js - 业务错误监控和报告生成
class BusinessErrorMonitor {
    constructor() {
        this.userActions = [];
        this.businessErrors = [];
        this.errorConfig = this.getErrorConfig();
        this.setupMessageListener();
        console.log('🔧 BusinessErrorMonitor initialized');
    }

    getErrorConfig() {
        return {
            // 业务错误码模式
            errorPatterns: [
                // 字段匹配模式
                { field: 'code', patterns: [/^[45]\d{4}$/, /^ERROR_/] },
                { field: 'status', patterns: [/^error$/, /^fail$/i] },
                { field: 'success', patterns: [false, 'false', 0] },
                { field: 'result', patterns: [false, 'false', 0, 'fail'] },
                
                // 错误消息模式
                { field: 'message', patterns: [/错误/, /失败/, /invalid/i, /timeout/i, /expired/i, /denied/i] },
                { field: 'msg', patterns: [/错误/, /失败/, /invalid/i, /timeout/i, /expired/i, /denied/i] },
                { field: 'error', patterns: [/.*/] }, // 只要有error字段就认为是错误
                
                // 自定义匹配函数
                { 
                    custom: (data) => {
                        return (data?.hasOwnProperty('success') && !data.success) ||
                               (data?.hasOwnProperty('code') && data.code !== 0 && data.code !== 200 && data.code !== '0000');
                    }
                }
            ],

            // 特定接口的业务规则
            apiSpecificRules: {
                '/api/login': {
                    successField: 'success',
                    codeField: 'code',
                    successValues: [true, 1, 'success'],
                    errorCodes: [40001, 40002, 40003]
                },
                '/api/payment': {
                    successField: 'result',
                    codeField: 'errCode',
                    successValues: ['SUCCESS', 'success'],
                    errorValues: ['FAILED', 'TIMEOUT', 'failed']
                }
            },

            // 忽略的接口
            ignoreUrls: [
                /\.(jpg|jpeg|png|gif|svg|css|js|woff|woff2|ttf|eot)$/i,
                /\/log\//,
                /\/analytics\//,
                /\/tracking\//,
                /\/monitoring\//
            ]
        };
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📩 Message received in background:', message.type);
            switch (message.type) {
                case 'USER_ACTION':
                    this.handleUserAction(message.action);
                    sendResponse({ status: 'received' });
                    break;
                    
                case 'API_RESPONSE':
                    this.handleAPIResponse(message.data);
                    sendResponse({ status: 'received' });
                    break;
                    
                case 'NETWORK_ERROR':
                    this.handleNetworkError(message.data);
                    sendResponse({ status: 'received' });
                    break;
                    
                case 'GET_REPORT':
                    sendResponse(this.generateReport());
                    break;
                    
                case 'CLEAR_DATA':
                    this.clearData();
                    sendResponse({ status: 'cleared' });
                    break;
                    
                default:
                    sendResponse({ status: 'unknown_message_type' });
            }
        });
    }

    handleUserAction(action) {
        this.userActions.push(action);
        
        // 限制存储数量
        if (this.userActions.length > 200) {
            this.userActions = this.userActions.slice(-100);
        }
        
        // if (window.debugMode) {
            console.log('📝 User action stored:', action);
        // }
    }

    handleAPIResponse(data) {
        if (this.isBusinessError(data.url, data.responseData)) {
            this.captureBusinessError(data);
        }
    }

    handleNetworkError(data) {
        this.captureBusinessError({
            ...data,
            type: 'NETWORK_ERROR',
            responseData: { error: data.error }
        });
    }

    isBusinessError(url, responseData) {
        // 检查是否在忽略列表
        if (this.errorConfig.ignoreUrls.some(pattern => pattern.test(url))) {
            return false;
        }

        // 检查特定接口规则
        const apiRule = Object.keys(this.errorConfig.apiSpecificRules).find(apiPath => 
            url.includes(apiPath)
        );
        
        if (apiRule) {
            const rule = this.errorConfig.apiSpecificRules[apiRule];
            return this.checkSpecificRule(responseData, rule);
        }

        // 检查通用错误模式
        return this.checkGeneralPatterns(responseData);
    }

    checkSpecificRule(data, rule) {
        if (rule.successField && data && data[rule.successField] !== undefined) {
            if (rule.errorValues && rule.errorValues.includes(data[rule.successField])) {
                return true;
            }
            if (rule.successValues && !rule.successValues.includes(data[rule.successField])) {
                return true;
            }
        }
        
        if (rule.codeField && data && data[rule.codeField] !== undefined) {
            if (rule.errorCodes && rule.errorCodes.includes(data[rule.codeField])) {
                return true;
            }
        }
        
        return this.checkGeneralPatterns(data);
    }

    checkGeneralPatterns(data) {
        if (!data || typeof data !== 'object') return false;

        for (const pattern of this.errorConfig.errorPatterns) {
            if (pattern.field && data[pattern.field] !== undefined) {
                const value = data[pattern.field];
                if (pattern.patterns.some(p => 
                    p instanceof RegExp ? p.test(String(value)) : p === value
                )) {
                    return true;
                }
            }
            
            if (pattern.custom && pattern.custom(data)) {
                return true;
            }
        }
        
        return false;
    }

    captureBusinessError(errorData) {
        const errorRecord = {
            ...errorData,
            id: this.generateId(),
            capturedAt: new Date().toISOString()
        };

        this.businessErrors.push(errorRecord);
        
        // 限制存储数量
        if (this.businessErrors.length > 100) {
            this.businessErrors = this.businessErrors.slice(-50);
        }

        this.saveToStorage();
        this.sendRealTimeNotification(errorRecord);
        
        console.log('🔴 Business Error Captured:', errorRecord);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    sendRealTimeNotification(error) {
        const actionDescription = this.getActionDescription(error.triggeredBy);
        const errorMessage = error.responseData?.message || 
                           error.responseData?.msg || 
                           error.responseData?.error || 
                           '业务错误';

        // 创建浏览器通知
        chrome.notifications.create(error.id, {
            type: 'basic',
            iconUrl: 'icon48.png',
            title: '🚨 业务错误告警',
            message: `操作 "${actionDescription}" 触发错误: ${errorMessage}`,
            priority: 2
        });

        // 可以在这里集成企业微信、钉钉等webhook通知
        this.sendToWebhook(error);
    }

    sendToWebhook(error) {
        // 示例：发送到企业微信
        /*
        const webhookData = {
            msgtype: "markdown",
            markdown: {
                title: "业务错误告警",
                text: `### 🚨 业务错误告警\n**操作:** ${this.getActionDescription(error.triggeredBy)}\n**接口:** ${error.method} ${error.url}\n**错误:** ${error.responseData?.message || '未知错误'}\n**时间:** ${new Date(error.timestamp).toLocaleString()}`
            }
        };
        
        fetch('YOUR_WEBHOOK_URL', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookData)
        });
        */
    }

    getActionDescription(action) {
        if (!action) return '未知操作';
        
        if (action.element) {
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
        } else if (action.data) {
            return `${action.type}: ${JSON.stringify(action.data).substring(0, 50)}`;
        }
        
        return action.type || '未知操作';
    }

    async saveToStorage() {
        const data = {
            userActions: this.userActions,
            businessErrors: this.businessErrors,
            lastUpdated: new Date().toISOString(),
            version: '1.0'
        };
        
        await chrome.storage.local.set({ businessMonitorData: data });
    }

    async loadFromStorage() {
        try {
            const result = await chrome.storage.local.get(['businessMonitorData']);
            if (result.businessMonitorData) {
                this.userActions = result.businessMonitorData.userActions || [];
                this.businessErrors = result.businessMonitorData.businessErrors || [];
            }
            return result.businessMonitorData;
        } catch (error) {
            console.error('Load storage error:', error);
            return { userActions: [], businessErrors: [] };
        }
    }

    generateReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalBusinessErrors: this.businessErrors.length,
                totalUserActions: this.userActions.length,
                monitoringDuration: this.getMonitoringDuration(),
                errorRate: this.calculateErrorRate(),
                errorsByType: this.groupErrorsByType(),
                topErrorAPIs: this.getTopErrorAPIs(),
                mostCommonErrors: this.getMostCommonErrors()
            },
            detailedErrors: this.businessErrors.map(error => ({
                id: error.id,
                timestamp: error.timestamp,
                api: error.url,
                method: error.method,
                httpStatus: error.httpStatus,
                responseTime: error.responseTime,
                actionDescription: this.getActionDescription(error.triggeredBy),
                userAction: error.triggeredBy,
                requestData: error.requestData,
                responseData: error.responseData,
                pageInfo: {
                    url: error.triggeredBy?.pageUrl,
                    title: error.triggeredBy?.pageTitle
                }
            })),
            recentUserActions: this.userActions.slice(-20)
        };

        return report;
    }

    getMonitoringDuration() {
        if (this.userActions.length === 0) return '0分钟';
        
        const firstAction = new Date(this.userActions[0].timestamp);
        const lastAction = new Date(this.userActions[this.userActions.length - 1].timestamp);
        const durationMs = lastAction - firstAction;
        const minutes = Math.floor(durationMs / 60000);
        
        return minutes > 60 ? 
            `${Math.floor(minutes / 60)}小时${minutes % 60}分钟` : 
            `${minutes}分钟`;
    }

    calculateErrorRate() {
        if (this.userActions.length === 0) return '0%';
        const rate = (this.businessErrors.length / this.userActions.length * 100).toFixed(2);
        return `${rate}%`;
    }

    groupErrorsByType() {
        const groups = {};
        this.businessErrors.forEach(error => {
            let type = 'UNKNOWN';
            
            if (error.type === 'NETWORK_ERROR') {
                type = 'NETWORK_ERROR';
            } else if (error.responseData?.code) {
                type = `CODE_${error.responseData.code}`;
            } else if (error.responseData?.message) {
                const msg = error.responseData.message;
                if (msg.includes('超时')) type = 'TIMEOUT';
                else if (msg.includes('权限')) type = 'AUTH_ERROR';
                else if (msg.includes('参数')) type = 'PARAM_ERROR';
                else type = 'BUSINESS_ERROR';
            } else {
                type = 'BUSINESS_ERROR';
            }
            
            if (!groups[type]) groups[type] = [];
            groups[type].push(error);
        });
        return groups;
    }

    getTopErrorAPIs() {
        const apiCounts = {};
        this.businessErrors.forEach(error => {
            const path = new URL(error.url).pathname;
            apiCounts[path] = (apiCounts[path] || 0) + 1;
        });
        
        return Object.entries(apiCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([api, count]) => ({ api, count }));
    }

    getMostCommonErrors() {
        const errorMessages = {};
        this.businessErrors.forEach(error => {
            const msg = error.responseData?.message || 
                       error.responseData?.msg || 
                       error.responseData?.error || 
                       '未知错误';
            errorMessages[msg] = (errorMessages[msg] || 0) + 1;
        });
        
        return Object.entries(errorMessages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([message, count]) => ({ message, count }));
    }

    clearData() {
        this.userActions = [];
        this.businessErrors = [];
        chrome.storage.local.remove(['businessMonitorData']);
        console.log('🗑️ All data cleared');
    }

    async downloadReport() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const filename = `business-error-report-${new Date().toISOString().split('T')[0]}.json`;
        
        try {
            await chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            });
        } catch (error) {
            console.error('Download failed:', error);
        }
    }
}

// 初始化监控器
const businessMonitor = new BusinessErrorMonitor();

// 加载存储的数据
businessMonitor.loadFromStorage();

// 暴露到全局用于调试
self.businessMonitor = businessMonitor;

console.log('🚀 Background script loaded successfully');