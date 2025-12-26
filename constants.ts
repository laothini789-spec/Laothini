import { Category, Ingredient, Product, Table, Staff, Role } from "./types";

export const CATEGORIES: Category[] = [
    { id: 'cat_1', name: 'จานหลัก', icon: 'Utensils' },
    { id: 'cat_2', name: 'ของทานเล่น', icon: 'Pizza' },
    { id: 'cat_3', name: 'เครื่องดื่ม', icon: 'Beer' },
    { id: 'cat_4', name: 'ของหวาน', icon: 'IceCream' },
];

export const INGREDIENTS: Ingredient[] = [
    { id: 'ing_bun', name: 'ขนมปังเบอร์เกอร์', unit: 'ชิ้น', currentStock: 50, minStockLevel: 20, costPerUnit: 5 },
    { id: 'ing_beef', name: 'เนื้อบด', unit: 'ชิ้น', currentStock: 40, minStockLevel: 15, costPerUnit: 25 },
    { id: 'ing_cheese', name: 'เชดดาร์ชีส', unit: 'แผ่น', currentStock: 100, minStockLevel: 20, costPerUnit: 3 },
    { id: 'ing_lettuce', name: 'ผักกาดหอม', unit: 'หัว', currentStock: 10, minStockLevel: 3, costPerUnit: 15 },
    { id: 'ing_beer', name: 'ถังเบียร์สด', unit: 'ลิตร', currentStock: 30, minStockLevel: 5, costPerUnit: 80 },
];

export const PRODUCTS: Product[] = [
    {
        id: 'p_1',
        name: 'ชีสเบอร์เกอร์คลาสสิค',
        categoryId: 'cat_1',
        price: 180,
        image: 'https://picsum.photos/200/200?random=1',
        recipe: [
            { ingredientId: 'ing_bun', quantity: 1 },
            { ingredientId: 'ing_beef', quantity: 1 },
            { ingredientId: 'ing_cheese', quantity: 1 },
            { ingredientId: 'ing_lettuce', quantity: 0.1 },
        ]
    },
    {
        id: 'p_2',
        name: 'ดับเบิ้ลเนื้อเบอร์เกอร์',
        categoryId: 'cat_1',
        price: 240,
        image: 'https://picsum.photos/200/200?random=2',
        recipe: [
            { ingredientId: 'ing_bun', quantity: 1 },
            { ingredientId: 'ing_beef', quantity: 2 },
            { ingredientId: 'ing_cheese', quantity: 2 },
        ]
    },
    {
        id: 'p_choco',
        name: 'Chocolate Frappe',
        categoryId: 'cat_3',
        price: 160,
        image: 'https://picsum.photos/200/200?random=5',
        recipe: []
    },
    {
        id: 'p_4',
        name: 'คราฟต์เบียร์ IPA',
        categoryId: 'cat_3',
        price: 220,
        image: 'https://picsum.photos/200/200?random=4',
        recipe: [
            { ingredientId: 'ing_beer', quantity: 0.5 }
        ]
    }
];

export const TABLES: Table[] = [
    { id: 't1', name: 'โต๊ะ 01', status: 'AVAILABLE', capacity: 4 },
    { id: 't2', name: 'โต๊ะ 02', status: 'OCCUPIED', capacity: 2, currentOrderId: 'ord_init_1' },
    { id: 't3', name: 'โต๊ะ 03', status: 'AVAILABLE', capacity: 4 },
    { id: 't4', name: 'โต๊ะ 04', status: 'RESERVED', capacity: 6 },
    { id: 't5', name: 'บาร์ 01', status: 'AVAILABLE', capacity: 1 },
    { id: 't6', name: 'บาร์ 02', status: 'AVAILABLE', capacity: 1 },
];

export const STAFF_MEMBERS: Staff[] = [
    { id: 'u_1', name: 'คุณเจ้าของ (Admin)', role: Role.ADMIN, pin: '1111', avatar: 'AD' },
    { id: 'u_2', name: 'สมชาย (ผจก.)', role: Role.MANAGER, pin: '2222', avatar: 'MG' },
    { id: 'u_3', name: 'น้องบี (พนักงาน)', role: Role.STAFF, pin: '3333', avatar: 'ST' },
];

// Export default PINs for documentation purposes
export const DEFAULT_PINS = {
    ADMIN: '1111',
    MANAGER: '2222',
    STAFF: '3333'
};