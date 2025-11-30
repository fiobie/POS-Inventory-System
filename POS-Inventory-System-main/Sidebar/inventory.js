// Inventory System JavaScript

// Storage key for inventory data
const STORAGE_KEY = 'bonbonInventory';

// Inventory data structure
let inventoryData = [];
let nextProductNumber = 1;
let pendingDeleteProductId = null;

// Current filter state
let currentCategory = 'all';
let currentSearch = '';

// Low stock threshold
const LOW_STOCK_THRESHOLD = 10;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadInventoryData();
    initializeNextProductNumber();
    populateCategoryList();
    populateSortMenu();
    renderTable();
    updateSummaryCards();
    setupEventListeners();
    setupSidebarToggle();
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

// Load inventory data from localStorage
function loadInventoryData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            inventoryData = JSON.parse(stored);
        } else {
            // Initialize with sample data if empty
            inventoryData = [
                {
                    id: '#0001',
                    name: '16oz Cup',
                    category: 'cups',
                    price: 1.3,
                    stock: 50,
                    status: 'in-stock'
                }
            ];
            saveInventoryData();
        }
    } catch (error) {
        console.error('Error loading inventory data:', error);
        inventoryData = [];
    }
}

// Initialize counter for sequential IDs
function initializeNextProductNumber() {
    const highest = inventoryData.reduce((max, item) => {
        const numericId = extractNumericPortion(item.id);
        return Math.max(max, numericId);
    }, 0);
    nextProductNumber = highest + 1;
    if (nextProductNumber < 1) {
        nextProductNumber = 1;
    }
}

function extractNumericPortion(id) {
    if (!id) return 0;
    const digits = id.toString().replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
}

function formatProductId(number) {
    return `#${number.toString().padStart(4, '0')}`;
}

// Save inventory data to localStorage
function saveInventoryData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inventoryData));
    } catch (error) {
        console.error('Error saving inventory data:', error);
    }
}

// Generate unique product ID
function generateProductId() {
    const id = formatProductId(nextProductNumber);
    nextProductNumber += 1;
    return id;
}

function previewNextProductId() {
    return formatProductId(nextProductNumber);
}

// Calculate product status based on stock
function calculateStatus(stock) {
    if (stock === 0) {
        return 'out-of-stock';
    } else if (stock <= LOW_STOCK_THRESHOLD) {
        return 'low-stock';
    } else {
        return 'in-stock';
    }
}

// Get status display text
function getStatusText(status) {
    const statusMap = {
        'in-stock': 'In Stock',
        'low-stock': 'Low Stock',
        'out-of-stock': 'Out of Stock'
    };
    return statusMap[status] || 'Unknown';
}

// Get category display text
function getCategoryText(category) {
    const categoryMap = {
        'chicken': 'Chicken Flavors',
        'bubbletea': 'Bubble Tea Flavors',
        'cups': 'Cups'
    };
    return categoryMap[category] || category;
}

// Get all unique categories from inventory data
function getAllCategories() {
    const categories = new Set();
    
    // Add default categories
    categories.add('Chicken Flavors');
    categories.add('Bubble Tea Flavors');
    categories.add('Cups');
    
    // Add categories from inventory data
    inventoryData.forEach(item => {
        const displayName = getCategoryText(item.category);
        categories.add(displayName);
    });
    
    return Array.from(categories).sort();
}

// Populate category datalist
function populateCategoryList() {
    const datalist = document.getElementById('categoryList');
    const categories = getAllCategories();
    
    datalist.innerHTML = categories.map(category => 
        `<option value="${category}">${category}</option>`
    ).join('');
}

// Populate sort menu with categories
function populateSortMenu() {
    const sortMenu = document.getElementById('sortMenu');
    const categories = getAllCategories();
    const sortBtn = document.getElementById('sortBtn');
    
    // Keep "All Categories" option and add dynamic categories
    const allCategoriesOption = '<a href="#" class="sort-item" data-sort="all">All Categories</a>';
    const categoryOptions = categories.map(category => {
        // Convert display name back to key for filtering
        const categoryMap = {
            'Chicken Flavors': 'chicken',
            'Bubble Tea Flavors': 'bubbletea',
            'Cups': 'cups'
        };
        // For custom categories, use the category name itself as the key
        const sortKey = categoryMap[category] || category;
        return `<a href="#" class="sort-item" data-sort="${sortKey}" data-display="${category}">${category}</a>`;
    }).join('');
    
    sortMenu.innerHTML = allCategoriesOption + categoryOptions;
    
    // Re-attach event listeners
    document.querySelectorAll('.sort-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.dataset.sort;
            const displayName = this.dataset.display || this.textContent.trim();
            currentCategory = category;
            
            // Update button text
            sortBtn.innerHTML = `${displayName} <i class="fas fa-chevron-down"></i>`;
            
            sortMenu.classList.remove('show');
            renderTable();
        });
    });
}

// Calculate product value
function calculateValue(price, stock) {
    return (price * stock).toFixed(2);
}

// Filter inventory data
function getFilteredData() {
    let filtered = [...inventoryData];

    // Filter by category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(item => {
            // Check if category matches the key
            if (item.category === currentCategory) {
                return true;
            }
            // Check if category display name matches
            const itemCategoryDisplay = getCategoryText(item.category);
            return itemCategoryDisplay === currentCategory;
        });
    }

    // Filter by search
    if (currentSearch.trim() !== '') {
        const searchLower = currentSearch.toLowerCase();
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(searchLower) ||
            item.id.toLowerCase().includes(searchLower) ||
            getCategoryText(item.category).toLowerCase().includes(searchLower)
        );
    }

    return filtered;
}

// Render products table
function renderTable() {
    const tbody = document.getElementById('productsTableBody');
    const filteredData = getFilteredData();

    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>No products found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredData.map(product => {
        const status = calculateStatus(product.stock);
        const value = calculateValue(product.price, product.stock);
        
        return `
            <tr>
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${getCategoryText(product.category)}</td>
                <td>₱${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td><span class="status-badge ${status}">${getStatusText(status)}</span></td>
                <td>₱${value}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="editProduct('${product.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteProduct('${product.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Update summary cards
function updateSummaryCards() {
    const productsInStock = inventoryData.filter(item => calculateStatus(item.stock) === 'in-stock').length;
    const totalItems = inventoryData.reduce((sum, item) => sum + item.stock, 0);
    const lowStock = inventoryData.filter(item => calculateStatus(item.stock) === 'low-stock').length;
    const outOfStock = inventoryData.filter(item => calculateStatus(item.stock) === 'out-of-stock').length;
    const totalValue = inventoryData.reduce((sum, item) => sum + (item.price * item.stock), 0);

    document.getElementById('productsInStock').textContent = productsInStock;
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('lowStock').textContent = lowStock;
    document.getElementById('outOfStock').textContent = outOfStock;
    document.getElementById('totalValue').textContent = `₱${totalValue.toFixed(2)}`;
}

// Open add product modal
function openAddProductModal() {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('modalTitle');
    
    title.innerHTML = '<i class="fas fa-box"></i> Add Product';
    form.reset();
    form.dataset.mode = 'add';
    document.getElementById('productIdInput').value = previewNextProductId();
    modal.classList.add('show');
}

// Open edit product modal
function editProduct(productId) {
    const product = inventoryData.find(item => item.id === productId);
    if (!product) return;

    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('modalTitle');
    
    title.innerHTML = '<i class="fas fa-edit"></i> Edit Product';
    form.dataset.mode = 'edit';
    form.dataset.productId = productId;
    
    document.getElementById('productIdInput').value = product.id;
    document.getElementById('productNameInput').value = product.name;
    // Show category display name in edit mode
    document.getElementById('productCategoryInput').value = getCategoryText(product.category);
    document.getElementById('productPriceInput').value = product.price;
    document.getElementById('productStockInput').value = product.stock;
    
    modal.classList.add('show');
}

// Delete product
function deleteProduct(productId) {
    const product = inventoryData.find(item => item.id === productId);
    if (!product) return;

    pendingDeleteProductId = productId;
    const modal = document.getElementById('confirmDeleteModal');
    const message = document.getElementById('confirmDeleteMessage');
    if (message) {
        message.innerHTML = `Are you sure you want to delete <strong>${product.name}</strong>?`;
    }
    if (modal) {
        modal.classList.add('show');
    }
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const mode = form.dataset.mode;
    const idInput = document.getElementById('productIdInput');
    let productId = idInput.value.trim();
    const name = document.getElementById('productNameInput').value.trim();
    const categoryInput = document.getElementById('productCategoryInput').value.trim();
    const price = parseFloat(document.getElementById('productPriceInput').value);
    const stock = parseInt(document.getElementById('productStockInput').value);
    
    // Normalize category - convert display name back to key if it's a known category
    let category = categoryInput;
    const categoryMap = {
        'Chicken Flavors': 'chicken',
        'Bubble Tea Flavors': 'bubbletea',
        'Cups': 'cups'
    };
    if (categoryMap[categoryInput]) {
        category = categoryMap[categoryInput];
    }

    // Validation
    if (!productId || !name || !category || isNaN(price) || isNaN(stock)) {
        alert('Please fill in all fields with valid values.');
        return;
    }

    if (price < 0 || stock < 0) {
        alert('Price and stock cannot be negative.');
        return;
    }

    if (mode === 'add') {
        productId = generateProductId();
        idInput.value = productId;
        // Check if ID already exists
        if (inventoryData.find(item => item.id === productId)) {
            alert('Product ID already exists. Please try again.');
            return;
        }

        const newProduct = {
            id: productId,
            name: name,
            category: category,
            price: price,
            stock: stock,
            status: calculateStatus(stock)
        };

        inventoryData.push(newProduct);
    } else if (mode === 'edit') {
        const existingProduct = inventoryData.find(item => item.id === productId);
        if (!existingProduct) {
            alert('Product not found.');
            return;
        }

        // Update product
        existingProduct.name = name;
        existingProduct.category = category;
        existingProduct.price = price;
        existingProduct.stock = stock;
        existingProduct.status = calculateStatus(stock);
    }

    saveInventoryData();
    populateCategoryList(); // Update category list with new category
    populateSortMenu(); // Update sort menu with new category
    renderTable();
    updateSummaryCards();
    closeModal();
}

// Close modal
function closeModal() {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    
    modal.classList.remove('show');
    form.reset();
    form.dataset.mode = '';
    form.dataset.productId = '';
    document.getElementById('productIdInput').value = previewNextProductId();
}

function closeDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    pendingDeleteProductId = null;
    if (modal) {
        modal.classList.remove('show');
    }
}

function confirmDeleteProduct() {
    if (!pendingDeleteProductId) {
        closeDeleteModal();
        return;
    }

    inventoryData = inventoryData.filter(item => item.id !== pendingDeleteProductId);
    saveInventoryData();
    renderTable();
    updateSummaryCards();
    closeDeleteModal();
}

// Clear filters
function clearFilters() {
    currentCategory = 'all';
    currentSearch = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('sortBtn').innerHTML = 'Category <i class="fas fa-chevron-down"></i>';
    document.getElementById('sortMenu').classList.remove('show');
    renderTable();
}

// Setup event listeners
function setupEventListeners() {
    // Add Product Button
    document.getElementById('addProductBtn').addEventListener('click', openAddProductModal);

    // Modal close buttons
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);

    // Close modal on overlay click
    document.getElementById('productModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    const confirmModal = document.getElementById('confirmDeleteModal');
    if (confirmModal) {
        document.getElementById('confirmDeleteCancel').addEventListener('click', closeDeleteModal);
        document.getElementById('closeConfirmModalBtn').addEventListener('click', closeDeleteModal);
        document.getElementById('confirmDeleteConfirm').addEventListener('click', confirmDeleteProduct);
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal) {
                closeDeleteModal();
            }
        });
    }

    // Form submission
    document.getElementById('productForm').addEventListener('submit', handleFormSubmit);

    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        currentSearch = e.target.value;
        renderTable();
    });

    // Clear filters button
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

    // Sort dropdown
    const sortBtn = document.getElementById('sortBtn');
    const sortMenu = document.getElementById('sortMenu');
    
    sortBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        sortMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!sortBtn.contains(e.target) && !sortMenu.contains(e.target)) {
            sortMenu.classList.remove('show');
        }
    });

    // Sort menu items will be attached in populateSortMenu()
}

// Make functions available globally for onclick handlers
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

