// 基金分析原型服务器 - 正确调用TTFund Skill API
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 9094;

app.use(cors());
app.use(express.json());

// 托管静态文件
app.use(express.static(__dirname));

// TTFund Skill 网关地址
const TTFUND_GATEWAY = 'https://skills.tiantianfunds.com/ai-smart-skill-service/openapi/skill/invoke';

// 调用 TTFund FUND_BASE_INFOS skill，提取并返回归一化的基金字段
async function fetchFundBaseInfos(code) {
    const headers = {
        'X-API-Key': process.env.TTFUND_APIKEY,
        'Content-Type': 'application/json'
    };
    const body = {
        skill_id: 'FUND_BASE_INFOS',
        _skill_version: '1.0.0',
        fcode: code
    };
    const response = await axios.post(TTFUND_GATEWAY, body, { headers });
    // 从嵌套路径提取基金数据
    const fund = response.data?.data?.raw_result?.body?.data?.[0];
    if (!fund) throw new Error('未找到该基金数据，请确认基金代码是否正确');
    return fund;
}

// 获取基金基本信息
app.get('/api/fund/:code', async (req, res) => {
    try {
        const fund = await fetchFundBaseInfos(req.params.code);
        res.json({
            code: 0,
            data: { name: fund.SHORTNAME, type: fund.FTYPE, company: fund.JJGS }
        });
    } catch (error) {
        console.error('TTFund /api/fund error:', error.message);
        res.status(500).json({ error: 'TTFund API error', message: error.message });
    }
});

// 获取最新净值和涨跌幅
app.get('/api/quote/:code', async (req, res) => {
    try {
        const fund = await fetchFundBaseInfos(req.params.code);
        res.json({
            code: 0,
            data: { net_value: fund.DWJZ, change_percent: fund.RZDF }
        });
    } catch (error) {
        console.error('TTFund /api/quote error:', error.message);
        res.status(500).json({ error: 'TTFund Quote error', message: error.message });
    }
});

// 获取持仓行业（FUND_BASE_INFOS无板块明细，用基金类型+近期收益替代）
app.get('/api/industries/:code', async (req, res) => {
    try {
        const fund = await fetchFundBaseInfos(req.params.code);
        const weekStr = fund.SYL_Z != null ? `近一周${fund.SYL_Z >= 0 ? '+' : ''}${fund.SYL_Z}%` : '';
        const yearStr = fund.SYL_1N != null ? `近一年${fund.SYL_1N >= 0 ? '+' : ''}${fund.SYL_1N}%` : '';
        res.json({
            code: 0,
            data: {
                industries: [],
                sector_summary: [fund.FTYPE, weekStr, yearStr].filter(Boolean).join('，')
            }
        });
    } catch (error) {
        console.error('TTFund /api/industries error:', error.message);
        res.status(500).json({ error: 'TTFund Industries error', message: error.message });
    }
});

// 火山引擎API代理
app.post('/api/analyze', async (req, res) => {
    const { messages, model } = req.body;
    const endpoint = process.env.VOLCENGINE_API_BASE;

    try {
        const headers = {
            'Authorization': `Bearer ${process.env.VOLCENGINE_API_KEY}`,
            'Content-Type': 'application/json'
        };
        const requestBody = {
            model: model || process.env.VOLCENGINE_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000
        };
        const response = await axios.post(endpoint, requestBody, { headers });
        res.json(response.data);
    } catch (error) {
        console.error('VolcEngine API error:', error.message);
        console.error('Error details:', error.response?.data || 'No response data');
        res.status(500).json({
            error: 'VolcEngine API error',
            message: error.message
        });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log('TTFUND_APIKEY configured:', process.env.TTFUND_APIKEY ? 'Yes' : 'No');
        console.log('VOLCENGINE_API_KEY configured:', process.env.VOLCENGINE_API_KEY ? 'Yes' : 'No');
        console.log('VOLCENGINE_API_BASE:', process.env.VOLCENGINE_API_BASE || 'Not set');
    });
}

module.exports = app;
