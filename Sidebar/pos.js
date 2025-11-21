// POS System JavaScript

// Sample products data
// Optional: add image: 'relative/path/to-image.png' to display product photos
const products = {
    chicken: [
        { id: 1, name: 'Cloy Honey Soy', price: 149, category: 'chicken', image: 'Bonbon Pics/cloy honey soy.jpg'},
        { id: 2, name: 'Boombayah', price: 149, category: 'chicken', image: 'Bonbon Pics/boombayah.jpg'},
        { id: 3, name: 'Honey Butter Night', price: 149, category: 'chicken', image: 'Bonbon Pics/honey butter night.jpg'},
        { id: 4, name: 'Oppa BB-Q', price: 149, category: 'chicken', image: 'Bonbon Pics/oppa bb-q.jpg'},
        { id: 5, name: 'Chijeu Chikin', price: 149, category: 'chicken', image: 'Bonbon Pics/Chijeu Chikin.jpg'},
        { id: 6, name: 'Olenji Chikin', price: 149, category: 'chicken', image: 'Bonbon Pics/olenji chikin.jpg'},
        { id: 7, name: 'Salted Egg Chikin', price: 159, category: 'chicken', image: 'Bonbon Pics/salted egg chikin.jpg'},
        { id: 8, name: 'Yangneom Nom', price: 159, category: 'chicken', image: 'Bonbon Pics/yangneom nom.jpg'},
        { id: 9, name: 'Bonbon Buldak', price: 159, category: 'chicken', image: 'Bonbon Pics/bonbon buldak.jpg'},
        { id: 10, name: 'Snow Cheese', price: 159, category: 'chicken', image: 'Bonbon Pics/snow cheese.jpg'},
        { id: 11, name: 'Honey Mustard Chikin', price: 159, category: 'chicken', image: 'Bonbon Pics/honey mustard chikin.jpg'}
    ],
    bubbletea: [
        createBubbleTeaProduct(12, 'Classic', 80, 'Bonbon Pics/Milktea3.jpg'),
        createBubbleTeaProduct(13, 'Wintermelon', 90, 'Bonbon Pics/Milktea3.jpg'),
        createBubbleTeaProduct(14, 'Okinawa', 90, 'Bonbon Pics/Milktea3.jpg'),
        createBubbleTeaProduct(15, 'Cookies & Cream', 85, 'Bonbon Pics/Milktea1.jpg'),
        createBubbleTeaProduct(16, 'Matcha', 85, 'Bonbon Pics/Milktea4.jpg'),
        createBubbleTeaProduct(17, 'Taro', 80, 'Bonbon Pics/Milktea4.jpg'),
        createBubbleTeaProduct(18, 'Strawberry', 85, 'Bonbon Pics/Milktea1.jpg'),
        createBubbleTeaProduct(19, 'Chocolate', 85, 'Bonbon Pics/Milktea4.jpg'),
        createBubbleTeaProduct(20, 'Brown Sugar', 80, 'Bonbon Pics/Milktea2.jpg')
    ]
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
            medium: basePrice + 10,
            large: basePrice + 20
        }
    };
}

// Current order state
let currentOrder = [];
const STORAGE_KEY = 'bonbonPosOrders';
let orderList = loadOrdersFromStorage();
let orderIdCounter = computeNextOrderId();
let currentCategory = 'all';
let selectedOrderDate = getTodayISO();

// Toggle visibility of order sections (Notes, Payment, Total Price, Confirm Button)
function toggleOrderSections(show) {
    const orderNotes = document.querySelector('.order-notes');
    const paymentMethod = document.querySelector('.payment-method');
    const totalPrice = document.querySelector('.total-price');
    const confirmBtnContainer = document.querySelector('.confirm-btn-container');
    
    if (show) {
        // Add show class with slight delay for smooth animation
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
        // Remove show class
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeProducts();
    setupEventListeners();
    updateTotalPrice();
    // Hide sections initially
    toggleOrderSections(false);
    initializeDateFilter();
});

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

    const productImageContent = product.image
        ? `<img src="${product.image}" alt="${product.name}">`
        : `<i class="fas fa-cloud"></i>`;

    if (product.category === 'bubbletea') {
        const sizeButtons = Object.entries(product.sizes).map(([size, price]) => `
            <button class="size-btn" data-size="${size}" data-price="${price}">
                ${capitalize(size)}
            </button>
        `).join('');

        card.innerHTML = `
            <div class="product-image">
                ${productImageContent}
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
            </div>
            <div class="product-name">${product.name}</div>
            <div class="product-price">Price: ₱${product.price.toFixed(2)}</div>
        `;
        card.addEventListener('click', () => addToOrder(product));
    }

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
        // Hide sections when order is empty
        toggleOrderSections(false);
        return;
    }

    orderItemsContainer.innerHTML = '';

    currentOrder.forEach(item => {
        const orderItem = createOrderItem(item);
        orderItemsContainer.appendChild(orderItem);
    });
    
    // Show sections when items are added
    toggleOrderSections(true);
}

// Create order item element
function createOrderItem(item) {
    const orderItem = document.createElement('div');
    orderItem.className = 'order-item';
    orderItem.dataset.itemKey = item.key;

    const orderImageContent = item.image
        ? `<img src="${item.image}" alt="${item.name}">`
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
            removeFromOrder(productId);
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

    categoriesBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!categoriesBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Category selection
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
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
    
    orderListModal.addEventListener('click', function(e) {
        if (e.target === orderListModal) {
            closeOrderList();
        }
    });
}

// Confirm order
function confirmOrder() {
    if (currentOrder.length === 0) {
        alert('Please add items to the order first.');
        return;
    }

    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    const notes = document.getElementById('notesInput').value.trim();
    const total = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const now = new Date();
    const dateISO = now.toISOString().split('T')[0];

    // Create order object
    const order = {
        id: orderIdCounter++,
        items: [...currentOrder],
        paymentMethod: paymentMethod,
        notes: notes,
        total: total,
        dateISO: dateISO,
        dateDisplay: now.toLocaleDateString(),
        timeDisplay: now.toLocaleTimeString()
    };

    // Add to order list
    orderList.push(order);
    saveOrdersToStorage();
    orderIdCounter = computeNextOrderId();

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
    alert('Order confirmed successfully!');
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

    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <title>Receipt #${formattedId}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: #f7f7f7;
                    margin: 0;
                    padding: 20px;
                }
                .receipt {
                    background: #ffffff;
                    border: 1px solid #ddd;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 480px;
                    margin: 0 auto;
                }
                h2, h3 {
                    margin: 0;
                    text-align: center;
                }
                .meta {
                    margin: 20px 0;
                    font-size: 14px;
                }
                .meta div {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                    font-size: 14px;
                }
                th {
                    background: #FF8C00;
                    color: #8B0000;
                }
                .total {
                    font-weight: 700;
                    text-align: right;
                    margin-top: 16px;
                    font-size: 16px;
                }
                .notes {
                    margin-top: 16px;
                    font-size: 14px;
                }
                .footer {
                    margin-top: 24px;
                    text-align: center;
                    font-size: 12px;
                    color: #777;
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <h2>Bonbon Kitchen</h2>
                <h3>Order Receipt</h3>
                <div class="meta">
                    <div><span>Order No.:</span><span>#${formattedId}</span></div>
                    <div><span>Date:</span><span>${order.dateDisplay}</span></div>
                    <div><span>Time:</span><span>${order.timeDisplay}</span></div>
                    <div><span>Payment:</span><span>${capitalize(order.paymentMethod)}</span></div>
                </div>
                <table>
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
                <div class="total">Total: ₱${order.total.toFixed(2)}</div>
                <div class="notes"><strong>Notes:</strong> ${notesValue}</div>
                <div class="footer">
                    Thank you for dining with Bonbon Kitchen!<br/>
                    Save this receipt as PDF via the print dialog.
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.focus();
                    window.print();
                };
            </script>
        </body>
        </html>
    `;

    const receiptWindow = window.open('', '_blank', 'width=500,height=700');
    receiptWindow.document.write(receiptHtml);
    receiptWindow.document.close();
}

// Make functions globally accessible
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.removeFromOrder = removeFromOrder;
window.editOrder = editOrder;
window.cancelOrder = cancelOrder;
window.generateReceipt = generateReceipt;
window.addToOrder = addToOrder;
