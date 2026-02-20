// ===== 股票数据模型 =====
const STOCKS = [
    { code: '600519', name: '贵州茅台', basePrice: 1688.00, sector: '白酒' },
    { code: '000858', name: '五粮液', basePrice: 142.50, sector: '白酒' },
    { code: '601318', name: '中国平安', basePrice: 48.60, sector: '金融' },
    { code: '600036', name: '招商银行', basePrice: 35.80, sector: '金融' },
    { code: '000001', name: '平安银行', basePrice: 11.25, sector: '金融' },
    { code: '300750', name: '宁德时代', basePrice: 198.30, sector: '新能源' },
    { code: '002594', name: '比亚迪', basePrice: 268.40, sector: '新能源' },
    { code: '601012', name: '隆基绿能', basePrice: 22.15, sector: '新能源' },
    { code: '000333', name: '美的集团', basePrice: 62.80, sector: '家电' },
    { code: '600900', name: '长江电力', basePrice: 28.30, sector: '电力' },
];

const INDICES = [
    { name: '上证指数', code: 'SH000001', baseValue: 3245.68 },
    { name: '深证成指', code: 'SZ399001', baseValue: 10856.32 },
    { name: '创业板指', code: 'SZ399006', baseValue: 2168.45 },
];

// ===== 状态管理 =====
const state = {
    stocks: [],
    indices: [],
    selectedStock: null,
    priceHistory: {},      // code -> [prices]
    volumeHistory: {},     // code -> [volumes]
    timeLabels: [],
    priceChart: null,
    volumeChart: null,
    filter: 'all',
};

// ===== 数据模拟引擎 =====
function initStockData() {
    const now = new Date();
    // 生成过去 60 个时间点
    for (let i = 59; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 2000);
        state.timeLabels.push(formatTime(t));
    }

    state.stocks = STOCKS.map(s => {
        const volatility = s.basePrice * 0.002; // 0.2% 波动
        const prices = generatePriceSeries(s.basePrice, 60, volatility);
        const volumes = generateVolumeSeries(60);
        const currentPrice = prices[prices.length - 1];
        const openPrice = prices[0];
        const change = currentPrice - openPrice;
        const changePercent = (change / openPrice) * 100;

        state.priceHistory[s.code] = prices;
        state.volumeHistory[s.code] = volumes;

        return {
            ...s,
            price: currentPrice,
            open: openPrice,
            high: Math.max(...prices),
            low: Math.min(...prices),
            change,
            changePercent,
            volume: volumes.reduce((a, b) => a + b, 0),
            turnover: (Math.random() * 3 + 0.5).toFixed(2),
        };
    });

    state.indices = INDICES.map(idx => {
        const vol = idx.baseValue * 0.001;
        const value = idx.baseValue + (Math.random() - 0.5) * vol * 10;
        const change = value - idx.baseValue;
        const changePercent = (change / idx.baseValue) * 100;
        return { ...idx, value, change, changePercent };
    });

    state.selectedStock = state.stocks[0];
}

function generatePriceSeries(base, count, volatility) {
    const prices = [base];
    for (let i = 1; i < count; i++) {
        const drift = (Math.random() - 0.498) * volatility; // 轻微上行偏差
        const newPrice = Math.max(prices[i - 1] + drift, base * 0.9);
        prices.push(parseFloat(newPrice.toFixed(2)));
    }
    return prices;
}

function generateVolumeSeries(count) {
    return Array.from({ length: count }, () =>
        Math.floor(Math.random() * 5000 + 1000)
    );
}

function updateTick() {
    const now = new Date();
    state.timeLabels.push(formatTime(now));
    if (state.timeLabels.length > 60) state.timeLabels.shift();

    state.stocks.forEach(stock => {
        const volatility = stock.basePrice * 0.002;
        const lastPrice = state.priceHistory[stock.code].slice(-1)[0];
        const drift = (Math.random() - 0.498) * volatility;
        const newPrice = parseFloat(Math.max(lastPrice + drift, stock.basePrice * 0.9).toFixed(2));
        const newVol = Math.floor(Math.random() * 5000 + 1000);

        state.priceHistory[stock.code].push(newPrice);
        state.volumeHistory[stock.code].push(newVol);
        if (state.priceHistory[stock.code].length > 60) state.priceHistory[stock.code].shift();
        if (state.volumeHistory[stock.code].length > 60) state.volumeHistory[stock.code].shift();

        const prices = state.priceHistory[stock.code];
        stock.price = newPrice;
        stock.change = newPrice - prices[0];
        stock.changePercent = (stock.change / prices[0]) * 100;
        stock.high = Math.max(...prices);
        stock.low = Math.min(...prices);
        stock.volume += newVol;
    });

    // 更新指数
    state.indices.forEach(idx => {
        const vol = idx.baseValue * 0.0005;
        const drift = (Math.random() - 0.5) * vol;
        idx.value = parseFloat((idx.value + drift).toFixed(2));
        idx.change = idx.value - idx.baseValue;
        idx.changePercent = (idx.change / idx.baseValue) * 100;
    });
}

// ===== 渲染函数 =====
function renderIndices() {
    const container = document.getElementById('index-cards');
    container.innerHTML = state.indices.map(idx => {
        const dir = idx.change >= 0 ? 'up' : 'down';
        const sign = idx.change >= 0 ? '+' : '';
        return `
            <div class="index-card ${dir}">
                <div class="index-name">${idx.name}</div>
                <div class="index-value">${idx.value.toFixed(2)}</div>
                <div class="index-change">${sign}${idx.change.toFixed(2)}  ${sign}${idx.changePercent.toFixed(2)}%</div>
            </div>
        `;
    }).join('');
}

function renderStockList() {
    const container = document.getElementById('stock-list');
    const filtered = state.stocks.filter(s => {
        if (state.filter === 'up') return s.change >= 0;
        if (state.filter === 'down') return s.change < 0;
        return true;
    });

    container.innerHTML = filtered.map(stock => {
        const dir = stock.change >= 0 ? 'up' : 'down';
        const sign = stock.change >= 0 ? '+' : '';
        const isActive = state.selectedStock && state.selectedStock.code === stock.code;
        return `
            <div class="stock-item ${isActive ? 'active' : ''}" data-code="${stock.code}">
                <div class="stock-item-left">
                    <span class="stock-name">${stock.name}</span>
                    <span class="stock-code">${stock.code}</span>
                </div>
                <div class="stock-item-right">
                    <span class="stock-price" style="color: var(--${dir === 'up' ? 'red' : 'green'})">${stock.price.toFixed(2)}</span>
                    <span class="stock-change-badge ${dir}">${sign}${stock.changePercent.toFixed(2)}%</span>
                </div>
            </div>
        `;
    }).join('');

    // 绑定点击
    container.querySelectorAll('.stock-item').forEach(el => {
        el.addEventListener('click', () => {
            const code = el.dataset.code;
            state.selectedStock = state.stocks.find(s => s.code === code);
            renderStockList();
            updateChartData();
            renderDetail();
        });
    });
}

function renderDetail() {
    const s = state.selectedStock;
    if (!s) return;

    // 更新头部
    document.getElementById('chart-stock-name').textContent = s.name;
    document.getElementById('chart-stock-code').textContent = s.code;

    const dir = s.change >= 0;
    const sign = dir ? '+' : '';
    const color = dir ? 'var(--red)' : 'var(--green)';

    document.getElementById('price-main').textContent = s.price.toFixed(2);
    document.getElementById('price-main').style.color = color;
    document.getElementById('price-change').textContent = `${sign}${s.change.toFixed(2)}  ${sign}${s.changePercent.toFixed(2)}%`;
    document.getElementById('price-change').style.color = color;

    // 详情面板
    const details = [
        { label: '开盘', value: s.open.toFixed(2) },
        { label: '最高', value: s.high.toFixed(2), color: 'var(--red)' },
        { label: '最低', value: s.low.toFixed(2), color: 'var(--green)' },
        { label: '成交量', value: formatVolume(s.volume) },
        { label: '涨跌额', value: (s.change >= 0 ? '+' : '') + s.change.toFixed(2), color: s.change >= 0 ? 'var(--red)' : 'var(--green)' },
        { label: '涨跌幅', value: (s.changePercent >= 0 ? '+' : '') + s.changePercent.toFixed(2) + '%', color: s.changePercent >= 0 ? 'var(--red)' : 'var(--green)' },
        { label: '换手率', value: s.turnover + '%' },
        { label: '板块', value: s.sector },
    ];

    document.getElementById('detail-grid').innerHTML = details.map(d => `
        <div class="detail-item">
            <span class="detail-label">${d.label}</span>
            <span class="detail-value" ${d.color ? `style="color:${d.color}"` : ''}>${d.value}</span>
        </div>
    `).join('');
}

// ===== Chart.js =====
function initCharts() {
    const priceCtx = document.getElementById('price-chart').getContext('2d');
    const volumeCtx = document.getElementById('volume-chart').getContext('2d');

    const s = state.selectedStock;
    const prices = state.priceHistory[s.code];
    const isUp = prices[prices.length - 1] >= prices[0];

    const lineColor = isUp ? '#ef4444' : '#10b981';
    const fillColor = isUp
        ? 'rgba(239, 68, 68, 0.08)'
        : 'rgba(16, 185, 129, 0.08)';

    state.priceChart = new Chart(priceCtx, {
        type: 'line',
        data: {
            labels: state.timeLabels.slice(),
            datasets: [{
                data: prices.slice(),
                borderColor: lineColor,
                backgroundColor: fillColor,
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHitRadius: 10,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    borderWidth: 1,
                    titleColor: '#94a3b8',
                    bodyColor: '#f1f5f9',
                    bodyFont: { weight: '600', size: 14 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => `¥ ${ctx.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 8 },
                    border: { display: false },
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#64748b', font: { size: 11 }, callback: v => v.toFixed(2) },
                    border: { display: false },
                }
            }
        }
    });

    const volumes = state.volumeHistory[s.code];
    state.volumeChart = new Chart(volumeCtx, {
        type: 'bar',
        data: {
            labels: state.timeLabels.slice(),
            datasets: [{
                data: volumes.slice(),
                backgroundColor: volumes.map((_, i) => {
                    const p = state.priceHistory[s.code];
                    return (i > 0 && p[i] >= p[i - 1]) ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';
                }),
                borderRadius: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 8 },
                    border: { display: false },
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#64748b', font: { size: 10 } },
                    border: { display: false },
                }
            }
        }
    });
}

function updateChartData() {
    const s = state.selectedStock;
    if (!s || !state.priceChart) return;

    const prices = state.priceHistory[s.code];
    const volumes = state.volumeHistory[s.code];
    const isUp = prices[prices.length - 1] >= prices[0];
    const lineColor = isUp ? '#ef4444' : '#10b981';
    const fillColor = isUp ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)';

    const pc = state.priceChart;
    pc.data.labels = state.timeLabels.slice();
    pc.data.datasets[0].data = prices.slice();
    pc.data.datasets[0].borderColor = lineColor;
    pc.data.datasets[0].backgroundColor = fillColor;
    pc.update('none');

    const vc = state.volumeChart;
    vc.data.labels = state.timeLabels.slice();
    vc.data.datasets[0].data = volumes.slice();
    vc.data.datasets[0].backgroundColor = volumes.map((_, i) => {
        return (i > 0 && prices[i] >= prices[i - 1]) ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';
    });
    vc.update('none');
}

// ===== 工具函数 =====
function formatTime(date) {
    return date.getHours().toString().padStart(2, '0') + ':' +
        date.getMinutes().toString().padStart(2, '0') + ':' +
        date.getSeconds().toString().padStart(2, '0');
}

function formatVolume(vol) {
    if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿';
    if (vol >= 10000) return (vol / 10000).toFixed(1) + '万';
    return vol.toString();
}

function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent =
        now.getFullYear() + '-' +
        (now.getMonth() + 1).toString().padStart(2, '0') + '-' +
        now.getDate().toString().padStart(2, '0') + ' ' +
        formatTime(now);
}

// ===== 筛选按钮 =====
function initFilters() {
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filter = btn.dataset.filter;
            renderStockList();
        });
    });
}

// ===== 主循环 =====
function tick() {
    updateTick();
    renderIndices();
    renderStockList();
    renderDetail();
    updateChartData();
    updateClock();
}

function init() {
    initStockData();
    renderIndices();
    renderStockList();
    renderDetail();
    initCharts();
    initFilters();
    updateClock();

    // 每 2 秒更新一次
    setInterval(tick, 2000);
    setInterval(updateClock, 1000);
}

document.addEventListener('DOMContentLoaded', init);
