// 基金AI分析 - 主应用逻辑

// DOM元素
const fundCodeInput = document.getElementById('fundCodeInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loading = document.getElementById('loading');
const errorCard = document.getElementById('errorCard');
const resultSection = document.getElementById('resultSection');
const analysisContent = document.getElementById('analysisContent');

// TTFund API封装 - 通过后端API调用
const TTFundAPI = {
    // 获取基金基本信息
    getFundInfo: async function(code) {
        const url = `/api/fund/${code}`;
        const response = await axios.get(url);
        if (response.data && response.data.code === 0 && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || '获取基金信息失败');
    },

    // 获取最新净值行情
    getLatestQuote: async function(code) {
        const url = `/api/quote/${code}`;
        const response = await axios.get(url);
        if (response.data && response.data.code === 0 && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || '获取行情失败');
    },

    // 获取持仓行业分布
    getHoldingIndustries: async function(code) {
        const url = `/api/industries/${code}`;
        const response = await axios.get(url);
        if (response.data && response.data.code === 0 && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.message || '获取持仓信息失败');
    }
};

// 火山引擎API封装 - 通过后端API调用
const VolcEngineAPI = {
    // 调用大模型生成分析
    generateAnalysis: async function(prompt) {
        const requestBody = {
            model: CONFIG.VOLCENGINE_MODEL,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        };

        try {
            const response = await axios.post('/api/analyze', requestBody);
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            }
            throw new Error('返回格式错误');
        } catch (error) {
            console.error('火山引擎API调用失败:', error);
            throw new Error('AI分析生成失败: ' + (error.response?.data?.error?.message || error.message));
        }
    }
};

// 主分析流程
async function analyzeFund() {
    const code = fundCodeInput.value.trim();

    if (!code) {
        showError('请输入基金代码');
        return;
    }

    if (code.length !== 6) {
        showError('基金代码应为6位数字');
        return;
    }

    try {
        // 显示加载状态
        setLoading(true);
        hideError();
        hideResult();

        // 1. 获取基金基本信息
        const fundInfo = await TTFundAPI.getFundInfo(code);
        const fundName = fundInfo.name || '未知';

        // 2. 获取最新行情
        const quote = await TTFundAPI.getLatestQuote(code);
        const netValue = quote.net_value || quote.unit_value || '--';
        const changePct = quote.change_percent || quote.day_gain || '--';

        // 3. 获取持仓行业
        const industries = await TTFundAPI.getHoldingIndustries(code);
        let sectorList = industries.sector_summary || '暂无持仓板块信息';
        if (industries && industries.industries && industries.industries.length > 0) {
            // 取前5大持仓行业
            const topSectors = industries.industries.slice(0, 5);
            sectorList = topSectors.map(item => {
                return `${item.name}（占比${item.weight}%）今日涨跌幅${item.change || '--'}%`;
            }).join('，');
        }

        // 4. 构造提示词
        const prompt = FundPrompts.buildPrompt({
            fund_name: fundName,
            fund_code: code,
            change_pct: changePct,
            recent_days_change: null,
            sector_list: sectorList
        });

        // 5. 调用火山引擎生成分析
        const analysis = await VolcEngineAPI.generateAnalysis(prompt);

        // 6. 渲染结果
        renderResult({
            fundName,
            code,
            netValue,
            changePct,
            analysis
        });

        console.log('分析完成', { fundName, code, netValue, changePct, sectorList, analysis });

    } catch (error) {
        console.error('分析出错:', error);
        // 提取服务端返回的具体错误信息
        const detail = error.response?.data?.message || error.response?.data?.error || '';
        showError(error.message + (detail ? `\n详情：${detail}` : ''));
    } finally {
        setLoading(false);
    }
}

// UI辅助函数
function setLoading(isLoading) {
    if (isLoading) {
        loading.style.display = 'block';
        analyzeBtn.disabled = true;
    } else {
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
    }
}

function showError(message) {
    errorCard.style.display = 'block';
    errorCard.textContent = message;
}

function hideError() {
    errorCard.style.display = 'none';
}

function hideResult() {
    resultSection.style.display = 'none';
}

function renderResult(data) {
    const { fundName, code, netValue, changePct, analysis } = data;

    // 填充基本信息
    document.getElementById('fundName').textContent = fundName;
    document.getElementById('fundCode').textContent = code;
    document.getElementById('netValue').textContent = netValue;

    const changePercentEl = document.getElementById('changePercent');
    changePercentEl.textContent = `${parseFloat(changePct) > 0 ? '+' : ''}${changePct}%`;

    // 设置涨跌颜色
    if (parseFloat(changePct) > 0) {
        changePercentEl.classList.add('change-positive');
        changePercentEl.classList.remove('change-negative');
    } else {
        changePercentEl.classList.add('change-negative');
        changePercentEl.classList.remove('change-positive');
    }

    // 渲染分析内容 - 将换行转换为<p>
    const paragraphs = analysis.split('\n').filter(p => p.trim());
    analysisContent.innerHTML = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');

    // 显示结果
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

// 绑定事件
analyzeBtn.addEventListener('click', analyzeFund);
fundCodeInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        analyzeFund();
    }
});

// 快捷键：回车触发分析
fundCodeInput.focus();
