// handlers/index.js
import UserActionHandler from './MessageHandlerStrategy/UserActionHandler.js';
import ApiResponseHandler from './MessageHandlerStrategy/ApiResponseHandler.js';
import NetworkErrorHandler from './MessageHandlerStrategy/NetworkErrorHandler.js';
import GetUserActionHistoryHandler from './MessageHandlerStrategy/GetUserActionHistoryHandler.js';
import GetStatsHandler from './MessageHandlerStrategy/GetStatsHandler.js';
import {GetReportHandler} from './MessageHandlerStrategy/GetReportHandler.js';
import ClearDataHandler from './MessageHandlerStrategy/ClearDataHandler.js';


export const messageHandlers = [
    UserActionHandler,
    ApiResponseHandler,
    NetworkErrorHandler,
    GetUserActionHistoryHandler,
    GetStatsHandler,
    GetReportHandler,
    ClearDataHandler
];

// 如果有新的处理器，继续在这里添加


