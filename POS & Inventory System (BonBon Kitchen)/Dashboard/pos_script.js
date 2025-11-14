document.addEventListener('DOMContentLoaded', () => {
    // --- Data Storage (Placeholder Products and In-Memory Storage) ---
    const products = [
        { id: 'C001', name: 'Snow Cheese', category: 'chicken', price: 150.00 },
        { id: 'C002', name: 'Boombayah', category: 'chicken', price: 160.00 },
        { id: 'C003', name: 'Cloy Honey Soy', category: 'chicken', price: 140.00 },
        { id: 'C004', name: 'Chijue Chikin', category: 'chicken', price: 170.00 },
        { id: 'C005', name: 'Honey Butter Night', category: 'chicken', price: 165.00 },
        { id: 'B001', name: 'Milk Tea Classic', category: 'bubbletea', price: 95.00 },
        { id: 'B002', name: 'Taro Blast', category: 'bubbletea', price: 105.00 },
        { id: 'B003', name: 'Brown Sugar', category: 'bubbletea', price: 110.00 },
        { id: 'B004', name: 'Matcha Green', category: 'bubbletea', price: 120.00 },
    ];
    
    let shoppingCart = [];
    let dailyOrders = []; // Stores confirmed orders

    // --- DOM Elements ---
    const productCatalog = document.getElementById('product-catalog');
    const categoryDropdown = document.getElementById('category-dropdown');
    const cartItemsTbody = document.getElementById('cart-items-tbody');
    const totalPriceSpan = document.getElementById('total-price');
    const confirmOrderBtn = document.getElementById('confirm-order-btn');
    const showOrderListBtn = document.getElementById('show-order-list-btn');
    const closeOrderListBtn = document.getElementById('close-order-list-btn');
    const orderListPanel = document.getElementById('order-list-panel');
    const dailyOrdersTbody = document.getElementById('daily-orders-tbody');

    // --- Core Functions ---

    /** Renders product cards based on the selected category. */
    const renderProducts = (category = 'all') => {
        productCatalog.innerHTML = '';
        const filteredProducts = category === 'all' 
            ? products 
            : products.filter(p => p.category === category);

        filteredProducts.forEach(product => {
            const card = document.createElement('div');
            card.classList.add('product-card');
            card.dataset.productId = product.id;

            // Matches the visual product card structure
            card.innerHTML = `
                <div class="product-card-image-placeholder">
                   <img src="images/${product.id.toLowerCase()}.jpg" alt="${product.name}" class="product-image-actual">
                </div>
                <h4>${product.name}</h4>
                <p>Price of Product: ${product.price.toFixed(2)}</p>
            `;
            // Feature: Picture when clicked will show up on the Order container
            card.addEventListener('click', () => addItemToCart(product.id));
            productCatalog.appendChild(card);
        });
    };

    /** Adds an item to the shopping cart or increments quantity. */
    const addItemToCart = (productId) => {
        const product = products.find(p => p.id === productId);
        let cartItem = shoppingCart.find(item => item.id === productId);

        if (cartItem) {
            cartItem.quantity++;
        } else {
            shoppingCart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                unitPrice: product.price, // Store price per order
                quantity: 1
            });
        }
        renderCart();
    };

    /** Removes an item from the cart or decrements quantity. */
    const updateCartItemQuantity = (productId, change) => {
        const itemIndex = shoppingCart.findIndex(item => item.id === productId);
        if (itemIndex > -1) {
            shoppingCart[itemIndex].quantity += change;
            
            if (shoppingCart[itemIndex].quantity <= 0) {
                shoppingCart.splice(itemIndex, 1); // Remove if quantity is 0 or less
            }
            renderCart();
        }
    };

    /** Renders the shopping cart table and updates the total price. */
    const renderCart = () => {
        cartItemsTbody.innerHTML = '';
        let total = 0;

        shoppingCart.forEach(item => {
            const lineTotal = item.unitPrice * item.quantity;
            const row = cartItemsTbody.insertRow();
            
            // Feature: Product, Quantity, and Price per order display
            row.innerHTML = `
                <td>${item.name}</td>
                <td class="qty-control">
                    <button data-id="${item.id}" data-change="-1" class="qty-btn">-</button>
                    ${item.quantity}
                    <button data-id="${item.id}" data-change="1" class="qty-btn">+</button>
                </td>
                <td style="text-align:right;">${lineTotal.toFixed(2)}</td>
                <td style="text-align:center;">
                    <button data-id="${item.id}" class="remove-item-btn"><i class="fas fa-trash"></i></button>
                </td>
            `;
            total += lineTotal;
        });

        // Feature: Total Price of the order
        totalPriceSpan.textContent = total.toFixed(2);
        attachCartListeners();
    };

    /** Attaches listeners for removing items and quantity controls. */
    const attachCartListeners = () => {
        document.querySelectorAll('.remove-item-btn').forEach(button => {
            button.onclick = (e) => {
                const idToRemove = e.currentTarget.dataset.id;
                const index = shoppingCart.findIndex(item => item.id === idToRemove);
                if (index > -1) {
                    shoppingCart.splice(index, 1);
                    renderCart();
                }
            };
        });

        document.querySelectorAll('.qty-control button').forEach(button => {
            button.onclick = (e) => {
                const id = e.currentTarget.dataset.id;
                const change = parseInt(e.currentTarget.dataset.change);
                updateCartItemQuantity(id, change);
            };
        });
    };
    
    /** Renders the daily orders in the Order List panel. */
    const renderDailyOrders = () => {
        dailyOrdersTbody.innerHTML = '';
        
        dailyOrders.forEach(order => {
            // Feature: Show Product Name (eg. Snow Cheese, Boombayah etc,)
            const totalProducts = order.items.map(i => `${i.name}`).join(', ');
            const totalQuantity = order.items.reduce((sum, i) => sum + i.quantity, 0);

            const row = dailyOrdersTbody.insertRow();
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>${totalProducts}</td>
                <td>${totalQuantity}</td>
                <td>${order.items.length > 0 ? order.items[0].unitPrice.toFixed(2) : '0.00'}</td>
                <td>${order.paymentMethod}</td>
                <td><strong>${order.total.toFixed(2)}</strong></td>
                <td>
                    <button class="action-btn edit-btn" data-id="${order.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn cancel-btn" data-id="${order.id}"><i class="fas fa-times-circle"></i></button>
                </td>
            `;
            // Note: The Price/Item column is simplified here, showing the price of the first item for simplicity.
        });
    };

    // --- Event Listeners ---

    // 1. Product Catalog Filter
    categoryDropdown.addEventListener('change', (e) => {
        // Feature: Categories drop down will show Chicken Flavors and Bubble Tea Flavors
        renderProducts(e.target.value);
    });

    // 2. Confirm Order Button
    confirmOrderBtn.addEventListener('click', () => {
        if (shoppingCart.length === 0) {
            alert('Your cart is empty. Please add items to confirm an order.');
            return;
        }

        const orderId = Math.floor(Math.random() * 90000) + 10000; // Simple 5-digit ID
        const total = parseFloat(totalPriceSpan.textContent);
        
        // Feature: Payment Method section
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        
        // Feature: Note section
        const note = document.getElementById('customer-note').value;
        
        const newOrder = {
            id: orderId,
            items: [...shoppingCart],
            total: total,
            paymentMethod: paymentMethod,
            note: note,
            timestamp: new Date()
        };

        dailyOrders.unshift(newOrder); // Add to the beginning of the order list
        
        // Reset POS state
        shoppingCart = [];
        document.getElementById('customer-note').value = '';
        renderCart();

        // Feature: Button at the bottom will be the Confirm button where it will go to the order list.
        alert(`Order #${orderId} confirmed! Total: ${total.toFixed(2)} PHP (${paymentMethod})`);
        renderDailyOrders();
        orderListPanel.classList.remove('hidden'); // Show the Order List
    });

    // 3. Order List Panel Controls
    showOrderListBtn.addEventListener('click', () => {
        // Feature: Order List button will show all the orders made in that day.
        renderDailyOrders();
        orderListPanel.classList.remove('hidden');
    });

    closeOrderListBtn.addEventListener('click', () => {
        orderListPanel.classList.add('hidden');
    });

    // --- Initialization ---
    renderProducts('all'); 
    renderCart(); 
});