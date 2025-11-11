// 可配置的业务错误规则
const BusinessErrorConfig = {
  // 通用业务错误码模式
  errorCodePatterns: [
    // 1. 字段匹配模式
    { field: 'code', patterns: [/^[45]\d{4}$/, /^ERROR_/] }, // 5位数字错误码或ERROR_开头
    { field: 'status', patterns: [/^error$/, /^fail$/i] },
    { field: 'success', patterns: [false] }, // success: false
    { field: 'result', patterns: [false, 0] }, // result: false/0
    
    // 2. 错误消息模式
    { field: 'message', patterns: [/错误/, /失败/, /invalid/i, /timeout/i, /expired/i] },
    { field: 'msg', patterns: [/错误/, /失败/, /invalid/i, /timeout/i, /expired/i] },
    
    // 3. 自定义匹配函数
    { custom: (data) => {
      return data?.hasOwnProperty('errorCode') && data.errorCode !== 0;
    }}
  ],

  // 特定接口的业务规则
  apiSpecificRules: {
    '/api/login': {
      successField: 'success',
      codeField: 'code',
      successValues: [true, 1],
      errorValues: [false, 0],
      errorCodes: [40001, 40002, 40003] // 特定错误码
    },
    '/api/payment': {
      successField: 'result',
      codeField: 'errCode',
      successValues: ['SUCCESS'],
      errorValues: ['FAILED', 'TIMEOUT']
    }
  },

  // 忽略的接口（如日志上报、埋点等）
  ignoreUrls: [
    /\/log\//,
    /\/tracking\//,
    /\/analytics\//,
    /\.jpg$|\.png$|\.gif$|\.css$|\.js$/
  ],

  // 敏感信息过滤
  sensitiveFields: ['password', 'token', 'authorization', 'cookie', 'secret']
};

// 判断是否为业务错误
function isBusinessError(url, responseData) {
  // 1. 检查是否在忽略列表
  if (BusinessErrorConfig.ignoreUrls.some(pattern => pattern.test(url))) {
    return false;
  }

  // 2. 检查特定接口规则
  const apiRule = Object.keys(BusinessErrorConfig.apiSpecificRules).find(apiPath => 
    url.includes(apiPath)
  );
  
  if (apiRule) {
    const rule = BusinessErrorConfig.apiSpecificRules[apiRule];
    return checkSpecificRule(responseData, rule);
  }

  // 3. 检查通用错误模式
  return checkGeneralPatterns(responseData);
}

function checkSpecificRule(data, rule) {
  if (rule.successField && data && data[rule.successField] !== undefined) {
    if (rule.errorValues.includes(data[rule.successField])) {
      return true;
    }
    if (rule.successValues.includes(data[rule.successField])) {
      return false;
    }
  }
  
  if (rule.codeField && data && data[rule.codeField] !== undefined) {
    if (rule.errorCodes.includes(data[rule.codeField])) {
      return true;
    }
  }
  
  return checkGeneralPatterns(data);
}

function checkGeneralPatterns(data) {
  if (!data || typeof data !== 'object') return false;

  for (const pattern of BusinessErrorConfig.errorCodePatterns) {
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