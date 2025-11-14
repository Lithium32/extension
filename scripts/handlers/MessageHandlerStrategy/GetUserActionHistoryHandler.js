// handlers/GetUserActionHistoryHandler.js
import MessageHandler from '../MessageHandler.js';

/**
 * 用户操作历史处理器
 */
class GetUserActionHistoryHandler extends MessageHandler {
    supports() {
        return 'GET_USER_ACTION_HISTORY';
    }

    async handle(data, context) {
        console.log('📝 处理用户操作历史请求');
        return {
            status: "success",
            data: context.userActions
        };
    }
}

export default GetUserActionHistoryHandler;