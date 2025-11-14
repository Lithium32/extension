// 可配置的业务错误规则
export const ErrorConfig = {
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
  // 忽略的接口
  ignoreUrls: [
      /\.(jpg|jpeg|png|gif|svg|css|js|woff|woff2|ttf|eot)$/i,
      /\/log\//,
      /\/analytics\//,
      /\/tracking\//,
      /\/monitoring\//
  ],

 	// 获取配置的方法
    getErrorConfig() {
        return {
            errorPatterns: this.errorPatterns,
            ignoreUrls: this.ignoreUrls,
        };
    },

	isBusinessError(url, responseData) {
        debugger
        // 检查是否在忽略列表
        if (this.ignoreUrls.some(pattern => pattern.test(url))) {
            return false;
        }

        // 检查通用错误模式
        return this.checkGeneralPatterns(responseData);
    },

    checkGeneralPatterns(data) {
        if (!data || typeof data !== 'object') return false;

        for (const pattern of this.errorPatterns) {
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

};

// 导出默认配置
export default ErrorConfig;

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