// Dashboard JavaScript

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    setupNavigation();
    setupClickableCards();
});

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
            
            // Find and click the inventory nav item
            const inventoryNav = document.querySelector(`.nav-item[data-page="${targetPage}"]`);
            
            if (inventoryNav) {
                // Remove active from all nav items
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                
                // Add active to inventory
                inventoryNav.classList.add('active');
                
                // Visual feedback
                this.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
                
                console.log(`Navigating to: ${targetPage}`);
                
                // You can add actual navigation logic here later
                // For example: window.location.href = `${targetPage}.html`;
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

// Initialize charts with empty/placeholder data
function initializeCharts() {
    // Sales Bar Chart
    const salesCanvas = document.getElementById('salesChart');
    if (salesCanvas) {
        const salesCtx = salesCanvas.getContext('2d');
        
        // Set canvas size
        salesCanvas.width = salesCanvas.offsetWidth;
        salesCanvas.height = salesCanvas.offsetHeight;
        
        // Draw placeholder chart
        drawPlaceholderBarChart(salesCtx, salesCanvas.width, salesCanvas.height);
    }
    
    // Pie Chart
    const pieCanvas = document.getElementById('pieChart');
    if (pieCanvas) {
        const pieCtx = pieCanvas.getContext('2d');
        
        // Set canvas size
        pieCanvas.width = pieCanvas.offsetWidth;
        pieCanvas.height = pieCanvas.offsetHeight;
        
        // Draw placeholder pie chart
        drawPlaceholderPieChart(pieCtx, pieCanvas.width, pieCanvas.height);
    }

    // Bubble Tea Pie Chart
    const bubbleTeaCanvas = document.getElementById('bubbleTeaChart');
    if (bubbleTeaCanvas) {
        const bubbleTeaCtx = bubbleTeaCanvas.getContext('2d');

        bubbleTeaCanvas.width = bubbleTeaCanvas.offsetWidth;
        bubbleTeaCanvas.height = bubbleTeaCanvas.offsetHeight;

        drawPlaceholderPieChart(bubbleTeaCtx, bubbleTeaCanvas.width, bubbleTeaCanvas.height);
    }
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            initializeCharts();
        }, 250);
    });
}

// Draw placeholder bar chart
function drawPlaceholderBarChart(ctx, width, height) {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Chart dimensions
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    const barWidth = chartWidth / 5;
    const maxValue = 20;
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Y-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((maxValue - (i * 5)).toString(), padding - 10, y + 4);
    }
    
    // Draw bars (placeholder - empty bars)
    const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4'];
    const colors = ['#FFD700', '#8B4513', '#FF8C00', '#8B0000'];
    
    items.forEach((item, index) => {
        const x = padding + (index + 1) * barWidth;
        const barHeight = 0; // Empty bars for placeholder
        
        // Draw bar background (empty)
        ctx.fillStyle = colors[index];
        ctx.fillRect(x - barWidth / 2 + 10, padding + chartHeight - barHeight, barWidth - 20, barHeight);
        
        // X-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item, x, height - padding + 20);
    });
    
    // Draw "No Data" message
    ctx.fillStyle = '#999';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', width / 2, height / 2);
}

// Draw placeholder pie chart
function drawPlaceholderPieChart(ctx, width, height) {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Chart center and radius
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    // Draw empty circle
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw "No Data" message
    ctx.fillStyle = '#999';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', centerX, centerY);
    
    // Draw placeholder legend
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const colors = ['#FF8C00', '#8B0000', '#FFD700'];
    const startY = centerY + radius + 30;
    
    items.forEach((item, index) => {
        const y = startY + (index * 25);
        
        // Color box
        ctx.fillStyle = colors[index];
        ctx.fillRect(centerX - 100, y - 10, 15, 15);
        
        // Label
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(item, centerX - 80, y + 3);
    });
}

// Smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';
