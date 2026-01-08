let products = {
    chicken: [],
    bubbletea: [],
    uncategorized: []
};

function createBubbleTeaProduct(id, name, basePrice, image) {
    return {
        id,
        name,
        category: 'bubbletea',
        image,
        price: basePrice,
        sizes: {
            small: basePrice,
            medium: basePrice + 15,
            large: basePrice + 30
        }
    };
}

let currentOrder = [];
const STORAGE_KEY = 'bonbonPosOrders';
let orderList = loadOrdersFromStorage();
let orderIdCounter = computeNextOrderId();
let currentCategory = 'all';
let selectedOrderDate = getTodayISO();
let nextProductId = getInitialProductId();
let cropperInstance = null;

// Helper function to encode image paths for use in img src
function encodeImagePath(path) {
    if (!path) return null;
    // Just return the path as-is - browsers handle spaces in src attributes
    return path;
}

let API_BASE = 'api';
try {
    const pathParts = window.location.pathname.split('/');
    // Find the Sidebar folder in the path and build API path relative to it
    const sidebarIndex = pathParts.findIndex(p => p.toLowerCase() === 'sidebar');
    if (sidebarIndex !== -1) {
        const basePath = pathParts.slice(0, sidebarIndex + 1).join('/');
        API_BASE = basePath + '/api';
    } else {
        // Fallback: assume api is in same directory
        API_BASE = 'api';
    }
} catch (e) {
    API_BASE = 'api';
}

function toggleOrderSections(show) {
    const orderNotes = document.querySelector('.order-notes');
    const paymentMethod = document.querySelector('.payment-method');
    const totalPrice = document.querySelector('.total-price');
    const confirmBtnContainer = document.querySelector('.confirm-btn-container');

    if (show) {
        setTimeout(() => {
            orderNotes.classList.add('show');
        }, 100);
        setTimeout(() => {
            paymentMethod.classList.add('show');
        }, 200);
        setTimeout(() => {
            totalPrice.classList.add('show');
        }, 300);
        setTimeout(() => {
            confirmBtnContainer.classList.add('show');
        }, 400);
    } else {
        orderNotes.classList.remove('show');
        paymentMethod.classList.remove('show');
        totalPrice.classList.remove('show');
        confirmBtnContainer.classList.remove('show');
    }
}

function loadOrdersFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.warn('Unable to load orders from storage', error);
        return [];
    }
}

function saveOrdersToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orderList));
    } catch (error) {
        console.warn('Unable to save orders to storage', error);
    }
}

function computeNextOrderId() {
    if (!orderList.length) return 1;
    const maxId = Math.max(...orderList.map(order => order.id));
    return maxId + 1;
}

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

function getInitialProductId() {
    const categories = Object.values(products);
    const maxId = categories.reduce((outerMax, items) => {
        const catMax = items.reduce((innerMax, product) => Math.max(innerMax, product.id || 0), 0);
        return Math.max(outerMax, catMax);
    }, 0);
    return maxId + 1;
}

function initializeDateFilter() {
    const dateInput = document.getElementById('orderDateFilter');
    if (dateInput) {
        dateInput.value = selectedOrderDate;
        dateInput.addEventListener('change', (e) => {
            selectedOrderDate = e.target.value || getTodayISO();
            updateOrderListDisplay();
        });
    }

    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportOrdersToCsv);
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportOrdersToPdf);
}

function formatOrderId(id) {
    return `#${id.toString().padStart(4, '0')}`;
}

function capitalize(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

document.addEventListener('DOMContentLoaded', async function () {
    await loadProductsFromServer();
    initializeProducts();
    setupEventListeners();
    setupAddProductModal();
    updateTotalPrice();
    toggleOrderSections(false);
    initializeDateFilter();
});

async function loadProductsFromServer() {
    try {
        const response = await fetch(API_BASE + '/products.php');
        const serverProducts = await response.json();

        if (!Array.isArray(serverProducts)) {
            loadHardcodedProducts();
            return;
        }

        products = {
            chicken: [],
            bubbletea: [],
            uncategorized: []
        };

        serverProducts.forEach(prod => {
            let categoryName = (prod.category_name || '').toLowerCase().trim();
            let category = categoryName;

            if (categoryName.includes('chicken')) {
                category = 'chicken';
            } else if (categoryName.includes('bubble') || categoryName.includes('tea')) {
                category = 'bubbletea';
            } else {
                // For unknown categories, normalize: remove spaces and special chars
                category = categoryName.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || 'uncategorized';
            }

            if (!products[category]) {
                products[category] = [];
            }

            if (category === 'bubbletea' && !prod.sizes) {
                products[category].push({
                    id: prod.product_id,
                    name: prod.name,
                    price: parseFloat(prod.selling_price),
                    category: category,
                    image: prod.image_path || null,
                    sizes: {
                        small: parseFloat(prod.selling_price),
                        medium: parseFloat(prod.selling_price) + 15,
                        large: parseFloat(prod.selling_price) + 30
                    }
                });
            } else {
                products[category].push({
                    id: prod.product_id,
                    name: prod.name,
                    price: parseFloat(prod.selling_price),
                    category: category,
                    image: prod.image_path || null
                });
            }
        });
    } catch (error) {
        console.warn('Could not load products from server:', error);
        loadHardcodedProducts();
    }
}

function loadHardcodedProducts() {
    products.chicken = [
        { id: 1001, name: 'Cloy Honey Soy', price: 149, category: 'chicken', image: 'Bonbon Pics/cloy honey soy.jpg' },
        { id: 1002, name: 'Boombayah', price: 149, category: 'chicken', image: 'Bonbon Pics/boombayah.jpg' },
        { id: 1003, name: 'Honey Butter Night', price: 149, category: 'chicken', image: 'Bonbon Pics/honey butter night.jpg' },
        { id: 1004, name: 'Oppa BB-Q', price: 149, category: 'chicken', image: 'Bonbon Pics/Oppa BB-Q.jpg' },
        { id: 1005, name: 'Chijeu Chikin', price: 149, category: 'chicken', image: 'Bonbon Pics/Chijeu Chikin.jpg' },
        { id: 1006, name: 'Olenji Chikin', price: 149, category: 'chicken', image: 'Bonbon Pics/olenji chikin.jpg' },
        { id: 1007, name: 'Salted Egg Chikin', price: 159, category: 'chicken', image: 'Bonbon Pics/Salted Egg Chikin.jpg' },
        { id: 1008, name: 'Yangneom Nom', price: 159, category: 'chicken', image: 'Bonbon Pics/Yangneom Nom.jpg' },
        { id: 1009, name: 'Bonbon Buldak', price: 159, category: 'chicken', image: 'Bonbon Pics/Bonbon Buldak.jpg' },
        { id: 1010, name: 'Snow Cheese', price: 159, category: 'chicken', image: 'Bonbon Pics/snow cheese.jpg' },
        { id: 1011, name: 'Honey Mustard Chikin', price: 159, category: 'chicken', image: 'Bonbon Pics/Honey Mustard Chikin.jpg' }
    ];

    products.bubbletea = [
        createBubbleTeaProduct(2001, 'Classic', 45, 'Bonbon Pics/Milktea3.jpg'),
        createBubbleTeaProduct(2002, 'Wintermelon', 50, 'Bonbon Pics/Milktea3.jpg'),
        createBubbleTeaProduct(2003, 'Okinawa', 50, 'Bonbon Pics/Milktea3.jpg'),
        createBubbleTeaProduct(2004, 'Cookies & Cream', 60, 'Bonbon Pics/Milktea1.jpg'),
        createBubbleTeaProduct(2005, 'Matcha', 55, 'Bonbon Pics/Milktea4.jpg'),
        createBubbleTeaProduct(2006, 'Taro', 55, 'Bonbon Pics/Milktea4.jpg'),
        createBubbleTeaProduct(2007, 'Strawberry', 55, 'Bonbon Pics/Milktea1.jpg'),
        createBubbleTeaProduct(2008, 'Chocolate', 55, 'Bonbon Pics/Milktea4.jpg'),
        createBubbleTeaProduct(2009, 'Brown Sugar', 80, 'Bonbon Pics/Milktea2.jpg')
    ];
}

// Initialize product display
function initializeProducts() {
    displayProducts(currentCategory);
}

// Display products based on category
function displayProducts(category) {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';

    let productsToShow = [];

    if (category === 'all') {
        productsToShow = [...products.chicken, ...products.bubbletea];
    } else if (category === 'chicken') {
        productsToShow = products.chicken;
    } else if (category === 'bubbletea') {
        productsToShow = products.bubbletea;
    }

    productsToShow.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

// Create product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const encodedImage = encodeImagePath(product.image);
    const productImageContent = encodedImage
        ? `<img src="${encodedImage}" alt="${product.name}" onerror="this.onerror=null;this.src='Bonbon Pics/Logo.png'">`
        : `<i class="fas fa-cloud"></i>`;

    // Check if this is a newly added product (custom property)
    const hasNameOverlay = product.isNew || false;
    const nameOverlayHtml = hasNameOverlay ? `<div class="name-overlay">${product.name}</div>` : '';

    const hasBubbleTeaSizes = product.category === 'bubbletea' && product.sizes;

    if (hasBubbleTeaSizes) {
        const sizeButtons = Object.entries(product.sizes).map(([size, price]) => `
            <button class="size-btn" data-size="${size}" data-price="${price}">
                ${capitalize(size)}
            </button>
        `).join('');

        card.innerHTML = `
            <div class="product-image">
                ${productImageContent}
                ${nameOverlayHtml}
            </div>
            <div class="product-name">${product.name}</div>
            <div class="size-buttons">
                ${sizeButtons}
            </div>
        `;

        card.querySelectorAll('.size-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const size = button.dataset.size;
                const price = parseFloat(button.dataset.price);
                addToOrder(product, size, price);
            });
        });
    } else {
        card.innerHTML = `
            <div class="product-image">
                ${productImageContent}
                ${nameOverlayHtml}
            </div>
            <div class="product-name">${product.name}</div>
            <div class="product-price">Price: ₱${product.price.toFixed(2)}</div>
        `;
        card.addEventListener('click', () => addToOrder(product));
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'product-delete-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'Delete product';
    deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        confirmProductDeletion(product);
    });

    card.appendChild(deleteBtn);

    return card;
}

// Add product to order
function addToOrder(product, size = null, overridePrice = null) {
    const key = size ? `${product.id}-${size}` : `${product.id}`;
    const existingItem = currentOrder.find(item => item.key === key);
    const priceToUse = overridePrice ?? product.price;

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        currentOrder.push({
            key,
            id: product.id,
            name: size ? `${product.name} (${capitalize(size)})` : product.name,
            baseName: product.name,
            size: size,
            price: priceToUse,
            image: product.image || null,
            quantity: 1
        });
    }

    updateOrderDisplay();
    updateTotalPrice();
}

// Update order display
function updateOrderDisplay() {
    const orderItemsContainer = document.getElementById('orderItemsContainer');

    if (currentOrder.length === 0) {
        orderItemsContainer.innerHTML = `
            <div class="empty-order">
                <i class="fas fa-shopping-cart"></i>
                <p>No items in order</p>
            </div>
        `;
        toggleOrderSections(false);
        return;
    }

    orderItemsContainer.innerHTML = '';

    currentOrder.forEach(item => {
        const orderItem = createOrderItem(item);
        orderItemsContainer.appendChild(orderItem);
    });

    toggleOrderSections(true);
}

function createOrderItem(item) {
    const orderItem = document.createElement('div');
    orderItem.className = 'order-item';
    orderItem.dataset.itemKey = item.key;

    const encodedImage = encodeImagePath(item.image);
    const orderImageContent = encodedImage
        ? `<img src="${encodedImage}" alt="${item.name}" onerror="this.onerror=null;this.src='Bonbon Pics/Logo.png'">`
        : `<i class="fas fa-cloud"></i>`;

    orderItem.innerHTML = `
        <div class="order-item-image">
            ${orderImageContent}
        </div>
        <div class="order-item-details">
            <div class="order-item-name">${item.name}</div>
            <div class="order-item-price">₱${item.price.toFixed(2)}</div>
        </div>
        <div class="order-item-controls">
            <div class="quantity-control">
                <button class="qty-btn" onclick="decreaseQuantity('${item.key}')">-</button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn" onclick="increaseQuantity('${item.key}')">+</button>
            </div>
            <button class="remove-btn" onclick="removeFromOrder('${item.key}')" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return orderItem;
}

// Increase quantity
function increaseQuantity(itemKey) {
    const item = currentOrder.find(item => item.key === itemKey);
    if (item) {
        item.quantity += 1;
        updateOrderDisplay();
        updateTotalPrice();
    }
}

// Decrease quantity
function decreaseQuantity(itemKey) {
    const item = currentOrder.find(item => item.key === itemKey);
    if (item) {
        if (item.quantity > 1) {
            item.quantity -= 1;
        } else {
            removeFromOrder(itemKey);
            return;
        }
        updateOrderDisplay();
        updateTotalPrice();
    }
}

// Remove from order
function removeFromOrder(itemKey) {
    currentOrder = currentOrder.filter(item => item.key !== itemKey);
    updateOrderDisplay();
    updateTotalPrice();
}

// Update total price
function updateTotalPrice() {
    const total = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('totalPrice').textContent = total.toFixed(2);
}

// Setup event listeners
function setupEventListeners() {
    // Categories dropdown
    const categoriesBtn = document.getElementById('categoriesBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    categoriesBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!categoriesBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Category selection
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const category = this.dataset.category;
            currentCategory = category;
            displayProducts(category);
            dropdownMenu.classList.remove('show');
        });
    });

    // Confirm button
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.addEventListener('click', confirmOrder);

    // Order List button
    const orderListBtn = document.getElementById('orderListBtn');
    orderListBtn.addEventListener('click', openOrderList);

    // Close modal
    const closeModalBtn = document.getElementById('closeModalBtn');
    const orderListModal = document.getElementById('orderListModal');

    closeModalBtn.addEventListener('click', closeOrderList);

    orderListModal.addEventListener('click', function (e) {
        if (e.target === orderListModal) {
            closeOrderList();
        }
    });
}

// Confirm order
async function confirmOrder() {
    if (currentOrder.length === 0) {
        alert('Please add items to the order first.');
        return;
    }

    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    const notes = document.getElementById('notesInput').value.trim();
    const total = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const now = new Date();
    const dateISO = now.toISOString().split('T')[0];

    const orderData = {
        items: currentOrder.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size || null
        })),
        paymentMethod: paymentMethod,
        notes: notes,
        userId: 1 // Replace with actual logged-in user ID
    };

    try {
        const apiEndpoint = 'api/orders.php';
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const text = await response.text().catch(() => 'unable to read body');
            let serverMessage = text;
            try { serverMessage = JSON.parse(text); } catch (e) { }
            console.error('API returned error', response.status, response.statusText, text);
            throw new Error(`Failed to save order to database (${response.status}): ${typeof serverMessage === 'string' ? serverMessage : JSON.stringify(serverMessage)}`);
        }

        const result = await response.json();

        const order = {
            id: result.orderId,
            items: [...currentOrder],
            paymentMethod: paymentMethod,
            notes: notes,
            total: total,
            dateISO: dateISO,
            dateDisplay: now.toLocaleDateString(),
            timeDisplay: now.toLocaleTimeString(),
            orderNumber: result.orderNumber
        };

        orderList.push(order);
        saveOrdersToStorage();

        // Reset current order
        currentOrder = [];
        document.getElementById('notesInput').value = '';
        document.querySelector('input[name="payment"][value="cash"]').checked = true;

        updateOrderDisplay();
        updateTotalPrice();

        selectedOrderDate = dateISO;
        const dateInput = document.getElementById('orderDateFilter');
        if (dateInput) {
            dateInput.value = selectedOrderDate;
        }
        updateOrderListDisplay();

        // Show success message
        alert(`Order ${result.orderNumber} confirmed successfully!`);
    } catch (error) {
        console.error('Error confirming order:', error);

        if (error instanceof TypeError && error.message && error.message.toLowerCase().includes('failed to fetch')) {
            alert('Network error: could not reach the server. Make sure you opened the page via http://localhost/pos.html (not file:///), and that your webserver (XAMPP/Apache) is running.');
        } else {
            alert('Error saving order. Please try again.');
        }
    }
}

// Open order list modal
function openOrderList() {
    const orderListModal = document.getElementById('orderListModal');
    const dateInput = document.getElementById('orderDateFilter');
    if (dateInput) {
        dateInput.value = selectedOrderDate;
    }
    updateOrderListDisplay();
    orderListModal.classList.add('show');
}

// Close order list modal
function closeOrderList() {
    const orderListModal = document.getElementById('orderListModal');
    orderListModal.classList.remove('show');
}

// Update order list display
function updateOrderListDisplay() {
    const orderListBody = document.getElementById('orderListBody');
    const emptyOrderList = document.getElementById('emptyOrderList');

    const ordersForDate = orderList.filter(order => order.dateISO === selectedOrderDate);

    if (ordersForDate.length === 0) {
        orderListBody.innerHTML = '';
        emptyOrderList.style.display = 'flex';
        return;
    }

    emptyOrderList.style.display = 'none';
    orderListBody.innerHTML = '';

    ordersForDate.forEach(order => {
        order.items.forEach((item, index) => {
            const row = document.createElement('tr');

            // Show order ID only for first item in order
            const orderIdCell = index === 0
                ? `<td rowspan="${order.items.length}">${formatOrderId(order.id)}</td>`
                : '';

            row.innerHTML = `
                ${orderIdCell}
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>₱${item.price.toFixed(2)}</td>
                ${index === 0 ? `<td rowspan="${order.items.length}">${capitalize(order.paymentMethod)}</td>` : ''}
                ${index === 0 ? `<td rowspan="${order.items.length}">₱${order.total.toFixed(2)}</td>` : ''}
                ${index === 0 ? `<td rowspan="${order.items.length}">${order.dateDisplay}</td>` : ''}
                ${index === 0 ? `<td rowspan="${order.items.length}">${order.notes || '-'}</td>` : ''}
                ${index === 0 ? `
                    <td rowspan="${order.items.length}">
                        <div class="action-buttons">
                            <button class="action-btn receipt-btn" onclick="generateReceipt(${order.id})" title="Receipt">
                                <i class="fas fa-receipt"></i>
                            </button>
                            <button class="action-btn edit-btn" onclick="editOrder(${order.id})" title="Edit">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="action-btn cancel-btn" onclick="cancelOrder(${order.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                ` : ''}
            `;

            orderListBody.appendChild(row);
        });
    });
}

// Edit order
function editOrder(orderId) {
    const order = orderList.find(o => o.id === orderId);
    if (!order) return;

    // Load order back to current order
    currentOrder = order.items.map(item => ({ ...item }));

    // Set payment method
    document.querySelector(`input[name="payment"][value="${order.paymentMethod}"]`).checked = true;

    // Set notes
    document.getElementById('notesInput').value = order.notes || '';

    // Remove from order list
    orderList = orderList.filter(o => o.id !== orderId);
    saveOrdersToStorage();

    // Update displays
    updateOrderDisplay();
    updateTotalPrice();
    updateOrderListDisplay();

    // Close modal
    closeOrderList();

    // Scroll to order summary
    document.querySelector('.order-summary').scrollIntoView({ behavior: 'smooth' });
}

// Cancel order
function cancelOrder(orderId) {
    if (confirm('Are you sure you want to cancel this order?')) {
        orderList = orderList.filter(order => order.id !== orderId);
        saveOrdersToStorage();
        updateOrderListDisplay();
        alert('Order cancelled successfully.');
    }
}

function getOrdersForSelectedDate() {
    return orderList.filter(order => order.dateISO === selectedOrderDate);
}

function exportOrdersToCsv() {
    const orders = getOrdersForSelectedDate();
    if (!orders.length) {
        alert('No orders available for the selected date.');
        return;
    }

    const headers = ['Order ID', 'Product Name', 'Quantity', 'Price per Item', 'Payment', 'Total Price', 'Date', 'Notes'];
    const rows = [headers];

    orders.forEach(order => {
        order.items.forEach((item, index) => {
            rows.push([
                index === 0 ? formatOrderId(order.id) : '',
                item.name,
                item.quantity,
                `₱${item.price.toFixed(2)}`,
                index === 0 ? capitalize(order.paymentMethod) : '',
                index === 0 ? `₱${order.total.toFixed(2)}` : '',
                index === 0 ? order.dateDisplay : '',
                index === 0 ? (order.notes || '-') : ''
            ]);
        });
    });

    const csvContent = rows.map(row => row.map(value => `"${value}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${selectedOrderDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function exportOrdersToPdf() {
    const orders = getOrdersForSelectedDate();
    if (!orders.length) {
        alert('No orders available for the selected date.');
        return;
    }

    const rowsHtml = orders.map(order => {
        return order.items.map((item, index) => `
            <tr>
                ${index === 0 ? `<td rowspan="${order.items.length}">${formatOrderId(order.id)}</td>` : ''}
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>₱${item.price.toFixed(2)}</td>
                ${index === 0 ? `<td rowspan="${order.items.length}">${capitalize(order.paymentMethod)}</td>` : ''}
                ${index === 0 ? `<td rowspan="${order.items.length}">₱${order.total.toFixed(2)}</td>` : ''}
                ${index === 0 ? `<td rowspan="${order.items.length}">${order.dateDisplay}</td>` : ''}
                ${index === 0 ? `<td rowspan="${order.items.length}">${order.notes || '-'}</td>` : ''}
            </tr>
        `).join('');
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <title>Orders ${selectedOrderDate}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                h2 { text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #333; padding: 8px; font-size: 12px; }
                th { background-color: #FF8C00; color: #8B0000; }
            </style>
        </head>
        <body>
            <h2>Orders for ${selectedOrderDate}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Product Name</th>
                        <th>Qty.</th>
                        <th>Price/Item</th>
                        <th>Payment</th>
                        <th>Total Price</th>
                        <th>Date</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;

    const pdfWindow = window.open('', '_blank');
    pdfWindow.document.write(html);
    pdfWindow.document.close();
}

// Add Product Modal & Cropper Logic
function setupAddProductModal() {
    const modal = document.getElementById('addProductModal');
    const openBtn = document.getElementById('openAddProductBtn');
    const openEditBtn = document.getElementById('openEditProductBtn');
    const closeBtn = document.getElementById('closeAddProductBtn');
    const cancelBtn = document.getElementById('cancelAddProductBtn');
    const form = document.getElementById('addProductForm');
    const imageInput = document.getElementById('productImageInput');

    if (!modal || !openBtn || !form || !imageInput) {
        return;
    }

    openBtn.addEventListener('click', openAddProductModal);
    if (openEditBtn) openEditBtn.addEventListener('click', openEditProductModal);
    if (closeBtn) closeBtn.addEventListener('click', closeAddProductModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAddProductModal);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeAddProductModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('show')) {
            closeAddProductModal();
        }
    });

    form.addEventListener('submit', handleAddProductSubmit);
    imageInput.addEventListener('change', handleAddProductImage);
}

function openAddProductModal() {
    resetAddProductForm();
    const modal = document.getElementById('addProductModal');
    const selectorRow = document.getElementById('editProductSelectorRow');
    if (selectorRow) selectorRow.style.display = 'none';
    document.querySelector('.modal-header h3').innerHTML = '<i class="fas fa-drumstick-bite"></i> Add New Product';
    const primaryBtn = document.querySelector('#addProductForm .primary-btn');
    if (primaryBtn) primaryBtn.textContent = 'Save Product';
    if (modal) {
        modal.classList.add('show');
    }
}

function openEditProductModal() {
    resetAddProductForm();
    const modal = document.getElementById('addProductModal');
    const selectorRow = document.getElementById('editProductSelectorRow');
    if (selectorRow) selectorRow.style.display = 'block';
    document.querySelector('.modal-header h3').innerHTML = '<i class="fas fa-edit"></i> Edit Product';
    const primaryBtn = document.querySelector('#addProductForm .primary-btn');
    if (primaryBtn) primaryBtn.textContent = 'Edit Product';
    populateEditProductSelector();
    if (modal) modal.classList.add('show');
}

function populateEditProductSelector() {
    const sel = document.getElementById('editProductSelector');
    if (!sel) return;
    sel.innerHTML = '';
    const items = [];
    Object.keys(products).forEach(cat => {
        (products[cat] || []).forEach(p => items.push(Object.assign({}, p, { category: cat })));
    });

    if (items.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No products available';
        sel.appendChild(opt);
        return;
    }

    items.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} — ${capitalize(p.category)}`;
        opt.dataset.category = p.category;
        sel.appendChild(opt);
    });

    sel.removeEventListener('change', handleEditSelectorChange);
    sel.addEventListener('change', handleEditSelectorChange);
    sel.selectedIndex = 0;
    handleEditSelectorChange();
}

function handleEditSelectorChange() {
    const sel = document.getElementById('editProductSelector');
    if (!sel) return;
    const selectedVal = sel.value;
    if (!selectedVal) return;
    const category = sel.options[sel.selectedIndex].dataset.category;
    const prodList = products[category] || [];
    const prod = prodList.find(p => String(p.id) === String(selectedVal));
    if (!prod) return;

    // fill form fields
    document.getElementById('productNameInput').value = prod.name || '';
    document.getElementById('productPriceInput').value = prod.price || prod.selling_price || '';
    document.getElementById('productCategoryInput').value = prod.category || category || 'chicken';
    document.getElementById('productDescriptionInput').value = prod.description || prod.desc || '';
    document.getElementById('editingProductId').value = prod.id;
}

function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.classList.remove('show');
    }
    resetAddProductForm();
}

function resetAddProductForm() {
    const form = document.getElementById('addProductForm');
    const imageInput = document.getElementById('productImageInput');

    if (form) form.reset();
    if (imageInput) imageInput.value = '';
    const desc = document.getElementById('productDescriptionInput');
    if (desc) desc.value = '';
    const editingId = document.getElementById('editingProductId');
    if (editingId) editingId.value = '';
    const selectorRow = document.getElementById('editProductSelectorRow');
    if (selectorRow) selectorRow.style.display = 'none';

    const header = document.querySelector('.modal-header h3');
    if (header) header.innerHTML = '<i class="fas fa-drumstick-bite"></i> Add New Product';
    const primaryBtn = document.querySelector('#addProductForm .primary-btn');
    if (primaryBtn) primaryBtn.textContent = 'Save Product';

    destroyCropper(true);
}

function handleAddProductImage(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
        destroyCropper(true);
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file.');
        event.target.value = '';
        destroyCropper(true);
        return;
    }

    const reader = new FileReader();
    reader.onload = function (loadEvent) {
        const cropperImage = document.getElementById('cropperImage');
        if (!cropperImage) return;

        const result = loadEvent.target && loadEvent.target.result ? loadEvent.target.result : reader.result;
        if (!result) return;

        cropperImage.src = result;
        cropperImage.style.display = 'block';
        initializeCropper(cropperImage);
    };
    reader.readAsDataURL(file);
}

function initializeCropper(imageElement) {
    if (typeof Cropper === 'undefined') {
        console.error('Cropper.js is not loaded.');
        return;
    }

    destroyCropper();

    cropperInstance = new Cropper(imageElement, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        background: false,
        responsive: true,
        preview: '.crop-preview',
        movable: true,
        zoomable: true,
        scalable: false,
        guides: true
    });
}

function destroyCropper(clearPreview = false) {
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }

    if (clearPreview) {
        const cropperImage = document.getElementById('cropperImage');
        if (cropperImage) {
            cropperImage.removeAttribute('src');
            cropperImage.style.display = 'none';
        }
        const preview = document.querySelector('.crop-preview');
        if (preview) {
            preview.innerHTML = '';
        }
    }
}

async function handleAddProductSubmit(event) {
    event.preventDefault();

    const nameInput = document.getElementById('productNameInput');
    const priceInput = document.getElementById('productPriceInput');
    const categoryInput = document.getElementById('productCategoryInput');

    const name = nameInput ? nameInput.value.trim() : '';
    const priceValue = priceInput ? parseFloat(priceInput.value) : NaN;
    const category = categoryInput ? categoryInput.value : 'chicken';

    if (!name) {
        alert('Please enter the product name.');
        return;
    }

    if (Number.isNaN(priceValue) || priceValue <= 0) {
        alert('Please enter a valid price.');
        return;
    }

    const editingId = document.getElementById('editingProductId') ? document.getElementById('editingProductId').value : '';

    if (!cropperInstance && !editingId) {
        alert('Please upload and crop an image for the product.');
        return;
    }

    let imageDataUrl = null;
    if (cropperInstance) {
        const canvas = cropperInstance.getCroppedCanvas({
            width: 400,
            height: 400,
            imageSmoothingQuality: 'high'
        });
        imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    }

    if (editingId) {
        try {
            const payload = {
                productId: Number(editingId),
                name: name,
                sellingPrice: priceValue,
                description: document.getElementById('productDescriptionInput').value || '',
                category: category
            };
            if (imageDataUrl) payload.imageData = imageDataUrl;

            const resp = await fetch(API_BASE + '/editProduct.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const txt = await resp.text().catch(() => '');
                throw new Error(`Failed to update product (${resp.status}): ${txt}`);
            }

            const result = await resp.json();
            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }

            if (result.product) {
                const updated = result.product;
                const newCat = (updated.category_slug || updated.category_name || updated.category_id) ? (updated.category_slug || String(updated.category_id)) : 'uncategorized';

                Object.keys(products).forEach(cat => {
                    products[cat] = (products[cat] || []).filter(p => Number(p.id) !== Number(updated.product_id));
                });

                if (!products[newCat]) products[newCat] = [];

                const localProd = {
                    id: Number(updated.product_id),
                    name: updated.name,
                    price: parseFloat(updated.selling_price || updated.price || 0),
                    category: newCat,
                    description: updated.description || '',
                    image: updated.image_path || null
                };

                products[newCat].push(localProd);

                if (currentCategory === 'all' || currentCategory === newCat) displayProducts(currentCategory);
                closeAddProductModal();
                alert('Product updated successfully.');
            } else {
                alert('Product updated but server did not return updated data. Refresh to verify.');
            }

        } catch (err) {
            console.error('Edit product failed', err);
            alert('Failed to update product: ' + (err.message || 'unknown error'));
        }

        return;
    }

    try {
        const payload = {
            name: name,
            category: category,
            sellingPrice: priceValue,
            costPrice: 0,
            description: document.getElementById('productDescriptionInput').value || '',
            imageData: imageDataUrl
        };

        const resp = await fetch(API_BASE + '/addProduct.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            throw new Error(`Failed to create product (${resp.status}): ${txt}`);
        }

        const result = await resp.json();
        const createdId = result.productId;

        const imagePath = result.imagePath || imageDataUrl;

        const newProduct = {
            id: createdId || nextProductId++,
            name,
            price: priceValue,
            category,
            image: imagePath,
            isNew: true
        };

        addCustomProductToCatalog(newProduct);
        closeAddProductModal();
        alert(`${newProduct.name} was added to the catalog!`);

        if (createdId && createdId >= nextProductId) nextProductId = createdId + 1;

    } catch (err) {
        console.error('Add product failed', err);
        alert('Failed to add product: ' + (err.message || 'unknown error'));
    }
}

function addCustomProductToCatalog(product) {
    if (!products[product.category]) {
        products[product.category] = [];
    }

    if (product.category === 'bubbletea' && !product.sizes) {
        product.sizes = {
            small: product.price,
            medium: product.price + 15,
            large: product.price + 30
        };
    }

    products[product.category].push(product);

    if (currentCategory === 'all' || currentCategory === product.category) {
        displayProducts(currentCategory);
    }
}

function confirmProductDeletion(product) {
    const confirmed = confirm(`Delete "${product.name}" from ${capitalize(product.category)}?`);
    if (!confirmed) return;
    deleteProductFromCatalog(product.id, product.category);
}

async function deleteProductFromCatalog(productId, category) {
    try {
        const response = await fetch(API_BASE + '/deleteProduct.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, category, _method: 'DELETE' })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Failed to delete product');
            return;
        }

        const categoryList = products[category];
        if (categoryList) {
            const index = categoryList.findIndex(item => item.id === productId);
            if (index !== -1) {
                categoryList.splice(index, 1);
            }
        }

        if (currentCategory === 'all' || currentCategory === category) {
            displayProducts(currentCategory);
        }

        alert(data.message || 'Product removed successfully');
    } catch (error) {
        console.error('Delete product failed:', error);
        alert('Error deleting product: ' + (error.message || 'unknown error'));
    }
}



// Generate printable/downloadable receipt
function generateReceipt(orderId) {
    const order = orderList.find(order => order.id === orderId);
    if (!order) {
        alert('Order not found.');
        return;
    }

    const formattedId = order.id.toString().padStart(4, '0');
    const notesValue = order.notes && order.notes.trim().length > 0 ? order.notes : 'None';
    const itemsRows = order.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₱${item.price.toFixed(2)}</td>
            <td>₱${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    if (typeof html2canvas === 'undefined') {
        alert('Unable to save receipt because html2canvas failed to load.');
        return;
    }

    const receiptElement = document.createElement('div');
    receiptElement.className = 'receipt-capture';
    receiptElement.innerHTML = `
        <h2>Bonbon Kitchen</h2>
        <h3>Order Receipt</h3>
        <div class="receipt-meta">
            <div><span>Order No.:</span><span>#${formattedId}</span></div>
            <div><span>Date:</span><span>${order.dateDisplay}</span></div>
            <div><span>Time:</span><span>${order.timeDisplay}</span></div>
            <div><span>Payment:</span><span>${capitalize(order.paymentMethod)}</span></div>
        </div>
        <table class="receipt-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows}
            </tbody>
        </table>
        <div class="receipt-total">Total: ₱${order.total.toFixed(2)}</div>
        <div class="receipt-notes"><strong>Notes:</strong> ${notesValue}</div>
        <div class="receipt-footer">
            Thank you for dining with Bonbon Kitchen!<br/>
            Enjoy your meal!
        </div>
    `;

    document.body.appendChild(receiptElement);

    requestAnimationFrame(() => {
        html2canvas(receiptElement, {
            backgroundColor: '#ffffff',
            scale: 2
        }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `receipt_${formattedId}.png`;
            link.click();
        }).catch(error => {
            console.error('Failed to capture receipt', error);
            alert('Unable to save the receipt. Please try again.');
        }).finally(() => {
            document.body.removeChild(receiptElement);
        });
    });
}

// Make functions globally accessible
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.removeFromOrder = removeFromOrder;
window.editOrder = editOrder;
window.cancelOrder = cancelOrder;
window.generateReceipt = generateReceipt;
window.addToOrder = addToOrder;
