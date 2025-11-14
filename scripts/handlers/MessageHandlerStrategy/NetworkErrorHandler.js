// handlers/NetworkErrorHandler.js
import MessageHandler from '../MessageHandler.js';

/**
 * 网络错误消息处理器
 */
class NetworkErrorHandler extends MessageHandler {
    supports() {
        return 'NETWORK_ERROR';
    }

    async handle(data, context) {
        console.log('🌐 处理网络错误:', data.error);
        context.handleNetworkError(data);
        return { status: 'received' };
    }
}

export default NetworkErrorHandler;