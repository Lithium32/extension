// handlers/ClearDataHandler.js
import MessageHandler from '../MessageHandler.js';

/**
 * 数据清理处理器
 */
class ClearDataHandler extends MessageHandler {
    supports() {
        return 'CLEAR_DATA';
    }

    async handle(data, context) {
        console.log('🗑️ 处理数据清理请求');
        this.clearData(context);
        return { status: 'success' };
    }

    clearData(context) {
        context.userActions = [];
        context.businessErrors = [];
        chrome.storage.local.remove(['businessMonitorData']);
        console.log('🗑️ All data cleared');
    }
}

export default ClearDataHandler;