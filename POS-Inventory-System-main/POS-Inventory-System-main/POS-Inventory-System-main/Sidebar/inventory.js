/**
 * Inventory Management System - OOP Refactored
 * Optimized for performance and scalability
 */

class InventoryManager {
    constructor() {
        // Configuration
        this.STORAGE_KEY = 'bonbonInventory';
        this.LOW_STOCK_THRESHOLD = 10;
        this.DEFAULT_SERVINGS_PER_BATCH = {
            'Brewed Assam Black Tea': 5,
            'Simple Syrup': 120,
            'Milk Syrup': 24,
            'BROWN SUGAR SAUCE': 12,
            'TAPIOCA PEARLS': 11,
            'COFFEE JELLY': 13,
            'EGG PUDDING': 20,
            'CREAM PUFF': 10,
            'CREAM CHEESE': 8,
            'Rock Salt and Cheese (Prep)': 6
        };
        
        // Data
        this.inventoryData = [];
        this.ingredients = [];
        this.currentCategory = 'all';
        this.currentSearch = '';
        this.currentStatusFilter = null;
        
        // Managers
        this.storage = new StorageManager(this.STORAGE_KEY);
        this.recipeStorage = new StorageManager('bonbonRecipes');
        this.ingredientStorage = new StorageManager('bonbonIngredients');
        this.posProductStorage = new StorageManager('bonbonPosProducts');
        this.archiveStorage = new StorageManager('bonbonArchives');
        this.eventManager = new EventManager();
        
        // Category mappings
        this.CATEGORY_PREFIXES = {
            'chicken': 'CHK',
            'bubbletea': 'BT',
            'cups': 'SUP',
            'ingredients': 'ING',
            'packaging': 'PKG'
        };
        
        this.CATEGORY_DISPLAY_MAP = {
            'chicken': 'Chicken Flavors',
            'bubbletea': 'Bubble Tea Flavors',
            'cups': 'Cups',
            'packaging': 'Packaging'
        };
        
        this.CATEGORY_KEY_MAP = {
            'Chicken Flavors': 'chicken',
            'Bubble Tea Flavors': 'bubbletea',
            'Cups': 'cups',
            'Ingredients': 'ingredients',
            'Packaging': 'packaging'
        };
        
        // DOM elements cache
        this.elements = {};
        this.renderCache = null;
    }

    /**
     * Initialize the inventory manager
     */
    init() {
        this.loadElements();
        this.loadInventoryData();
        this.normalizeCategoryIds('bubbletea');
        this.syncIngredientsFromBackend();
        this.syncRecipesFromBackend();
        this.setupEventListeners();
        this.populateCategoryList();
        this.populateSortMenu();
        this.renderTable();
        this.updateSummaryCards();
        this.syncProductsFromBackend();
    }

    /**
     * Cache DOM elements for performance
     */
    loadElements() {
        this.elements = {
            // Summary cards
            productsInStock: DOMHelper.getElement('productsInStock'),
            totalItems: DOMHelper.getElement('totalItems'),
            lowStock: DOMHelper.getElement('lowStock'),
            outOfStock: DOMHelper.getElement('outOfStock'),
            totalValue: DOMHelper.getElement('totalValue'),
            productsInStockCard: DOMHelper.getElement('productsInStockCard'),
            totalItemsCard: DOMHelper.getElement('totalItemsCard'),
            lowStockCard: DOMHelper.getElement('lowStockCard'),
            outOfStockCard: DOMHelper.getElement('outOfStockCard'),
            lowIngredientsCard: DOMHelper.getElement('lowIngredientsCard'),
            outIngredientsCard: DOMHelper.getElement('outIngredientsCard'),
            
            // Table
            productsTableBody: DOMHelper.getElement('productsTableBody'),
            
            // Modal
            productModal: DOMHelper.getElement('productModal'),
            productForm: DOMHelper.getElement('productForm'),
            modalTitle: DOMHelper.getElement('modalTitle'),
            productIdInput: DOMHelper.getElement('productIdInput'),
            productNameInput: DOMHelper.getElement('productNameInput'),
            productCategoryInput: DOMHelper.getElement('productCategoryInput'),
            productPriceInput: DOMHelper.getElement('productPriceInput'),
            productStockInput: DOMHelper.getElement('productStockInput'),
            closeModalBtn: DOMHelper.getElement('closeModalBtn'),
            cancelBtn: DOMHelper.getElement('cancelBtn'),
            // Form previews
            productStatusPreview: DOMHelper.getElement('productStatusPreview'),
            productValuePreview: DOMHelper.getElement('productValuePreview'),
            productIngredientsPreview: DOMHelper.getElement('productIngredientsPreview'),
            productServingsPreview: DOMHelper.getElement('productServingsPreview'),
            productShortPreview: DOMHelper.getElement('productShortPreview'),
            editRecipeFromFormBtn: DOMHelper.getElement('editRecipeFromFormBtn'),
            // Recipe Modal
            recipeModal: DOMHelper.getElement('recipeModal'),
            recipeForm: DOMHelper.getElement('recipeForm'),
            recipeModalTitle: DOMHelper.getElement('recipeModalTitle'),
            recipeProductName: DOMHelper.getElement('recipeProductName'),
            recipeTableBody: DOMHelper.getElement('recipeTableBody'),
            addRecipeRowBtn: DOMHelper.getElement('addRecipeRowBtn'),
            closeRecipeModalBtn: DOMHelper.getElement('closeRecipeModalBtn'),
            cancelRecipeBtn: DOMHelper.getElement('cancelRecipeBtn'),
            // Ingredient Stock Modal
            ingredientModal: DOMHelper.getElement('ingredientModal'),
            ingredientForm: DOMHelper.getElement('ingredientForm'),
            ingredientModalTitle: DOMHelper.getElement('ingredientModalTitle'),
            ingredientFormBody: DOMHelper.getElement('ingredientFormBody'),
            closeIngredientModalBtn: DOMHelper.getElement('closeIngredientModalBtn'),
            cancelIngredientModalBtn: DOMHelper.getElement('cancelIngredientModalBtn'),
            
            // Controls
            addProductBtn: DOMHelper.getElement('addProductBtn'),
            searchInput: DOMHelper.getElement('searchInput'),
            clearFiltersBtn: DOMHelper.getElement('clearFiltersBtn'),
            sortBtn: DOMHelper.getElement('sortBtn'),
            sortMenu: DOMHelper.getElement('sortMenu'),
            categoryList: DOMHelper.getElement('categoryList'),
            lowIngredients: DOMHelper.getElement('lowIngredients'),
            outIngredients: DOMHelper.getElement('outIngredients')
        };
    }

    /**
     * Load inventory data from storage
     */
    loadInventoryData() {
        const defaultData = [{
            id: 'BT-0001',
            name: 'Cup',
            category: 'cups',
            price: 1.3,
            stock: 100,
            status: 'in-stock'
        },
        {
            id: 'CHK-0001',
            name: 'Cloy Honey Soy',
            category: 'chicken',
            price: 149,
            stock: 48,
            status: 'in-stock'
        },
        {
            id: 'CHK-0002',
            name: 'Boombayah',
            category: 'chicken',
            price: 149,
            stock: 32,
            status: 'in-stock'
        },
        {
            id: 'CHK-0003',
            name: 'Honey Butter Night',
            category: 'chicken',
            price: 149,
            stock: 25,
            status: 'in-stock'
        },
        {
            id: 'CHK-0004',
            name: 'Oppa BB-Q',
            category: 'chicken',
            price: 149,
            stock: 30,
            status: 'in-stock'
        },
        {
            id: 'CHK-0005',
            name: 'Chijeu Chikin',
            category: 'chicken',
            price: 149,
            stock: 26,
            status: 'in-stock'
        },
        {
            id: 'CHK-0006',
            name: 'Olenji Chikin',
            category: 'chicken',
            price: 149,
            stock: 18,
            status: 'in-stock'
        },
        {
            id: 'CHK-0007',
            name: 'Salted Egg Chikin',
            category: 'chicken',
            price: 159,
            stock: 20,
            status: 'in-stock'
        },
        {
            id: 'CHK-0008',
            name: 'Yangneom Nom',
            category: 'chicken',
            price: 159,
            stock: 22,
            status: 'in-stock'
        },
        {
            id: 'CHK-0009',
            name: 'Bonbon Buldak',
            category: 'chicken',
            price: 159,
            stock: 18,
            status: 'in-stock'
        },
        {
            id: 'CHK-0010',
            name: 'Snow Cheese',
            category: 'chicken',
            price: 159,
            stock: 24,
            status: 'in-stock'
        },
        {
            id: 'CHK-0011',
            name: 'Honey Mustard Chikin',
            category: 'chicken',
            price: 159,
            stock: 20,
            status: 'in-stock'
        },
        {
            id: 'BT-0002',
            name: 'Classic',
            category: 'bubbletea',
            price: 79,
            stock: 50,
            status: 'in-stock'
        },
        {
            id: 'BT-0003',
            name: 'Wintermelon',
            category: 'bubbletea',
            price: 79,
            stock: 50,
            status: 'in-stock'
        },
        {
            id: 'BT-0004',
            name: 'Okinawa',
            category: 'bubbletea',
            price: 79,
            stock: 50,
            status: 'in-stock'
        },
        {
            id: 'BT-0005',
            name: 'Cookies & Cream',
            category: 'bubbletea',
            price: 89,
            stock: 50,
            status: 'in-stock'
        },
        {
            id: 'BT-0006',
            name: 'Matcha',
            category: 'bubbletea',
            price: 89,
            stock: 50,
            status: 'in-stock'
        },
        {
            id: 'BT-0007',
            name: 'Taro',
            category: 'bubbletea',
            price: 89,
            stock: 50,
            status: 'in-stock'
        },
        {
            id: 'BT-0008',
            name: 'Chocolate',
            category: 'bubbletea',
            price: 79,
            stock: 50,
            status: 'in-stock'
        },
        {
            id: 'BT-0009',
            name: 'Strawberry',
            category: 'bubbletea',
            price: 79,
            stock: 50,
            status: 'in-stock'
        },
        {
            id: 'BT-0010',
            name: 'Brown Sugar',
            category: 'bubbletea',
            price: 99,
            stock: 50,
            status: 'in-stock'
        },
        {
            id: 'BT-0011',
            name: 'Brewed Assam Black Tea',
            category: 'bubbletea',
            price: 0,
            stock: 8,
            status: 'in-stock'
        },
        {
            id: 'BT-0012',
            name: 'Simple Syrup',
            category: 'bubbletea',
            price: 0,
            stock: 96,
            status: 'in-stock'
        },
        {
            id: 'BT-0013',
            name: 'Milk Syrup (Prep)',
            category: 'bubbletea',
            price: 0,
            stock: 24,
            status: 'in-stock'
        },
        {
            id: 'BT-0014',
            name: 'Brown Sugar Sauce',
            category: 'bubbletea',
            price: 0,
            stock: 60,
            status: 'in-stock'
        },
        {
            id: 'BT-0015',
            name: 'Brown Sugar Syrup (Prep)',
            category: 'bubbletea',
            price: 0,
            stock: 16,
            status: 'in-stock'
        },
        {
            id: 'BT-0016',
            name: 'Tapioca Pearls (Prep)',
            category: 'bubbletea',
            price: 0,
            stock: 11,
            status: 'in-stock'
        },
        {
            id: 'BT-0017',
            name: 'Coffee Jelly (Prep)',
            category: 'bubbletea',
            price: 0,
            stock: 13,
            status: 'in-stock'
        },
        {
            id: 'BT-0018',
            name: 'Egg Pudding (Prep)',
            category: 'bubbletea',
            price: 0,
            stock: 20,
            status: 'in-stock'
        },
        {
            id: 'BT-0019',
            name: 'Cream Puff (Prep)',
            category: 'bubbletea',
            price: 0,
            stock: 10,
            status: 'in-stock'
        },
        {
            id: 'BT-0020',
            name: 'Cream Cheese (Prep)',
            category: 'bubbletea',
            price: 0,
            stock: 8,
            status: 'in-stock'
        },
        {
            id: 'BT-0021',
            name: 'Rock Salt and Cheese (Prep)',
            category: 'bubbletea',
            price: 0,
            stock: 6,
            status: 'in-stock'
        },
        {
            id: 'PKG-0001',
            name: 'Spaghetti Box',
            category: 'packaging',
            price: 4,
            stock: 200,
            status: 'in-stock'
        },
        {
            id: 'PKG-0002',
            name: 'Egg (Packaging)',
            category: 'packaging',
            price: 5,
            stock: 300,
            status: 'in-stock'
        },
        {
            id: 'PKG-0003',
            name: 'Aluminum Foil Sheet',
            category: 'packaging',
            price: 2,
            stock: 500,
            status: 'in-stock'
        },
        {
            id: 'PKG-0004',
            name: 'Paper Bag',
            category: 'packaging',
            price: 3,
            stock: 400,
            status: 'in-stock'
        }];
        
        const storedInventoryRaw = this.storage.get([]) || [];
        const storedInventory = Array.isArray(storedInventoryRaw) ? storedInventoryRaw : [];
        const hasByNameCat = (arr, def) => arr.some(item =>
            String(item.name || '').trim().toLowerCase() === String(def.name || '').trim().toLowerCase() &&
            String(item.category || '').trim().toLowerCase() === String(def.category || '').trim().toLowerCase()
        );
        const base = storedInventory.length ? storedInventory : defaultData;
        const missingByName = defaultData.filter(def => !hasByNameCat(base, def));
        this.inventoryData = this.dedupeProducts(base.concat(missingByName));
        this.saveInventoryData();

        // Load ingredients inventory (base units)
        const defaultIngredients = [
            { name: 'Chicken', unit: 'pcs', stock: 500 },
            { name: 'Soy Sauce', unit: 'ml', stock: 5000 },
            { name: 'Honey', unit: 'ml', stock: 3000 },
            { name: 'Hot Sauce', unit: 'ml', stock: 500 },
            { name: 'Ketchup', unit: 'ml', stock: 1000 },
            { name: 'Gochujang', unit: 'g', stock: 500 },
            { name: 'Milk', unit: 'ml', stock: 2000 },
            { name: 'Butter', unit: 'g', stock: 1000 },
            { name: 'Cheese', unit: 'g', stock: 2000 },
            { name: 'Garlic', unit: 'g', stock: 1000 },
            { name: 'Egg', unit: 'pcs', stock: 200 },
            { name: 'Flour', unit: 'g', stock: 2000 },
            { name: 'Cornstarch', unit: 'g', stock: 2000 },
            { name: 'Brown Sugar', unit: 'g', stock: 2000 },
            { name: 'Sugar', unit: 'g', stock: 2000 },
            { name: 'Garlic Powder', unit: 'g', stock: 500 },
            { name: 'Onion Powder', unit: 'g', stock: 500 },
            { name: 'Salt', unit: 'g', stock: 2000 },
            { name: 'Pepper', unit: 'g', stock: 1000 },
            { name: 'Powdered Sugar', unit: 'g', stock: 1000 },
            { name: 'Milk Powder', unit: 'g', stock: 2000 },
            { name: 'Cheese Powder', unit: 'g', stock: 500 },
            { name: 'Parsley', unit: 'g', stock: 200 },
            { name: 'Mayo', unit: 'g', stock: 3000 },
            { name: 'Mustard Paste', unit: 'ml', stock: 500 },
            { name: 'Sesame Oil', unit: 'ml', stock: 1000 },
            { name: 'Onion Springs', unit: 'g', stock: 200 },
            { name: 'Water', unit: 'ml', stock: 10000 },
            { name: 'Ginger', unit: 'g', stock: 200 },
            { name: 'Chili Powder', unit: 'g', stock: 200 },
            { name: 'Chili Flakes', unit: 'g', stock: 200 },
            { name: 'Orange Juice', unit: 'ml', stock: 1000 },
            { name: 'Vinegar', unit: 'ml', stock: 1000 },
            { name: 'Garnish', unit: 'serving', stock: 1000 },
            { name: 'Spaghetti Box', unit: 'pcs', stock: 1000 },
            { name: 'Salted Egg Powder', unit: 'g', stock: 1000 },
            { name: 'Non-Dairy Creamer', unit: 'g', stock: 2000 },
            { name: 'Milk Syrup', unit: 'ml', stock: 2000 },
            { name: 'Black Tea', unit: 'ml', stock: 5000 },
            { name: 'Wintermelon Syrup', unit: 'ml', stock: 2000 },
            { name: 'Brown Sugar Syrup', unit: 'ml', stock: 2000 },
            { name: 'Matcha Powder', unit: 'g', stock: 1000 },
            { name: 'Taro Powder', unit: 'g', stock: 1000 },
            { name: 'Chocolate Syrup', unit: 'ml', stock: 2000 },
            { name: 'Strawberry Syrup', unit: 'ml', stock: 2000 },
            { name: 'Pearls', unit: 'g', stock: 2000 },
            { name: 'Cup', unit: 'pcs', stock: 100 },
            { name: 'Straw', unit: 'pcs', stock: 100 },
            { name: 'Lid', unit: 'pcs', stock: 100 },
            { name: 'Sticker', unit: 'pcs', stock: 100 },
            { name: 'Plastic', unit: 'pcs', stock: 100 }
        ];
        const storedIngredientsRaw = this.ingredientStorage.get([]) || [];
        const storedIngredients = Array.isArray(storedIngredientsRaw) ? storedIngredientsRaw : [];
        const missingIngredients = defaultIngredients.filter(def => !storedIngredients.some(item => item && item.name === def.name && item.unit === def.unit));
        if (missingIngredients.length > 0) {
            this.ingredients = storedIngredients.concat(missingIngredients);
            this.ingredientStorage.set(this.ingredients);
        } else {
            this.ingredients = storedIngredients.length ? storedIngredients : defaultIngredients;
        }
    }

    /**
     * Save inventory data to storage
     */
    saveInventoryData() {
        this.storage.set(this.inventoryData);
        DOMHelper.clearCache(); // Clear cache after save
    }

    dedupeProducts(items) {
        try {
            const byKey = new Map();
            items.forEach(p => {
                const name = String(p.name || '').toLowerCase().trim();
                const cat = String(p.category || '').toLowerCase().trim();
                const key = `${name}|${cat}`;
                const prev = byKey.get(key);
                if (!prev) {
                    byKey.set(key, p);
                } else {
                    const a = Number(prev.stock) || 0;
                    const b = Number(p.stock) || 0;
                    byKey.set(key, b >= a ? p : prev);
                }
            });
            return Array.from(byKey.values());
        } catch (_) {
            return items;
        }
    }

    normalizeCategoryIds(categoryKey) {
        const prefix = this.CATEGORY_PREFIXES[categoryKey];
        if (!prefix) return;
        const list = this.inventoryData.filter(item => this.getCategoryKey(item.category) === categoryKey);
        if (!list.length) return;
        const sorted = list.slice().sort((a, b) => {
            const an = parseInt(String(a.id).split('-')[1] || '0', 10);
            const bn = parseInt(String(b.id).split('-')[1] || '0', 10);
            return an - bn;
        });
        let n = 1;
        const pad = v => String(v).padStart(4, '0');
        const reassigned = new Map();
        sorted.forEach(item => {
            const newId = `${prefix}-${pad(n++)}`;
            reassigned.set(item.id, newId);
            item.id = newId;
        });
        this.saveInventoryData();
    }

    async syncProductsFromBackend() {
        try {
            const res = await fetch('api/inventory.php?action=products');
            if (!res.ok) { showToast({ message: 'Unable to load products from server', kind: 'error' }); return; }
            const json = await res.json();
            const rows = Array.isArray(json.products) ? json.products : [];
            if (!rows.length) return;
            const mapped = rows.map(r => ({
                id: String(r.id),
                name: String(r.name),
                category: String(r.category),
                price: Number(r.price) || 0,
                stock: Number(r.stock) || 0,
                reorder_level: Number(r.reorder_level) || 0,
                status: this.calculateStatus(Number(r.stock) || 0)
            }));
            this.inventoryData = mapped;
            // Cleanup mistakenly seeded duplicates without "Milk Tea" suffix
            const dupCandidates = ['Cookies & Cream','Brown Sugar'];
            const existingNames = new Set(mapped.map(p => String(p.name).toLowerCase().trim()));
            const toDelete = dupCandidates.filter(n => existingNames.has(n.toLowerCase()) && existingNames.has((n + ' Milk Tea').toLowerCase()));
            if (toDelete.length) {
                await Promise.all(toDelete.map(n => fetch('api/inventory.php', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete_product', name: n })
                }).catch(() => null)));
                const res2 = await fetch('api/inventory.php?action=products');
                if (res2.ok) {
                    const json2 = await res2.json();
                    const rows2 = Array.isArray(json2.products) ? json2.products : [];
                    this.inventoryData = rows2.map(r => ({
                        id: String(r.id),
                        name: String(r.name),
                        category: String(r.category),
                        price: Number(r.price) || 0,
                        stock: Number(r.stock) || 0,
                        reorder_level: Number(r.reorder_level) || 0,
                        status: this.calculateStatus(Number(r.stock) || 0)
                    }));
                }
            }
            // Keep packaging ingredients (e.g., Cup) synced with packaging product stock
            this.inventoryData.forEach(p => {
                if (p.category === 'cups' || p.category === 'packaging') {
                    this.syncPackagingIngredient(p.name, p.stock);
                }
            });
            this.saveInventoryData();
            this.renderTable();
            this.updateSummaryCards();
        } catch (e) { /* silent fallback to local inventory */ }
    }

    async syncIngredientsFromBackend() {
        try {
            const res = await fetch('api/inventory.php?action=ingredients');
            if (!res.ok) { return; }
            let rows = [];
            try { rows = await res.json(); } catch (_) { rows = []; }
            if (!Array.isArray(rows)) return;
            const mapped = rows.map(r => ({ name: String(r.name), unit: String(r.unit), stock: Number(r.current_stock) || 0, reorder: Number(r.reorder_level) || 0 }));
            if (mapped.length) {
                this.ingredients = mapped;
                this.ingredientStorage.set(this.ingredients);
                this.renderTable();
                this.updateSummaryCards();
            }
        } catch (e) { /* silent fallback to local ingredients */ }
    }

    async syncRecipesFromBackend() {
        try {
            const res = await fetch('api/inventory.php?action=recipes');
            if (!res.ok) { return; }
            let rows = [];
            try { rows = await res.json(); } catch (_) { rows = []; }
            if (!Array.isArray(rows)) return;
            const grouped = {};
            const meta = {};
            rows.forEach(r => {
                const key = String(r.product_name);
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push({ name: String(r.ingredient_name), unit: String(r.unit), qty: Number(r.qty) || 0 });
                if (!meta[key]) meta[key] = this.parseRecipeNotes(String(r.notes || ''));
            });
            this.backendRecipes = grouped;
            this.backendRecipeMeta = meta;
        } catch (e) { /* silent fallback to local recipes */ }
    }

    parseRecipeNotes(notes) {
        const m = {};
        const pairs = notes.split(';');
        pairs.forEach(p => {
            const [k, v] = p.split('=');
            if (!k || v === undefined) return;
            const key = k.trim();
            const val = v.trim();
            if (/^yield_/.test(key) || /^portion_/.test(key)) {
                m[key] = isNaN(Number(val)) ? val : Number(val);
            }
        });
        return m;
    }

    /**
     * Generate organized product ID
     */
    generateProductId(category) {
        const categoryKey = this.CATEGORY_KEY_MAP[category] || 
                           category.toLowerCase().replace(/\s+/g, '');
        const prefix = this.CATEGORY_PREFIXES[categoryKey] || 'PRD';
        
        // Find highest number for this category
        const existingIds = this.inventoryData
            .filter(item => {
                const itemCategory = this.getCategoryKey(item.category);
                return this.CATEGORY_PREFIXES[itemCategory] === prefix;
            })
            .map(item => {
                const match = item.id.match(/-(\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            });
        
        const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        return `${prefix}-${FormatUtils.pad(nextNumber)}`;
    }

    /**
     * Get category key from display name
     */
    getCategoryKey(categoryDisplay) {
        return this.CATEGORY_KEY_MAP[categoryDisplay] || 
               categoryDisplay.toLowerCase().replace(/\s+/g, '');
    }

    /**
     * Calculate product status
     */
    calculateStatus(stock) {
        if (stock === 0) return 'out-of-stock';
        if (stock <= this.LOW_STOCK_THRESHOLD) return 'low-stock';
        return 'in-stock';
    }

    isLowStock(item) {
        const stock = Number(item.stock) || 0;
        const rl = Number(item.reorder_level) || 0;
        if (stock <= 0) return false;
        if (rl > 0) return stock <= rl;
        return stock <= this.LOW_STOCK_THRESHOLD;
    }

    /**
     * Get status display text
     */
    getStatusText(status) {
        const statusMap = {
            'in-stock': 'In Stock',
            'low-stock': 'Low Stock',
            'out-of-stock': 'Out of Stock'
        };
        return statusMap[status] || 'Unknown';
    }

    getIngredientIssue(name) {
        const recipe = this.getRecipe(name);
        if (!Array.isArray(recipe) || recipe.length === 0) return { cls: 'in-stock', text: 'Ingredients OK' };
        const shortage = this.computeShortageCount(recipe, name);
        const servings = this.computePossibleServings(recipe, name);
        if (servings === 0) return { cls: 'out-of-stock', text: 'Ingredients Out' };
        if (shortage > 0) return { cls: 'low-stock', text: 'Ingredients Shortage' };
        return { cls: 'in-stock', text: 'Ingredients OK' };
    }

    /**
     * Get category display text
     */
    getCategoryText(category) {
        return this.CATEGORY_DISPLAY_MAP[category] || category;
    }

    /**
     * Get all unique categories
     */
    getAllCategories() {
        return ['Chicken Flavors', 'Bubble Tea Flavors', 'Packaging'];
    }

    getCategoryGroupKey(category) {
        const key = this.CATEGORY_KEY_MAP[category] || category.toLowerCase().replace(/\s+/g, '');
        return key;
    }

    /**
     * Populate category datalist
     */
    populateCategoryList() {
        if (!this.elements.categoryList) return;
        
        const categories = this.getAllCategories();
        this.elements.categoryList.innerHTML = categories
            .map(cat => `<option value="${cat}">${cat}</option>`)
            .join('');
    }

    /**
     * Populate sort menu
     */
    populateSortMenu() {
        if (!this.elements.sortMenu) return;
        
        let categories = this.getAllCategories();
        if (!Array.isArray(categories) || categories.length === 0) {
            categories = ['Chicken Flavors', 'Bubble Tea Flavors', 'Packaging'];
        }
        const allOption = '<a href="#" class="sort-item" data-sort="all">All Categories</a>';
        const categoryOptions = categories.map(category => {
            const sortKey = this.CATEGORY_KEY_MAP[category] || category;
            return `<a href="#" class="sort-item" data-sort="${sortKey}" data-display="${category}">${category}</a>`;
        }).join('');
        
        this.elements.sortMenu.innerHTML = allOption + categoryOptions;
        this.attachSortMenuListeners();
    }

    /**
     * Attach sort menu event listeners
     */
    attachSortMenuListeners() {
        const sortItems = DOMHelper.queryAll('.sort-item', this.elements.sortMenu);
        
        sortItems.forEach(item => {
            this.eventManager.on(item, 'click', (e) => {
                e.preventDefault();
                const categoryKey = item.dataset.sort; // 'all', 'chicken', 'bubbletea', 'packaging'
                const displayName = item.dataset.display || item.textContent.trim();

                this.currentCategory = categoryKey;
                this.elements.sortBtn.innerHTML = `${displayName} <i class="fas fa-chevron-down"></i>`;
                this.elements.sortMenu.classList.remove('show');
                this.renderTable();
            });
        });
    }

    /**
     * Calculate product value
     */
    calculateValue(price, stock) {
        return (price * stock).toFixed(2);
    }

    /**
     * Get filtered data
     */
    getFilteredData() {
        let filtered = [...this.inventoryData];

        // Filter by category
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(item => {
                const itemGroupKey = this.getCategoryGroupKey(item.category);
                return itemGroupKey === this.currentCategory;
            });
        }

        // Always hide Cups as a standalone product row
        filtered = filtered.filter(item => item.category !== 'cups');

        // Filter by search (debounced in event listener)
        if (this.currentSearch.trim()) {
            const searchLower = this.currentSearch.toLowerCase();
            filtered = filtered.filter(item => 
                item.name.toLowerCase().includes(searchLower) ||
                item.id.toLowerCase().includes(searchLower) ||
                this.getCategoryText(item.category).toLowerCase().includes(searchLower)
            );
        }

        // Filter by status/ingredients widgets
        if (this.currentStatusFilter) {
            if (this.currentStatusFilter === 'low-stock') {
                filtered = filtered.filter(item => this.isLowStock(item));
            } else if (this.currentStatusFilter === 'out-of-stock') {
                filtered = filtered.filter(item => (Number(item.stock) || 0) === 0);
            } else if (this.currentStatusFilter === 'low-ingredients') {
                filtered = filtered.filter(p => {
                    const recipe = this.getRecipe(p.name);
                    if (!Array.isArray(recipe) || recipe.length === 0) return false;
                    const details = this.computeShortageDetails(recipe, p.name);
                    return details.some(d => d.kind === 'low');
                });
            } else if (this.currentStatusFilter === 'out-ingredients') {
                filtered = filtered.filter(p => {
                    const recipe = this.getRecipe(p.name);
                    if (!Array.isArray(recipe) || recipe.length === 0) return false;
                    const servings = this.computePossibleServings(recipe, p.name);
                    if (servings === 0) return true;
                    const details = this.computeShortageDetails(recipe, p.name);
                    return details.some(d => d.kind === 'out');
                });
            }
        }

        const catWeight = c => {
            const k = this.getCategoryGroupKey(c);
            if (k === 'chicken') return 0;
            if (k === 'bubbletea') return 1;
            if (k === 'packaging') return 2;
            return 3;
        };
        const idNumber = id => {
            const m = String(id || '').match(/(\d+)/g);
            if (!m || m.length === 0) return Number.MAX_SAFE_INTEGER;
            return parseInt(m[m.length - 1], 10) || Number.MAX_SAFE_INTEGER;
        };
        filtered.sort((a, b) => {
            const wa = catWeight(a.category);
            const wb = catWeight(b.category);
            if (wa !== wb) return wa - wb;
            const ai = idNumber(a.id);
            const bi = idNumber(b.id);
            if (ai !== bi) return ai - bi;
            return String(a.name).localeCompare(String(b.name));
        });

        return filtered;
    }

    /**
     * Render products table (optimized)
     */
    renderTable() {
        if (!this.elements.productsTableBody) return;
        
        const filteredData = this.getFilteredData();

        if (filteredData.length === 0) {
            this.elements.productsTableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>No products found</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        filteredData.forEach(product => {
            const status = this.calculateStatus(product.stock);
            const ingIssue = this.getIngredientIssue(product.name);
            const value = this.calculateValue(product.price, product.stock);
            const recipe = this.getRecipe(product.name);
            const isRecipeCategory = product.category === 'chicken' || product.category === 'bubbletea';
            const ingredientsText = recipe.length ? recipe.map(r => `${r.name} (${r.qty}${r.unit})`).join(', ') : '-';
            const meta = this.backendRecipeMeta && this.backendRecipeMeta[product.name];
            const yieldText = meta ? this.formatYield(meta) : '';
            const recipeCost = recipe.length ? this.computeRecipeCost(recipe) : 0;
            const possibleServings = recipe.length ? this.computePossibleServings(recipe, product.name) : '-';
            const shortDetails = recipe.length ? this.computeShortageDetails(recipe, product.name) : [];
            const shortHtml = shortDetails.length
                ? `<div class="short-list">${shortDetails.map(s => `<span class="chip ${s.kind === 'out' ? 'chip-out' : 'chip-low'}">${s.name} <span class="chip-meta">(short by ${FormatUtils.number(s.needed)}${s.unit}; requires ${FormatUtils.number(s.required)}${s.unit}/serving)</span></span>`).join('')}</div>`
                : '-';
            
            const row = DOMHelper.create('tr');
            const ingStocks = recipe.length ? recipe.map(r => {
                const ing = this.ingredients.find(i => i.name === r.name && i.unit === r.unit);
                const stk = ing ? Number(ing.stock) || 0 : 0;
                return `${r.name} (${FormatUtils.number(stk)}${r.unit})`;
            }).join(', ') : '-';
            const priceDisplay = product.category === 'bubbletea' ? 'Size-based' : FormatUtils.currency(product.price);
            const valueDisplay = product.category === 'bubbletea' ? '-' : FormatUtils.currency(value);
            row.innerHTML = `
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${this.getCategoryText(product.category)}</td>
                <td>${priceDisplay}</td>
                <td>${isRecipeCategory ? ingStocks : product.stock}</td>
                <td>
                    <div class="status-stack">
                        ${isRecipeCategory ? '' : `<span class="status-badge ${status}">${this.getStatusText(status)}</span>`}
                        ${recipe.length ? `<span class="status-badge ${ingIssue.cls}">${ingIssue.text}</span>` : ''}
                    </div>
                    ${yieldText ? `<div class="yield-meta">${yieldText}</div>` : ''}
                </td>
                <td>${valueDisplay}</td>
                <td>${ingredientsText}</td>
                <td>${FormatUtils.currency(recipeCost)}</td>
                <td>${possibleServings}</td>
                <td>${shortHtml}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="window.inventoryManager.editProduct('${product.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="window.inventoryManager.deleteProduct('${product.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${recipe.length ? `<button class="action-btn edit" onclick="window.inventoryManager.manageIngredients('${product.name}')" title="Manage Ingredients"><i class="fas fa-wrench"></i></button>` : ''}
                        <button class="action-btn edit" onclick="window.inventoryManager.openRecipeModal('${product.name}')" title="Edit Recipe">
                            <i class="fas fa-utensils"></i>
                        </button>
                    </div>
                </td>
            `;
            fragment.appendChild(row);
        });
        
        this.elements.productsTableBody.innerHTML = '';
        this.elements.productsTableBody.appendChild(fragment);
        this.updateSummaryCards();
    }

    // -----------------------------
    // Ingredient & Recipe Handling
    // -----------------------------
    getRecipe(productName) {
        const name = (productName || '').trim();
        // Prefer user-defined recipe from storage when available
        const userRecipes = this.recipeStorage.get({});
        if (userRecipes && userRecipes[name]) return userRecipes[name];
        if (this.backendRecipes && Array.isArray(this.backendRecipes[name]) && this.backendRecipes[name].length) {
            return this.backendRecipes[name];
        }
        const recipes = {
            // Chicken flavors with default measurements and costing context
            'Cloy Honey Soy': [
                { name: 'Chicken', unit: 'pcs', qty: 3, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Soy Sauce', unit: 'ml', qty: 15, purchaseQty: 1000, purchasePrice: 35 },
                { name: 'Honey', unit: 'ml', qty: 20, purchaseQty: 750, purchasePrice: 120 },
                { name: 'Salt', unit: 'g', qty: 1.25, purchaseQty: 400, purchasePrice: 10 },
                { name: 'Garlic', unit: 'g', qty: 15, purchaseQty: 500, purchasePrice: 40 },
                { name: 'Brown Sugar', unit: 'g', qty: 15, purchaseQty: 1000, purchasePrice: 60 },
                { name: 'Cornstarch', unit: 'g', qty: 5, purchaseQty: 1000, purchasePrice: 38 }
            ],
            'Boombayah': [
                { name: 'Chicken', unit: 'pcs', qty: 5, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Brown Sugar', unit: 'g', qty: 15, purchaseQty: 1000, purchasePrice: 60 },
                { name: 'Hot Sauce', unit: 'ml', qty: 20, purchaseQty: 165, purchasePrice: 38 },
                { name: 'Ketchup', unit: 'ml', qty: 30, purchaseQty: 320, purchasePrice: 26 },
                { name: 'Soy Sauce', unit: 'ml', qty: 15, purchaseQty: 1000, purchasePrice: 35 },
                { name: 'Chili Flakes', unit: 'g', qty: 0.5, purchaseQty: 100, purchasePrice: 25 }
            ],
            'Honey Butter Night': [
                { name: 'Chicken', unit: 'pcs', qty: 5, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Butter', unit: 'g', qty: 20, purchaseQty: 200, purchasePrice: 40 },
                { name: 'Honey', unit: 'ml', qty: 15, purchaseQty: 750, purchasePrice: 130 },
                { name: 'Brown Sugar', unit: 'g', qty: 15, purchaseQty: 1000, purchasePrice: 60 },
                { name: 'Salt', unit: 'g', qty: 1.25, purchaseQty: 400, purchasePrice: 10 },
                { name: 'Onion Springs', unit: 'g', qty: 0.5, purchaseQty: 100, purchasePrice: 20 },
                { name: 'Cornstarch', unit: 'g', qty: 2.5, purchaseQty: 1000, purchasePrice: 38 }
            ],
            'Chijeu Chikin': [
                { name: 'Chicken', unit: 'pcs', qty: 5, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Brown Sugar', unit: 'g', qty: 15, purchaseQty: 1000, purchasePrice: 60 },
                { name: 'Milk', unit: 'ml', qty: 30, purchaseQty: 1000, purchasePrice: 69 },
                { name: 'Ketchup', unit: 'ml', qty: 5, purchaseQty: 320, purchasePrice: 26 },
                { name: 'Water', unit: 'ml', qty: 45, purchaseQty: 1000, purchasePrice: 0 },
                { name: 'Cornstarch', unit: 'g', qty: 5, purchaseQty: 1000, purchasePrice: 38 },
                { name: 'Soy Sauce', unit: 'ml', qty: 5, purchaseQty: 1000, purchasePrice: 35 },
                { name: 'Salt', unit: 'g', qty: 1.25, purchaseQty: 400, purchasePrice: 10 },
                { name: 'Cheese', unit: 'g', qty: 25, purchaseQty: 500, purchasePrice: 91 }
            ],
            'Oppa BB-Q': [
                { name: 'Chicken', unit: 'pcs', qty: 5, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Brown Sugar', unit: 'g', qty: 15, purchaseQty: 1000, purchasePrice: 60 },
                { name: 'Ginger', unit: 'g', qty: 10, purchaseQty: 140, purchasePrice: 25 },
                { name: 'Garlic', unit: 'g', qty: 10, purchaseQty: 500, purchasePrice: 30 },
                { name: 'Chili Powder', unit: 'g', qty: 2.5, purchaseQty: 50, purchasePrice: 24 },
                { name: 'Sesame Oil', unit: 'ml', qty: 5, purchaseQty: 220, purchasePrice: 159 },
                { name: 'Soy Sauce', unit: 'ml', qty: 15, purchaseQty: 1000, purchasePrice: 35 },
                { name: 'Salt', unit: 'g', qty: 1.25, purchaseQty: 400, purchasePrice: 10 },
                { name: 'Water', unit: 'ml', qty: 45, purchaseQty: 1000, purchasePrice: 0 },
                { name: 'Cornstarch', unit: 'g', qty: 5, purchaseQty: 1000, purchasePrice: 38 }
            ],

            'Olenji Chikin': [
                { name: 'Chicken', unit: 'pcs', qty: 5, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Brown Sugar', unit: 'g', qty: 15, purchaseQty: 1000, purchasePrice: 60 },
                { name: 'Honey', unit: 'ml', qty: 15, purchaseQty: 750, purchasePrice: 130 },
                { name: 'Ginger', unit: 'g', qty: 1, purchaseQty: 140, purchasePrice: 25 },
                { name: 'Orange Juice', unit: 'ml', qty: 45, purchaseQty: 1000, purchasePrice: 88 },
                { name: 'Vinegar', unit: 'ml', qty: 5, purchaseQty: 1000, purchasePrice: 44 },
                { name: 'Salt', unit: 'g', qty: 1.25, purchaseQty: 400, purchasePrice: 10 },
                { name: 'Water', unit: 'ml', qty: 45, purchaseQty: 1000, purchasePrice: 0 },
                { name: 'Cornstarch', unit: 'g', qty: 5, purchaseQty: 1000, purchasePrice: 38 }
            ],

            'Yangneom Nom': [
                { name: 'Chicken', unit: 'pcs', qty: 5, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Brown Sugar', unit: 'g', qty: 15, purchaseQty: 1000, purchasePrice: 60 },
                { name: 'Honey', unit: 'ml', qty: 15, purchaseQty: 750, purchasePrice: 130 },
                { name: 'Garlic', unit: 'g', qty: 1, purchaseQty: 500, purchasePrice: 40 },
                { name: 'Gochujang', unit: 'g', qty: 5, purchaseQty: 170, purchasePrice: 71 },
                { name: 'Chili Powder', unit: 'g', qty: 5, purchaseQty: 50, purchasePrice: 24 },
                { name: 'Ketchup', unit: 'ml', qty: 15, purchaseQty: 320, purchasePrice: 26 },
                { name: 'Salt', unit: 'g', qty: 1.25, purchaseQty: 400, purchasePrice: 10 },
                { name: 'Water', unit: 'ml', qty: 45, purchaseQty: 1000, purchasePrice: 0 },
                { name: 'Cornstarch', unit: 'g', qty: 5, purchaseQty: 1000, purchasePrice: 38 }
            ],

            'Bonbon Buldak': [
                { name: 'Chicken', unit: 'pcs', qty: 5, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Brown Sugar', unit: 'g', qty: 15, purchaseQty: 1000, purchasePrice: 60 },
                { name: 'Hot Sauce', unit: 'ml', qty: 20, purchaseQty: 165, purchasePrice: 38 },
                { name: 'Ketchup', unit: 'ml', qty: 15, purchaseQty: 320, purchasePrice: 26 },
                { name: 'Soy Sauce', unit: 'ml', qty: 15, purchaseQty: 1000, purchasePrice: 35 },
                { name: 'Gochujang', unit: 'g', qty: 5, purchaseQty: 170, purchasePrice: 71 },
                { name: 'Milk', unit: 'ml', qty: 30, purchaseQty: 1000, purchasePrice: 69 },
                { name: 'Cheese', unit: 'g', qty: 25, purchaseQty: 500, purchasePrice: 91 },
                { name: 'Water', unit: 'ml', qty: 45, purchaseQty: 1000, purchasePrice: 0 },
                { name: 'Cornstarch', unit: 'g', qty: 5, purchaseQty: 1000, purchasePrice: 38 }
            ],

            'Snow Cheese': [
                { name: 'Chicken', unit: 'pcs', qty: 5, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Milk Powder', unit: 'g', qty: 30, purchaseQty: 1000, purchasePrice: 259 },
                { name: 'Cheese Powder', unit: 'g', qty: 30, purchaseQty: 100, purchasePrice: 55 },
                { name: 'Powdered Sugar', unit: 'g', qty: 30, purchaseQty: 450, purchasePrice: 85 },
                { name: 'Garlic Powder', unit: 'g', qty: 1.5, purchaseQty: 1000, purchasePrice: 145 },
                { name: 'Onion Powder', unit: 'g', qty: 1.5, purchaseQty: 1000, purchasePrice: 205 },
                { name: 'Parsley', unit: 'g', qty: 3, purchaseQty: 50, purchasePrice: 65 }
            ],

            'Honey Mustard Chikin': [
                { name: 'Chicken', unit: 'pcs', qty: 5, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Mustard Paste', unit: 'ml', qty: 15, purchaseQty: 200, purchasePrice: 85 },
                { name: 'Mayo', unit: 'g', qty: 30, purchaseQty: 3500, purchasePrice: 700 },
                { name: 'Honey', unit: 'ml', qty: 15, purchaseQty: 750, purchasePrice: 130 },
                { name: 'Salt', unit: 'g', qty: 1.5, purchaseQty: 400, purchasePrice: 10 },
                { name: 'Pepper', unit: 'g', qty: 1.5, purchaseQty: 100, purchasePrice: 30 },
                { name: 'Water', unit: 'ml', qty: 15, purchaseQty: 1000, purchasePrice: 0 }
            ],

            'Salted Egg Chikin': [
                { name: 'Chicken', unit: 'pcs', qty: 5, purchaseQty: 22, purchasePrice: 160 },
                { name: 'Milk Powder', unit: 'g', qty: 30, purchaseQty: 1000, purchasePrice: 259 },
                { name: 'Salted Egg Powder', unit: 'g', qty: 30, purchaseQty: 1000, purchasePrice: 669 },
                { name: 'Powdered Sugar', unit: 'g', qty: 15, purchaseQty: 450, purchasePrice: 85 },
                { name: 'Butter', unit: 'g', qty: 20, purchaseQty: 200, purchasePrice: 40 },
                { name: 'Sugar', unit: 'g', qty: 5, purchaseQty: 1000, purchasePrice: 50 },
                { name: 'Pepper', unit: 'g', qty: 3, purchaseQty: 100, purchasePrice: 30 },
                { name: 'Egg', unit: 'pcs', qty: 1, purchaseQty: 30, purchasePrice: 150 },
                { name: 'Cornstarch', unit: 'g', qty: 0.5, purchaseQty: 1000, purchasePrice: 38 },
                { name: 'Garnish', unit: 'serving', qty: 1, purchaseQty: 1000, purchasePrice: 1 },
                { name: 'Spaghetti Box', unit: 'pcs', qty: 1, purchaseQty: 1000, purchasePrice: 4 }
            ],

            'Classic': [
                { name: 'Black Tea', unit: 'ml', qty: 150, purchaseQty: 1000, purchasePrice: 100 },
                { name: 'Milk Syrup', unit: 'ml', qty: 30, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Non-Dairy Creamer', unit: 'g', qty: 20, purchaseQty: 1000, purchasePrice: 250 },
                { name: 'Pearls', unit: 'g', qty: 40, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Cup', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 130 },
                { name: 'Straw', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 80 },
                { name: 'Lid', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 120 },
                { name: 'Sticker', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 },
                { name: 'Plastic', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 }
            ],
            'Wintermelon': [
                { name: 'Black Tea', unit: 'ml', qty: 150, purchaseQty: 1000, purchasePrice: 100 },
                { name: 'Wintermelon Syrup', unit: 'ml', qty: 45, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Non-Dairy Creamer', unit: 'g', qty: 20, purchaseQty: 1000, purchasePrice: 250 },
                { name: 'Pearls', unit: 'g', qty: 40, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Cup', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 130 },
                { name: 'Straw', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 80 },
                { name: 'Lid', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 120 },
                { name: 'Sticker', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 },
                { name: 'Plastic', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 }
            ],
            'Okinawa': [
                { name: 'Black Tea', unit: 'ml', qty: 150, purchaseQty: 1000, purchasePrice: 100 },
                { name: 'Brown Sugar Syrup', unit: 'ml', qty: 45, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Non-Dairy Creamer', unit: 'g', qty: 20, purchaseQty: 1000, purchasePrice: 250 },
                { name: 'Pearls', unit: 'g', qty: 40, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Cup', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 130 },
                { name: 'Straw', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 80 },
                { name: 'Lid', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 120 },
                { name: 'Sticker', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 },
                { name: 'Plastic', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 }
            ],
            'Matcha': [
                { name: 'Matcha Powder', unit: 'g', qty: 10, purchaseQty: 1000, purchasePrice: 400 },
                { name: 'Milk Syrup', unit: 'ml', qty: 30, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Non-Dairy Creamer', unit: 'g', qty: 20, purchaseQty: 1000, purchasePrice: 250 },
                { name: 'Pearls', unit: 'g', qty: 40, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Cup', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 130 },
                { name: 'Straw', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 80 },
                { name: 'Lid', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 120 },
                { name: 'Sticker', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 },
                { name: 'Plastic', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 }
            ],
            'Taro': [
                { name: 'Taro Powder', unit: 'g', qty: 10, purchaseQty: 1000, purchasePrice: 350 },
                { name: 'Milk Syrup', unit: 'ml', qty: 30, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Non-Dairy Creamer', unit: 'g', qty: 20, purchaseQty: 1000, purchasePrice: 250 },
                { name: 'Pearls', unit: 'g', qty: 40, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Cup', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 130 },
                { name: 'Straw', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 80 },
                { name: 'Lid', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 120 },
                { name: 'Sticker', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 },
                { name: 'Plastic', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 }
            ],
            'Chocolate': [
                { name: 'Chocolate Syrup', unit: 'ml', qty: 30, purchaseQty: 1000, purchasePrice: 250 },
                { name: 'Milk Syrup', unit: 'ml', qty: 30, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Non-Dairy Creamer', unit: 'g', qty: 20, purchaseQty: 1000, purchasePrice: 250 },
                { name: 'Pearls', unit: 'g', qty: 40, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Cup', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 130 },
                { name: 'Straw', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 80 },
                { name: 'Lid', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 120 },
                { name: 'Sticker', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 },
                { name: 'Plastic', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 }
            ],
            'Strawberry': [
                { name: 'Strawberry Syrup', unit: 'ml', qty: 30, purchaseQty: 1000, purchasePrice: 250 },
                { name: 'Milk Syrup', unit: 'ml', qty: 30, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Non-Dairy Creamer', unit: 'g', qty: 20, purchaseQty: 1000, purchasePrice: 250 },
                { name: 'Pearls', unit: 'g', qty: 40, purchaseQty: 1000, purchasePrice: 200 },
                { name: 'Cup', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 130 },
                { name: 'Straw', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 80 },
                { name: 'Lid', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 120 },
                { name: 'Sticker', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 },
                { name: 'Plastic', unit: 'pcs', qty: 1, purchaseQty: 100, purchasePrice: 50 }
            ],

            // Production batches (requirements per batch)
            'Brewed Assam Black Tea': [
                { name: 'Assam Loose Tea', unit: 'g', qty: 20 },
                { name: 'Water', unit: 'ml', qty: 1000 }
            ],
            'Simple Syrup': [
                { name: 'White Sugar', unit: 'g', qty: 1000 },
                { name: 'Water', unit: 'ml', qty: 500 }
            ],
            'Milk Syrup (Prep)': [
                { name: 'Condensed Milk', unit: 'ml', qty: 485 },
                { name: 'Evaporated Milk', unit: 'ml', qty: 185 }
            ],
            'Brown Sugar Sauce': [
                { name: 'Brown Sugar', unit: 'g', qty: 1000 },
                { name: 'Water', unit: 'ml', qty: 500 }
            ],
            'Brown Sugar Syrup (Prep)': [
                { name: 'Muscovado', unit: 'g', qty: 500 },
                { name: 'Water', unit: 'ml', qty: 250 }
            ],
            'Tapioca Pearls (Prep)': [
                { name: 'Tapioca Pearls', unit: 'g', qty: 340 },
                { name: 'Water', unit: 'ml', qty: 3000 },
                { name: 'Brown Sugar Syrup', unit: 'ml', qty: 100 }
            ],
            'Coffee Jelly (Prep)': [
                { name: 'Nescafe', unit: 'g', qty: 25 },
                { name: 'Sugar', unit: 'g', qty: 45 },
                { name: 'Jelly Powder', unit: 'g', qty: 10 },
                { name: 'Water', unit: 'ml', qty: 350 }
            ],
            'Egg Pudding (Prep)': [
                { name: 'Egg Pudding Powder', unit: 'g', qty: 100 },
                { name: 'Water', unit: 'ml', qty: 500 },
                { name: 'Milk Syrup', unit: 'ml', qty: 45 }
            ],
            'Cream Puff (Prep)': [
                { name: 'Salted Cream Cheese', unit: 'g', qty: 50 },
                { name: 'Milk Syrup', unit: 'ml', qty: 15 },
                { name: 'Water', unit: 'ml', qty: 130 }
            ],
            'Cream Cheese (Prep)': [
                { name: 'Salted Cream Cheese', unit: 'g', qty: 75 },
                { name: 'Salt', unit: 'g', qty: 1 },
                { name: 'Water', unit: 'ml', qty: 75 }
            ],
            'Rock Salt and Cheese (Prep)': [
                { name: 'Salted Cream Cheese', unit: 'g', qty: 38 },
                { name: 'Salt', unit: 'g', qty: 1 },
                { name: 'Evaporated Milk', unit: 'ml', qty: 75 },
                { name: 'Water', unit: 'ml', qty: 75 }
            ]
        };
        return recipes[name] || [];
    }

    computePossibleServings(recipe, productName) {
        if (!Array.isArray(recipe) || recipe.length === 0) return '-';
        const spb = this.servingsPerBatch(productName);
        if (spb > 1) {
            let minBatches = Infinity;
            recipe.forEach(req => {
                const ing = this.ingredients.find(i => i.name === req.name && i.unit === req.unit);
                const stock = ing ? Number(ing.stock) || 0 : 0;
                const batches = req.qty > 0 ? Math.floor(stock / req.qty) : 0;
                minBatches = Math.min(minBatches, batches);
            });
            const servings = isFinite(minBatches) ? (minBatches * spb) : 0;
            return servings;
        } else {
            let minServings = Infinity;
            recipe.forEach(req => {
                const ing = this.ingredients.find(i => i.name === req.name && i.unit === req.unit);
                const stock = ing ? Number(ing.stock) || 0 : 0;
                const servings = req.qty > 0 ? Math.floor(stock / req.qty) : 0;
                minServings = Math.min(minServings, servings);
            });
            return isFinite(minServings) ? minServings : '-';
        }
    }

    computeShortageCount(recipe, productName) {
        const spb = this.servingsPerBatch(productName);
        let count = 0;
        recipe.forEach(req => {
            const ing = this.ingredients.find(i => i.name === req.name && i.unit === req.unit);
            const stock = ing ? Number(ing.stock) || 0 : 0;
            const requiredPerServing = spb > 1 ? (Number(req.qty) || 0) / spb : (Number(req.qty) || 0);
            if (stock < requiredPerServing) count += 1;
        });
        return count;
    }

    computeShortageDetails(recipe, productName) {
        const spb = this.servingsPerBatch(productName);
        const list = [];
        recipe.forEach(req => {
            this.ensureIngredientTracked(req.name, req.unit);
            const ing = this.ingredients.find(i => i.name === req.name && i.unit === req.unit);
            const stock = ing ? Number(ing.stock) || 0 : 0;
            const required = spb > 1 ? (Number(req.qty) || 0) / spb : (Number(req.qty) || 0);
            if (stock === 0) {
                list.push({ name: req.name, unit: req.unit, needed: required, required, available: 0, kind: 'out' });
            } else if (stock < required) {
                list.push({ name: req.name, unit: req.unit, needed: required - stock, required, available: stock, kind: 'low' });
            }
        });
        return list;
    }

    servingsPerBatch(productName) {
        try {
            const meta = (this.backendRecipeMeta && this.backendRecipeMeta[productName]) || {};
            const yml = Number(meta.yield_ml) || 0;
            const pml = Number(meta.portion_ml) || 0;
            const ygr = Number(meta.yield_g) || 0;
            const pgr = Number(meta.portion_g) || 0;
            const ypcs = Number(meta.yield_pcs) || 0;
            const ppcs = Number(meta.portion_pcs) || 0;
            let spb = 0;
            if (yml && pml) spb = Math.floor(yml / pml);
            else if (ygr && pgr) spb = Math.floor(ygr / pgr);
            else if (ypcs && ppcs) spb = Math.floor(ypcs / ppcs);
            if (spb > 0) return spb;
            const key = String(productName || '').trim();
            if (key in this.DEFAULT_SERVINGS_PER_BATCH) return this.DEFAULT_SERVINGS_PER_BATCH[key];
            return 1;
        } catch (_) {
            return 1;
        }
    }

    ensureIngredientTracked(name, unit) {
        const exists = this.ingredients.some(i => i.name === name && i.unit === unit);
        if (!exists) {
            this.ingredients.push({ name, unit, stock: 0 });
            this.ingredientStorage.set(this.ingredients);
        }
    }

    syncPackagingIngredient(name, stock) {
        const unit = 'pcs';
        this.ensureIngredientTracked(name, unit);
        const ing = this.ingredients.find(i => i.name === name && i.unit === unit);
        if (ing) {
            ing.stock = Number(stock) || 0;
            this.ingredientStorage.set(this.ingredients);
        }
    }

    formatYield(meta) {
        const yml = Number(meta.yield_ml) || 0;
        const ygr = Number(meta.yield_g) || 0;
        const ypcs = Number(meta.yield_pcs) || 0;
        const pml = Number(meta.portion_ml) || 0;
        const pgr = Number(meta.portion_g) || 0;
        const ppcs = Number(meta.portion_pcs) || 0;
        if (yml && pml) return `Yield ${FormatUtils.number(yml)}ml • Portion ${FormatUtils.number(pml)}ml • Est. ${Math.floor(yml / pml)} servings`;
        if (ygr && pgr) return `Yield ${FormatUtils.number(ygr)}g • Portion ${FormatUtils.number(pgr)}g • Est. ${Math.floor(ygr / pgr)} servings`;
        if (ypcs && ppcs) return `Yield ${FormatUtils.number(ypcs)}pcs • Portion ${FormatUtils.number(ppcs)}pcs • Est. ${Math.floor(ypcs / ppcs)} servings`;
        return '';
    }

    computeRecipeCost(recipe) {
        return recipe.reduce((sum, r) => {
            const price = Number(r.purchasePrice) || 0;
            const pQty = Number(r.purchaseQty) || 0;
            const qty = Number(r.qty) || 0;
            if (price > 0 && pQty > 0 && qty > 0) {
                return sum + (price * (qty / pQty));
            }
            return sum;
        }, 0);
    }

    manageIngredients(productName) {
        this.openIngredientModal(productName);
    }

    /**
     * Update summary cards
     */
        updateSummaryCards() {
        fetch('api/inventory.php?action=summary')
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(json => {
                const s = json.summary || {};
                const p = Number(s.productsInStock || 0);
                const t = Number(s.totalItems || 0);
                const l = Number(s.lowStock || 0);
                const o = Number(s.outOfStock || 0);
                const v = Number(s.totalValue || 0);
                if (this.elements.productsInStock) this.elements.productsInStock.textContent = p;
                if (this.elements.totalItems) this.elements.totalItems.textContent = t;
                if (this.elements.lowStock) this.elements.lowStock.textContent = l;
                if (this.elements.outOfStock) this.elements.outOfStock.textContent = o;
                if (this.elements.totalValue) this.elements.totalValue.textContent = FormatUtils.currency(v);
            })
            .catch(() => {
                const allProducts = [...this.inventoryData].filter(item => item.category !== 'cups');
                const p = allProducts.filter(item => Number(item.stock) > 0).length;
                const t = allProducts.length;
                const l = allProducts.filter(item => this.isLowStock(item) && item.category !== 'bubbletea' && item.category !== 'chicken').length;
                const o = allProducts.filter(item => (Number(item.stock) || 0) === 0).length;
                const v = allProducts.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.stock) || 0), 0);
                if (this.elements.productsInStock) this.elements.productsInStock.textContent = p;
                if (this.elements.totalItems) this.elements.totalItems.textContent = t;
                if (this.elements.lowStock) this.elements.lowStock.textContent = l;
                if (this.elements.outOfStock) this.elements.outOfStock.textContent = o;
                if (this.elements.totalValue) this.elements.totalValue.textContent = FormatUtils.currency(v);
            })
            .finally(() => {
                const lowSet = new Set();
                const outSet = new Set();
                this.inventoryData.forEach(p => {
                    const recipe = this.getRecipe(p.name);
                    if (!Array.isArray(recipe) || recipe.length === 0) return;
                    const details = this.computeShortageDetails(recipe, p.name);
                    details.forEach(d => {
                        const key = `${d.name}|${d.unit}`;
                        if (d.kind === 'low') lowSet.add(key);
                        if (d.kind === 'out') outSet.add(key);
                    });
                });
                const lowIngredients = lowSet.size;
                const outIngredients = outSet.size;
                if (this.elements.lowIngredients) this.elements.lowIngredients.textContent = lowIngredients;
                if (this.elements.outIngredients) this.elements.outIngredients.textContent = outIngredients;
            });
    }

    /**
     * Open add product modal
     */
    openAddProductModal() {
        if (!this.elements.productModal) return;
        
        this.elements.modalTitle.innerHTML = '<i class="fas fa-box"></i> Add Product';
        this.elements.productForm.reset();
        this.elements.productForm.dataset.mode = 'add';
        
        // Auto-generate ID
        this.elements.productIdInput.value = '';
        this.elements.productIdInput.placeholder = 'Select category to auto-generate ID';
        this.elements.productIdInput.readOnly = true;
        this.elements.productIdInput.classList.add('readonly');
        
        // Remove existing listener
        const newCategoryInput = this.elements.productCategoryInput.cloneNode(true);
        this.elements.productCategoryInput.parentNode.replaceChild(newCategoryInput, this.elements.productCategoryInput);
        this.elements.productCategoryInput = DOMHelper.getElement('productCategoryInput');
        
        // Generate ID when category changes
        this.eventManager.on(this.elements.productCategoryInput, 'input', () => {
            if (this.elements.productCategoryInput.value.trim()) {
                const generatedId = this.generateProductId(this.elements.productCategoryInput.value.trim());
                this.elements.productIdInput.value = generatedId;
            } else {
                this.elements.productIdInput.value = '';
            }
        }, { debounce: 100 });
        
        this.elements.productModal.classList.add('show');
        this.updateProductFormPreview();
    }

    /**
     * Edit product
     */
    editProduct(productId) {
        const product = this.inventoryData.find(item => item.id === productId);
        if (!product) return;

        this.elements.modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Product';
        this.elements.productForm.dataset.mode = 'edit';
        this.elements.productForm.dataset.productId = productId;
        
        this.elements.productIdInput.value = product.id;
        this.elements.productIdInput.disabled = true;
        this.elements.productIdInput.readOnly = true;
        this.elements.productIdInput.placeholder = 'Product ID (cannot be changed)';
        this.elements.productIdInput.classList.add('readonly');
        
        this.elements.productCategoryInput.value = this.getCategoryText(product.category);
        this.elements.productNameInput.value = product.name;
        this.elements.productPriceInput.value = product.price;
        this.elements.productStockInput.value = product.stock;
        
        this.updateProductFormPreview();
        this.elements.productModal.classList.add('show');
    }

    /**
     * Delete product
     */
    deleteProduct(productId) {
        const product = this.inventoryData.find(item => item.id === productId);
        if (!product) return;
        showConfirm({
            title: 'Delete Product',
            message: `Are you sure you want to delete "${product.name}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel'
        }).then(confirmed => {
            if (!confirmed) return;
            this.deleteProductBackend(productId, product.name).then(result => {
                if (result && result.success) {
                    return this.syncProductsFromBackend().then(() => {
                        showNotice({ title: 'Product Deleted', message: `"${product.name}" was deleted.`, kind: 'success', duration: 3500 });
                        showToast({ message: 'Product deleted', kind: 'success' });
                    });
                }
                if (result && (result.error === 'network_error' || result.error === 'db_error')) {
                    this.inventoryData = this.inventoryData.filter(item => item.id !== productId);
                    this.saveInventoryData();
                    this.renderTable();
                    this.updateSummaryCards();
                    this.pushArchive('products', {
                        product_id: null,
                        client_product_id: productId,
                        name: product.name,
                        category_slug: product.category,
                        selling_price: product.price,
                        stock_quantity: product.stock,
                        deleted_at: new Date().toISOString()
                    });
                    showNotice({ title: 'Deleted Offline', message: 'Network issue. Delete applied locally.', kind: 'info' });
                    showToast({ message: 'Deleted locally', kind: 'info' });
                    return;
                }
                const msg = this.errorMessage(result && result.error);
                showNotice({ title: 'Delete Failed', message: msg, kind: 'error' });
                showToast({ message: msg, kind: 'error' });
            });
        });
    }

    pushArchive(type, entry) {
        try {
            const data = this.archiveStorage.get({ products: [], ingredients: [], recipes: [] }) || { products: [], ingredients: [], recipes: [] };
            if (type === 'products') data.products.unshift(entry);
            if (type === 'ingredients') data.ingredients.unshift(entry);
            if (type === 'recipes') data.recipes.unshift(entry);
            this.archiveStorage.set(data);
        } catch (_) {}
    }

    /**
     * Handle form submission
     */
    handleFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const mode = form.dataset.mode;
        const productId = this.elements.productIdInput.value.trim();
        const name = this.elements.productNameInput.value.trim();
        const categoryInput = this.elements.productCategoryInput.value.trim();
        const price = parseFloat(this.elements.productPriceInput.value);
        const stock = parseInt(this.elements.productStockInput.value);
        
        // Normalize category
        const category = this.CATEGORY_KEY_MAP[categoryInput] || categoryInput;

        // Validation
        if (!productId || !name || !category || isNaN(price) || isNaN(stock)) {
            showNotice({ title: 'Invalid Form', message: 'Please fill in all fields with valid values.', kind: 'error' });
            return;
        }

        if (price < 0 || stock < 0) {
            showNotice({ title: 'Invalid Values', message: 'Price and stock cannot be negative.', kind: 'error' });
            return;
        }

        if (mode === 'add') {
            if (this.inventoryData.find(item => item.id === productId)) {
                showNotice({ title: 'Duplicate ID', message: 'Product ID already exists. Please use a different ID.', kind: 'error' });
                return;
            }
            const payload = { id: productId, name, category, price, stock };
            this.saveProductBackend('add_product', payload).then(result => {
                if (result && result.success) {
                    return this.syncProductsFromBackend();
                }
                if (result && (result.error === 'network_error' || result.error === 'db_error')) {
                    this.inventoryData.push({ id: productId, name, category, price, stock, status: this.calculateStatus(stock) });
                    this.saveInventoryData();
                    showNotice({ title: 'Saved Offline', message: 'Network issue. Change saved locally.', kind: 'info' });
                    showToast({ message: 'Saved locally', kind: 'info' });
                    return;
                }
                const msg = this.errorMessage(result && result.error);
                showNotice({ title: 'Save Failed', message: msg, kind: 'error' });
                showToast({ message: msg, kind: 'error' });
            });
            if (category === 'cups' || category === 'packaging') {
                this.syncPackagingIngredient(name, stock);
            }
        } else if (mode === 'edit') {
            const existingProduct = this.inventoryData.find(item => item.id === productId);
            if (!existingProduct) {
                showNotice({ title: 'Not Found', message: 'Product not found.', kind: 'error' });
                return;
            }
            const payload = { id: productId, name, category, price, stock };
            this.saveProductBackend('update_product', payload).then(result => {
                if (result && result.success) {
                    return this.syncProductsFromBackend();
                }
                if (result && (result.error === 'network_error' || result.error === 'db_error')) {
                    existingProduct.name = name;
                    existingProduct.category = category;
                    existingProduct.price = price;
                    existingProduct.stock = stock;
                    existingProduct.status = this.calculateStatus(stock);
                    this.saveInventoryData();
                    showNotice({ title: 'Saved Offline', message: 'Network issue. Change saved locally.', kind: 'info' });
                    showToast({ message: 'Saved locally', kind: 'info' });
                    return;
                }
                const msg = this.errorMessage(result && result.error);
                showNotice({ title: 'Update Failed', message: msg, kind: 'error' });
                showToast({ message: msg, kind: 'error' });
            });
            if (category === 'cups' || category === 'packaging') {
                this.syncPackagingIngredient(name, stock);
            }
        }

        this.saveInventoryData();
        this.populateCategoryList();
        this.populateSortMenu();
        this.renderTable();
        this.updateSummaryCards();
        this.closeModal();
        const verb = mode === 'add' ? 'added' : 'updated';
        const catText = this.getCategoryText(category);
        showNotice({ title: 'Product Saved', message: `${name} (${catText}) • ${FormatUtils.currency(price)} was ${verb}.`, kind: 'success', duration: 4000 });
        showToast({ message: `Product ${verb}: ${name}`, kind: 'success' });
    }

    async saveProductBackend(action, payload) {
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

    async deleteProductBackend(id, name) {
        return this.saveProductBackend('delete_product', { id, name });
    }

    

    /**
     * Close modal
     */
    closeModal() {
        if (!this.elements.productModal) return;
        
        this.elements.productModal.classList.remove('show');
        this.elements.productForm.reset();
        this.elements.productForm.dataset.mode = '';
        this.elements.productForm.dataset.productId = '';
        
        this.elements.productIdInput.disabled = false;
        this.elements.productIdInput.readOnly = false;
        this.elements.productIdInput.placeholder = 'e.g. CHK-0001';
        this.elements.productIdInput.classList.remove('readonly');
        
        // Remove category input listener
        const newCategoryInput = this.elements.productCategoryInput.cloneNode(true);
        this.elements.productCategoryInput.parentNode.replaceChild(newCategoryInput, this.elements.productCategoryInput);
        this.elements.productCategoryInput = DOMHelper.getElement('productCategoryInput');
    }

    errorMessage(code) {
        const map = {
            invalid_name: 'Please enter a valid product name.',
            invalid_category: 'Please select a valid category.',
            invalid_price: 'Price must be zero or higher.',
            invalid_stock: 'Stock must be zero or higher.',
            duplicate_product: 'Product already exists.',
            product_not_found: 'Product not found.',
            missing_identifier: 'Provide product ID or name.',
            db_error: 'Database error encountered.',
            network_error: 'Network error encountered.',
            server_error: 'Server error encountered.',
            unknown_action: 'Unknown action.'
        };
        return map[code] || 'Operation failed.';
    }

    /**
     * Clear filters
     */
    clearFilters() {
        this.currentCategory = 'all';
        this.currentSearch = '';
        this.currentStatusFilter = null;
        this.elements.searchInput.value = '';
        this.elements.sortBtn.innerHTML = 'Category <i class="fas fa-chevron-down"></i>';
        this.elements.sortMenu.classList.remove('show');
        this.renderTable();
        this.updateSummaryCards();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add Product Button
        if (this.elements.addProductBtn) {
            this.eventManager.on(this.elements.addProductBtn, 'click', () => this.openAddProductModal());
        }

        // Modal close buttons
        if (this.elements.closeModalBtn) {
            this.eventManager.on(this.elements.closeModalBtn, 'click', () => this.closeModal());
        }
        if (this.elements.cancelBtn) {
            this.eventManager.on(this.elements.cancelBtn, 'click', () => this.closeModal());
        }

        // Close modal on overlay click
        if (this.elements.productModal) {
            this.eventManager.on(this.elements.productModal, 'click', (e) => {
                if (e.target === this.elements.productModal) {
                    this.closeModal();
                }
            });
        }

        // Form submission
        if (this.elements.productForm) {
            this.eventManager.on(this.elements.productForm, 'submit', (e) => this.handleFormSubmit(e));
        }
        // Live preview
        ['input', 'change'].forEach(evt => {
            if (this.elements.productNameInput) this.eventManager.on(this.elements.productNameInput, evt, () => this.updateProductFormPreview(), { debounce: 150 });
            if (this.elements.productCategoryInput) this.eventManager.on(this.elements.productCategoryInput, evt, () => this.updateProductFormPreview(), { debounce: 150 });
            if (this.elements.productPriceInput) this.eventManager.on(this.elements.productPriceInput, evt, () => this.updateProductFormPreview(), { debounce: 150 });
            if (this.elements.productStockInput) this.eventManager.on(this.elements.productStockInput, evt, () => this.updateProductFormPreview(), { debounce: 150 });
        });
        if (this.elements.editRecipeFromFormBtn) {
            this.eventManager.on(this.elements.editRecipeFromFormBtn, 'click', () => {
                const name = this.elements.productNameInput?.value?.trim();
                if (name) this.openRecipeModal(name);
            });
        }

        // Recipe modal events
        if (this.elements.recipeForm) {
            this.eventManager.on(this.elements.recipeForm, 'submit', (e) => this.handleRecipeFormSubmit(e));
        }
        if (this.elements.addRecipeRowBtn) {
            this.eventManager.on(this.elements.addRecipeRowBtn, 'click', () => this.addRecipeRow());
        }
        if (this.elements.closeRecipeModalBtn) {
            this.eventManager.on(this.elements.closeRecipeModalBtn, 'click', () => this.closeRecipeModal());
        }
        if (this.elements.cancelRecipeBtn) {
            this.eventManager.on(this.elements.cancelRecipeBtn, 'click', () => this.closeRecipeModal());
        }

        // Ingredient stock modal events
        if (this.elements.ingredientForm) {
            this.eventManager.on(this.elements.ingredientForm, 'submit', (e) => this.handleIngredientFormSubmit(e));
        }
        if (this.elements.closeIngredientModalBtn) {
            this.eventManager.on(this.elements.closeIngredientModalBtn, 'click', () => this.closeIngredientModal());
        }
        if (this.elements.cancelIngredientModalBtn) {
            this.eventManager.on(this.elements.cancelIngredientModalBtn, 'click', () => this.closeIngredientModal());
        }
        if (this.elements.ingredientModal) {
            this.eventManager.on(this.elements.ingredientModal, 'click', (e) => {
                if (e.target === this.elements.ingredientModal) this.closeIngredientModal();
            });
        }

        // Search input with debouncing
        if (this.elements.searchInput) {
            this.eventManager.on(this.elements.searchInput, 'input', (e) => {
                this.currentSearch = e.target.value;
                this.renderTable();
            }, { debounce: 300 });
        }

        // Clear filters button
        if (this.elements.clearFiltersBtn) {
            this.eventManager.on(this.elements.clearFiltersBtn, 'click', () => this.clearFilters());
        }

        // Summary widgets click-to-filter
        const applyFilter = (kind) => {
            this.currentStatusFilter = this.currentStatusFilter === kind ? null : kind;
            this.currentCategory = 'all';
            this.currentSearch = '';
            if (this.elements.searchInput) this.elements.searchInput.value = '';
            this.renderTable();
            this.updateSummaryCards();
        };
        // Total Products -> show all
        if (this.elements.totalItemsCard) this.eventManager.on(this.elements.totalItemsCard, 'click', () => this.clearFilters());
        if (this.elements.lowStockCard) this.eventManager.on(this.elements.lowStockCard, 'click', () => applyFilter('low-stock'));
        if (this.elements.outOfStockCard) this.eventManager.on(this.elements.outOfStockCard, 'click', () => applyFilter('out-of-stock'));
        if (this.elements.lowIngredientsCard) this.eventManager.on(this.elements.lowIngredientsCard, 'click', () => applyFilter('low-ingredients'));
        if (this.elements.outIngredientsCard) this.eventManager.on(this.elements.outIngredientsCard, 'click', () => applyFilter('out-ingredients'));

        // Sort dropdown
        if (this.elements.sortBtn && this.elements.sortMenu) {
            this.eventManager.on(this.elements.sortBtn, 'click', (e) => {
                e.stopPropagation();
                this.elements.sortMenu.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            this.eventManager.on(document, 'click', (e) => {
                if (!this.elements.sortBtn.contains(e.target) && 
                    !this.elements.sortMenu.contains(e.target)) {
                    this.elements.sortMenu.classList.remove('show');
                }
            });
        }
    }


    updateProductFormPreview() {
        const price = parseFloat(this.elements.productPriceInput?.value || '0') || 0;
        const stock = parseInt(this.elements.productStockInput?.value || '0') || 0;
        const name = this.elements.productNameInput?.value?.trim() || '';
        const status = this.calculateStatus(stock);
        const value = this.calculateValue(price, stock);
        const recipe = this.getRecipe(name);
        const ingredientsText = recipe.length ? recipe.map(r => `${r.name} (${r.qty}${r.unit})`).join(', ') : '-';
        const servings = recipe.length ? this.computePossibleServings(recipe, name) : '-';
        const shortDetails = recipe.length ? this.computeShortageDetails(recipe, name) : [];
        const shortHtml = shortDetails.length
            ? `<div class="short-list">${shortDetails.map(s => `<span class="chip ${s.kind === 'out' ? 'chip-out' : 'chip-low'}">${s.name} <span class="chip-meta">(short by ${FormatUtils.number(s.needed)}${s.unit}; requires ${FormatUtils.number(s.required)}${s.unit}/serving)</span></span>`).join('')}</div>`
            : '-';
        const isRecipePreview = Array.isArray(recipe) && recipe.length > 0;
        if (this.elements.productStatusPreview) {
            this.elements.productStatusPreview.className = `status-badge ${isRecipePreview ? 'in-stock' : status}`;
            this.elements.productStatusPreview.textContent = isRecipePreview ? 'Made Fresh' : this.getStatusText(status);
        }
        if (this.elements.productValuePreview) {
            this.elements.productValuePreview.textContent = FormatUtils.currency(value);
        }
        if (this.elements.productIngredientsPreview) {
            this.elements.productIngredientsPreview.textContent = ingredientsText;
        }
        if (this.elements.productServingsPreview) {
            this.elements.productServingsPreview.textContent = servings;
        }
        if (this.elements.productShortPreview) {
            this.elements.productShortPreview.innerHTML = shortHtml;
        }
        const stockGroup = this.elements.productStockInput ? this.elements.productStockInput.closest('.form-group') : null;
        if (stockGroup) stockGroup.style.display = isRecipePreview ? 'none' : '';
    }

    openRecipeModal(productName) {
        if (!this.elements.recipeModal) return;
        this.elements.recipeModalTitle.innerHTML = `<i class="fas fa-utensils"></i> Edit Recipe`;
        this.elements.recipeProductName.value = productName;
        const existing = this.recipeStorage.get({});
        const recipe = (existing && existing[productName]) || this.getRecipe(productName);
        this.renderRecipeRows(recipe);
        this.elements.recipeModal.classList.add('show');
    }

    openIngredientModal(productName) {
        if (!this.elements.ingredientModal || !this.elements.ingredientFormBody) return;
        this.currentIngredientProduct = productName;
        const recipe = this.getRecipe(productName);
        const rows = Array.isArray(recipe) ? recipe : [];
        const html = rows.map((r, i) => {
            const ing = this.ingredients.find(x => x.name === r.name && x.unit === r.unit);
            const current = ing ? Number(ing.stock) || 0 : 0;
            const step = (r.unit === 'pcs' || r.unit === 'serving') ? 1 : 0.01;
            return `
                <div class="form-group">
                    <label>${r.name} (${r.unit})</label>
                    <input type="number" class="form-input" data-name="${r.name}" data-unit="${r.unit}" min="0" step="${step}" value="${current}">
                </div>
            `;
        }).join('');
        this.elements.ingredientFormBody.innerHTML = html || '<div class="empty-state"><p>No recipe ingredients for this product</p></div>';
        if (this.elements.ingredientModalTitle) {
            this.elements.ingredientModalTitle.innerHTML = `<i class="fas fa-tools"></i> Manage Ingredient Stock`;
        }
        this.elements.ingredientModal.classList.add('show');
    }

    renderRecipeRows(recipe) {
        if (!this.elements.recipeTableBody) return;
        const rows = Array.isArray(recipe) ? recipe : [];
        const html = rows.map((r, i) => `
            <tr data-index="${i}">
                <td><input type="text" class="form-input" value="${r.name || ''}" placeholder="e.g. Milk"></td>
                <td><input type="text" class="form-input" value="${r.unit || ''}" placeholder="e.g. ml"></td>
                <td><input type="number" class="form-input" value="${r.qty || 0}" min="0" step="0.01"></td>
                <td>
                    <button type="button" class="action-btn delete" onclick="window.inventoryManager.removeRecipeRow(${i})" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        this.elements.recipeTableBody.innerHTML = html || '<tr><td colspan="4" class="empty-state"><p>No ingredients yet</p></td></tr>';
    }

    addRecipeRow() {
        const rows = this.collectRecipeRows();
        rows.push({ name: '', unit: '', qty: 0 });
        this.renderRecipeRows(rows);
    }

    removeRecipeRow(index) {
        const rows = this.collectRecipeRows();
        rows.splice(index, 1);
        this.renderRecipeRows(rows);
    }

    collectRecipeRows() {
        const trs = Array.from(this.elements.recipeTableBody.querySelectorAll('tr'));
        return trs.map(tr => {
            const inputs = tr.querySelectorAll('input');
            return {
                name: inputs[0]?.value.trim() || '',
                unit: inputs[1]?.value.trim() || '',
                qty: parseFloat(inputs[2]?.value) || 0
            };
        }).filter(r => r.name && r.unit && r.qty > 0);
    }

    handleRecipeFormSubmit(e) {
        e.preventDefault();
        const productName = this.elements.recipeProductName.value.trim();
        const rows = this.collectRecipeRows();
        const all = this.recipeStorage.get({});
        all[productName] = rows;
        this.recipeStorage.set(all);
        this.saveRecipeBackend(productName, rows).then(result => {
            if (!(result && result.success)) {
                const msg = (result && result.error) ? result.error : 'server_error';
                showToast({ message: `Recipe save failed: ${msg}`, kind: 'error' });
            }
        });
        this.closeRecipeModal();
        this.renderTable();
    }

    closeRecipeModal() {
        if (!this.elements.recipeModal) return;
        this.elements.recipeModal.classList.remove('show');
        if (this.elements.recipeTableBody) {
            this.elements.recipeTableBody.innerHTML = '';
        }
    }

    handleIngredientFormSubmit(e) {
        e.preventDefault();
        if (!this.elements.ingredientFormBody) return;
        const inputs = Array.from(this.elements.ingredientFormBody.querySelectorAll('input[data-name][data-unit]'));
        inputs.forEach(inp => {
            const name = String(inp.getAttribute('data-name'));
            const unit = String(inp.getAttribute('data-unit'));
            const val = parseFloat(inp.value);
            if (isNaN(val) || val < 0) return;
            const ing = this.ingredients.find(i => i.name === name && i.unit === unit);
            if (ing) {
                ing.stock = val;
            } else {
                this.ingredients.push({ name, unit, stock: val });
            }
        });
        this.ingredientStorage.set(this.ingredients);
        const updates = inputs.map(inp => ({ name: String(inp.getAttribute('data-name')), unit: String(inp.getAttribute('data-unit')), stock: parseFloat(inp.value) }));
        this.bulkUpdateIngredientsBackend(updates).then(result => {
            if (!(result && result.success)) {
                const msg = (result && result.error) ? result.error : 'server_error';
                showToast({ message: `Ingredient update failed: ${msg}`, kind: 'error' });
            }
        });
        this.renderTable();
        this.updateSummaryCards();
        const recipe = this.getRecipe(this.currentIngredientProduct || '');
        const deficits = Array.isArray(recipe) ? this.computeShortageDetails(recipe, this.currentIngredientProduct || '') : [];
        const msg = deficits.length
            ? `Still short: ${deficits.map(d => `${d.name} short by ${FormatUtils.number(d.needed)}${d.unit} (requires ${FormatUtils.number(d.required)}${d.unit}/serving)`).join(', ')}`
            : 'All recipe ingredients meet the per-serving requirements.';
        this.closeIngredientModal();
        showNotice({ title: 'Ingredient Stock Updated', message: msg, kind: deficits.length ? 'info' : 'success', duration: 4000 });
        showToast({ message: deficits.length ? 'Ingredient shortages remain' : 'Ingredient stock updated', kind: deficits.length ? 'info' : 'success' });
    }

    async saveRecipeBackend(productName, rows) {
        try {
            const res = await fetch('api/inventory.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_recipe', product_name: productName, items: rows })
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

    async bulkUpdateIngredientsBackend(items) {
        try {
            const payload = { action: 'bulk_update_ingredients', items: items.filter(it => typeof it.stock === 'number' && it.stock >= 0) };
            const res = await fetch('api/inventory.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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

    closeIngredientModal() {
        if (!this.elements.ingredientModal) return;
        this.elements.ingredientModal.classList.remove('show');
        if (this.elements.ingredientFormBody) this.elements.ingredientFormBody.innerHTML = '';
        this.currentIngredientProduct = null;
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.eventManager.destroy();
        this.inventoryData = [];
        this.elements = {};
    }
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
        function overlayHandler(e) { if (e.target === modal) onClose(); }
        function keyHandler(e) { if (e.key === 'Escape') onClose(); }
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof PersistUtils !== 'undefined') PersistUtils.applyTabPersistence('inventory');
        window.inventoryManager = new InventoryManager();
        window.inventoryManager.init();
    });
} else {
    if (typeof PersistUtils !== 'undefined') PersistUtils.applyTabPersistence('inventory');
    window.inventoryManager = new InventoryManager();
    window.inventoryManager.init();
}
