import { PRODUCTS, INGREDIENTS, TABLES, STAFF_MEMBERS, CATEGORIES } from "../constants";
import { Ingredient, Order, OrderItem, OrderStatus, OrderType, Product, Table, Staff, PaymentMethod, Category, ProductOptionGroup, Discount, Shift } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

type AppDataKey = 'products' | 'categories' | 'option_groups' | 'discounts' | 'ingredients' | 'staff' | 'shifts';

const APP_DATA_KEYS: AppDataKey[] = [
    'products',
    'categories',
    'option_groups',
    'discounts',
    'ingredients',
    'staff',
    'shifts'
];

// This service mimics the Backend API + Database
class DataService {
    private orders: Order[] = [];
    private products: Product[] = PRODUCTS;
    private categories: Category[] = [...CATEGORIES]; // Make mutable copy
    private ingredients: Ingredient[] = INGREDIENTS;
    private tables: Table[] = [];
    private staff: Staff[] = STAFF_MEMBERS;
    private shifts: Shift[] = []; // Store shifts
    private tableTokens: Record<string, string> = {};
    private allowRemoteSync = false;

    // New Data Stores
    private optionGroups: ProductOptionGroup[] = [
        {
            id: 'opt_sweetness',
            name: 'ระดับความหวาน (Sweetness)',
            choices: [
                { id: 'sw_0', name: '0% (ไม่หวาน)', priceModifier: 0 },
                { id: 'sw_25', name: '25% (หวานน้อยมาก)', priceModifier: 0 },
                { id: 'sw_50', name: '50% (หวานน้อย)', priceModifier: 0 },
                { id: 'sw_100', name: '100% (ปกติ)', priceModifier: 0 },
                { id: 'sw_125', name: '125% (หวานมาก)', priceModifier: 0 }
            ],
            required: true,
            allowMultiple: false
        },
        {
            id: 'opt_toppings',
            name: 'ท็อปปิ้งเพิ่มเติม (Extra Toppings)',
            choices: [
                { id: 'top_pearl', name: 'ไข่มุก (Boba)', priceModifier: 10 },
                { id: 'top_jelly', name: 'เจลลี่บราวน์ชูการ์', priceModifier: 15 },
                { id: 'top_whip', name: 'วิปครีม', priceModifier: 20 },
                { id: 'top_cheese', name: 'ชีสโฟม', priceModifier: 25 }
            ],
            required: false,
            allowMultiple: true
        },
        {
            id: 'opt_sides',
            name: 'เครื่องเคียง (Side Dish)',
            choices: [
                { id: 'sd_fries', name: 'เฟรนช์ฟรายส์', priceModifier: 0 },
                { id: 'sd_salad', name: 'สลัดผัก', priceModifier: 0 },
                { id: 'sd_onion', name: 'หอมทอด', priceModifier: 10 },
                { id: 'sd_soup', name: 'ซุปเห็ด', priceModifier: 20 }
            ],
            required: true,
            allowMultiple: false
        },
        {
            id: 'opt_doneness',
            name: 'ระดับความสุก (Doneness)',
            choices: [
                { id: 'don_rare', name: 'Rare', priceModifier: 0 },
                { id: 'don_med_rare', name: 'Medium Rare', priceModifier: 0 },
                { id: 'don_medium', name: 'Medium', priceModifier: 0 },
                { id: 'don_well', name: 'Well Done', priceModifier: 0 }
            ],
            required: true,
            allowMultiple: false
        }
    ];

    private discounts: Discount[] = [
        { id: 'disc_member', name: 'Member Discount', type: 'PERCENT', value: 10, active: true, appliesTo: 'ALL' },
        { id: 'disc_emp', name: 'Staff Meal', type: 'FIXED', value: 50, active: true, appliesTo: 'FOOD' }
    ];

    constructor() {
        const productsLoad = this.loadProducts();
        this.products = productsLoad.items;
        const categoriesLoad = this.loadCategories();
        this.categories = categoriesLoad.items;
        const ingredientsLoad = this.loadIngredients();
        this.ingredients = ingredientsLoad.items;
        const optionGroupsLoad = this.loadOptionGroups();
        this.optionGroups = optionGroupsLoad.items;
        const discountsLoad = this.loadDiscounts();
        this.discounts = discountsLoad.items;
        const staffLoad = this.loadStaff();
        this.staff = staffLoad.items;
        this.tableTokens = this.loadTableTokens();
        const initialTables = this.loadTables();
        this.tables = initialTables.map(table => {
            const existingToken = this.tableTokens[table.id];
            const qrToken = existingToken || table.qrToken || this.generateQrToken();
            if (!existingToken) {
                this.tableTokens[table.id] = qrToken;
            }
            return {
                ...table,
                qrToken,
                status: table.status || 'AVAILABLE'
            };
        });
        this.persistTableTokens();
        this.persistTables();
        if (!productsLoad.fromStorage) {
            // Link Options to Products (Mocking the DB relationship)
            // Coffee & Tea -> Sweetness, Toppings
            // Link Options to Products (Mocking the DB relationship)
            // Coffee & Tea -> Sweetness, Toppings
            this.products.forEach(p => {
                // Drink Category (cat_3)
                if (p.categoryId === 'cat_3') {
                    p.optionGroupIds = ['opt_sweetness', 'opt_toppings'];
                }
                // Main Dish Category (cat_1)
                if (p.categoryId === 'cat_1') {
                    // Burgers gets sides
                    if (p.name.includes('เบอร์เกอร์') || p.name.includes('Burger')) {
                        p.optionGroupIds = ['opt_sides', 'opt_toppings'];
                    }
                    // Steaks get doneness
                    if (p.name.includes('สเต็ก') || p.name.includes('Steak') || p.name.includes('เนื้อ')) {
                        p.optionGroupIds = ['opt_doneness', 'opt_sides'];
                    }
                }
            });
        }
        const ordersLoad = this.loadOrders();
        this.orders = ordersLoad.items;
        const shiftsLoad = this.loadShifts();
        this.shifts = shiftsLoad.items;
        if (!ordersLoad.fromStorage) {
            // Create dummy orders
            this.createOrder({
                id: 'ord_screenshot_1',
                orderNumber: 'LM05018866',
                type: OrderType.DELIVERY,
                status: OrderStatus.CONFIRMED,
                deliveryPlatform: 'LINEMAN',
                customerName: 'สมศักดิ์ นฤนาถไมตรี',
                items: [
                    { id: 'item_s1', productId: 'p_choco', productName: 'Chocolate Frappe', quantity: 1, price: 160, notes: 'No syrup, Low fat milk', status: 'PENDING' },
                    { id: 'item_s2', productId: 'p_choco', productName: 'Chocolate Frappe', quantity: 1, price: 160, status: 'PENDING' }
                ],
                subtotal: 320,
                tax: 0,
                discount: 0,
                total: 320,
                createdAt: new Date(),
                paymentMethod: PaymentMethod.CASH
            });
        }
        this.setOrdersFromExternal(this.orders);
    }

    private cloneDefaults<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }

    private normalizeArray<T>(value: unknown, fallback: T[]): T[] {
        if (!Array.isArray(value)) return this.cloneDefaults(fallback);
        return value as T[];
    }

    private normalizeShifts(value: unknown): Shift[] {
        if (!Array.isArray(value)) return [];
        return (value as Shift[]).map(shift => ({
            ...shift,
            startTime: shift.startTime ? new Date(shift.startTime) : new Date(),
            endTime: shift.endTime ? new Date(shift.endTime) : undefined
        }));
    }

    private serializeShifts(shifts: Shift[]) {
        return shifts.map(shift => ({
            ...shift,
            startTime: shift.startTime instanceof Date ? shift.startTime.toISOString() : shift.startTime,
            endTime: shift.endTime instanceof Date ? shift.endTime.toISOString() : shift.endTime
        }));
    }

    private queueRemoteSave(key: AppDataKey, payload: unknown) {
        if (!this.allowRemoteSync || !isSupabaseConfigured || !supabase) return;
        void supabase
            .from('app_data')
            .upsert({ key, payload, updated_at: new Date().toISOString() }, { onConflict: 'key' })
            .then(({ error }) => {
                if (error) {
                    console.warn(`Failed to sync ${key} to Supabase`, error);
                }
            });
    }

    async hydrateFromSupabase() {
        if (!isSupabaseConfigured || !supabase) {
            this.allowRemoteSync = false;
            return false;
        }

        try {
            const { data, error } = await supabase
                .from('app_data')
                .select('key,payload')
                .in('key', APP_DATA_KEYS);

            if (error) {
                console.warn('Failed to load app data from Supabase', error);
                this.allowRemoteSync = true;
                return false;
            }

            const byKey = new Map<string, any>();
            (data || []).forEach(row => {
                byKey.set(row.key, row.payload);
            });

            const upserts: { key: AppDataKey; payload: unknown }[] = [];

            if (byKey.has('products')) {
                this.products = this.normalizeArray(byKey.get('products'), PRODUCTS);
            } else {
                upserts.push({ key: 'products', payload: this.products });
            }

            if (byKey.has('categories')) {
                this.categories = this.normalizeArray(byKey.get('categories'), CATEGORIES);
            } else {
                upserts.push({ key: 'categories', payload: this.categories });
            }

            if (byKey.has('option_groups')) {
                this.optionGroups = this.normalizeArray(byKey.get('option_groups'), this.optionGroups);
            } else {
                upserts.push({ key: 'option_groups', payload: this.optionGroups });
            }

            if (byKey.has('discounts')) {
                this.discounts = this.normalizeArray(byKey.get('discounts'), this.discounts);
            } else {
                upserts.push({ key: 'discounts', payload: this.discounts });
            }

            if (byKey.has('ingredients')) {
                this.ingredients = this.normalizeArray(byKey.get('ingredients'), INGREDIENTS);
            } else {
                upserts.push({ key: 'ingredients', payload: this.ingredients });
            }

            if (byKey.has('staff')) {
                this.staff = this.normalizeArray(byKey.get('staff'), STAFF_MEMBERS);
            } else {
                upserts.push({ key: 'staff', payload: this.staff });
            }

            if (byKey.has('shifts')) {
                this.shifts = this.normalizeShifts(byKey.get('shifts'));
            } else {
                upserts.push({ key: 'shifts', payload: this.serializeShifts(this.shifts) });
            }

            this.persistProducts();
            this.persistCategories();
            this.persistOptionGroups();
            this.persistDiscounts();
            this.persistIngredients();
            this.persistStaff();
            this.persistShifts();

            if (upserts.length > 0) {
                await supabase.from('app_data').upsert(upserts, { onConflict: 'key' });
            }

            this.allowRemoteSync = true;
            return true;
        } catch (err) {
            console.warn('Failed to hydrate data from Supabase', err);
            this.allowRemoteSync = true;
            return false;
        }
    }

    private loadProducts() {
        if (typeof window === 'undefined') return { items: this.cloneDefaults(PRODUCTS), fromStorage: false };
        try {
            const raw = localStorage.getItem('omnipos_products');
            if (raw === null) return { items: this.cloneDefaults(PRODUCTS), fromStorage: false };
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return { items: this.cloneDefaults(PRODUCTS), fromStorage: false };
            return { items: parsed as Product[], fromStorage: true };
        } catch {
            return { items: this.cloneDefaults(PRODUCTS), fromStorage: false };
        }
    }

    private persistProducts() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('omnipos_products', JSON.stringify(this.products));
            this.queueRemoteSave('products', this.products);
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }

    private loadCategories() {
        if (typeof window === 'undefined') return { items: this.cloneDefaults(CATEGORIES), fromStorage: false };
        try {
            const raw = localStorage.getItem('omnipos_categories');
            if (raw === null) return { items: this.cloneDefaults(CATEGORIES), fromStorage: false };
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return { items: this.cloneDefaults(CATEGORIES), fromStorage: false };
            return { items: parsed as Category[], fromStorage: true };
        } catch {
            return { items: this.cloneDefaults(CATEGORIES), fromStorage: false };
        }
    }

    private persistCategories() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('omnipos_categories', JSON.stringify(this.categories));
            this.queueRemoteSave('categories', this.categories);
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }

    private loadOptionGroups() {
        if (typeof window === 'undefined') return { items: this.cloneDefaults(this.optionGroups), fromStorage: false };
        try {
            const raw = localStorage.getItem('omnipos_option_groups');
            if (raw === null) return { items: this.cloneDefaults(this.optionGroups), fromStorage: false };
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return { items: this.cloneDefaults(this.optionGroups), fromStorage: false };
            return { items: parsed as ProductOptionGroup[], fromStorage: true };
        } catch {
            return { items: this.cloneDefaults(this.optionGroups), fromStorage: false };
        }
    }

    private persistOptionGroups() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('omnipos_option_groups', JSON.stringify(this.optionGroups));
            this.queueRemoteSave('option_groups', this.optionGroups);
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }

    private loadDiscounts() {
        if (typeof window === 'undefined') return { items: this.cloneDefaults(this.discounts), fromStorage: false };
        try {
            const raw = localStorage.getItem('omnipos_discounts');
            if (raw === null) return { items: this.cloneDefaults(this.discounts), fromStorage: false };
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return { items: this.cloneDefaults(this.discounts), fromStorage: false };
            return { items: parsed as Discount[], fromStorage: true };
        } catch {
            return { items: this.cloneDefaults(this.discounts), fromStorage: false };
        }
    }

    private persistDiscounts() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('omnipos_discounts', JSON.stringify(this.discounts));
            this.queueRemoteSave('discounts', this.discounts);
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }

    private loadOrders() {
        if (typeof window === 'undefined') return { items: [], fromStorage: false };
        try {
            const raw = localStorage.getItem('omnipos_orders');
            if (raw === null) return { items: [], fromStorage: false };
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return { items: [], fromStorage: false };
            const normalized = (parsed as Order[]).map(order => ({
                ...order,
                createdAt: order.createdAt ? new Date(order.createdAt) : new Date()
            }));
            return { items: normalized, fromStorage: true };
        } catch {
            return { items: [], fromStorage: false };
        }
    }

    private persistOrders() {
        if (typeof window === 'undefined') return;
        try {
            const payload = this.orders.map(order => ({
                ...order,
                createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt
            }));
            localStorage.setItem('omnipos_orders', JSON.stringify(payload));
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }

    private loadIngredients() {
        if (typeof window === 'undefined') return { items: this.cloneDefaults(INGREDIENTS), fromStorage: false };
        try {
            const raw = localStorage.getItem('omnipos_ingredients');
            if (raw === null) return { items: this.cloneDefaults(INGREDIENTS), fromStorage: false };
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return { items: this.cloneDefaults(INGREDIENTS), fromStorage: false };
            return { items: parsed as Ingredient[], fromStorage: true };
        } catch {
            return { items: this.cloneDefaults(INGREDIENTS), fromStorage: false };
        }
    }

    private persistIngredients() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('omnipos_ingredients', JSON.stringify(this.ingredients));
            this.queueRemoteSave('ingredients', this.ingredients);
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }

    private loadShifts() {
        if (typeof window === 'undefined') return { items: [], fromStorage: false };
        try {
            const raw = localStorage.getItem('omnipos_shifts');
            if (raw === null) return { items: [], fromStorage: false };
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return { items: [], fromStorage: false };
            const normalized = (parsed as Shift[]).map(shift => ({
                ...shift,
                startTime: shift.startTime ? new Date(shift.startTime) : new Date(),
                endTime: shift.endTime ? new Date(shift.endTime) : undefined
            }));
            return { items: normalized, fromStorage: true };
        } catch {
            return { items: [], fromStorage: false };
        }
    }

    private persistShifts() {
        if (typeof window === 'undefined') return;
        try {
            const payload = this.serializeShifts(this.shifts);
            localStorage.setItem('omnipos_shifts', JSON.stringify(payload));
            this.queueRemoteSave('shifts', payload);
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }

    private loadTableTokens() {
        if (typeof window === 'undefined') return {};
        try {
            const raw = localStorage.getItem('omnipos_table_tokens');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    private loadTables(): Table[] {
        if (typeof window === 'undefined') return TABLES.map(table => ({ ...table }));
        try {
            const raw = localStorage.getItem('omnipos_tables');
            if (raw === null) return TABLES.map(table => ({ ...table }));
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return TABLES.map(table => ({ ...table }));
            return parsed.map((table: Table) => ({
                ...table,
                status: table.status === 'OCCUPIED' ? 'AVAILABLE' : (table.status || 'AVAILABLE'),
                currentOrderId: undefined
            }));
        } catch {
            return TABLES.map(table => ({ ...table }));
        }
    }

    private persistTableTokens() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('omnipos_table_tokens', JSON.stringify(this.tableTokens));
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }

    private persistTables() {
        if (typeof window === 'undefined') return;
        try {
            const payload = this.tables.map(({ id, name, status, capacity, qrToken }) => ({
                id,
                name,
                status,
                capacity,
                qrToken
            }));
            localStorage.setItem('omnipos_tables', JSON.stringify(payload));
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }

    private loadStaff() {
        if (typeof window === 'undefined') return { items: this.cloneDefaults(STAFF_MEMBERS), fromStorage: false };
        try {
            const raw = localStorage.getItem('omnipos_staff');
            if (raw === null) return { items: this.cloneDefaults(STAFF_MEMBERS), fromStorage: false };
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return { items: this.cloneDefaults(STAFF_MEMBERS), fromStorage: false };
            return { items: parsed as Staff[], fromStorage: true };
        } catch {
            return { items: this.cloneDefaults(STAFF_MEMBERS), fromStorage: false };
        }
    }

    private persistStaff() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('omnipos_staff', JSON.stringify(this.staff));
            this.queueRemoteSave('staff', this.staff);
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }

    private generateQrToken() {
        return Math.random().toString(36).slice(2, 10);
    }

    // --- Product ---
    getProducts() { return this.products; }
    addProduct(product: Product) {
        this.products.push(product);
        this.persistProducts();
    }
    updateProduct(updatedProduct: Product) {
        const index = this.products.findIndex(p => p.id === updatedProduct.id);
        if (index !== -1) {
            this.products[index] = updatedProduct;
            this.persistProducts();
        }
    }
    deleteProduct(id: string) {
        this.products = this.products.filter(p => p.id !== id);
        this.persistProducts();
    }

    // --- Categories (CRUD) ---
    getCategories() { return this.categories; }
    addCategory(cat: Category) {
        this.categories.push(cat);
        this.persistCategories();
    }
    updateCategory(cat: Category) {
        const index = this.categories.findIndex(c => c.id === cat.id);
        if (index !== -1) {
            this.categories[index] = cat;
            this.persistCategories();
        }
    }
    deleteCategory(id: string) {
        this.categories = this.categories.filter(c => c.id !== id);
        this.persistCategories();
    }

    // --- Option Groups (CRUD) ---
    getOptionGroups() { return this.optionGroups; }
    addOptionGroup(opt: ProductOptionGroup) {
        this.optionGroups.push(opt);
        this.persistOptionGroups();
    }
    updateOptionGroup(opt: ProductOptionGroup) {
        const index = this.optionGroups.findIndex(o => o.id === opt.id);
        if (index !== -1) {
            this.optionGroups[index] = opt;
            this.persistOptionGroups();
        }
    }
    deleteOptionGroup(id: string) {
        this.optionGroups = this.optionGroups.filter(o => o.id !== id);
        this.persistOptionGroups();
    }

    // --- Discounts (CRUD) ---
    getDiscounts() { return this.discounts; }
    addDiscount(disc: Discount) {
        this.discounts.push(disc);
        this.persistDiscounts();
    }
    updateDiscount(disc: Discount) {
        const index = this.discounts.findIndex(d => d.id === disc.id);
        if (index !== -1) {
            this.discounts[index] = disc;
            this.persistDiscounts();
        }
    }
    deleteDiscount(id: string) {
        this.discounts = this.discounts.filter(d => d.id !== id);
        this.persistDiscounts();
    }


    // --- Inventory (CRUD) ---
    getIngredients() { return this.ingredients; }

    addIngredient(ing: Ingredient) {
        this.ingredients.push(ing);
        this.persistIngredients();
    }

    updateIngredient(ing: Ingredient) {
        const index = this.ingredients.findIndex(i => i.id === ing.id);
        if (index !== -1) {
            this.ingredients[index] = { ...this.ingredients[index], ...ing };
            this.persistIngredients();
        }
    }

    deleteIngredient(id: string) {
        this.ingredients = this.ingredients.filter(i => i.id !== id);
        this.persistIngredients();
    }

    deductStockForOrder(orderItems: OrderItem[]): string[] {
        const warnings: string[] = [];
        orderItems.forEach(item => {
            const product = this.products.find(p => p.id === item.productId);
            if (!product) return;
            product.recipe.forEach(recipeItem => {
                const ingredient = this.ingredients.find(i => i.id === recipeItem.ingredientId);
                if (ingredient) {
                    const deductAmount = recipeItem.quantity * item.quantity;
                    ingredient.currentStock -= deductAmount;
                    if (ingredient.currentStock < 0) ingredient.currentStock = 0;
                    if (ingredient.currentStock <= ingredient.minStockLevel) {
                        warnings.push(`แจ้งเตือนสต็อกต่ำ: ${ingredient.name}`);
                    }
                }
            });
        });
        this.persistIngredients();
        return warnings;
    }

    restoreStockForOrder(orderItems: OrderItem[]) {
        orderItems.forEach(item => {
            const product = this.products.find(p => p.id === item.productId);
            if (!product) return;
            product.recipe.forEach(recipeItem => {
                const ingredient = this.ingredients.find(i => i.id === recipeItem.ingredientId);
                if (ingredient) {
                    const restoreAmount = recipeItem.quantity * item.quantity;
                    ingredient.currentStock += restoreAmount;
                }
            });
        });
        this.persistIngredients();
    }

    calculateMaxYield(productId: string): number {
        const product = this.products.find(p => p.id === productId);
        if (!product || !product.recipe || product.recipe.length === 0) return 9999;

        let maxYield = 9999;
        product.recipe.forEach(r => {
            const ing = this.ingredients.find(i => i.id === r.ingredientId);
            if (ing) {
                const possible = Math.floor(ing.currentStock / r.quantity);
                if (possible < maxYield) maxYield = possible;
            } else {
                maxYield = 0; // Missing ingredient
            }
        });
        return maxYield;
    }

    // --- Product Options ---
    getProductOptionGroups(product: Product): ProductOptionGroup[] {
        if (!product.optionGroupIds || product.optionGroupIds.length === 0) return [];
        return this.optionGroups.filter(g => product.optionGroupIds?.includes(g.id));
    }

    createOrder(order: Order) {
        // Validate order before creating
        if (!order.id || !order.orderNumber) {
            throw new Error('Order must have valid id and orderNumber');
        }
        
        // Deduct Stock immediately for Confirmed/Completed orders
        if ((order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.COMPLETED) && !order.stockDeducted) {
            this.deductStockForOrder(order.items);
            order.stockDeducted = true;
        }

        this.orders.push(order);
        if (order.tableId) {
            const table = this.tables.find(t => t.id === order.tableId);
            if (table) {
                table.status = 'OCCUPIED';
                table.currentOrderId = order.id;
            }
        }
        this.persistTables();
        this.persistOrders();
        return order;
    }

    updateOrder(updatedOrder: Order) {
        const index = this.orders.findIndex(o => o.id === updatedOrder.id);
        if (index !== -1) {
            this.orders[index] = updatedOrder;
            this.persistOrders();
        }
    }

    updateOrderStatus(orderId: string, status: OrderStatus) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            console.warn(`Order with ID ${orderId} not found`);
            return;
        }
        
        const oldStatus = order.status;
        
        if (status === OrderStatus.COMPLETED) {
            order.status = status;
            if (order.tableId) {
                const table = this.tables.find(t => t.id === order.tableId);
                if (table) {
                    table.status = 'AVAILABLE';
                    table.currentOrderId = undefined;
                }
            }
            // Check if stock needs deduction (e.g. if skipped previous steps)
            if (!order.stockDeducted) {
                this.deductStockForOrder(order.items);
                order.stockDeducted = true;
            }

            // Record Cash Sale if applicable
            if (order.paymentMethod === PaymentMethod.CASH) {
                this.recordCashTransaction(order.total);
            }
        } else if (status === OrderStatus.CANCELLED) {
            order.status = status;
            if (order.tableId) {
                const table = this.tables.find(t => t.id === order.tableId);
                if (table) {
                    table.status = 'AVAILABLE';
                    table.currentOrderId = undefined;
                }
            }
        } else {
            order.status = status;
            // Handle other status changes if needed
        }
        
        // Log any status change for debugging
        if (oldStatus !== status) {
            console.log(`Order ${orderId} status changed from ${oldStatus} to ${status}`);
        }
        this.persistTables();
        this.persistOrders();
    }

    setOrdersFromExternal(externalOrders: Order[]) {
        const normalized = externalOrders.map(order => ({
            ...order,
            createdAt: new Date(order.createdAt)
        }));
        this.orders = normalized;
        this.persistOrders();

        const activeByTable = new Map<string, Order>();
        normalized.forEach(order => {
            if (!order.tableId) return;
            if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) return;
            const existing = activeByTable.get(order.tableId);
            if (!existing || new Date(order.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
                activeByTable.set(order.tableId, order);
            }
        });

        this.tables = this.tables.map(table => {
            const activeOrder = activeByTable.get(table.id);
            if (activeOrder) {
                return {
                    ...table,
                    status: 'OCCUPIED',
                    currentOrderId: activeOrder.id
                };
            }
            if (table.status === 'OCCUPIED') {
                return {
                    ...table,
                    status: 'AVAILABLE',
                    currentOrderId: undefined
                };
            }
            return {
                ...table,
                currentOrderId: undefined
            };
        });
        this.persistTables();
    }

    setTablesFromExternal(externalTables: Table[]) {
        const normalized = externalTables.map(table => ({
            ...table,
            status: table.status || 'AVAILABLE',
            capacity: table.capacity || 1,
            currentOrderId: table.currentOrderId || undefined,
            qrToken: table.qrToken || undefined
        }));
        this.tables = normalized;

        const nextTokens: Record<string, string> = {};
        normalized.forEach(table => {
            if (table.qrToken) {
                nextTokens[table.id] = table.qrToken;
            }
        });
        this.tableTokens = nextTokens;
        this.persistTables();
        this.persistTableTokens();
    }

    // --- Tables ---
    getTables() { return this.tables; }
    getTable(id: string) { return this.tables.find(t => t.id === id); }
    ensureTableTokens() {
        let updated = false;
        let tokensUpdated = false;
        this.tables = this.tables.map(table => {
            if (!table.qrToken) {
                const qrToken = this.generateQrToken();
                this.tableTokens[table.id] = qrToken;
                updated = true;
                tokensUpdated = true;
                return { ...table, qrToken };
            }
            if (!this.tableTokens[table.id]) {
                this.tableTokens[table.id] = table.qrToken;
                tokensUpdated = true;
            }
            return table;
        });
        if (updated) {
            this.persistTables();
        }
        if (tokensUpdated) {
            this.persistTableTokens();
        }
        return this.tables;
    }
    addTable(table: Table) {
        const qrToken = table.qrToken || this.generateQrToken();
        const withToken = { ...table, qrToken };
        this.tableTokens[withToken.id] = qrToken;
        this.persistTableTokens();
        this.tables.push(withToken);
        this.persistTables();
    }
    deleteTable(id: string) {
        this.tables = this.tables.filter(t => t.id !== id);
        if (this.tableTokens[id]) {
            delete this.tableTokens[id];
            this.persistTableTokens();
        }
        this.persistTables();
    }
    updateTable(table: Table) {
        const index = this.tables.findIndex(t => t.id === table.id);
        if (index !== -1) {
            const current = this.tables[index];
            const qrToken = table.qrToken || current.qrToken;
            this.tables[index] = { ...table, qrToken };
            if (qrToken) {
                this.tableTokens[table.id] = qrToken;
                this.persistTableTokens();
            }
            this.persistTables();
        }
    }

    // --- Staff Management ---
    getAllStaff() { return this.staff; }

    addStaff(staff: Staff) {
        this.staff.push(staff);
        this.persistStaff();
    }

    updateStaff(staff: Staff) {
        const index = this.staff.findIndex(s => s.id === staff.id);
        if (index !== -1) {
            this.staff[index] = staff;
            this.persistStaff();
        }
    }

    deleteStaff(id: string) {
        this.staff = this.staff.filter(s => s.id !== id);
        this.persistStaff();
    }

    changePin(staffId: string, newPin: string): boolean {
        // Validate new PIN format
        if (!newPin || newPin.length !== 4 || !/^[0-9]+$/.test(newPin)) {
            console.warn('Invalid PIN format');
            return false;
        }
        
        const staffIndex = this.staff.findIndex(s => s.id === staffId);
        if (staffIndex !== -1) {
            this.staff[staffIndex].pin = newPin;
            console.log(`PIN changed successfully for staff ID: ${staffId}`);
            this.persistStaff();
            return true;
        }
        
        console.warn(`Staff with ID ${staffId} not found`);
        return false;
    }

    validatePin(pin: string): Staff | undefined {
        // Add input validation for PIN
        if (!pin || pin.length !== 4 || !/^[0-9]+$/.test(pin)) {
            console.warn('Invalid PIN format');
            return undefined;
        }
        
        // Find staff with matching PIN
        const staff = this.staff.find(s => s.pin === pin);
        
        // Log PIN validation attempts for security monitoring
        if (staff) {
            console.log(`Successful PIN validation for staff: ${staff.name}`);
        } else {
            console.warn(`Failed PIN validation attempt with PIN: ${'*'.repeat(pin.length)}`);
        }
        
        return staff;
    }

    // --- Shift Management ---

    getShifts() { return this.shifts; }

    getOpenShift(): Shift | undefined {
        return this.shifts.find(s => s.status === 'OPEN');
    }

    startShift(staff: Staff, startingCash: number): Shift {
        const existingOpenShift = this.getOpenShift();
        if (existingOpenShift) {
            throw new Error("Cannot start a new shift while one is already open.");
        }

        const newShift: Shift = {
            id: `shift_${Date.now()}`,
            staffId: staff.id,
            staffName: staff.name,
            startTime: new Date(),
            startingCash: startingCash,
            totalCashSales: 0,
            expectedCash: startingCash,
            difference: 0,
            status: 'OPEN'
        };
        this.shifts.push(newShift);
        this.persistShifts();
        return newShift;
    }

    closeShift(endingCash: number, notes?: string): Shift {
        const openShift = this.getOpenShift();
        if (!openShift) {
            throw new Error("No open shift found.");
        }

        const index = this.shifts.findIndex(s => s.id === openShift.id);
        if (index !== -1) {
            const shift = this.shifts[index];
            shift.endTime = new Date();
            shift.endingCash = endingCash;
            shift.expectedCash = shift.startingCash + shift.totalCashSales;
            shift.difference = endingCash - shift.expectedCash;
            shift.status = 'CLOSED';
            shift.notes = notes;
            this.persistShifts();
            return shift;
        }
        return openShift;
    }

    // Update Shift Sales
    recordCashTransaction(amount: number) {
        const openShift = this.getOpenShift();
        if (openShift) {
            const index = this.shifts.findIndex(s => s.id === openShift.id);
            if (index !== -1) {
                this.shifts[index].totalCashSales += amount;
                this.shifts[index].expectedCash = this.shifts[index].startingCash + this.shifts[index].totalCashSales;
                this.persistShifts();
            }
        }
    }

    getOrders() { 
        // Deserialize dates when returning orders
        return this.orders.map(order => ({
            ...order,
            createdAt: new Date(order.createdAt)
        })); 
    }
    
    getOrder(id: string) { 
        const order = this.orders.find(o => o.id === id);
        if (order) {
            return {
                ...order,
                createdAt: new Date(order.createdAt)
            };
        }
        return order;
    }

    // --- Refund & Return ---
    refundOrderItem(orderId: string, itemId: string, quantity: number) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            console.warn(`Order with ID ${orderId} not found for refund`);
            return;
        }

        const item = order.items.find(i => i.id === itemId);
        if (!item) {
            console.warn(`Item with ID ${itemId} not found in order ${orderId} for refund`);
            return;
        }

        // Validation
        const currentRef = item.refundedQuantity || 0;
        const remaining = item.quantity - currentRef;
        const toRefund = Math.min(quantity, remaining);

        if (toRefund <= 0) {
            console.warn(`Invalid refund quantity: requested ${quantity}, available ${remaining}`);
            return;
        }

        // 1. Update Refund Quantity on Item
        item.refundedQuantity = currentRef + toRefund;

        // 2. Calculate Refund Amount (Simple price * qty, ignoring complex partial discount logic for now)
        const refundValue = item.price * toRefund;
        order.refundedAmount = (order.refundedAmount || 0) + refundValue;

        // 3. Mark Order as Cancelled if FULLY Refunded?
        // Let's check if all items are fully refunded
        const allItemsRefunded = order.items.every(i => (i.refundedQuantity || 0) >= i.quantity);
        if (allItemsRefunded) {
            order.status = OrderStatus.CANCELLED;
        }

        // 4. Update Shift Cash if Payment was CASH (Deduced from sales)
        if (order.paymentMethod === PaymentMethod.CASH) {
            this.recordCashTransaction(-refundValue);
        }
        this.persistOrders();
    }
}

export const dataService = new DataService();
