// handlers/GetStatsHandler.js
import MessageHandler from '../MessageHandler.js';

/**
 * 获取统计数据处理器
 */
class GetStatsHandler extends MessageHandler {
    supports() {
        return 'GET_STATS';
    }

    async handle(data, context) {
        console.log('📊 处理获取统计数据请求');
        const stats = context.getStats();
        return { 
            status: 'success', 
            data: stats 
        };
    }
}

export default GetStatsHandler;