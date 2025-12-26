import { PRODUCTS, INGREDIENTS, TABLES, STAFF_MEMBERS, CATEGORIES } from "../constants";
import { Ingredient, Order, OrderItem, OrderStatus, OrderType, Product, Table, Staff, PaymentMethod, Category, ProductOptionGroup, Discount, Shift } from "../types";

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
        this.tableTokens = this.loadTableTokens();
        this.tables = TABLES.map(table => {
            const existingToken = this.tableTokens[table.id];
            const qrToken = existingToken || table.qrToken || this.generateQrToken();
            if (!existingToken) {
                this.tableTokens[table.id] = qrToken;
            }
            return {
                ...table,
                qrToken
            };
        });
        this.persistTableTokens();
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

    private loadTableTokens() {
        if (typeof window === 'undefined') return {};
        try {
            const raw = localStorage.getItem('omnipos_table_tokens');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
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

    private generateQrToken() {
        return Math.random().toString(36).slice(2, 10);
    }

    // --- Product ---
    getProducts() { return this.products; }
    addProduct(product: Product) { this.products.push(product); }
    updateProduct(updatedProduct: Product) {
        const index = this.products.findIndex(p => p.id === updatedProduct.id);
        if (index !== -1) this.products[index] = updatedProduct;
    }
    deleteProduct(id: string) { this.products = this.products.filter(p => p.id !== id); }

    // --- Categories (CRUD) ---
    getCategories() { return this.categories; }
    addCategory(cat: Category) { this.categories.push(cat); }
    updateCategory(cat: Category) {
        const index = this.categories.findIndex(c => c.id === cat.id);
        if (index !== -1) this.categories[index] = cat;
    }
    deleteCategory(id: string) { this.categories = this.categories.filter(c => c.id !== id); }

    // --- Option Groups (CRUD) ---
    getOptionGroups() { return this.optionGroups; }
    addOptionGroup(opt: ProductOptionGroup) { this.optionGroups.push(opt); }
    updateOptionGroup(opt: ProductOptionGroup) {
        const index = this.optionGroups.findIndex(o => o.id === opt.id);
        if (index !== -1) this.optionGroups[index] = opt;
    }
    deleteOptionGroup(id: string) { this.optionGroups = this.optionGroups.filter(o => o.id !== id); }

    // --- Discounts (CRUD) ---
    getDiscounts() { return this.discounts; }
    addDiscount(disc: Discount) { this.discounts.push(disc); }
    updateDiscount(disc: Discount) {
        const index = this.discounts.findIndex(d => d.id === disc.id);
        if (index !== -1) this.discounts[index] = disc;
    }
    deleteDiscount(id: string) { this.discounts = this.discounts.filter(d => d.id !== id); }


    // --- Inventory (CRUD) ---
    getIngredients() { return this.ingredients; }

    addIngredient(ing: Ingredient) {
        this.ingredients.push(ing);
    }

    updateIngredient(ing: Ingredient) {
        const index = this.ingredients.findIndex(i => i.id === ing.id);
        if (index !== -1) {
            this.ingredients[index] = { ...this.ingredients[index], ...ing };
        }
    }

    deleteIngredient(id: string) {
        this.ingredients = this.ingredients.filter(i => i.id !== id);
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
        return order;
    }

    updateOrder(updatedOrder: Order) {
        const index = this.orders.findIndex(o => o.id === updatedOrder.id);
        if (index !== -1) {
            this.orders[index] = updatedOrder;
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
    }

    // --- Tables ---
    getTables() { return this.tables; }
    getTable(id: string) { return this.tables.find(t => t.id === id); }
    addTable(table: Table) {
        const qrToken = table.qrToken || this.generateQrToken();
        const withToken = { ...table, qrToken };
        this.tableTokens[withToken.id] = qrToken;
        this.persistTableTokens();
        this.tables.push(withToken);
    }
    deleteTable(id: string) {
        this.tables = this.tables.filter(t => t.id !== id);
        if (this.tableTokens[id]) {
            delete this.tableTokens[id];
            this.persistTableTokens();
        }
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
        }
    }

    // --- Staff Management ---
    getAllStaff() { return this.staff; }

    addStaff(staff: Staff) {
        this.staff.push(staff);
    }

    updateStaff(staff: Staff) {
        const index = this.staff.findIndex(s => s.id === staff.id);
        if (index !== -1) {
            this.staff[index] = staff;
        }
    }

    deleteStaff(id: string) {
        this.staff = this.staff.filter(s => s.id !== id);
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
    }
}

export const dataService = new DataService();
