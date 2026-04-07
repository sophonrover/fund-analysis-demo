# 基金AI分析 - 极简原型

## 使用方法

### 1. 配置API Key

编辑 `config.js`，填入你的火山引擎API Key：

```javascript
VOLCENGINE_APIKEY: '你的火山引擎API Key',
```

或者从 `.env` 拷贝过来。TTFund API Key已经配置好了。

### 2. 启动

#### 方式一：直接打开
直接用浏览器打开 `index.html` 即可使用。

*注意：如果遇到跨域(CORS)问题，请使用方式二。*

#### 方式二：启动本地静态服务器 + 代理

使用Node.js启动本地服务器：

```bash
# 安装serve
npm install -g serve

# 启动
serve .

# 访问
open http://localhost:3000
```

如果仍然遇到CORS问题，可以启用代理：设置 `CONFIG.USE_PROXY=true`，并启动一个简单的代理。

## 文件说明

- `index.html` - 主页面UI
- `app.js` - 主逻辑，包含API调用和页面渲染
- `prompts.js` - 提示词模板（按照PRD规范）
- `config.js` - 配置文件（需要你填写）
- `.env` - 环境变量示例

## 功能流程

1. 用户输入6位基金代码
2. 调用TTFund API获取：基金基本信息、最新净值涨跌幅、持仓行业分布
3. 根据PRD提示词模板构造prompt
4. 调用火山引擎大模型生成AI分析
5. 在页面展示结果 + 合规免责声明

## 合规说明

本原型严格遵循合规要求：
- 不提供任何明确操作建议（买入/卖出/持有等）
- 只提供原因分析和思考方向
- 页面底部固定展示免责声明
