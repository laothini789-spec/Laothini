
/**
 * DATABASE SCHEMA & TYPES
 */

export enum OrderType {
    DINE_IN = 'DINE_IN',
    TAKEAWAY = 'TAKEAWAY',
    DELIVERY = 'DELIVERY'
}

export enum OrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    PREPARING = 'PREPARING',
    READY = 'READY',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum PaymentMethod {
    CASH = 'CASH',
    CREDIT_CARD = 'CREDIT_CARD',
    PROMPTPAY = 'PROMPTPAY',
    QR_CODE = 'QR_CODE',
    TRANSFER = 'TRANSFER'
}

export enum Role {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    STAFF = 'STAFF'
}

export interface Staff {
    id: string;
    name: string;
    role: Role;
    pin: string;
    avatar?: string;
    permissions?: string[]; // List of accessed modules e.g. ['access_pos', 'access_inventory']
}

// -- Inventory & Product --

export interface Ingredient {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    minStockLevel: number;
    costPerUnit: number;
    lastLog?: string; // New field to store the last adjustment reason
}

export interface RecipeItem {
    ingredientId: string;
    quantity: number;
}

export interface ProductOptionChoice {
    id: string; // Add ID for tracking
    name: string;
    priceModifier: number; // e.g. +10, +0
}

export interface ProductOptionGroup {
    id: string;
    name: string; // e.g. "Sweetness Level", "Toppings"
    choices: ProductOptionChoice[];
    required: boolean; // Must select one?
    allowMultiple: boolean; // Checkbox vs Radio
    maxSelection?: number; // Limit selection count
}

export interface ProductVariant {
    id: string;
    name: string; // e.g. "Strawberry", "Chocolate"
    price: number;
    cost?: number;
    stock?: number;
}

export interface CompositeItem {
    productId: string;
    quantity: number;
}

export interface DeliveryPricing {
    price: number;
    cost: number;
    gp: number; // GP % (Commission Fee)
}

export interface Product {
    id: string;
    name: string;
    categoryId: string;
    price: number; // Base Price (Storefront)

    // Platform Specific Prices & Costs
    priceDelivery?: {
        lineman?: DeliveryPricing;
        grab?: DeliveryPricing;
        shopeefood?: DeliveryPricing;
    };

    image: string;

    // Extended Fields
    description?: string;
    cost?: number; // Base Cost price

    // Inventory
    trackStock?: boolean; // Track stock directly on product
    stock?: number; // Current stock if trackStock is true

    // Advanced Types
    isComposite?: boolean; // Is this a bundle/set?
    compositeItems?: CompositeItem[]; // Items in the bundle

    variants?: ProductVariant[]; // e.g. Flavors

    recipe: RecipeItem[]; // Ingredients (Old logic)
    optionGroupIds?: string[]; // Links to ProductOptionGroup
}

export interface Category {
    id: string;
    name: string;
    icon: string; // Store icon name as string
}

export interface Discount {
    id: string;
    name: string; // e.g. "Member 10%", "Employee 50%"
    type: 'PERCENT' | 'FIXED';
    value: number;
    active: boolean;
    appliesTo: 'ALL' | 'FOOD' | 'BEVERAGE';
    specificCategoryIds?: string[]; // List of category IDs this discount applies to
}

// -- Order Management --

export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    selectedOptions?: {
        groupId: string;
        groupName: string;
        choiceId: string;
        choiceName: string;
        priceModifier: number;
    }[];
    notes?: string;
    status: 'PENDING' | 'COOKING' | 'DONE';
    refundedQuantity?: number; // Track how many items were refunded
}

export interface Order {
    id: string;
    orderNumber: string;
    tableId?: string;
    type: OrderType;
    status: OrderStatus;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    discount: number; // Total discount amount
    total: number;
    paymentMethod?: PaymentMethod;
    createdAt: Date;
    customerName?: string;
    deliveryPlatform?: 'GRAB' | 'LINEMAN' | 'SHOPEE';
    stockDeducted?: boolean; // Track if inventory was deducted
    refundedAmount?: number; // Total amount refunded
}

export interface Table {
    id: string;
    name: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
    capacity: number;
    currentOrderId?: string;
    qrToken?: string;
}

// -- Hardware --

export interface PrinterConfig {
    id: string;
    name: string;
    type: 'NETWORK' | 'BLUETOOTH' | 'USB';
    address: string; // IP or MAC or UUID
    connected: boolean;
    paperSize: '58mm' | '80mm';

    // Capabilities
    isCashier: boolean; // Prints Receipts
    isKitchen: boolean; // Prints Order Tickets
    assignedCategoryIds: string[]; // List of categories this printer handles (if isKitchen is true)
}

export interface PrintSettings {
    autoPrintReceipt: boolean;
    autoPrintKitchen: boolean;
    openCashDrawer: boolean;
}

export interface TaxSettings {
    enabled: boolean;
    rate: number; // e.g. 7 for 7%
    label: string; // e.g. "VAT"
}

export interface InventorySettings {
    enabled: boolean; // Main toggle for real-time stock tracking
    lowStockThreshold: number; // Global warning level
}

export interface ReceiptConfig {
    logoUrl: string;
    footerImageUrl: string;
    headerText: string;
    footerText: string;
    address: string;
}

// -- Shift Management --

export interface Shift {
    id: string;
    staffId: string;
    staffName: string; // Snapshot of staff name
    startTime: Date;
    endTime?: Date;
    startingCash: number;
    endingCash?: number;
    totalCashSales: number; // Sales made in CASH during this shift
    expectedCash: number; // Starting + Cash Sales - Withdrawals (if any)
    difference: number; // Ending - Expected
    status: 'OPEN' | 'CLOSED';
    notes?: string;
}
