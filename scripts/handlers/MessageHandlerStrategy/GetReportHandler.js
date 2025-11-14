// handlers/GetReportHandler.js
import MessageHandler from '../MessageHandler.js';

/**
 * 报告生成处理器
 */
class GetReportHandler extends MessageHandler {
    constructor() {
        super();
        this.userActions = null;
        this.businessErrors = null;
    }
    supports() {
        return 'GET_REPORT';
    }

    async handle(data, context) {
        console.log('📋 处理报告生成请求');
        this.userActions = context.userActions;
        this.businessErrors = context.businessErrors;
        const report = this.generateReport();
        return {
            status: "success",
            data: report
        };
    }

    generateReport() {
        debugger
        let totalUserActions = this.userActions.length;
        let monitoringDuration = this.getMonitoringDuration();
        let errorType = this.groupErrorsByType();
        let topErrorAPIs = this.getTopErrorAPIs();
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
                timestamp: error.data.timestamp,
                api: error.data.url,
                method: error.data.method,
                httpStatus: error.data.httpStatus,
                responseTime: error.data.responseTime,
                actionDescription: getActionDescription(error.data.triggeredBy),
                userAction: error.data.triggeredBy,
                requestData: error.data.requestData,
                responseData: error.data.responseData,
                pageInfo: {
                    url: error.data.triggeredBy?.pageUrl,
                    title: error.data.triggeredBy?.pageTitle
                }
            })),
            recentUserActions: this.userActions.slice(-20)
        };

        return report;
    }

    getMonitoringDuration() {
        if (this.userActions.length === 0) return '0分钟';
        debugger
        const firstAction = new Date(this.userActions[0].timestamp);
        const lastAction = new Date(this.userActions[this.userActions.length - 1].timestamp);
        const durationMs = lastAction - firstAction;
        const minutes = Math.floor(durationMs / 60000);
        
        return minutes > 60 ? 
            `${Math.floor(minutes / 60)}小时${minutes % 60}分钟` : 
            `${minutes}分钟`;
    }

    groupErrorsByType() {
        const groups = {};
        this.businessErrors.forEach(error => {
            let type = 'UNKNOWN';
            
            if (error.type === 'NETWORK_ERROR') {
                type = 'NETWORK_ERROR';
            } else if (error.data.responseData?.code) {
                type = `CODE_${error.data.responseData.code}`;
            } else if (error.data.responseData?.message) {
                const msg = error.data.responseData.message;
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
            const path = error.data.url;
            apiCounts[path] = (apiCounts[path] || 0) + 1;
        });
        
        return Object.entries(apiCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([api, count]) => ({ api, count }));
    }

    calculateErrorRate() {
        if (this.userActions.length === 0) return '0%';
        const rate = (this.businessErrors.length / this.userActions.length * 100).toFixed(2);
        return `${rate}%`;
    }

    getMostCommonErrors() {
        const errorMessages = {};
        this.businessErrors.forEach(error => {
            const msg = error.data.responseData?.message || 
                       error.data.responseData?.msg || 
                       error.data.responseData?.error || 
                       '未知错误';
            errorMessages[msg] = (errorMessages[msg] || 0) + 1;
        });
        
        return Object.entries(errorMessages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([message, count]) => ({ message, count }));
    }

    static getActionDescription(action) {
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

}

// export default GetReportHandler;
export { GetReportHandler };

export const getActionDescription = GetReportHandler.getActionDescription;

