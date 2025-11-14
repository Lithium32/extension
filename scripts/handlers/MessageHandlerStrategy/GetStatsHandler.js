// handlers/GetStatsHandler.js
import MessageHandler from '../MessageHandler.js';

/**
 * 获取统计数据处理器
 */
class GetStatsHandler extends MessageHandler {
    constructor() {
        super();
        this.handleType = ['GET_STATS'];
    }
    supports(messageType) {
        if (messageType) {
            return this.handleType.includes(messageType);
        }
        return false;
    }

    async handle(data, context, type) {
        console.log('📊 处理获取统计数据请求');
        const stats = context.getStats();
        return { 
            status: 'success', 
            data: stats 
        };
    }
}

export default GetStatsHandler;