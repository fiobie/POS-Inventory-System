// Dashboard JavaScript

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof PersistUtils !== 'undefined') PersistUtils.applyTabPersistence('dashboard');
    initializeCharts();
    setupNavigation();
    setupClickableCards();
    setupSidebarToggle();
    updateInventoryKPIs();
    initializeReports();
    setupReportButtons();
});

// Setup responsive sidebar toggle
function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.add('show');
            sidebarOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', function() {
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('show');
            document.body.style.overflow = '';
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('show');
            document.body.style.overflow = '';
        });
    }

    // Close sidebar when clicking on nav items (mobile)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show');
                sidebarOverlay.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    });
}

// Logout confirmation + success modals
// Setup navigation functionality
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Only prevent default if there's no valid href (like #)
            if (!href || href === '#') {
                e.preventDefault();
                
                // Remove active class from all items
                navItems.forEach(nav => nav.classList.remove('active'));
                
                // Add active class to clicked item
                this.classList.add('active');
                
                const page = this.getAttribute('data-page');
                console.log(`Navigating to: ${page}`);
            }
            // If href exists and is valid, let the browser handle navigation naturally
        });
    });
}

// Setup clickable KPI cards to navigate to Inventory
function setupClickableCards() {
    const clickableCards = document.querySelectorAll('.kpi-card.clickable[data-navigate]');
    
    clickableCards.forEach(card => {
        card.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-navigate');
            const inventoryNav = document.querySelector(`.nav-item[data-page="${targetPage}"]`);
            
            if (inventoryNav) {
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                inventoryNav.classList.add('active');
                
                this.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
                
                const href = inventoryNav.getAttribute('href');
                if (href) {
                    window.location.href = href;
                } else {
                    window.location.href = `${targetPage}.html`;
                }
            }
        });
        
        // Add keyboard accessibility
        card.setAttribute('tabindex', '0');
        card.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
}

// Update dashboard inventory KPIs from stored inventory
function updateInventoryKPIs() {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    fetch('api/inventory.php?action=summary')
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(json => {
            const s = json.summary || {};
            setText('productsInStock', s.productsInStock || 0);
            setText('totalItems', s.totalItems || 0);
            setText('lowStock', s.lowStock || 0);
            setText('outOfStock', s.outOfStock || 0);
            const tv = document.getElementById('totalValue');
            if (tv) {
                const val = Number(s.totalValue || 0);
                tv.textContent = FormatUtils ? FormatUtils.currency(val) : `₱${val.toFixed(2)}`;
            }
        })
        .catch(() => {
            if (typeof showToast === 'function') {
                try { showToast({ message: 'Dashboard data loaded from local storage', kind: 'info' }); } catch (_) {}
            }
            try {
                const storage = new StorageManager('bonbonInventory');
                const data = (storage.get([]) || []).filter(item => item.category !== 'cups');
                const TH = 10;
                const toNum = v => Number(v) || 0;
                const productsInStock = data.filter(item => toNum(item.stock) > 0).length;
                const totalProducts = data.length;
                const lowStock = data.filter(item => {
                    const stock = toNum(item.stock);
                    const rl = toNum(item.reorder_level);
                    if (stock <= 0) return false;
                    if (rl > 0) return stock <= rl;
                    return stock <= TH;
                }).filter(item => item.category !== 'bubbletea' && item.category !== 'chicken').length;
                const outOfStock = data.filter(item => toNum(item.stock) === 0).length;
                const totalValueNum = data.reduce((sum, item) => sum + toNum(item.price) * toNum(item.stock), 0);
                setText('productsInStock', productsInStock);
                setText('totalItems', totalProducts);
                setText('lowStock', lowStock);
                setText('outOfStock', outOfStock);
                const tv = document.getElementById('totalValue');
                if (tv) tv.textContent = FormatUtils ? FormatUtils.currency(totalValueNum) : `₱${totalValueNum.toFixed(2)}`;
            } catch (_) {}
        });
}

// Initialize charts with empty/placeholder data
async function initializeCharts() {
    const salesCanvas = document.getElementById('salesChart');
    const pieCanvas = document.getElementById('pieChart');
    const bubbleTeaCanvas = document.getElementById('bubbleTeaChart');
    try {
        const json = await NetUtils.fetchJson('api/pos.php?action=analytics', {}, { ttl: 5000, retries: 1, key: 'analytics:current' });
        if (json) {
            if (salesCanvas && Array.isArray(json.monthlyTotals)) {
                const ctx = salesCanvas.getContext('2d');
                salesCanvas.width = salesCanvas.offsetWidth;
                salesCanvas.height = salesCanvas.offsetHeight;
                drawSalesBarChart(ctx, salesCanvas.width, salesCanvas.height, json.monthlyTotals.map(v => Number(v)||0), 20000);
            }
            if (pieCanvas) {
                const pieCtx = pieCanvas.getContext('2d');
                pieCanvas.width = pieCanvas.offsetWidth;
                pieCanvas.height = pieCanvas.offsetHeight;
                const data = Array.isArray(json.topChicken) ? json.topChicken : [];
                if (data.length) drawPieChart(pieCtx, pieCanvas.width, pieCanvas.height, data);
                else drawPlaceholderPieChart(pieCtx, pieCanvas.width, pieCanvas.height);
            }
            if (bubbleTeaCanvas) {
                const btCtx = bubbleTeaCanvas.getContext('2d');
                bubbleTeaCanvas.width = bubbleTeaCanvas.offsetWidth;
                bubbleTeaCanvas.height = bubbleTeaCanvas.offsetHeight;
                const data = Array.isArray(json.topBubbleTea) ? json.topBubbleTea : [];
                if (data.length) drawPieChart(btCtx, bubbleTeaCanvas.width, bubbleTeaCanvas.height, data);
                else drawPlaceholderPieChart(btCtx, bubbleTeaCanvas.width, bubbleTeaCanvas.height);
            }
            setProfitKpis(json);
        } else { throw new Error('analytics_failed'); }
    } catch (_) {
        if (salesCanvas) {
            const ctx = salesCanvas.getContext('2d');
            salesCanvas.width = salesCanvas.offsetWidth;
            salesCanvas.height = salesCanvas.offsetHeight;
            const totals = computeMonthlySales();
            drawSalesBarChart(ctx, salesCanvas.width, salesCanvas.height, totals, 20000);
        }
        if (pieCanvas) {
            const pieCtx = pieCanvas.getContext('2d');
            pieCanvas.width = pieCanvas.offsetWidth;
            pieCanvas.height = pieCanvas.offsetHeight;
            const chickenNames = ['Cloy Honey Soy','Boombayah','Honey Butter Night','Oppa BB-Q','Chijeu Chikin','Olenji Chikin','Salted Egg Chikin','Yangneom Nom','Bonbon Buldak','Snow Cheese','Honey Mustard Chikin'];
            const chickenTop = computeMonthlyTop(chickenNames);
            if (chickenTop.length) drawPieChart(pieCtx, pieCanvas.width, pieCanvas.height, chickenTop);
            else drawPlaceholderPieChart(pieCtx, pieCanvas.width, pieCanvas.height);
        }
        if (bubbleTeaCanvas) {
            const btCtx = bubbleTeaCanvas.getContext('2d');
            bubbleTeaCanvas.width = bubbleTeaCanvas.offsetWidth;
            bubbleTeaCanvas.height = bubbleTeaCanvas.offsetHeight;
            const bubbleTeaNames = ['Classic','Wintermelon','Okinawa','Cookies & Cream','Matcha','Taro','Strawberry','Chocolate','Brown Sugar'];
            const bubbleTop = computeMonthlyTop(bubbleTeaNames);
            if (bubbleTop.length) drawPieChart(btCtx, bubbleTeaCanvas.width, bubbleTeaCanvas.height, bubbleTop);
            else drawPlaceholderPieChart(btCtx, bubbleTeaCanvas.width, bubbleTeaCanvas.height);
        }
        setProfitKpis(null);
    }

    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            initializeCharts();
        }, 250);
    });
}

// Draw placeholder bar chart
function drawSalesBarChart(ctx, width, height, monthlyTotals, maxValue) {
    ctx.clearRect(0, 0, width, height);
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / 12;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        const label = (maxValue - (i * (maxValue / 4)));
        ctx.fillText(Math.round(label).toString(), padding - 10, y + 4);
    }
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const maxData = Math.max(...monthlyTotals);
    const scale = maxValue > 0 ? chartHeight / maxValue : 0;
    for (let i = 0; i < 12; i++) {
        const x = padding + (i + 0.5) * barWidth;
        const value = monthlyTotals[i] || 0;
        const barHeight = Math.max(0, Math.min(chartHeight, value * scale));
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(x - barWidth / 2 + 10, padding + chartHeight - barHeight, barWidth - 20, barHeight);
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(months[i], x, height - padding + 20);
    }
    if (!maxData || maxData <= 0) {
        ctx.fillStyle = '#999';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', width / 2, height / 2);
    }
}

function computeMonthlySales() {
    try {
        const raw = localStorage.getItem('bonbonPosOrders');
        const orders = raw ? JSON.parse(raw) : [];
        const now = new Date();
        const year = now.getFullYear();
        const totals = new Array(12).fill(0);
        orders.forEach(o => {
            const d = new Date(o.dateISO || o.dateDisplay || now);
            if (d.getFullYear() !== year) return;
            const m = d.getMonth();
            const t = Number(o.total) || 0;
            totals[m] += t;
        });
        return totals;
    } catch (e) {
        return new Array(12).fill(0);
    }
}

// Draw placeholder pie chart
function drawPlaceholderPieChart(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#999';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', centerX, centerY);
    
    const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];
    const colors = ['#FF8C00', '#8B0000', '#FFD700', '#8B4513', '#DC143C'];

    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';

    const swatchSize = 14;
    const swatchGap = 6;
    const itemGap = 24;
    const itemWidths = items.map(label => swatchSize + swatchGap + ctx.measureText(label).width);
    const totalLegendWidth = itemWidths.reduce((a, b) => a + b, 0) + itemGap * (items.length - 1);

    let y = Math.min(height - 18, centerY + radius + 28);
    let x = Math.max(12, (width - totalLegendWidth) / 2);

    items.forEach((label, index) => {
        const color = colors[index];
        const w = itemWidths[index];

        if (x + w > width - 12) {
            x = 12;
            y += 22;
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, y - swatchSize / 2, swatchSize, swatchSize);

        ctx.fillStyle = '#666';
        ctx.fillText(label, x + swatchSize + swatchGap, y + 4);

        x += w + itemGap;
    });
}

// Compute monthly top N (up to 5) labels from local orders
function computeMonthlyTop(allowedNames) {
    try {
        const raw = localStorage.getItem('bonbonPosOrders');
        const orders = raw ? JSON.parse(raw) : [];
        const now = new Date();
        const m = now.getMonth();
        const y = now.getFullYear();
        const counts = new Map();

        orders.forEach(order => {
            const d = new Date(order.dateISO || order.dateDisplay || now);
            if (d.getMonth() !== m || d.getFullYear() !== y) return;
            if (!Array.isArray(order.items)) return;
            order.items.forEach(item => {
                const base = (item.baseName || item.name || '').replace(/\s*\(.*\)$/, '');
                if (!base) return;
                if (allowedNames && !allowedNames.includes(base)) return;
                const qty = Number(item.quantity) || 0;
                counts.set(base, (counts.get(base) || 0) + qty);
            });
        });

        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    } catch (e) {
        console.warn('Failed to compute monthly top items', e);
        return [];
    }
}

// Draw real pie chart with up to 5 slices and horizontal legend
function drawPieChart(ctx, width, height, data) {
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    const palette = ['#FF8C00', '#8B0000', '#FFD700', '#8B4513', '#DC143C'];
    const total = data.reduce((sum, [, count]) => sum + count, 0);
    let startAngle = -Math.PI / 2;

    data.forEach(([label, count], i) => {
        const angle = total > 0 ? (count / total) * Math.PI * 2 : 0;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
        ctx.closePath();
        ctx.fillStyle = palette[i % palette.length];
        ctx.fill();
        startAngle += angle;
    });

    ctx.fillStyle = '#666';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    if (total === 0) {
        ctx.fillText('No data available', centerX, centerY);
    }

    // Legend
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    const swatchSize = 14;
    const swatchGap = 6;
    const itemGap = 24;
    const labels = data.map(([label]) => label);
    const itemWidths = labels.map(label => swatchSize + swatchGap + ctx.measureText(label).width);
    const totalLegendWidth = itemWidths.reduce((a, b) => a + b, 0) + itemGap * (labels.length - 1);
    let y = Math.min(height - 18, centerY + radius + 28);
    let x = Math.max(12, (width - totalLegendWidth) / 2);
    labels.forEach((label, i) => {
        const w = itemWidths[i];
        if (x + w > width - 12) {
            x = 12;
            y += 22;
        }
        ctx.fillStyle = palette[i % palette.length];
        ctx.fillRect(x, y - swatchSize / 2, swatchSize, swatchSize);
        ctx.fillStyle = '#666';
        ctx.fillText(label, x + swatchSize + swatchGap, y + 4);
        x += w + itemGap;
    });
}

function setProfitKpis(server) {
    const fmtCurrency = (val) => {
        try { return FormatUtils.currency(Number(val || 0)); } catch (_) { const n = Number(val || 0); return `₱${n.toFixed(2)}`; }
    };
    const todayEl = document.getElementById('todayProfit');
    const monthEl = document.getElementById('monthlyProfit');
    const aovEl = document.getElementById('avgOrderValue');
    if (server && typeof server === 'object') {
        if (todayEl) todayEl.textContent = fmtCurrency(server.todayProfit);
        if (monthEl) monthEl.textContent = fmtCurrency(server.monthProfit);
        if (aovEl) aovEl.textContent = fmtCurrency(server.avgOrderValue);
        return;
    }
    try {
        const raw = localStorage.getItem('bonbonPosOrders');
        const orders = raw ? JSON.parse(raw) : [];
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const todayStr = now.toISOString().slice(0,10);
        let today = 0, month = 0, count = 0;
        for (const o of orders) {
            const d = new Date(o.dateISO || o.dateDisplay || now);
            const ds = d.toISOString().slice(0,10);
            if (ds === todayStr) today += Number(o.total) || 0;
            if (d.getFullYear() === y && d.getMonth() === m) { month += Number(o.total) || 0; count++; }
        }
        const aov = count ? (month / count) : 0;
        if (todayEl) todayEl.textContent = fmtCurrency(today);
        if (monthEl) monthEl.textContent = fmtCurrency(month);
        if (aovEl) aovEl.textContent = fmtCurrency(aov);
    } catch (_) {
        if (todayEl) todayEl.textContent = fmtCurrency(0);
        if (monthEl) monthEl.textContent = fmtCurrency(0);
        if (aovEl) aovEl.textContent = fmtCurrency(0);
    }
}

// Initialize Reports
async function initializeReports() {
    await loadSalesReport('month');
    await loadInventoryReport();
}

// Setup Report Buttons
function setupReportButtons() {
    const buttons = ['todayReportBtn', 'weekReportBtn', 'monthReportBtn', 'yearReportBtn'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', function() {
                // Remove active class from all buttons
                buttons.forEach(id => {
                    const b = document.getElementById(id);
                    if (b) b.classList.remove('active');
                });
                // Add active class to clicked button
                this.classList.add('active');
                
                const period = btnId.replace('ReportBtn', '');
                loadSalesReport(period);
            });
        }
    });
    
    // Set month as default active
    const monthBtn = document.getElementById('monthReportBtn');
    if (monthBtn) monthBtn.classList.add('active');
}

// Load Sales Report
async function loadSalesReport(period = 'month') {
    try {
        const res = await fetch(`api/pos.php?action=analytics&period=${period}`);
        const json = await res.ok ? await res.json() : {};
        
        const fmtCurrency = (val) => {
            try { return FormatUtils.currency(Number(val || 0)); } catch (_) { 
                const n = Number(val || 0); 
                return `₱${n.toFixed(2)}`; 
            }
        };
        
        // Calculate period-specific data
        const now = new Date();
        let startDate, endDate;
        
        switch(period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - dayOfWeek);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;
        }
        
        // Fetch detailed sales data
        const salesRes = await fetch(`api/pos.php?action=sales_report&start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
        const salesData = salesRes.ok ? await salesRes.json() : { total: 0, orders: 0, avgOrder: 0, bestSeller: null };
        
        const totalSalesEl = document.getElementById('totalSales');
        const totalOrdersEl = document.getElementById('totalOrders');
        const avgOrderValueEl = document.getElementById('avgOrderValueReport');
        const bestSellingItemEl = document.getElementById('bestSellingItem');
        
        if (totalSalesEl) totalSalesEl.textContent = fmtCurrency(salesData.total || json.monthProfit || 0);
        if (totalOrdersEl) totalOrdersEl.textContent = (salesData.orders || 0).toString();
        if (avgOrderValueEl) avgOrderValueEl.textContent = fmtCurrency(salesData.avgOrder || json.avgOrderValue || 0);
        if (bestSellingItemEl) bestSellingItemEl.textContent = salesData.bestSeller || '—';
        
    } catch (error) {
        console.error('Failed to load sales report:', error);
    }
}

// Load Inventory Report
async function loadInventoryReport() {
    try {
        const res = await fetch('api/inventory.php?action=summary');
        const json = await res.ok ? await res.json() : {};
        const summary = json.summary || {};
        
        const fmtCurrency = (val) => {
            try { return FormatUtils.currency(Number(val || 0)); } catch (_) { 
                const n = Number(val || 0); 
                return `₱${n.toFixed(2)}`; 
            }
        };
        
        const lowStockEl = document.getElementById('lowStockReport');
        const outOfStockEl = document.getElementById('outOfStockReport');
        const totalInventoryValueEl = document.getElementById('totalInventoryValue');
        const needsReorderEl = document.getElementById('needsReorder');
        
        if (lowStockEl) lowStockEl.textContent = (summary.lowStock || 0).toString();
        if (outOfStockEl) outOfStockEl.textContent = (summary.outOfStock || 0).toString();
        if (totalInventoryValueEl) totalInventoryValueEl.textContent = fmtCurrency(summary.totalValue || 0);
        if (needsReorderEl) needsReorderEl.textContent = ((summary.lowStock || 0) + (summary.outOfStock || 0)).toString();
        
    } catch (error) {
        console.error('Failed to load inventory report:', error);
    }
}

// Smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';
