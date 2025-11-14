// handlers/GetUserActionHistoryHandler.js
import MessageHandler from '../MessageHandler.js';

/**
 * 用户操作历史处理器
 */
class GetUserActionHistoryHandler extends MessageHandler {
    constructor() {
        super();
        this.handleType = ['GET_USER_ACTION_HISTORY'];
    }
    supports(messageType) {
        if (messageType) {
            return this.handleType.includes(messageType);
        }
        return false;
    }
    async handle(data, context, type) {
        console.log('📝 处理用户操作历史请求');
        return {
            status: "success",
            data: context.userActions
        };
    }
}

export default GetUserActionHistoryHandler;