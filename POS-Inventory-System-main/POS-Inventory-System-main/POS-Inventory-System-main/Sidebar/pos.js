// POS System JavaScript

// Products data (frontend fallback)
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
        createBubbleTeaProduct(12, 'Classic', 45, 'Bonbon Pics/Milktea3.jpg'),
        createBubbleTeaProduct(13, 'Wintermelon', 50, 'Bonbon Pics/Milktea3.jpg'),
        createBubbleTeaProduct(14, 'Okinawa', 50, 'Bonbon Pics/Milktea3.jpg'),
        createBubbleTeaProduct(15, 'Cookies & Cream', 60, 'Bonbon Pics/Milktea1.jpg'),
        createBubbleTeaProduct(16, 'Matcha', 55, 'Bonbon Pics/Milktea4.jpg'),
        createBubbleTeaProduct(17, 'Taro', 55, 'Bonbon Pics/Milktea4.jpg'),
        createBubbleTeaProduct(18, 'Strawberry', 55, 'Bonbon Pics/Milktea1.jpg'),
        createBubbleTeaProduct(19, 'Chocolate', 55, 'Bonbon Pics/Milktea4.jpg'),
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
            medium: basePrice + 15,
            large: basePrice + 30
        }
    };
}

// Current order state
let currentOrder = [];
let backendProducts = null;
const STORAGE_KEY = 'bonbonPosOrders';
let orderList = loadOrdersFromStorage();
let orderIdCounter = computeNextOrderId();
let currentCategory = 'all';
let selectedOrderDate = getTodayISO();
let nextProductId = getInitialProductId();
let cropperInstance = null;
let editingProduct = null;

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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof PersistUtils !== 'undefined') PersistUtils.applyTabPersistence('pos');
    loadSharedProductsFromInventory().then(() => loadBackendProducts()).finally(() => {
        initializeProducts();
    });
    setupEventListeners();
    setupAddProductModal();
    setupSidebarToggle();
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

    const source = backendProducts || products;
    if (category === 'all') {
        productsToShow = [...(source.chicken || []), ...(source.bubbletea || []), ...(source.cups || [])];
    } else if (category === 'chicken') {
        productsToShow = source.chicken || [];
    } else if (category === 'bubbletea') {
        productsToShow = source.bubbletea || [];
    }

    productsToShow.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

async function loadBackendProducts() {
    try {
        const res = await fetch('api/pos.php?format=json');
        if (!res.ok) { return; }
        let json = {};
        try { json = await res.json(); } catch (_) { json = {}; }
        const rows = Array.isArray(json.products) ? json.products : [];
        if (!rows.length) return;
        const grouped = {};
        rows.forEach(r => {
            const slug = String(r.category || 'uncategorized');
            if (!grouped[slug]) grouped[slug] = [];
            const base = {
                id: r.product_id || r.id,
                name: String(r.name),
                category: slug,
                price: Number(r.price) || 0,
                image: r.image_path || null
            };
            if (slug === 'bubbletea') {
                base.sizes = {
                    small: base.price,
                    medium: base.price + 15,
                    large: base.price + 30
                };
            }
            grouped[slug].push(base);
        });
        backendProducts = grouped;
    } catch (e) { /* silent fallback to local products */ }
}

// Create product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const productImageContent = product.image
        ? `<img data-src="${product.image}" alt="${product.name}">`
        : `<i class="fas fa-cloud"></i>`;

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
            </div>
            <div class="product-name">${product.name}</div>
            <div class="size-buttons">
                ${sizeButtons}
            </div>
        `;
        const img = card.querySelector('.product-image img');
        if (img && typeof PerformanceUtils !== 'undefined') PerformanceUtils.lazyLoadImage(img, img.getAttribute('data-src'));

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
        const img = card.querySelector('.product-image img');
        if (img && typeof PerformanceUtils !== 'undefined') PerformanceUtils.lazyLoadImage(img, img.getAttribute('data-src'));
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

    const editBtn = document.createElement('button');
    editBtn.className = 'product-edit-btn';
    editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
    editBtn.title = 'Edit product';
    editBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        openEditProductModal(product);
    });

    card.appendChild(deleteBtn);
    card.appendChild(editBtn);
    
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
            category: product.category,
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
        ? `<img data-src="${item.image}" alt="${item.name}">`
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

    const img = orderItem.querySelector('.order-item-image img');
    if (img && typeof PerformanceUtils !== 'undefined') PerformanceUtils.lazyLoadImage(img, img.getAttribute('data-src'));
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
    if (categoriesBtn && dropdownMenu) {
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
    }

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
    if (confirmBtn) confirmBtn.addEventListener('click', confirmOrder);

    // Order List button
    const orderListBtn = document.getElementById('orderListBtn');
    if (orderListBtn) orderListBtn.addEventListener('click', openOrderList);

    // Close modal
    const closeModalBtn = document.getElementById('closeModalBtn');
    const orderListModal = document.getElementById('orderListModal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeOrderList);
    if (orderListModal) {
        orderListModal.addEventListener('click', function(e) {
            if (e.target === orderListModal) {
                closeOrderList();
            }
        });
    }
}

// Confirm order
function confirmOrder() {
    if (currentOrder.length === 0) {
        showNotice({ title: 'No Items', message: 'Please add items to the order first.', kind: 'error' });
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

    sendOrderToBackend(order).then(result => {
        if (result && result.success) {
            orderList.push(order);
            saveOrdersToStorage();
            orderIdCounter = computeNextOrderId();
            try { deductIngredientsForOrder(order); } catch (e) {}
        } else if (result && (result.error === 'network_error' || result.error === 'db_error')) {
            orderList.push(order);
            saveOrdersToStorage();
            orderIdCounter = computeNextOrderId();
            try { deductIngredientsForOrder(order); } catch (e) {}
            showToast({ message: 'Order saved locally (offline)', kind: 'info' });
        } else {
            const msg = orderErrorMessage(result && result.error);
            showNotice({ title: 'Order Failed', message: msg, kind: 'error' });
            showToast({ message: msg, kind: 'error' });
            return;
        }
    });

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
    const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);
    const summary = `${formatOrderId(order.id)} • ${itemCount} item(s) • ₱${order.total.toFixed(2)} via ${capitalize(order.paymentMethod)}`;
    showNotice({ title: 'Order Confirmed', message: summary, kind: 'success', duration: 4000 });
    showToast({ message: `Order ${formatOrderId(order.id)} confirmed`, kind: 'success' });
}

// Ingredient deduction utilities
function getDefaultRecipeMap() {
    return {
        'Cloy Honey Soy': [
            { name: 'Chicken', unit: 'pcs', qty: 3 },
            { name: 'Soy Sauce', unit: 'ml', qty: 15 },
            { name: 'Honey', unit: 'ml', qty: 20 },
            { name: 'Salt', unit: 'g', qty: 1.25 },
            { name: 'Garlic', unit: 'g', qty: 15 },
            { name: 'Brown Sugar', unit: 'g', qty: 15 },
            { name: 'Cornstarch', unit: 'g', qty: 5 }
        ],
        'Boombayah': [
            { name: 'Chicken', unit: 'pcs', qty: 5 },
            { name: 'Brown Sugar', unit: 'g', qty: 15 },
            { name: 'Hot Sauce', unit: 'ml', qty: 20 },
            { name: 'Ketchup', unit: 'ml', qty: 30 },
            { name: 'Soy Sauce', unit: 'ml', qty: 15 },
            { name: 'Chili Flakes', unit: 'g', qty: 0.5 }
        ],
        'Honey Butter Night': [
            { name: 'Chicken', unit: 'pcs', qty: 5 },
            { name: 'Butter', unit: 'g', qty: 20 },
            { name: 'Honey', unit: 'ml', qty: 15 },
            { name: 'Brown Sugar', unit: 'g', qty: 15 },
            { name: 'Salt', unit: 'g', qty: 1.25 },
            { name: 'Onion Springs', unit: 'g', qty: 0.5 },
            { name: 'Cornstarch', unit: 'g', qty: 2.5 }
        ],
        'Chijeu Chikin': [
            { name: 'Chicken', unit: 'pcs', qty: 5 },
            { name: 'Brown Sugar', unit: 'g', qty: 15 },
            { name: 'Milk', unit: 'ml', qty: 30 },
            { name: 'Ketchup', unit: 'ml', qty: 5 },
            { name: 'Water', unit: 'ml', qty: 45 },
            { name: 'Cornstarch', unit: 'g', qty: 5 },
            { name: 'Soy Sauce', unit: 'ml', qty: 5 },
            { name: 'Salt', unit: 'g', qty: 1.25 },
            { name: 'Cheese', unit: 'g', qty: 25 }
        ],
        'Oppa BB-Q': [
            { name: 'Chicken', unit: 'pcs', qty: 5 },
            { name: 'Brown Sugar', unit: 'g', qty: 15 },
            { name: 'Ginger', unit: 'g', qty: 10 },
            { name: 'Garlic', unit: 'g', qty: 10 },
            { name: 'Chili Powder', unit: 'g', qty: 2.5 },
            { name: 'Sesame Oil', unit: 'ml', qty: 5 },
            { name: 'Soy Sauce', unit: 'ml', qty: 15 },
            { name: 'Salt', unit: 'g', qty: 1.25 },
            { name: 'Water', unit: 'ml', qty: 45 },
            { name: 'Cornstarch', unit: 'g', qty: 5 }
        ],
        'Olenji Chikin': [
            { name: 'Chicken', unit: 'pcs', qty: 5 },
            { name: 'Brown Sugar', unit: 'g', qty: 15 },
            { name: 'Honey', unit: 'ml', qty: 15 },
            { name: 'Ginger', unit: 'g', qty: 1 },
            { name: 'Orange Juice', unit: 'ml', qty: 45 },
            { name: 'Vinegar', unit: 'ml', qty: 5 },
            { name: 'Salt', unit: 'g', qty: 1.25 },
            { name: 'Water', unit: 'ml', qty: 45 },
            { name: 'Cornstarch', unit: 'g', qty: 5 }
        ],
        'Yangneom Nom': [
            { name: 'Chicken', unit: 'pcs', qty: 5 },
            { name: 'Brown Sugar', unit: 'g', qty: 15 },
            { name: 'Honey', unit: 'ml', qty: 15 },
            { name: 'Garlic', unit: 'g', qty: 1 },
            { name: 'Gochujang', unit: 'g', qty: 5 },
            { name: 'Chili Powder', unit: 'g', qty: 5 },
            { name: 'Ketchup', unit: 'ml', qty: 15 },
            { name: 'Salt', unit: 'g', qty: 1.25 },
            { name: 'Water', unit: 'ml', qty: 45 },
            { name: 'Cornstarch', unit: 'g', qty: 5 }
        ],
        'Bonbon Buldak': [
            { name: 'Chicken', unit: 'pcs', qty: 5 },
            { name: 'Brown Sugar', unit: 'g', qty: 15 },
            { name: 'Hot Sauce', unit: 'ml', qty: 20 },
            { name: 'Ketchup', unit: 'ml', qty: 15 },
            { name: 'Soy Sauce', unit: 'ml', qty: 15 },
            { name: 'Gochujang', unit: 'g', qty: 5 },
            { name: 'Milk', unit: 'ml', qty: 30 },
            { name: 'Cheese', unit: 'g', qty: 25 },
            { name: 'Water', unit: 'ml', qty: 45 },
            { name: 'Cornstarch', unit: 'g', qty: 5 }
        ],
        'Snow Cheese': [
            { name: 'Chicken', unit: 'pcs', qty: 5 },
            { name: 'Milk Powder', unit: 'g', qty: 30 },
            { name: 'Cheese Powder', unit: 'g', qty: 30 },
            { name: 'Powdered Sugar', unit: 'g', qty: 30 },
            { name: 'Garlic Powder', unit: 'g', qty: 1.5 },
            { name: 'Onion Powder', unit: 'g', qty: 1.5 },
            { name: 'Parsley', unit: 'g', qty: 3 }
        ],
        'Honey Mustard Chikin': [
            { name: 'Chicken', unit: 'pcs', qty: 5 },
            { name: 'Mustard Paste', unit: 'ml', qty: 15 },
            { name: 'Mayo', unit: 'g', qty: 30 },
            { name: 'Honey', unit: 'ml', qty: 15 },
            { name: 'Salt', unit: 'g', qty: 1.5 },
            { name: 'Pepper', unit: 'g', qty: 1.5 },
            { name: 'Water', unit: 'ml', qty: 15 }
        ],
        'Salted Egg Chikin': [
            { name: 'Chicken', unit: 'pcs', qty: 5 },
            { name: 'Milk Powder', unit: 'g', qty: 30 },
            { name: 'Salted Egg Powder', unit: 'g', qty: 30 },
            { name: 'Powdered Sugar', unit: 'g', qty: 15 },
            { name: 'Butter', unit: 'g', qty: 20 },
            { name: 'Sugar', unit: 'g', qty: 5 },
            { name: 'Pepper', unit: 'g', qty: 3 },
            { name: 'Egg', unit: 'pcs', qty: 1 },
            { name: 'Cornstarch', unit: 'g', qty: 0.5 },
            { name: 'Garnish', unit: 'serving', qty: 1 },
            { name: 'Spaghetti Box', unit: 'pcs', qty: 1 }
        ],
        // Bubble Tea flavors
        'Classic': [
            { name: 'Black Tea', unit: 'ml', qty: 150 },
            { name: 'Milk Syrup', unit: 'ml', qty: 30 },
            { name: 'Non-Dairy Creamer', unit: 'g', qty: 20 },
            { name: 'Pearls', unit: 'g', qty: 40 },
            { name: 'Cup', unit: 'pcs', qty: 1 },
            { name: 'Straw', unit: 'pcs', qty: 1 },
            { name: 'Lid', unit: 'pcs', qty: 1 },
            { name: 'Sticker', unit: 'pcs', qty: 1 },
            { name: 'Plastic', unit: 'pcs', qty: 1 }
        ],
        'Wintermelon': [
            { name: 'Black Tea', unit: 'ml', qty: 150 },
            { name: 'Wintermelon Syrup', unit: 'ml', qty: 45 },
            { name: 'Non-Dairy Creamer', unit: 'g', qty: 20 },
            { name: 'Pearls', unit: 'g', qty: 40 },
            { name: 'Cup', unit: 'pcs', qty: 1 },
            { name: 'Straw', unit: 'pcs', qty: 1 },
            { name: 'Lid', unit: 'pcs', qty: 1 },
            { name: 'Sticker', unit: 'pcs', qty: 1 },
            { name: 'Plastic', unit: 'pcs', qty: 1 }
        ],
        'Okinawa': [
            { name: 'Black Tea', unit: 'ml', qty: 150 },
            { name: 'Brown Sugar Syrup', unit: 'ml', qty: 45 },
            { name: 'Non-Dairy Creamer', unit: 'g', qty: 20 },
            { name: 'Pearls', unit: 'g', qty: 40 },
            { name: 'Cup', unit: 'pcs', qty: 1 },
            { name: 'Straw', unit: 'pcs', qty: 1 },
            { name: 'Lid', unit: 'pcs', qty: 1 },
            { name: 'Sticker', unit: 'pcs', qty: 1 },
            { name: 'Plastic', unit: 'pcs', qty: 1 }
        ],
        'Matcha': [
            { name: 'Matcha Powder', unit: 'g', qty: 10 },
            { name: 'Milk Syrup', unit: 'ml', qty: 30 },
            { name: 'Non-Dairy Creamer', unit: 'g', qty: 20 },
            { name: 'Pearls', unit: 'g', qty: 40 },
            { name: 'Cup', unit: 'pcs', qty: 1 },
            { name: 'Straw', unit: 'pcs', qty: 1 },
            { name: 'Lid', unit: 'pcs', qty: 1 },
            { name: 'Sticker', unit: 'pcs', qty: 1 },
            { name: 'Plastic', unit: 'pcs', qty: 1 }
        ],
        'Taro': [
            { name: 'Taro Powder', unit: 'g', qty: 10 },
            { name: 'Milk Syrup', unit: 'ml', qty: 30 },
            { name: 'Non-Dairy Creamer', unit: 'g', qty: 20 },
            { name: 'Pearls', unit: 'g', qty: 40 },
            { name: 'Cup', unit: 'pcs', qty: 1 },
            { name: 'Straw', unit: 'pcs', qty: 1 },
            { name: 'Lid', unit: 'pcs', qty: 1 },
            { name: 'Sticker', unit: 'pcs', qty: 1 },
            { name: 'Plastic', unit: 'pcs', qty: 1 }
        ],
        'Chocolate': [
            { name: 'Chocolate Syrup', unit: 'ml', qty: 30 },
            { name: 'Milk Syrup', unit: 'ml', qty: 30 },
            { name: 'Non-Dairy Creamer', unit: 'g', qty: 20 },
            { name: 'Pearls', unit: 'g', qty: 40 },
            { name: 'Cup', unit: 'pcs', qty: 1 },
            { name: 'Straw', unit: 'pcs', qty: 1 },
            { name: 'Lid', unit: 'pcs', qty: 1 },
            { name: 'Sticker', unit: 'pcs', qty: 1 },
            { name: 'Plastic', unit: 'pcs', qty: 1 }
        ],
        'Strawberry': [
            { name: 'Strawberry Syrup', unit: 'ml', qty: 30 },
            { name: 'Milk Syrup', unit: 'ml', qty: 30 },
            { name: 'Non-Dairy Creamer', unit: 'g', qty: 20 },
            { name: 'Pearls', unit: 'g', qty: 40 },
            { name: 'Cup', unit: 'pcs', qty: 1 },
            { name: 'Straw', unit: 'pcs', qty: 1 },
            { name: 'Lid', unit: 'pcs', qty: 1 },
            { name: 'Sticker', unit: 'pcs', qty: 1 },
            { name: 'Plastic', unit: 'pcs', qty: 1 }
        ]
    };
}

function getRecipeForProduct(name) {
    try {
        const recipeStorage = new StorageManager('bonbonRecipes');
        const userRecipes = recipeStorage.get({});
        return (userRecipes && userRecipes[name]) || getDefaultRecipeMap()[name] || [];
    } catch (e) {
        return getDefaultRecipeMap()[name] || [];
    }
}

function deductIngredientsForOrder(order) {
    const ingredientStorage = new StorageManager('bonbonIngredients');
    const ingredients = ingredientStorage.get([]) || [];
    order.items.forEach(item => {
        const recipe = getRecipeForProduct(item.baseName);
        const recipeNames = new Set(recipe.map(r => String(r.name)));
        recipe.forEach(req => {
            let rName = req.name;
            let rUnit = req.unit;
            let rQty = Number(req.qty) || 0;
            if (item.size && item.category === 'bubbletea') {
                const sizeLabel = String(item.size).toLowerCase();
                const cupMap = { small: 'Cup 12oz', medium: 'Cup 16oz', large: 'Cup 22oz' };
                if (rName === 'Cup') {
                    rName = cupMap[sizeLabel] || rName;
                }
                const factor = sizeLabel === 'small' ? 1.0 : (sizeLabel === 'medium' ? (16/12) : (sizeLabel === 'large' ? (22/12) : 1.0));
                if (rName !== 'Cup' && (rUnit === 'ml' || rUnit === 'g')) {
                    rQty = rQty * factor;
                }
            }
            const deduction = rQty * (Number(item.quantity) || 0);
            let ing = ingredients.find(i => i.name === rName && i.unit === rUnit);
            if (!ing) {
                ing = { name: rName, unit: rUnit, stock: 0 };
                ingredients.push(ing);
            }
            const current = Number(ing.stock) || 0;
            ing.stock = Math.max(0, current - deduction);
        });

        // Packaging deduction independent of recipe (avoid double if already in recipe)
        if (item.category === 'bubbletea') {
            const sizeLabel = String(item.size || '').toLowerCase();
            const cupMap = { small: 'Cup 12oz', medium: 'Cup 16oz', large: 'Cup 22oz' };
            const cupName = cupMap[sizeLabel] || 'Cup';
            const packaging = [
                { name: cupName, unit: 'pcs' },
                { name: 'Straw', unit: 'pcs' },
                { name: 'Lid', unit: 'pcs' },
                { name: 'Sticker', unit: 'pcs' },
                { name: 'Plastic', unit: 'pcs' }
            ];
            packaging.forEach(p => {
                if (recipeNames.has(p.name)) return; // already deducted via recipe
                let ing = ingredients.find(i => i.name === p.name && i.unit === p.unit);
                if (!ing) { ing = { name: p.name, unit: p.unit, stock: 0 }; ingredients.push(ing); }
                const current = Number(ing.stock) || 0;
                ing.stock = Math.max(0, current - (Number(item.quantity) || 0));

            });
        }
    });
    ingredientStorage.set(ingredients);
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
    showConfirm({
        title: 'Cancel Order',
        message: 'Are you sure you want to cancel this order?',
        confirmText: 'Yes, cancel',
        cancelText: 'Keep order'
    }).then(confirmed => {
        if (!confirmed) return;
        const ord = orderList.find(o => o.id === orderId);
        fetch('api/pos.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cancel_order', orderId })
        }).then(async res => {
            let json = {};
            try { json = await res.json(); } catch (_) {}
            if (!res.ok || (json && json.error)) {
                const code = (json && json.error) ? json.error : 'server_error';
                if (code === 'network_error' || code === 'db_error' || code === 'server_error') {
                    pushArchiveLocal('orders', {
                        order_id: orderId,
                        order_number: ord && ord.number,
                        total_amount: ord && ord.total,
                        notes: ord && ord.notes,
                        items_json: JSON.stringify(ord ? ord.items : []),
                        cancelled_at: new Date().toISOString()
                    });
                    orderList = orderList.filter(order => order.id !== orderId);
                    saveOrdersToStorage();
                    updateOrderListDisplay();
                    showToast({ message: 'Order archived locally (offline)', kind: 'info' });
                } else {
                    const msg = orderErrorMessage(code);
                    showNotice({ title: 'Cancel Failed', message: msg, kind: 'error' });
                    showToast({ message: msg, kind: 'error' });
                    return;
                }
            } else {
                orderList = orderList.filter(order => order.id !== orderId);
                saveOrdersToStorage();
                updateOrderListDisplay();
                showNotice({ title: 'Order Cancelled', message: 'Order cancelled successfully.', kind: 'success' });
                showToast({ message: 'Order cancelled', kind: 'success' });
            }
        }).catch(() => {
            pushArchiveLocal('orders', {
                order_id: orderId,
                order_number: ord && ord.number,
                total_amount: ord && ord.total,
                notes: ord && ord.notes,
                items_json: JSON.stringify(ord ? ord.items : []),
                cancelled_at: new Date().toISOString()
            });
            orderList = orderList.filter(order => order.id !== orderId);
            saveOrdersToStorage();
            updateOrderListDisplay();
            showToast({ message: 'Order archived locally (offline)', kind: 'info' });
        });
    });
}

function getOrdersForSelectedDate() {
    return orderList.filter(order => order.dateISO === selectedOrderDate);
}

function exportOrdersToCsv() {
    const orders = getOrdersForSelectedDate();
    if (!orders.length) {
        showNotice({ title: 'No Orders', message: 'No orders available for the selected date.', kind: 'error' });
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
    if (window.XLSX && window.XLSX.utils) {
        const ws = window.XLSX.utils.aoa_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Orders');
        const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orders_${selectedOrderDate}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
        showToast({ message: 'Excel downloaded', kind: 'success' });
        return;
    }
    const csvContent = rows.map(row => row.map(value => `"${value}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${selectedOrderDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast({ message: 'CSV downloaded', kind: 'success' });
}

function exportOrdersToPdf() {
    const orders = getOrdersForSelectedDate();
    if (!orders.length) {
        showNotice({ title: 'No Orders', message: 'No orders available for the selected date.', kind: 'error' });
        return;
    }

    const headers = ['Order ID', 'Product Name', 'Qty.', 'Price/Item', 'Payment', 'Total Price', 'Date', 'Notes'];
    const body = [];
    orders.forEach(order => {
        order.items.forEach((item, index) => {
            body.push([
                index === 0 ? formatOrderId(order.id) : '',
                item.name,
                String(item.quantity),
                `₱${item.price.toFixed(2)}`,
                index === 0 ? capitalize(order.paymentMethod) : '',
                index === 0 ? `₱${order.total.toFixed(2)}` : '',
                index === 0 ? order.dateDisplay : '',
                index === 0 ? (order.notes || '-') : ''
            ]);
        });
    });

    const jspdfGlobal = window.jspdf;
    if (jspdfGlobal && jspdfGlobal.jsPDF && typeof window.jspdf.jsPDF === 'function' && typeof window.jspdf.jsPDF.prototype.autoTable === 'function') {
        const { jsPDF } = jspdfGlobal;
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(14);
        doc.text(`Orders for ${selectedOrderDate}`, 105, 15, { align: 'center' });
        doc.autoTable({
            head: [headers],
            body,
            startY: 22,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [255, 140, 0], textColor: [139, 0, 0] }
        });
        doc.save(`orders_${selectedOrderDate}.pdf`);
        showToast({ message: 'PDF downloaded', kind: 'success' });
        return;
    }

    // Fallback: open printable HTML if jsPDF is unavailable
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
                window.onload = function() { window.print(); };
            </script>
        </body>
        </html>`;
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
        pdfWindow.document.write(html);
        pdfWindow.document.close();
    }
}

// Add Product Modal & Cropper Logic
function setupAddProductModal() {
    const modal = document.getElementById('addProductModal');
    const openBtn = document.getElementById('openAddProductBtn');
    const closeBtn = document.getElementById('closeAddProductBtn');
    const cancelBtn = document.getElementById('cancelAddProductBtn');
    const form = document.getElementById('addProductForm');
    const imageInput = document.getElementById('productImageInput');

    if (!modal || !openBtn || !form || !imageInput) {
        return;
    }

    openBtn.addEventListener('click', openAddProductModal);
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
    if (modal) {
        modal.classList.add('show');
    }
    const form = document.getElementById('addProductForm');
    if (form) {
        form.dataset.mode = 'add';
        form.dataset.productId = '';
    }
}

function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.classList.remove('show');
    }
    resetAddProductForm();
    editingProduct = null;
}

function resetAddProductForm() {
    const form = document.getElementById('addProductForm');
    const imageInput = document.getElementById('productImageInput');

    if (form) form.reset();
    if (imageInput) imageInput.value = '';

    destroyCropper(true);
}

function handleAddProductImage(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
        destroyCropper(true);
        return;
    }

    if (!file.type.startsWith('image/')) {
        showNotice({ title: 'Invalid Image', message: 'Please upload a valid image file.', kind: 'error' });
        event.target.value = '';
        destroyCropper(true);
        return;
    }

    const reader = new FileReader();
    reader.onload = function(loadEvent) {
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

function handleAddProductSubmit(event) {
    event.preventDefault();

    const nameInput = document.getElementById('productNameInput');
    const priceInput = document.getElementById('productPriceInput');
    const categoryInput = document.getElementById('productCategoryInput');

    const name = nameInput ? nameInput.value.trim() : '';
    const priceValue = priceInput ? parseFloat(priceInput.value) : NaN;
    const category = categoryInput ? categoryInput.value : 'chicken';

    if (!name) {
        showNotice({ title: 'Missing Name', message: 'Please enter the product name.', kind: 'error' });
        return;
    }

    if (Number.isNaN(priceValue) || priceValue <= 0) {
        showNotice({ title: 'Invalid Price', message: 'Please enter a valid price.', kind: 'error' });
        return;
    }

    const mode = (document.getElementById('addProductForm')?.dataset?.mode) || 'add';
    if (mode === 'add' && !cropperInstance) {
        showNotice({ title: 'No Image', message: 'Please upload and crop an image for the product.', kind: 'error' });
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

    if (mode === 'add') {
        const newProduct = {
            id: nextProductId++,
            name,
            price: priceValue,
            category,
            image: imageDataUrl
        };
        addCustomProductToCatalog(newProduct);
        saveProductToSharedCatalog(newProduct);
        saveProductBackend('add_product', { id: '', name, category, price: priceValue, stock: 0 }).then(res => {
            if (!(res && res.success)) {
                const msg = (res && res.error) ? res.error : 'server_error';
                showToast({ message: `Backend add failed: ${msg}`, kind: 'error' });
            }
        });
        closeAddProductModal();
        const catText = capitalize(category);
        showNotice({ title: 'Product Added', message: `${newProduct.name} (${catText}) • ₱${priceValue.toFixed(2)} added to POS.`, kind: 'success', duration: 4000 });
    } else {
        const prev = editingProduct;
        if (!prev) { closeAddProductModal(); return; }
        updateProductInCatalog(prev, { name, price: priceValue, category, image: imageDataUrl || prev.image });
        updateProductInSharedCatalog(prev, { name, price: priceValue, category, image: imageDataUrl || prev.image });
        saveProductBackend('update_product', { id: '', name, category, price: priceValue, stock: 0 }).then(res => {
            if (!(res && res.success)) {
                const msg = (res && res.error) ? res.error : 'server_error';
                showToast({ message: `Backend update failed: ${msg}`, kind: 'error' });
            }
        });
        closeAddProductModal();
        const catText = capitalize(category);
        showNotice({ title: 'Product Updated', message: `${name} (${catText}) • ₱${priceValue.toFixed(2)} updated in POS.`, kind: 'success', duration: 4000 });
    }
}

function openEditProductModal(product) {
    editingProduct = product;
    const form = document.getElementById('addProductForm');
    const modal = document.getElementById('addProductModal');
    const nameInput = document.getElementById('productNameInput');
    const priceInput = document.getElementById('productPriceInput');
    const categoryInput = document.getElementById('productCategoryInput');
    if (!form || !modal || !nameInput || !priceInput || !categoryInput) return;
    form.dataset.mode = 'edit';
    form.dataset.productId = String(product.id);
    nameInput.value = product.name;
    priceInput.value = String(product.price);
    categoryInput.value = product.category;
    modal.classList.add('show');
}

function updateProductInCatalog(oldProduct, updated) {
    const oldCat = oldProduct.category;
    const newCat = updated.category;
    const src = backendProducts || products;
    let list = src[oldCat] || [];
    const idx = list.findIndex(p => String(p.name) === String(oldProduct.name));
    if (idx >= 0) {
        list[idx] = { ...list[idx], ...updated };
    }
    if (oldCat !== newCat) {
        src[oldCat] = list.filter(p => String(p.name) !== String(oldProduct.name));
        if (!src[newCat]) src[newCat] = [];
        src[newCat].push({ ...oldProduct, ...updated });
    }
    displayProducts(currentCategory);
}

function updateProductInSharedCatalog(oldProduct, updated) {
    try {
        const sm = new StorageManager('bonbonPosProducts');
        const data = sm.get({}) || {};
        const oldCat = oldProduct.category;
        const newCat = updated.category;
        const base = { id: oldProduct.id, name: updated.name, category: updated.category, price: updated.price, image: updated.image || null };
        if (Array.isArray(data[oldCat])) {
            data[oldCat] = data[oldCat].filter(p => String(p.name) !== String(oldProduct.name));
        }
        if (!Array.isArray(data[newCat])) data[newCat] = [];
        const idx = data[newCat].findIndex(p => String(p.name) === String(base.name));
        if (idx >= 0) data[newCat][idx] = { ...data[newCat][idx], ...base }; else data[newCat].push(base);
        sm.set(data);
    } catch (e) {}
}

function addCustomProductToCatalog(product) {
    if (!products[product.category]) {
        products[product.category] = [];
    }
    products[product.category].push(product);

    if (currentCategory === 'all' || currentCategory === product.category) {
        displayProducts(currentCategory);
    }
}

function saveProductToSharedCatalog(product) {
    try {
        const sm = new StorageManager('bonbonPosProducts');
        const data = sm.get({}) || {};
        const slug = product.category;
        if (!data[slug]) data[slug] = [];
        const list = data[slug];
        const idx = list.findIndex(p => String(p.name) === String(product.name));
        const base = { id: product.id, name: product.name, category: product.category, price: product.price, image: product.image || null };
        if (idx >= 0) list[idx] = { ...list[idx], ...base }; else list.push(base);
        sm.set(data);
    } catch (e) {}
}

function confirmProductDeletion(product) {
    showConfirm({
        title: 'Delete Product',
        message: `Delete "${product.name}" from ${capitalize(product.category)}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
    }).then(confirmed => {
        if (!confirmed) return;
        deleteProductFromCatalog(product.id, product.category);
        showToast({ message: 'Product deleted', kind: 'success' });
    });
}

function deleteProductFromCatalog(productId, category) {
    const categoryList = products[category];
    if (!Array.isArray(categoryList)) {
        showNotice({ title: 'Error', message: 'Unable to remove product: category not found.', kind: 'error' });
        return;
    }

    const index = categoryList.findIndex(item => item.id === productId);
    if (index === -1) {
        showNotice({ title: 'Not Found', message: 'Product not found. It may have already been deleted.', kind: 'error' });
        return;
    }

    const [removedProduct] = categoryList.splice(index, 1);
    saveProductBackend('delete_product', { id: '', name: removedProduct.name }).then(res => {
        if (!(res && res.success)) {
            const msg = (res && res.error) ? res.error : 'server_error';
            showToast({ message: `Backend delete failed: ${msg}`, kind: 'error' });
        }
    });

    if (currentCategory === 'all' || currentCategory === category) {
        displayProducts(currentCategory);
    }

    showNotice({ title: 'Product Removed', message: `"${removedProduct.name}" has been removed from the catalog.`, kind: 'success' });
}

// Generate printable/downloadable receipt
function generateReceipt(orderId) {
    const order = orderList.find(order => order.id === orderId);
    if (!order) {
    showNotice({ title: 'Not Found', message: 'Order not found.', kind: 'error' });
    return;
    }

    const formattedId = order.id.toString().padStart(4, '0');
    const notesValue = order.notes && order.notes.trim().length > 0 ? order.notes : 'None';
    const userLogoImg = document.querySelector('.user-icon img');
    const logoPath = (userLogoImg && (userLogoImg.getAttribute('src') || userLogoImg.getAttribute('data-default-avatar'))) || 'Bonbon Pics/Logo.png';
    const itemsRows = order.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₱${item.price.toFixed(2)}</td>
            <td>₱${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    if (typeof html2canvas === 'undefined') {
        showNotice({ title: 'Error', message: 'Unable to save receipt because html2canvas failed to load.', kind: 'error' });
        return;
    }

    const receiptElement = document.createElement('div');
    receiptElement.className = 'receipt-capture';
    receiptElement.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;">
            <img src="${logoPath}" alt="Logo" style="width:42px;height:42px;border-radius:50%;object-fit:cover;">
            <h2 style="margin:0;">Bonbon Kitchen</h2>
        </div>
        <h3 style="text-align:center;margin-top:4px;">Order Receipt</h3>
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
            showToast({ message: 'Receipt saved', kind: 'success' });
        }).catch(error => {
            console.error('Failed to capture receipt', error);
            showNotice({ title: 'Error', message: 'Unable to save the receipt. Please try again.', kind: 'error' });
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
function showConfirm(opts) {
    const modal = document.getElementById('confirmModal');
    const closeBtn = document.getElementById('closeConfirmBtn');
    const yesBtn = document.getElementById('confirmYesBtn');
    const noBtn = document.getElementById('confirmNoBtn');
    const msg = document.getElementById('confirmMessage');
    const header = modal ? modal.querySelector('.modal-header h3') : null;
    return new Promise(resolve => {
        if (!modal || !yesBtn || !noBtn || !msg) {
            resolve(confirm(opts && opts.message ? opts.message : 'Are you sure?'));
            return;
        }
        msg.textContent = opts && opts.message ? opts.message : '';
        if (header && opts && opts.title) header.innerHTML = `<i class="fas fa-question-circle"></i> ${opts.title}`;
        if (yesBtn && opts && opts.confirmText) yesBtn.textContent = opts.confirmText;
        if (noBtn && opts && opts.cancelText) noBtn.textContent = opts.cancelText;
        const onClose = () => { cleanup(); resolve(false); };
        const onYes = () => { cleanup(); resolve(true); };
        const onNo = () => { cleanup(); resolve(false); };
        function cleanup() {
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
            if (closeBtn) closeBtn.removeEventListener('click', onClose);
            modal.removeEventListener('click', overlayHandler);
            document.removeEventListener('keydown', keyHandler);
            modal.classList.remove('show');
        }
        function overlayHandler(e) {
            if (e.target === modal) onClose();
        }
        function keyHandler(e) {
            if (e.key === 'Escape') onClose();
        }
        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);
        if (closeBtn) closeBtn.addEventListener('click', onClose);
        modal.addEventListener('click', overlayHandler);
        document.addEventListener('keydown', keyHandler);
        modal.classList.add('show');
    });
}

function showNotice(opts) {
    const modal = document.getElementById('noticeModal');
    const titleEl = document.getElementById('noticeTitle');
    const msgEl = document.getElementById('noticeMessage');
    const okBtn = document.getElementById('noticeOkBtn');
    const closeBtn = document.getElementById('closeNoticeBtn');
    if (!modal || !titleEl || !msgEl || !okBtn) return;
    const icon = opts && opts.kind === 'success' ? 'fa-check-circle' : (opts && opts.kind === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    if (opts && opts.title) titleEl.innerHTML = `<i class="fas ${icon}"></i> ${opts.title}`;
    if (opts && opts.message) msgEl.textContent = opts.message;
    const content = modal.querySelector('.modal-content');
    if (content) {
        content.classList.remove('notice-success','notice-error','notice-info');
        const cls = opts && opts.kind === 'success' ? 'notice-success' : (opts && opts.kind === 'error' ? 'notice-error' : 'notice-info');
        content.classList.add(cls);
    }
    let progressEl = null;
    let progressBar = null;
    let timerId = null;
    const duration = (opts && typeof opts.duration === 'number') ? Math.max(1000, opts.duration) : null;
    if (duration) {
        progressEl = document.createElement('div');
        progressEl.className = 'notice-progress';
        progressBar = document.createElement('div');
        progressBar.className = 'notice-progress-bar';
        progressBar.style.transitionDuration = `${duration}ms`;
        progressEl.appendChild(progressBar);
        const body = modal.querySelector('.modal-body');
        if (body) body.appendChild(progressEl);
        requestAnimationFrame(() => { progressBar.style.width = '100%'; });
    }
    function cleanup() {
        okBtn.removeEventListener('click', onOk);
        if (closeBtn) closeBtn.removeEventListener('click', onOk);
        modal.removeEventListener('click', overlayHandler);
        document.removeEventListener('keydown', keyHandler);
        modal.classList.remove('show');
        if (timerId) clearTimeout(timerId);
        if (progressEl && progressEl.parentNode) progressEl.parentNode.removeChild(progressEl);
    }
    function onOk() { cleanup(); }
    function overlayHandler(e) { if (e.target === modal) cleanup(); }
    function keyHandler(e) { if (e.key === 'Escape') cleanup(); }
    okBtn.addEventListener('click', onOk);
    if (closeBtn) closeBtn.addEventListener('click', onOk);
    modal.addEventListener('click', overlayHandler);
    document.addEventListener('keydown', keyHandler);
    modal.classList.add('show');
    if (duration) timerId = setTimeout(onOk, duration);
}

function showToast(opts) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const kind = opts && opts.kind ? opts.kind : 'info';
    const icon = kind === 'success' ? 'fa-check-circle' : (kind === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    const message = (opts && opts.message) ? String(opts.message) : '';
    const duration = (opts && opts.duration) ? opts.duration : 3500;
    const now = Date.now();
    if (!window.__toastState) window.__toastState = { lastShown: {}, maxVisible: 3 };
    const key = `${kind}:${message}`;
    const last = window.__toastState.lastShown[key] || 0;
    if (now - last < 1000) return;
    window.__toastState.lastShown[key] = now;
    while (container.children.length >= window.__toastState.maxVisible) {
        container.removeChild(container.firstElementChild);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
    }, duration);
}
async function loadSharedProductsFromInventory() {
    try {
        const sm = new StorageManager('bonbonPosProducts');
        const shared = sm.get({}) || {};
        const merged = { chicken: [], bubbletea: [], cups: [] };
        function pushUnique(list, item) {
            const exists = list.some(p => String(p.name) === String(item.name));
            if (!exists) list.push(item);
        }
        ['chicken','bubbletea','cups'].forEach(cat => {
            const arr = Array.isArray(shared[cat]) ? shared[cat] : [];
            arr.forEach(r => {
                const base = { id: r.id, name: r.name, category: cat, price: Number(r.price) || 0, image: r.image || null };
                if (cat === 'bubbletea') {
                    base.sizes = { small: base.price, medium: base.price + 15, large: base.price + 30 };
                }
                pushUnique(merged[cat], base);
            });
        });
        // Merge with defaults
        const result = {
            chicken: [...(products.chicken || []), ...(merged.chicken || [])],
            bubbletea: [...(products.bubbletea || []), ...(merged.bubbletea || [])],
            cups: [...(products.cups || [])]
        };
        backendProducts = result;
    } catch (e) {}
}
async function sendOrderToBackend(order) {
    try {
        const res = await fetch('api/pos.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'place_order', paymentMethod: order.paymentMethod, notes: order.notes, total: order.total, items: order.items })
        });
        let json = {};
        try { json = await res.json(); } catch (_) { json = {}; }
        if (!res.ok) {
            const code = (json && json.error) ? json.error : 'server_error';
            return { success: false, error: code };
        }
        if (json && json.error) return { success: false, error: json.error };
        return { success: true };
    } catch (_) {
        return { success: false, error: 'network_error' };
    }
}

function orderErrorMessage(code) {
    const map = {
        db_error: 'Database error encountered.',
        network_error: 'Network error encountered.',
        server_error: 'Server error encountered.',
        unknown_action: 'Unknown server action.'
    };
    return map[code] || 'Order could not be processed.';
}
function pushArchiveLocal(type, entry) {
    try {
        const stored = localStorage.getItem('bonbonArchives');
        const data = stored ? JSON.parse(stored) : { products: [], ingredients: [], recipes: [], orders: [] };
        if (!data.products) data.products = [];
        if (!data.ingredients) data.ingredients = [];
        if (!data.recipes) data.recipes = [];
        if (!data.orders) data.orders = [];
        if (type === 'products') data.products.unshift(entry);
        if (type === 'orders') data.orders.unshift(entry);
        localStorage.setItem('bonbonArchives', JSON.stringify(data));
    } catch (_) {}
}
async function saveProductBackend(action, payload) {
    try {
        const res = await fetch('api/inventory.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...payload })
        });
        let json = {};
        try { json = await res.json(); } catch (_) { json = {}; }
        if (!res.ok) {
            const code = (json && json.error) ? json.error : 'server_error';
            return { success: false, error: code };
        }
        if (json && json.error) return { success: false, error: json.error };
        return { success: true };
    } catch (_) {
        return { success: false, error: 'network_error' };
    }
}
