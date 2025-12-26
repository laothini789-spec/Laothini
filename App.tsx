import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { POSView } from './components/POSView';
import { Dashboard } from './components/Dashboard';
import { MenuView } from './components/MenuView';
import { CustomerOrderView } from './components/CustomerOrderView';
import { dataService } from './services/dataService';
import { getRecentOrdersWithItems, updateOrderStatusRemote } from './services/onlineOrderService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Order, OrderItem, OrderStatus, OrderType, Table, Staff, Role, PaymentMethod, Ingredient, PrinterConfig, Category, PrintSettings, TaxSettings, ReceiptConfig, Product, RecipeItem, Shift } from './types';
import { Bell, ChefHat, Package, Settings as SettingsIcon, Monitor, ScrollText, Users, Lock, Unlock, X, Bike, Clock, Printer, CheckCircle, FileText, Tags, Plus, ShoppingBag, ChevronLeft, UtensilsCrossed, Edit, Trash2, Minus, Save, AlertTriangle, FilePenLine, KeyRound, CheckSquare, Square, CreditCard, Banknote, QrCode, Sliders, RefreshCcw, Bluetooth, Wifi, Usb, Layers, Upload, Search, History, Percent, ArrowRight, Calculator, Armchair, Calendar, RotateCcw } from 'lucide-react';
import { STAFF_MEMBERS } from './constants';

// --- DEFINED PERMISSIONS ---
const PERMISSION_OPTIONS = [
    { id: 'access_pos', label: 'ขายหน้าร้าน (POS & Tables)', desc: 'เข้าถึงหน้าสั่งอาหารและจัดการโต๊ะ' },
    { id: 'access_kitchen', label: 'จัดการออเดอร์/ครัว (KDS)', desc: 'ดูและจัดการสถานะออเดอร์ในครัว' },
    { id: 'access_history', label: 'ดูประวัติใบเสร็จ', desc: 'ดูย้อนหลังและพิมพ์ใบเสร็จซ้ำ' },
    { id: 'access_inventory', label: 'จัดการคลังสินค้า', desc: 'ดู แก้ไข และปรับสต็อกวัตถุดิบ' },
    { id: 'access_menu', label: 'จัดการเมนู', desc: 'เพิ่ม/ลบ สินค้าและโปรโมชั่น' },
    { id: 'access_reports', label: 'ดูรายงานยอดขาย', desc: 'เข้าถึง Dashboard และสถิติ' },
    { id: 'access_settings', label: 'ตั้งค่าระบบ', desc: 'จัดการพนักงานและการตั้งค่าร้าน' },
];

// --- KITCHEN DISPLAY COMPONENT ---
const KitchenDisplay = ({ onOpenOrder }: { onOpenOrder: (order: Order) => void }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = () => {
            // Fetch active orders (not completed/cancelled)
            const activeOrders = dataService.getOrders()
                .filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED)
                // Sort by newest first
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setOrders(activeOrders);

            // Auto-select first order if none selected and orders exist
            if (!selectedOrderId && activeOrders.length > 0) {
                setSelectedOrderId(activeOrders[0].id);
            }
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 2000);
        return () => clearInterval(interval);
    }, [selectedOrderId]);

    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    const handleCancelOrder = (order: Order) => {
        if (confirm(`ต้องการยกเลิกออเดอร์ ${order.orderNumber} ใช่หรือไม่?`)) {
            dataService.updateOrderStatus(order.id, OrderStatus.CANCELLED);
            if (isSupabaseConfigured) {
                updateOrderStatusRemote(order.id, OrderStatus.CANCELLED).catch(() => {
                    alert('อัปเดตสถานะบนระบบออนไลน์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
                });
            }
            setSelectedOrderId(null);
        }
    };
    const handleClearOrder = (order: Order) => {
        if (confirm(`ต้องการเคลียร์ออเดอร์โต๊ะนี้ (${order.orderNumber}) ใช่หรือไม่?`)) {
            dataService.updateOrderStatus(order.id, OrderStatus.COMPLETED);
            if (isSupabaseConfigured) {
                updateOrderStatusRemote(order.id, OrderStatus.COMPLETED).catch(() => {
                    alert('อัปเดตสถานะบนระบบออนไลน์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
                });
            }
            setSelectedOrderId(null);
        }
    };

    return (
        <div className="h-full bg-slate-100 flex overflow-hidden">
            {/* Left Sidebar: Order List */}
            <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 text-lg">ออเดอร์ที่เปิดอยู่</h2>
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">{orders.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {orders.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            <p>ไม่มีออเดอร์ที่เปิดอยู่</p>
                        </div>
                    )}
                    {orders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrderId(order.id)}
                            className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 ${selectedOrderId === order.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-800 text-lg">{order.orderNumber}</span>
                                <span className="font-bold text-slate-800">
                                    {order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    {order.tableId ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            ทานที่ร้าน • {dataService.getTable(order.tableId)?.name || 'โต๊ะ ?'}
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                            {order.type === OrderType.DELIVERY
                                                ? `${order.deliveryPlatform} (เดลิเวอรี่)`
                                                : 'กลับบ้าน'}
                                        </>
                                    )}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {new Date(order.createdAt).toLocaleDateString('th-TH')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Content: Details */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                {selectedOrder ? (
                    <>
                        <div className="flex-1 overflow-y-auto">
                            {/* Header: Total Sales */}
                            <div className="p-8 text-center">
                                <h1 className="text-3xl font-bold text-orange-500">
                                    ยอดขาย {selectedOrder.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h1>
                            </div>

                            <div className="max-w-3xl mx-auto w-full px-8 pb-24">
                                {/* Receipt Info */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">ข้อมูลใบเสร็จ</h3>
                                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                                        <div className="text-slate-500">ประเภท</div>
                                        <div className="text-right font-medium text-slate-800">
                                            {selectedOrder.type === OrderType.DELIVERY && selectedOrder.deliveryPlatform
                                                ? `${selectedOrder.deliveryPlatform} Delivery`
                                                : selectedOrder.type === OrderType.DINE_IN ? 'Dine-in (ทานที่ร้าน)' : 'Takeaway (กลับบ้าน)'}
                                        </div>

                                        <div className="text-slate-500">โน้ต</div>
                                        <div className="text-right font-medium text-slate-800">
                                            {selectedOrder.tableId ? dataService.getTable(selectedOrder.tableId)?.name : '-'}
                                        </div>

                                        <div className="text-slate-500">ชื่อพนักงาน</div>
                                        <div className="text-right font-medium text-slate-800">Admin</div>

                                        <div className="text-slate-500">เวลาเปิดบิล</div>
                                        <div className="text-right font-medium text-slate-800">
                                            {new Date(selectedOrder.createdAt).toLocaleString('th-TH')}
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 my-6"></div>

                                {/* Order Items */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">รายการอาหาร</h3>
                                    <div className="space-y-4">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-start text-sm">
                                                <div className="flex-1">
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-slate-800">{item.productName}</span>
                                                        <span className="text-slate-500">× {item.quantity}</span>
                                                    </div>
                                                    {item.notes && (
                                                        <div className="text-xs text-slate-400 mt-1 pl-2 border-l-2 border-slate-200">
                                                            - เพิ่มไข่: {item.notes}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-medium text-slate-800">
                                                    {(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 my-6"></div>

                                {/* Price Breakdown */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">ราคา</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">ค่าอาหาร</span>
                                            <span className="font-medium text-slate-800">
                                                {selectedOrder.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        {selectedOrder.tax > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">ภาษี (VAT)</span>
                                                <span className="font-medium text-slate-800">
                                                    {selectedOrder.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                        {selectedOrder.discount > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span>ส่วนลด</span>
                                                <span>-{selectedOrder.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-slate-500">
                                            <span>ค่าบริการ</span>
                                            <span className="font-medium text-slate-800">0.00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Action Bar */}
                        <div className="absolute bottom-0 right-0 p-6 bg-transparent pointer-events-none w-full flex justify-end">
                            <div className="pointer-events-auto flex gap-3">
                                <button
                                    onClick={() => handleCancelOrder(selectedOrder)}
                                    className="bg-red-50 border border-red-200 text-red-600 px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-red-100"
                                >
                                    ยกเลิกออเดอร์
                                </button>
                                <button
                                    onClick={() => handleClearOrder(selectedOrder)}
                                    className="bg-slate-900 border border-slate-900 text-white px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-slate-800"
                                >
                                    เคลียร์ออเดอร์
                                </button>
                                <button
                                    onClick={() => onOpenOrder(selectedOrder)}
                                    className="bg-orange-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-orange-600 flex items-center gap-2 transform transition-transform hover:scale-105"
                                >
                                    <span>เปิดหน้ารายการ</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Package size={64} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">เลือกออเดอร์เพื่อดูรายละเอียด</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- INVENTORY VIEW COMPONENT ---
const InventoryView = ({ currentUser }: { currentUser: Staff }) => {
    const [activeTab, setActiveTab] = useState<'STOCK' | 'RECIPES'>('STOCK');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);

    // States for Recipe Management
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Load Data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setIngredients([...dataService.getIngredients()]);
        setProducts([...dataService.getProducts()]);
    };

    // --- Sub-Component: Stock Management ---
    const StockTab = () => {
        const [isFormOpen, setIsFormOpen] = useState(false);
        const [isAdjustOpen, setIsAdjustOpen] = useState(false);
        const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
        const [adjustingIng, setAdjustingIng] = useState<Ingredient | null>(null);

        const canManage = currentUser.role === Role.ADMIN || currentUser.role === Role.MANAGER;
        const showCost = canManage;

        const updateStock = (id: string, delta: number) => {
            const ing = ingredients.find(i => i.id === id);
            if (ing) {
                const newStock = Math.max(0, ing.currentStock + delta);
                const updated = { ...ing, currentStock: newStock, lastLog: delta > 0 ? 'Manual Add' : 'Manual Reduce' };
                dataService.updateIngredient(updated);
                loadData();
            }
        };

        const handleSaveIngredient = (ing: Ingredient) => {
            if (editingIng) dataService.updateIngredient(ing);
            else dataService.addIngredient(ing);
            loadData();
        };

        const handleAdjustStock = (ing: Ingredient) => {
            dataService.updateIngredient(ing);
            loadData();
        };

        const handleDelete = (id: string) => {
            if (confirm('คุณแน่ใจหรือไม่ที่จะลบวัตถุดิบนี้?')) {
                dataService.deleteIngredient(id);
                loadData();
            }
        };

        return (
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Package size={24} className="text-blue-600" /> รายการวัตถุดิบ (Stock)
                    </h2>
                    {canManage && (
                        <button
                            onClick={() => { setEditingIng(null); setIsFormOpen(true); }}
                            className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={20} /> เพิ่มวัตถุดิบ
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold text-slate-600">ชื่อวัตถุดิบ</th>
                                <th className="p-4 font-semibold text-slate-600">คงเหลือ</th>
                                <th className="p-4 font-semibold text-slate-600">หน่วย</th>
                                {showCost && <th className="p-4 font-semibold text-slate-600">ต้นทุน/หน่วย</th>}
                                <th className="p-4 font-semibold text-slate-600 text-right">ปรับสต็อก</th>
                                {canManage && <th className="p-4 font-semibold text-slate-600 text-right">จัดการ</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ingredients.map(ing => (
                                <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{ing.name}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${ing.currentStock <= ing.minStockLevel ? 'text-red-600' : 'text-slate-800'}`}>
                                                {ing.currentStock}
                                            </span>
                                            {ing.currentStock <= ing.minStockLevel && <AlertTriangle size={14} className="text-red-500" />}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-500">{ing.unit}</td>
                                    {showCost && <td className="p-4 text-slate-500">฿{ing.costPerUnit}</td>}
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => updateStock(ing.id, -1)} className="p-1 rounded bg-slate-100 hover:bg-red-50 hover:text-red-500 transition-colors"><Minus size={16} /></button>
                                            <button
                                                onClick={() => { setAdjustingIng(ing); setIsAdjustOpen(true); }}
                                                className="p-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-500 transition-colors text-xs px-2"
                                            >
                                                แก้ไข
                                            </button>
                                            <button onClick={() => updateStock(ing.id, 1)} className="p-1 rounded bg-slate-100 hover:bg-green-50 hover:text-green-500 transition-colors"><Plus size={16} /></button>
                                        </div>
                                    </td>
                                    {canManage && (
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setEditingIng(ing); setIsFormOpen(true); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"><Edit size={16} /></button>
                                                <button onClick={() => handleDelete(ing.id)} className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {ingredients.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">ยังไม่มีข้อมูลวัตถุดิบ</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <IngredientFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} ingredient={editingIng} onSave={handleSaveIngredient} />
                <StockAdjustModal isOpen={isAdjustOpen} onClose={() => setIsAdjustOpen(false)} ingredient={adjustingIng} onSave={handleAdjustStock} />
            </div>
        );
    };

    // --- Sub-Component: Recipe Management ---
    const RecipeTab = () => {
        const [currentRecipe, setCurrentRecipe] = useState<RecipeItem[]>([]);
        const [addIngId, setAddIngId] = useState('');
        const [addQty, setAddQty] = useState<number>(1);

        useEffect(() => {
            if (selectedProduct) {
                setCurrentRecipe(selectedProduct.recipe || []);
            } else {
                setCurrentRecipe([]);
            }
        }, [selectedProduct]);

        const handleProductSelect = (product: Product) => {
            setSelectedProduct(product);
        };

        const handleAddIngredient = (e: React.FormEvent) => {
            e.preventDefault();
            if (selectedProduct && addIngId && addQty > 0) {
                const existingItemIndex = currentRecipe.findIndex(r => r.ingredientId === addIngId);
                let newRecipe = [...currentRecipe];

                if (existingItemIndex > -1) {
                    newRecipe[existingItemIndex].quantity += addQty;
                } else {
                    newRecipe.push({ ingredientId: addIngId, quantity: addQty });
                }

                // Update Local State
                setCurrentRecipe(newRecipe);

                // Update Service
                const updatedProduct = { ...selectedProduct, recipe: newRecipe };
                dataService.updateProduct(updatedProduct);
                setSelectedProduct(updatedProduct); // Refresh selected

                // Reset Form
                setAddIngId('');
                setAddQty(1);
            }
        };

        const handleRemoveIngredient = (ingId: string) => {
            if (selectedProduct) {
                const newRecipe = currentRecipe.filter(r => r.ingredientId !== ingId);
                setCurrentRecipe(newRecipe);
                const updatedProduct = { ...selectedProduct, recipe: newRecipe };
                dataService.updateProduct(updatedProduct);
                setSelectedProduct(updatedProduct);
            }
        };

        const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

        // Calculate Cost
        const calculateRecipeCost = () => {
            return currentRecipe.reduce((total, item) => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                return total + (ing ? ing.costPerUnit * item.quantity : 0);
            }, 0);
        };

        return (
            <div className="h-full flex gap-6">
                {/* Left: Product List */}
                <div className="w-1/3 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-2">เลือกสินค้า</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="ค้นหาสินค้า..."
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredProducts.map(p => (
                            <div
                                key={p.id}
                                onClick={() => handleProductSelect(p)}
                                className={`p-4 border-b border-slate-50 cursor-pointer transition-colors flex justify-between items-center ${selectedProduct?.id === p.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={p.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800 text-sm">{p.name}</div>
                                        <div className="text-xs text-slate-500">{p.recipe?.length || 0} วัตถุดิบ</div>
                                    </div>
                                </div>
                                <ChevronLeft className="rotate-180 text-slate-300" size={16} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Recipe Editor */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                    {selectedProduct ? (
                        <>
                            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                                        <img src={selectedProduct.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">{selectedProduct.name}</h2>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                            <span>ราคาขาย: <span className="font-bold text-green-600">฿{selectedProduct.price}</span></span>
                                            <span>ต้นทุนสูตร: <span className="font-bold text-orange-600">฿{calculateRecipeCost().toFixed(2)}</span></span>
                                            <span>กำไรขั้นต้น: <span className="font-bold text-slate-700">฿{(selectedProduct.price - calculateRecipeCost()).toFixed(2)}</span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className="mb-6">
                                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <ChefHat size={20} className="text-orange-500" /> วัตถุดิบในสูตร
                                    </h3>

                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                <tr>
                                                    <th className="p-3">วัตถุดิบ</th>
                                                    <th className="p-3 text-right">ปริมาณ</th>
                                                    <th className="p-3 text-right">หน่วย</th>
                                                    <th className="p-3 text-right">ต้นทุน/หน่วย</th>
                                                    <th className="p-3 text-right">รวมทุน</th>
                                                    <th className="p-3 text-center">ลบ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {currentRecipe.map((item, idx) => {
                                                    const ing = ingredients.find(i => i.id === item.ingredientId);
                                                    if (!ing) return null;
                                                    const cost = ing.costPerUnit * item.quantity;
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50">
                                                            <td className="p-3 font-medium text-slate-700">{ing.name}</td>
                                                            <td className="p-3 text-right font-bold">{item.quantity}</td>
                                                            <td className="p-3 text-right text-slate-500">{ing.unit}</td>
                                                            <td className="p-3 text-right text-slate-500">{ing.costPerUnit}</td>
                                                            <td className="p-3 text-right font-medium text-slate-800">{cost.toFixed(2)}</td>
                                                            <td className="p-3 text-center">
                                                                <button onClick={() => handleRemoveIngredient(item.ingredientId)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={16} /></button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {currentRecipe.length === 0 && (
                                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">ยังไม่ได้กำหนดสูตร</td></tr>
                                                )}
                                            </tbody>
                                            {currentRecipe.length > 0 && (
                                                <tfoot className="bg-slate-50 font-bold text-slate-700 border-t border-slate-200">
                                                    <tr>
                                                        <td colSpan={4} className="p-3 text-right">รวมต้นทุนวัตถุดิบ</td>
                                                        <td className="p-3 text-right text-orange-600">฿{calculateRecipeCost().toFixed(2)}</td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="font-bold text-sm text-slate-700 mb-3">เพิ่มวัตถุดิบในสูตร</h4>
                                    <form onSubmit={handleAddIngredient} className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs text-slate-500 mb-1">เลือกวัตถุดิบ</label>
                                            <select
                                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                                value={addIngId}
                                                onChange={e => setAddIngId(e.target.value)}
                                                required
                                            >
                                                <option value="">-- เลือก --</option>
                                                {ingredients.map(ing => (
                                                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit}) - ฿{ing.costPerUnit}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs text-slate-500 mb-1">ปริมาณ</label>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0.0001"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                                                value={addQty}
                                                onChange={e => setAddQty(Number(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1 shadow-sm h-[38px]">
                                            <Plus size={16} /> เพิ่ม
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Calculator size={64} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">เลือกสินค้าทางด้านซ้าย</p>
                            <p className="text-sm">เพื่อจัดการสูตรและคำนวณต้นทุน</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 h-full bg-slate-50 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="text-2xl font-bold text-slate-800">จัดการคลังและสูตร (Inventory & Recipes)</h1>
                <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                    <button
                        onClick={() => setActiveTab('STOCK')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'STOCK' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Package size={16} /> รายการวัตถุดิบ (Stock)
                    </button>
                    <button
                        onClick={() => setActiveTab('RECIPES')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'RECIPES' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <ChefHat size={16} /> จัดสูตรอาหาร (Recipes)
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'STOCK' && <StockTab />}
                {activeTab === 'RECIPES' && <RecipeTab />}
            </div>
        </div>
    );
};

// --- DELIVERY VIEW COMPONENT (Based on Screenshot) ---
const DeliveryView = () => {
    // Component kept for reference but functionality mainly moved to POS
    return null;
};

// --- HISTORY VIEW COMPONENT ---
const HistoryView = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterType, setFilterType] = useState<'ALL' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('ALL');

    const refreshOrders = () => {
        const allOrders = dataService.getOrders();
        // Filter for history: Completed or Cancelled
        const history = allOrders.filter(o =>
            o.status === OrderStatus.COMPLETED || o.status === OrderStatus.CANCELLED
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(history);
    };

    useEffect(() => {
        refreshOrders();
    }, []);

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());

        const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
        const matchesDate = orderDate >= startDate && orderDate <= endDate;

        // Filter Logic
        let matchesType = true;
        if (filterType === 'DINE_IN') matchesType = o.type === OrderType.DINE_IN;
        if (filterType === 'TAKEAWAY') matchesType = o.type === OrderType.TAKEAWAY;
        if (filterType === 'DELIVERY') matchesType = o.type === OrderType.DELIVERY;

        return matchesSearch && matchesDate && matchesType;
    });

    const handleVoidOrder = (order: Order) => {
        if (confirm(`ต้องการยกเลิกบิล ${order.orderNumber} ใช่หรือไม่? การยกเลิกจะไม่คืนสต็อกอัตโนมัติ`)) {
            dataService.updateOrderStatus(order.id, OrderStatus.CANCELLED);
            refreshOrders();
            if (selectedOrder?.id === order.id) {
                setSelectedOrder(prev => prev ? { ...prev, status: OrderStatus.CANCELLED } : null);
            }
        }
    }

    const handlePrint = (order: Order) => {
        alert(`กำลังพิมพ์ใบเสร็จ ${order.orderNumber}...`);
    }

    const handleRefundItem = (item: OrderItem) => {
        if (!selectedOrder) return;
        const maxRefund = item.quantity - (item.refundedQuantity || 0);
        if (maxRefund <= 0) return;

        const qtyStr = prompt(`ต้องการคืนเงินสินค้า "${item.productName}"\nระบุจำนวน (สูงสุด ${maxRefund}):`, maxRefund.toString());
        if (!qtyStr) return;

        const qty = parseInt(qtyStr);
        if (isNaN(qty) || qty <= 0 || qty > maxRefund) {
            alert('จำนวนไม่ถูกต้อง');
            return;
        }

        dataService.refundOrderItem(selectedOrder.id, item.id, qty);
        refreshOrders();

        // Refresh local state
        const updated = dataService.getOrder(selectedOrder.id);
        if (updated) setSelectedOrder({ ...updated });
    };

    return (
        <div className="flex h-full bg-slate-100 overflow-hidden">
            {/* List Sidebar */}
            <div className="w-[400px] bg-white border-r border-slate-200 flex flex-col z-10 shadow-sm">

                {/* Date Picker Section */}
                <div className="p-4 pb-2 bg-slate-50 border-b border-slate-100/50">
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <input
                                type="date"
                                className="w-full pl-2 pr-2 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white shadow-sm"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <span className="text-xs text-slate-400">ถึง</span>
                        <div className="relative flex-1">
                            <input
                                type="date"
                                className="w-full pl-2 pr-2 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white shadow-sm"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Search & Filter Section */}
                <div className="p-4 pt-2 bg-slate-50 border-b border-slate-200">
                    {/* Search Bar */}
                    <div className="relative mb-3">
                        <input
                            type="text"
                            placeholder="ค้นหาใบเสร็จ"
                            className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-100 text-slate-800 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute right-3 top-2.5 text-slate-400" size={20} />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 text-xs font-medium overflow-x-auto pb-1 no-scrollbar">
                        {[
                            { id: 'ALL', label: 'ทั้งหมด' },
                            { id: 'DINE_IN', label: 'เคาน์เตอร์' },
                            { id: 'TAKEAWAY', label: 'สั่งกลับบ้าน' },
                            { id: 'DELIVERY', label: 'เดลิเวอรี่' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilterType(tab.id as any)}
                                className={`px-3 py-1.5 rounded-md border whitespace-nowrap transition-colors ${filterType === tab.id
                                    ? 'bg-slate-700 text-white border-slate-700'
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Order List */}
                <div className="flex-1 overflow-y-auto bg-slate-100/50">
                    {filteredOrders.length === 0 && (
                        <div className="p-10 text-center text-slate-400 text-sm flex flex-col items-center">
                            <History size={48} className="mb-4 opacity-20" />
                            <p>ไม่พบประวัติใบเสร็จ</p>
                        </div>
                    )}
                    {filteredOrders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`p-4 border-b border-slate-200 cursor-pointer transition-all hover:bg-white ${selectedOrder?.id === order.id ? 'bg-blue-50/50' : 'bg-slate-50'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-800 text-base">{order.orderNumber}</span>
                                <span className={`font-bold ${order.status === OrderStatus.CANCELLED ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                    ฿{order.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-normal">
                                    {order.type === OrderType.DINE_IN ? 'เคาน์เตอร์' :
                                        order.type === OrderType.TAKEAWAY ? 'สั่งกลับบ้าน' :
                                            order.type === OrderType.DELIVERY ? 'เดลิเวอรี่' : '-'}
                                </span>
                                <span className="text-slate-500 font-normal">
                                    {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail View (Right Side) - kept mostly consistent but cleaned up */}
            <div className="flex-1 bg-slate-200/50 p-8 flex justify-center overflow-y-auto">
                {selectedOrder ? (
                    <div className="w-full max-w-md flex flex-col h-fit">
                        {/* Receipt Card */}
                        <div className="bg-white shadow-xl rounded-xl overflow-hidden mb-6 border border-slate-200 relative">
                            {/* Paper Effect */}
                            <div className="h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>

                            {/* Receipt Header */}
                            <div className="p-8 pb-4 text-center border-b border-dashed border-slate-200">
                                <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl shadow-lg">L</div>
                                <h3 className="font-bold text-xl text-slate-800">Laothini POS</h3>
                                <div className="text-xs text-slate-500 mt-1 space-y-1">
                                    <p>Receipt ID: <span className="font-mono text-slate-700">{selectedOrder.orderNumber}</span></p>
                                    <p>{new Date(selectedOrder.createdAt).toLocaleString('th-TH')}</p>
                                </div>
                                {selectedOrder.status === OrderStatus.CANCELLED && (
                                    <div className="mt-4 border-2 border-red-500 text-red-500 font-bold text-xl py-2 rounded-lg transform -rotate-6 opacity-50">
                                        ยกเลิกบิล (VOID)
                                    </div>
                                )}
                            </div>

                            {/* Items */}
                            <div className="p-8 space-y-4">
                                {selectedOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm items-start border-b border-slate-100 last:border-0 pb-3 mb-3 last:mb-0 last:pb-0">
                                        <div className="flex-1">
                                            <span className="text-slate-800 font-bold">{item.productName}</span>
                                            {item.notes && <div className="text-xs text-slate-400">({item.notes})</div>}
                                            {(item.refundedQuantity || 0) > 0 && (
                                                <div className="text-xs text-red-500 font-bold mt-1">
                                                    คืนเงินแล้ว {item.refundedQuantity} ชิ้น
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <div className="text-slate-800 font-medium">฿{(item.price * item.quantity).toLocaleString()}</div>
                                            <div className="text-xs text-slate-400">x{item.quantity}</div>

                                            {selectedOrder.status === OrderStatus.COMPLETED && (item.quantity - (item.refundedQuantity || 0) > 0) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRefundItem(item); }}
                                                    className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 border border-red-100 transition-colors"
                                                >
                                                    คืนเงิน
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="p-8 bg-slate-50 border-t border-dashed border-slate-200 space-y-2">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>ยอดรวม (Subtotal)</span>
                                    <span>{selectedOrder.subtotal.toFixed(2)}</span>
                                </div>
                                {selectedOrder.tax > 0 && (
                                    <div className="flex justify-between text-sm text-slate-500">
                                        <span>ภาษี (VAT)</span>
                                        <span>{selectedOrder.tax.toFixed(2)}</span>
                                    </div>
                                )}
                                {selectedOrder.discount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>ส่วนลด (Discount)</span>
                                        <span>-{selectedOrder.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                {(selectedOrder.refundedAmount || 0) > 0 && (
                                    <div className="flex justify-between text-sm text-red-600 font-bold">
                                        <span>ยอดคืนเงิน (Refunded)</span>
                                        <span>-{selectedOrder.refundedAmount?.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-2xl font-bold text-slate-800 pt-4 border-t border-slate-200 mt-2">
                                    <span>Total</span>
                                    <span>฿{selectedOrder.total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 mt-2 pt-2">
                                    <span>Payment Method</span>
                                    <span className="font-bold uppercase">{selectedOrder.paymentMethod || 'CASH'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => handlePrint(selectedOrder)}
                                className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm transition-all"
                            >
                                <Printer size={20} /> พิมพ์ใบเสร็จ
                            </button>
                            {selectedOrder.status !== OrderStatus.CANCELLED && (
                                <button
                                    onClick={() => handleVoidOrder(selectedOrder)}
                                    className="flex-1 bg-red-50 border border-red-200 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 flex items-center justify-center gap-2 shadow-sm transition-all"
                                >
                                    <Trash2 size={20} /> ยกเลิกบิล
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 h-full">
                        <FileText size={80} className="mb-6 opacity-20" />
                        <p className="text-lg font-medium">เลือกรายการเพื่อดูรายละเอียด</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS (Existing) ---
const PinModal = ({
    isOpen,
    onClose,
    onSuccess,
    title = "กรุณาใส่รหัส PIN",
    requiredRole
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (staff: Staff) => void;
    title?: string;
    requiredRole?: Role;
}) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleNumClick = (num: string) => {
        if (pin.length < 4) setPin(prev => prev + num);
    };

    const handleClear = () => setPin('');
    const handleBackspace = () => setPin(prev => prev.slice(0, -1));

    const handleSubmit = async () => {
        setError('');
        if (loading) return;

        if (isSupabaseConfigured && supabase) {
            setLoading(true);
            const { data, error: rpcError } = await supabase.rpc('match_staff_pin', {
                pin_input: pin
            });
            const result = Array.isArray(data) ? data[0] : data;
            if (rpcError || !result) {
                setError('รหัส PIN ไม่ถูกต้อง');
                setPin('');
                setLoading(false);
                return;
            }
            const roleValue = Object.values(Role).includes(result.role as Role)
                ? (result.role as Role)
                : Role.STAFF;
            const staff: Staff = {
                id: result.id,
                name: result.name || 'Staff',
                role: roleValue,
                pin: '',
                avatar: (result.name || 'ST').slice(0, 2).toUpperCase(),
                permissions: result.permissions || []
            };
            if (requiredRole === Role.MANAGER && staff.role === Role.STAFF) {
                setError('สิทธิ์ไม่เพียงพอ (ต้องการระดับ Manager)');
                setPin('');
                setLoading(false);
                return;
            }
            onSuccess(staff);
            setPin('');
            setError('');
            setLoading(false);
            onClose();
            return;
        }

        const staff = dataService.validatePin(pin);
        if (staff) {
            if (requiredRole === Role.MANAGER && staff.role === Role.STAFF) {
                setError('สิทธิ์ไม่เพียงพอ (ต้องการระดับ Manager)');
                setPin('');
                return;
            }
            onSuccess(staff);
            setPin('');
            setError('');
            onClose();
        } else {
            setError('รหัส PIN ไม่ถูกต้อง');
            setPin('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-[340px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>

                <div className="mb-6 flex justify-center">
                    <div className="flex gap-4">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 border-slate-300 ${pin.length > i ? 'bg-slate-800 border-slate-800' : ''}`} />
                        ))}
                    </div>
                </div>

                {error && <div className="text-red-500 text-center text-sm mb-4">{error}</div>}

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleNumClick(num.toString())}
                            className="h-16 rounded-xl bg-slate-50 hover:bg-slate-200 text-xl font-bold text-slate-700 transition-colors"
                        >
                            {num}
                        </button>
                    ))}
                    <button onClick={handleClear} className="h-16 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold">C</button>
                    <button onClick={() => handleNumClick('0')} className="h-16 rounded-xl bg-slate-50 hover:bg-slate-200 text-xl font-bold text-slate-700">0</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`h-16 rounded-xl font-bold ${loading ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-primary hover:bg-slate-800 text-white'}`}
                    >
                        {loading ? '...' : 'OK'}
                    </button>
                </div>

                <p className="text-center text-xs text-slate-400">Demo PINs: Admin=1111, Manager=2222, Staff=3333</p>
            </div>
        </div>
    );
};

const EmailLoginModal = ({
    isOpen,
    onClose,
    onSuccess,
    onUsePin
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (staff: Staff) => void;
    onUsePin?: () => void;
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!supabase) {
            setError('ยังไม่ได้ตั้งค่า Supabase');
            return;
        }
        if (!email || !password) {
            setError('กรุณากรอกอีเมลและรหัสผ่าน');
            return;
        }
        setLoading(true);
        setError('');
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError || !data.user) {
            setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            setLoading(false);
            return;
        }
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id,name,role,permissions')
            .eq('id', data.user.id)
            .maybeSingle();
        if (profileError || !profile) {
            setError('ไม่พบข้อมูลพนักงานในระบบ');
            setLoading(false);
            return;
        }
        const roleValue = Object.values(Role).includes(profile.role as Role)
            ? (profile.role as Role)
            : Role.STAFF;
        const staff: Staff = {
            id: profile.id,
            name: profile.name || data.user.email || 'Staff',
            role: roleValue,
            pin: '',
            avatar: (profile.name || 'ST').slice(0, 2).toUpperCase(),
            permissions: profile.permissions || []
        };
        onSuccess(staff);
        setLoading(false);
        setEmail('');
        setPassword('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-[360px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">เข้าสู่ระบบพนักงาน</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>

                {error && <div className="text-red-500 text-center text-sm mb-4">{error}</div>}

                <div className="space-y-4 mb-6">
                    <input
                        type="email"
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                        placeholder="อีเมล"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                        placeholder="รหัสผ่าน"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`w-full py-3 rounded-xl font-bold text-white ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
                >
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>

                {onUsePin && (
                    <button
                        onClick={onUsePin}
                        className="w-full mt-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                    >
                        ใช้ PIN (โหมดออฟไลน์)
                    </button>
                )}
            </div>
        </div>
    );
};

const StaffFormModal = ({ isOpen, onClose, staff, onSave }: { isOpen: boolean, onClose: () => void, staff: Staff | null, onSave: (s: Staff) => void }) => {
    const [form, setForm] = useState<Partial<Staff>>({
        name: '',
        role: Role.STAFF,
        pin: '',
        avatar: 'ST',
        permissions: []
    });

    useEffect(() => {
        if (staff) {
            setForm({
                ...staff,
                permissions: staff.permissions || getDefaultPermissions(staff.role)
            });
        } else {
            setForm({
                name: '',
                role: Role.STAFF,
                pin: '',
                avatar: 'ST',
                permissions: getDefaultPermissions(Role.STAFF)
            });
        }
    }, [staff, isOpen]);

    const getDefaultPermissions = (role: Role) => {
        if (role === Role.ADMIN) return PERMISSION_OPTIONS.map(p => p.id);
        if (role === Role.MANAGER) return PERMISSION_OPTIONS.filter(p => p.id !== 'access_settings').map(p => p.id);
        return ['access_pos', 'access_kitchen'];
    };

    const handleRoleChange = (newRole: Role) => {
        setForm(prev => ({
            ...prev,
            role: newRole,
            permissions: getDefaultPermissions(newRole)
        }));
    };

    const togglePermission = (permId: string) => {
        const currentPerms = form.permissions || [];
        if (currentPerms.includes(permId)) {
            setForm({ ...form, permissions: currentPerms.filter(p => p !== permId) });
        } else {
            setForm({ ...form, permissions: [...currentPerms, permId] });
        }
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...form,
            id: staff?.id || `u_${Date.now()}`
        } as Staff);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-bold text-slate-800">{staff ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อพนักงาน</label>
                            <input
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-900"
                                required
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="เช่น สมชาย ใจดี"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">ตำแหน่ง (Role)</label>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-900 appearance-none"
                                    value={form.role}
                                    onChange={e => handleRoleChange(e.target.value as Role)}
                                >
                                    <option value={Role.STAFF}>พนักงาน (Staff)</option>
                                    <option value={Role.MANAGER}>ผู้จัดการ (Manager)</option>
                                    <option value={Role.ADMIN}>เจ้าของร้าน (Admin)</option>
                                </select>
                                <ChevronLeft className="absolute right-4 top-3.5 rotate-[-90deg] text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">รหัส PIN (4 หลัก)</label>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <input
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-slate-900 font-mono tracking-widest"
                                    required
                                    type="text"
                                    maxLength={4}
                                    pattern="\d{4}"
                                    placeholder="0000"
                                    value={form.pin}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setForm({ ...form, pin: val });
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <label className="block text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <CheckSquare size={18} className="text-orange-500" />
                            กำหนดสิทธิ์การเข้าถึง (Permissions)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {PERMISSION_OPTIONS.map(perm => {
                                const isChecked = (form.permissions || []).includes(perm.id);
                                return (
                                    <div
                                        key={perm.id}
                                        onClick={() => togglePermission(perm.id)}
                                        className={`
                                            flex items-start gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all
                                            ${isChecked ? 'bg-orange-50 border-orange-500' : 'bg-white border-slate-100 hover:border-orange-200'}
                                        `}
                                    >
                                        <div className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'bg-orange-500 border-orange-500' : 'border-slate-300 bg-white'}`}>
                                            {isChecked && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                        <div>
                                            <div className={`text-sm font-bold ${isChecked ? 'text-orange-800' : 'text-slate-700'}`}>{perm.label}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{perm.desc}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button type="submit" className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all text-lg">
                            บันทึกข้อมูล
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PrinterFormModal = ({ isOpen, onClose, printer, onSave, categories }: { isOpen: boolean, onClose: () => void, printer: PrinterConfig | null, onSave: (p: PrinterConfig) => void, categories: Category[] }) => {
    const [form, setForm] = useState<Partial<PrinterConfig>>({
        name: '', type: 'NETWORK', address: '', connected: false, paperSize: '80mm',
        isCashier: true, isKitchen: false, assignedCategoryIds: []
    });
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        if (printer) setForm(printer);
        else setForm({
            name: '', type: 'NETWORK', address: '', connected: false, paperSize: '80mm',
            isCashier: true, isKitchen: false, assignedCategoryIds: []
        });
    }, [printer, isOpen]);

    if (!isOpen) return null;

    const handleBluetoothScan = async () => {
        setIsScanning(true);
        try {
            // Web Bluetooth API Logic (requires HTTPS or localhost)
            // Note: In some environments this might throw if not supported
            const device = await (navigator as any).bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['battery_service'] // Generic service as example
            });

            setForm(prev => ({
                ...prev,
                type: 'BLUETOOTH',
                name: device.name || 'Unknown Bluetooth Printer',
                address: device.id, // Using Device ID as address
                connected: true
            }));
            alert(`เชื่อมต่อกับ ${device.name} สำเร็จ`);
        } catch (err) {
            console.error(err);
            alert("ไม่สามารถค้นหาอุปกรณ์ Bluetooth ได้ หรือเบราว์เซอร์ไม่รองรับ");
        } finally {
            setIsScanning(false);
        }
    };

    const toggleCategory = (catId: string) => {
        const current = form.assignedCategoryIds || [];
        if (current.includes(catId)) {
            setForm({ ...form, assignedCategoryIds: current.filter(id => id !== catId) });
        } else {
            setForm({ ...form, assignedCategoryIds: [...current, catId] });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...form, id: printer?.id || `prn_${Date.now()}` } as PrinterConfig);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800">{printer ? 'แก้ไขเครื่องพิมพ์' : 'เพิ่มเครื่องพิมพ์'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อเครื่องพิมพ์</label>
                            <input
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                                required
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="เช่น ครัวร้อน, บาร์น้ำ"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">ประเภทการเชื่อมต่อ</label>
                            <div className="flex gap-2 mb-2">
                                {[
                                    { id: 'NETWORK', icon: <Wifi size={16} />, label: 'WiFi/LAN' },
                                    { id: 'BLUETOOTH', icon: <Bluetooth size={16} />, label: 'Bluetooth' },
                                    { id: 'USB', icon: <Usb size={16} />, label: 'USB' },
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setForm({ ...form, type: type.id as any })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${form.type === type.id
                                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        {type.icon} {type.label}
                                    </button>
                                ))}
                            </div>

                            {form.type === 'BLUETOOTH' ? (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                                    <button
                                        type="button"
                                        onClick={handleBluetoothScan}
                                        disabled={isScanning}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 mx-auto disabled:opacity-50"
                                    >
                                        {isScanning ? <RefreshCcw size={18} className="animate-spin" /> : <Bluetooth size={18} />}
                                        {isScanning ? 'กำลังค้นหา...' : 'ค้นหาและจับคู่ Bluetooth'}
                                    </button>
                                    <p className="text-xs text-blue-600 mt-2">โปรดตรวจสอบว่าเปิด Bluetooth ที่อุปกรณ์แล้ว</p>
                                </div>
                            ) : (
                                <div>
                                    <input
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                                        value={form.address}
                                        onChange={e => setForm({ ...form, address: e.target.value })}
                                        placeholder={form.type === 'NETWORK' ? "IP Address (e.g., 192.168.1.200)" : "Port Name"}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Paper Size Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">ขนาดกระดาษ</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg hover:bg-slate-50 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        name="paperSize"
                                        value="80mm"
                                        checked={form.paperSize === '80mm'}
                                        onChange={() => setForm({ ...form, paperSize: '80mm' })}
                                        className="w-4 h-4 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">80mm (Standard)</div>
                                        <div className="text-xs text-slate-500">กระดาษความร้อนขนาดมาตรฐาน</div>
                                    </div>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg hover:bg-slate-50 transition-colors flex-1">
                                    <input
                                        type="radio"
                                        name="paperSize"
                                        value="58mm"
                                        checked={form.paperSize === '58mm'}
                                        onChange={() => setForm({ ...form, paperSize: '58mm' })}
                                        className="w-4 h-4 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">58mm (Small)</div>
                                        <div className="text-xs text-slate-500">กระดาษใบเสร็จขนาดเล็ก</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <label className="block text-sm font-bold text-slate-800 mb-3">หน้าที่การพิมพ์ (Function)</label>

                            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 mb-2">
                                <input
                                    type="checkbox"
                                    checked={form.isCashier}
                                    onChange={e => setForm({ ...form, isCashier: e.target.checked })}
                                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-700">เครื่องแคชเชียร์ (Cashier)</div>
                                    <div className="text-xs text-slate-500">พิมพ์ใบเสร็จรับเงินสำหรับลูกค้า</div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={form.isKitchen}
                                    onChange={e => setForm({ ...form, isKitchen: e.target.checked })}
                                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                                />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-700">เครื่องครัว/บาร์ (Kitchen/Bar)</div>
                                    <div className="text-xs text-slate-500">พิมพ์ใบรายการอาหาร/เครื่องดื่มตามหมวดหมู่</div>
                                </div>
                            </label>
                        </div>

                        {/* Category Selection for Kitchen Printer */}
                        {form.isKitchen && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-fade-in">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                                    <Layers size={14} /> เลือกหมวดหมู่ที่จะพิมพ์
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {categories.map(cat => (
                                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={(form.assignedCategoryIds || []).includes(cat.id)}
                                                onChange={() => toggleCategory(cat.id)}
                                                className="rounded text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-slate-700">{cat.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2">* เครื่องนี้จะพิมพ์เฉพาะรายการที่อยู่ในหมวดหมู่ที่เลือก</p>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all">
                            บันทึกเครื่องพิมพ์
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const IngredientFormModal = ({ isOpen, onClose, ingredient, onSave }: any) => {
    const [form, setForm] = useState<Partial<Ingredient>>({ name: '', unit: '', currentStock: 0, minStockLevel: 0, costPerUnit: 0 });

    useEffect(() => {
        if (ingredient) {
            setForm(ingredient);
        } else {
            setForm({ name: '', unit: '', currentStock: 0, minStockLevel: 0, costPerUnit: 0 });
        }
    }, [ingredient, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...form, id: ingredient?.id || `ing_${Date.now()}` } as Ingredient);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[450px] animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">{ingredient ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อวัตถุดิบ</label>
                        <input className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">หน่วย (เช่น กก., ชิ้น)</label>
                            <input className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900" required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ต้นทุนต่อหน่วย</label>
                            <input type="number" step="0.01" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900" required value={form.costPerUnit} onChange={e => setForm({ ...form, costPerUnit: Number(e.target.value) })} />
                        </div>
                    </div>
                    {!ingredient && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนตั้งต้น</label>
                            <input type="number" step="any" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900" value={form.currentStock} onChange={e => setForm({ ...form, currentStock: Number(e.target.value) })} />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">แจ้งเตือนเมื่อต่ำกว่า (Min Level)</label>
                        <input type="number" step="any" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900" value={form.minStockLevel} onChange={e => setForm({ ...form, minStockLevel: Number(e.target.value) })} />
                    </div>

                    <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-slate-800 mt-2 flex items-center justify-center gap-2">
                        <Save size={18} /> บันทึก
                    </button>
                </form>
            </div>
        </div>
    );
};

const StockAdjustModal = ({ isOpen, onClose, ingredient, onSave }: any) => {
    const [amount, setAmount] = useState<number | ''>('');
    const [reason, setReason] = useState('');
    const [type, setType] = useState<'ADD' | 'REMOVE'>('ADD');

    if (!isOpen || !ingredient) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof amount === 'number') {
            const finalStock = type === 'ADD' ? ingredient.currentStock + amount : ingredient.currentStock - amount;
            onSave({
                ...ingredient,
                currentStock: Math.max(0, finalStock),
                lastLog: reason || (type === 'ADD' ? 'ปรับเพิ่มสต็อก' : 'ปรับลดสต็อก')
            });
            setAmount('');
            setReason('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">ปรับสต็อก: {ingredient.name}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex justify-center mb-6 bg-slate-100 p-4 rounded-xl">
                    <div className="text-center">
                        <p className="text-sm text-slate-500 mb-1">คงเหลือปัจจุบัน</p>
                        <p className="text-3xl font-bold text-slate-800">{ingredient.currentStock} <span className="text-sm font-normal text-slate-500">{ingredient.unit}</span></p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
                        <button type="button" onClick={() => setType('ADD')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${type === 'ADD' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}>
                            เพิ่ม (+)
                        </button>
                        <button type="button" onClick={() => setType('REMOVE')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${type === 'REMOVE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>
                            ลด (-)
                        </button>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนที่{type === 'ADD' ? 'เพิ่ม' : 'ลด'}</label>
                        <input
                            type="number"
                            step="any"
                            autoFocus
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent text-lg font-bold text-center bg-white text-slate-900"
                            value={amount}
                            onChange={e => setAmount(Number(e.target.value))}
                            placeholder="0"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ (Reason)</label>
                        <div className="relative">
                            <FilePenLine className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900 text-sm"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder={`เช่น ${type === 'ADD' ? 'ซื้อเพิ่ม, รับของเข้า' : 'ของเสีย, ใช้ทดสอบ'}`}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 ${type === 'ADD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                        ยืนยันการ{type === 'ADD' ? 'เพิ่ม' : 'ลด'}สต็อก
                    </button>
                </form>
            </div>
        </div>
    );
};

const TableMap = ({
    onSelectTable,
    onTabChange,
    onTakeaway,
    onDeliveryStart
}: {
    onSelectTable: (id: string) => void,
    onTabChange: (tab: string) => void,
    onTakeaway: () => void,
    onDeliveryStart: (platform: string, orderRef?: string) => void
}) => {
    const [tables, setTables] = useState(dataService.getTables());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [qrTable, setQrTable] = useState<Table | null>(null);
    const [qrTimestamp, setQrTimestamp] = useState<Date | null>(null);
    const [isQrSettingsOpen, setIsQrSettingsOpen] = useState(false);
    const [qrBaseUrl, setQrBaseUrl] = useState('');
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [moveFromTable, setMoveFromTable] = useState<Table | null>(null);
    const [moveToTableId, setMoveToTableId] = useState<string>('');

    // NEW: Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingTable, setEditingTable] = useState<Table | null>(null);

    // Delivery Modal States
    const [deliveryStep, setDeliveryStep] = useState<'PLATFORM' | 'ORDER_NO'>('PLATFORM');
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [deliveryRef, setDeliveryRef] = useState('');

    const [newTableName, setNewTableName] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(4);

    // Edit Form State
    const [editName, setEditName] = useState('');
    const [editCapacity, setEditCapacity] = useState(0);

    // Table Actions
    const handleUpdateTableStatus = (e: React.MouseEvent, table: Table, newStatus: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED') => {
        e.stopPropagation();

        // If clearing an occupied table, confirm first
        if (table.status === 'OCCUPIED' && newStatus === 'AVAILABLE') {
            if (!confirm(`โต๊ะ ${table.name} กำลังใช้งานอยู่ คุณต้องการเคลียร์โต๊ะหรือไม่?`)) {
                return;
            }
        }

        const updatedTable = { ...table, status: newStatus };
        if (newStatus === 'AVAILABLE') {
            updatedTable.currentOrderId = undefined;
        }

        dataService.updateTable(updatedTable);
        setTables([...dataService.getTables()]); // Refresh
        void syncTablesToSupabase([updatedTable]);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setTables([...dataService.getTables()]);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleEditTableClick = (e: React.MouseEvent, table: Table) => {
        e.stopPropagation();
        handleEditTableInit(table);
    };

    const handleAddTable = (e: React.FormEvent) => {
        e.preventDefault();
        const newTable: Table = {
            id: `t_${Date.now()}`,
            name: newTableName || `โต๊ะ ${tables.length + 1}`,
            status: 'AVAILABLE',
            capacity: newTableCapacity
        };
        dataService.addTable(newTable);
        setTables([...dataService.getTables()]);
        void syncTablesToSupabase([newTable]);
        setIsModalOpen(false);
        setNewTableName('');
        setNewTableCapacity(4);
    };

    const handleEditTableInit = (table: Table) => {
        setEditingTable(table);
        setEditName(table.name);
        setEditCapacity(table.capacity);
    };

    const handleUpdateTable = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTable) {
            const updatedTable = { ...editingTable, name: editName, capacity: editCapacity };
            dataService.updateTable(updatedTable);
            setTables([...dataService.getTables()]);
            void syncTablesToSupabase([updatedTable]);
            setEditingTable(null);
        }
    };

    const handleDeleteTable = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('คุณต้องการลบโต๊ะนี้ใช่หรือไม่? หากลบแล้วข้อมูลออเดอร์ปัจจุบันบนโต๊ะนี้ (ถ้ามี) จะหายไป')) {
            dataService.deleteTable(id);
            setTables([...dataService.getTables()]);
            if (isSupabaseConfigured && supabase) {
                void supabase.from('tables').delete().eq('id', id);
            }
        }
    };

    const handleMoveTableClick = (e: React.MouseEvent, table: Table) => {
        e.stopPropagation();
        if (!table.currentOrderId) {
            alert('โต๊ะนี้ยังไม่มีออเดอร์ที่กำลังใช้งาน');
            return;
        }
        setMoveFromTable(table);
        setMoveToTableId('');
        setIsMoveModalOpen(true);
    };

    const handleConfirmMove = () => {
        if (!moveFromTable || !moveFromTable.currentOrderId) return;
        if (!moveToTableId) {
            alert('กรุณาเลือกโต๊ะปลายทาง');
            return;
        }
        const targetTable = dataService.getTable(moveToTableId);
        if (!targetTable) {
            alert('ไม่พบโต๊ะปลายทาง');
            return;
        }
        if (targetTable.currentOrderId) {
            alert('โต๊ะปลายทางมีออเดอร์อยู่แล้ว');
            return;
        }

        const order = dataService.getOrder(moveFromTable.currentOrderId);
        if (order) {
            dataService.updateOrder({ ...order, tableId: targetTable.id });
        }

        dataService.updateTable({
            ...moveFromTable,
            status: 'AVAILABLE',
            currentOrderId: undefined
        });
        dataService.updateTable({
            ...targetTable,
            status: 'OCCUPIED',
            currentOrderId: moveFromTable.currentOrderId
        });
        setTables([...dataService.getTables()]);
        void syncTablesToSupabase([moveFromTable, { ...targetTable, status: 'OCCUPIED', currentOrderId: moveFromTable.currentOrderId }]);
        setIsMoveModalOpen(false);
        setMoveFromTable(null);
        setMoveToTableId('');
    };

    useEffect(() => {
        const savedBaseUrl = localStorage.getItem('omnipos_qr_base_url');
        if (savedBaseUrl) {
            setQrBaseUrl(savedBaseUrl);
        } else {
            setQrBaseUrl(`${window.location.origin}${window.location.pathname}`);
        }
    }, []);

    useEffect(() => {
        const syncTableTokensWithSupabase = async () => {
            if (!isSupabaseConfigured || !supabase) return;
            const { data, error } = await supabase
                .from('tables')
                .select('id, qr_token');
            if (error || !data) return;

            const supabaseTokens = new Map<string, string | null>();
            data.forEach((row: any) => {
                supabaseTokens.set(row.id, row.qr_token ?? null);
            });

            const localTables = dataService.getTables();
            const updates: Table[] = [];
            const upserts: { id: string; qr_token: string }[] = [];

            localTables.forEach(table => {
                const remoteToken = supabaseTokens.get(table.id) ?? null;
                if (remoteToken) {
                    if (table.qrToken !== remoteToken) {
                        updates.push({ ...table, qrToken: remoteToken });
                    }
                } else if (table.qrToken) {
                    upserts.push({ id: table.id, qr_token: table.qrToken });
                }
            });

            updates.forEach(table => dataService.updateTable(table));
            if (updates.length > 0) {
                setTables([...dataService.getTables()]);
            }

            if (upserts.length > 0) {
                await supabase.from('tables').upsert(upserts, { onConflict: 'id' });
            }
        };

        void syncTableTokensWithSupabase();
    }, []);

    const normalizeBaseUrl = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
    };

    const escapeHtml = (value: string) => {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const buildTableOrderUrl = (tableId: string) => {
        const baseUrl = normalizeBaseUrl(qrBaseUrl) || `${window.location.origin}${window.location.pathname}`;
        const table = dataService.getTable(tableId);
        const url = new URL(baseUrl);
        url.searchParams.set('mode', 'customer');
        url.searchParams.set('table', tableId);
        if (table?.qrToken) {
            url.searchParams.set('token', table.qrToken);
        } else {
            url.searchParams.delete('token');
        }
        url.searchParams.delete('tableId');
        url.searchParams.delete('customer');
        return url.toString();
    };

    const syncTablesToSupabase = async (targetTables: Table[]) => {
        if (!isSupabaseConfigured || !supabase) return;
        const payload = targetTables.map(table => ({
            id: table.id,
            name: table.name,
            status: table.status,
            capacity: table.capacity,
            current_order_id: table.currentOrderId || null,
            qr_token: table.qrToken || null
        }));
        await supabase.from('tables').upsert(payload, { onConflict: 'id' });
    };

    const getQrImageUrl = (tableId: string) => {
        const orderUrl = buildTableOrderUrl(tableId);
        return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(orderUrl)}`;
    };

    const handleOpenQr = (e: React.MouseEvent, table: Table) => {
        e.stopPropagation();
        setQrTable(table);
        setIsQrModalOpen(true);
        setQrTimestamp(new Date());
        void syncTablesToSupabase([table]);
    };

    const handlePrintQr = () => {
        if (!qrTable) return;
        const printedAt = qrTimestamp || new Date();
        const orderUrl = buildTableOrderUrl(qrTable.id);
        const escapedTableName = escapeHtml(qrTable.name);
        const escapedOrderUrl = escapeHtml(orderUrl);
        const qrImage = getQrImageUrl(qrTable.id);
        const printWindow = window.open('', '_blank', 'width=520,height=720');
        if (!printWindow) {
            alert('ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาอนุญาต pop-up');
            return;
        }
        printWindow.document.write(`
            <html>
                <head>
                    <title>QR โต๊ะ ${escapedTableName}</title>
                    <style>
                        @page { size: 58mm auto; margin: 4mm; }
                        body { font-family: Arial, sans-serif; padding: 0; margin: 0; }
                        .receipt { width: 58mm; text-align: center; }
                        h1 { font-size: 14px; margin: 6px 0; }
                        p { margin: 4px 0; font-size: 11px; color: #475569; }
                        .meta { font-size: 11px; color: #0f172a; }
                        img { margin: 8px auto; width: 52mm; height: 52mm; }
                        .divider { border-top: 1px dashed #cbd5f5; margin: 8px 0; }
                        .url { font-size: 9px; color: #94a3b8; word-break: break-all; }
                    </style>
                </head>
                <body>
                    <div class="receipt">
                        <h1>QR สั่งอาหาร</h1>
                        <div class="meta">โต๊ะ ${escapedTableName}</div>
                        <div class="meta">${printedAt.toLocaleString('th-TH')}</div>
                        <div class="divider"></div>
                        <img src="${qrImage}" alt="QR โต๊ะ ${escapedTableName}" />
                        <p>สแกนเพื่อสั่งอาหาร</p>
                        <p class="url">${escapedOrderUrl}</p>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const handlePrintAllQr = () => {
        if (tables.length === 0) return;
        const printedAt = new Date();
        const printWindow = window.open('', '_blank', 'width=520,height=720');
        if (!printWindow) {
            alert('ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาอนุญาต pop-up');
            return;
        }
        void syncTablesToSupabase(tables);
        const receiptsHtml = tables.map(table => {
            const orderUrl = buildTableOrderUrl(table.id);
            const qrImage = getQrImageUrl(table.id);
            const escapedTableName = escapeHtml(table.name);
            const escapedOrderUrl = escapeHtml(orderUrl);
            return `
                <div class="receipt">
                    <h1>QR สั่งอาหาร</h1>
                    <div class="meta">โต๊ะ ${escapedTableName}</div>
                    <div class="meta">${printedAt.toLocaleString('th-TH')}</div>
                    <div class="divider"></div>
                    <img src="${qrImage}" alt="QR โต๊ะ ${escapedTableName}" />
                    <p>สแกนเพื่อสั่งอาหาร</p>
                    <p class="url">${escapedOrderUrl}</p>
                </div>
                <div class="page-break"></div>
            `;
        }).join('');
        printWindow.document.write(`
            <html>
                <head>
                    <title>QR โต๊ะทั้งหมด</title>
                    <style>
                        @page { size: 58mm auto; margin: 4mm; }
                        body { font-family: Arial, sans-serif; padding: 0; margin: 0; }
                        .receipt { width: 58mm; text-align: center; }
                        h1 { font-size: 14px; margin: 6px 0; }
                        p { margin: 4px 0; font-size: 11px; color: #475569; }
                        .meta { font-size: 11px; color: #0f172a; }
                        img { margin: 8px auto; width: 52mm; height: 52mm; }
                        .divider { border-top: 1px dashed #cbd5f5; margin: 8px 0; }
                        .url { font-size: 9px; color: #94a3b8; word-break: break-all; }
                        .page-break { page-break-after: always; }
                    </style>
                </head>
                <body>
                    ${receiptsHtml}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const handleSaveQrBaseUrl = (e: React.FormEvent) => {
        e.preventDefault();
        const normalized = normalizeBaseUrl(qrBaseUrl);
        if (!normalized) {
            alert('กรุณากรอก URL ให้ถูกต้อง');
            return;
        }
        localStorage.setItem('omnipos_qr_base_url', normalized);
        setQrBaseUrl(normalized);
        setIsQrSettingsOpen(false);
    };

    const resetDeliveryModal = () => {
        setIsDeliveryModalOpen(false);
        setDeliveryStep('PLATFORM');
        setSelectedPlatform(null);
        setDeliveryRef('');
    };

    const handlePlatformSelect = (platform: string) => {
        setSelectedPlatform(platform);
        setDeliveryStep('ORDER_NO');
    };

    const handleDeliverySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPlatform) {
            const finalRef = deliveryRef.startsWith('#') ? deliveryRef : `#${deliveryRef}`;
            onDeliveryStart(selectedPlatform, finalRef);
            resetDeliveryModal();
        }
    };

    return (
        <div className="p-8 h-full bg-slate-50 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">จัดการโต๊ะ (Floor Plan)</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition-all ${isEditMode
                            ? 'bg-slate-800 text-white ring-2 ring-slate-300'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        {isEditMode ? <CheckCircle size={18} /> : <Edit size={18} />}
                        {isEditMode ? 'เสร็จสิ้น' : 'แก้ไขผัง'}
                    </button>
                    <button
                        onClick={() => setIsQrSettingsOpen(true)}
                        className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 shadow-sm"
                    >
                        <QrCode size={18} /> ตั้งค่า URL QR
                    </button>
                    <button
                        onClick={handlePrintAllQr}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 shadow-sm"
                    >
                        <Printer size={18} /> พิมพ์ QR ทั้งหมด
                    </button>
                    <button
                        onClick={onTakeaway}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm"
                    >
                        <ShoppingBag size={18} /> สั่งกลับบ้าน
                    </button>
                    <button
                        onClick={() => {
                            resetDeliveryModal();
                            setIsDeliveryModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 shadow-sm"
                    >
                        <Bike size={18} /> สั่งเดลิเวอรี่
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 shadow-sm"
                    >
                        <Plus size={18} /> เพิ่มโต๊ะ
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {tables.map(table => (
                    <div
                        key={table.id}
                        onClick={() => {
                            if (isEditMode) {
                                handleEditTableInit(table);
                            } else {
                                onSelectTable(table.id);
                            }
                        }}
                        className={`
                            h-32 rounded-2xl flex flex-col justify-between p-5 shadow-sm transition-all border relative group overflow-hidden
                            ${isEditMode
                                ? 'cursor-pointer border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 opacity-80'
                                : 'cursor-pointer hover:-translate-y-1 hover:shadow-md bg-white'
                            }
                            ${!isEditMode && table.status === 'AVAILABLE' ? 'border-slate-200 border-b-4 border-b-green-500' : ''}
                            ${!isEditMode && table.status === 'OCCUPIED' ? 'border-slate-200 border-b-4 border-b-red-500' : ''}
                            ${!isEditMode && table.status === 'RESERVED' ? 'border-slate-200 border-b-4 border-b-yellow-500' : ''}
                        `}
                    >
                        {/* Status Accents (Background Gradient) */}
                        {!isEditMode && (
                            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-5 pointer-events-none
                                ${table.status === 'AVAILABLE' ? 'bg-green-500' :
                                    table.status === 'OCCUPIED' ? 'bg-red-500' : 'bg-yellow-500'}`}
                            />
                        )}

                        {/* Delete Button (Only in Edit Mode) */}
                        {isEditMode && (
                            <button
                                onClick={(e) => handleDeleteTable(e, table.id)}
                                className="absolute top-2 right-2 bg-red-100 text-red-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-all z-10"
                                title="ลบโต๊ะ"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}

                        {/* Header: Name and Icon */}
                        <div className="flex justify-between items-start z-0">
                            <span className={`text-xl font-bold truncate ${table.status === 'OCCUPIED' && !isEditMode ? 'text-red-600' : 'text-slate-800'}`}>
                                {table.name}
                            </span>
                            {!isEditMode && (
                                <div className={`p-2 rounded-lg ${table.status === 'AVAILABLE' ? 'bg-green-50 text-green-600' :
                                    table.status === 'OCCUPIED' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                                    }`}>
                                    <Armchair size={18} />
                                </div>
                            )}
                        </div>

                        {/* Footer: Capacity, Status, and Action Buttons */}
                        <div className="flex justify-between items-end mt-2">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-2 py-1 rounded-md w-fit">
                                    <Users size={14} />
                                    <span className="text-xs font-bold">{table.capacity}</span>
                                </div>
                                {!isEditMode && (
                                    <div className="flex gap-1">
                                        {/* Reserve Button */}
                                        <button
                                            onClick={(e) => handleUpdateTableStatus(e, table, table.status === 'RESERVED' ? 'AVAILABLE' : 'RESERVED')}
                                            className={`p-1.5 rounded-lg border transition-colors ${table.status === 'RESERVED' ? 'bg-yellow-100 text-yellow-600 border-yellow-200' : 'bg-white text-slate-400 border-slate-200 hover:text-yellow-600 hover:border-yellow-300'
                                                }`}
                                            title={table.status === 'RESERVED' ? "ยกเลิกจอง" : "จองโต๊ะ"}
                                        >
                                            <Calendar size={14} />
                                        </button>

                                        {/* Edit Button */}
                                        <button
                                            onClick={(e) => handleEditTableClick(e, table)}
                                            className="p-1.5 rounded-lg border bg-white text-slate-400 border-slate-200 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                            title="แก้ไขข้อมูลโต๊ะ"
                                        >
                                            <Edit size={14} />
                                        </button>

                                        {/* QR Button */}
                                        <button
                                            onClick={(e) => handleOpenQr(e, table)}
                                            className="p-1.5 rounded-lg border bg-white text-slate-400 border-slate-200 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                                            title="พิมพ์ QR สั่งอาหาร"
                                        >
                                            <QrCode size={14} />
                                        </button>

                                        {/* Move Table Button */}
                                        <button
                                            onClick={(e) => handleMoveTableClick(e, table)}
                                            className="p-1.5 rounded-lg border bg-white text-slate-400 border-slate-200 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                                            title="ย้ายออเดอร์ไปโต๊ะอื่น"
                                        >
                                            <ArrowRight size={14} />
                                        </button>

                                        {/* Clear Button */}
                                        <button
                                            onClick={(e) => handleUpdateTableStatus(e, table, 'AVAILABLE')}
                                            className="p-1.5 rounded-lg border bg-white text-slate-400 border-slate-200 hover:text-red-600 hover:border-red-300 transition-colors"
                                            title="เคลียร์โต๊ะ (ว่าง)"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="text-right">
                                {isEditMode ? (
                                    <div className="flex items-center gap-1 text-orange-500 text-xs font-bold">
                                        <Edit size={12} />
                                        <span>แก้ไข</span>
                                    </div>
                                ) : (
                                    <>
                                        <p className={`text-sm font-bold ${table.status === 'AVAILABLE' ? 'text-green-600' :
                                            table.status === 'OCCUPIED' ? 'text-red-600' : 'text-yellow-600'
                                            }`}>
                                            {table.status === 'AVAILABLE' ? 'ว่าง' : table.status === 'OCCUPIED' ? 'ไม่ว่าง' : 'จองแล้ว'}
                                        </p>
                                        {table.status === 'OCCUPIED' && table.currentOrderId && (
                                            <p className="text-[10px] text-slate-400">Order #{dataService.getOrder(table.currentOrderId)?.orderNumber.slice(-4)}</p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Table Modal */}
            {editingTable && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-96 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">แก้ไขข้อมูลโต๊ะ</h3>
                            <button onClick={() => setEditingTable(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdateTable}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อโต๊ะ</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนที่นั่ง</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setEditCapacity(Math.max(1, editCapacity - 1))}
                                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <input
                                            type="number"
                                            className="w-20 text-center px-2 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900 font-bold"
                                            value={editCapacity}
                                            onChange={(e) => setEditCapacity(Number(e.target.value))}
                                            min="1"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setEditCapacity(editCapacity + 1)}
                                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 mt-2">
                                    บันทึกการแก้ไข
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Table Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-96">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">เพิ่มโต๊ะใหม่</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddTable}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อโต๊ะ</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                                        value={newTableName}
                                        onChange={(e) => setNewTableName(e.target.value)}
                                        placeholder="เช่น โต๊ะ 10"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนที่นั่ง</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                                        value={newTableCapacity}
                                        onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                                        min="1"
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-slate-800 mt-2">
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {isQrModalOpen && qrTable && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-[420px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">QR สั่งอาหาร • {qrTable.name}</h3>
                            <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <div
                                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
                                style={{ width: '58mm' }}
                            >
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 tracking-widest">QR สั่งอาหาร</p>
                                    <p className="text-sm font-bold text-slate-800 mt-1">โต๊ะ {qrTable.name}</p>
                                    <p className="text-[10px] text-slate-500">
                                        {(qrTimestamp || new Date()).toLocaleString('th-TH')}
                                    </p>
                                </div>
                                <div className="border-t border-dashed border-slate-300 my-3"></div>
                                <div className="flex flex-col items-center">
                                    <img
                                        src={getQrImageUrl(qrTable.id)}
                                        alt={`QR โต๊ะ ${qrTable.name}`}
                                        className="w-[52mm] h-[52mm]"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-2">สแกนเพื่อสั่งอาหาร</p>
                                    <p className="text-[9px] text-slate-400 break-all mt-1">
                                        {buildTableOrderUrl(qrTable.id)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handlePrintQr}
                                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700"
                            >
                                พิมพ์ใบเสร็จ QR สำหรับโต๊ะนี้
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isQrSettingsOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-[440px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">ตั้งค่า URL QR</h3>
                            <button onClick={() => setIsQrSettingsOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveQrBaseUrl} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Base URL สำหรับ QR</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                                    value={qrBaseUrl}
                                    onChange={(e) => setQrBaseUrl(e.target.value)}
                                    placeholder="เช่น https://your-domain.com/ หรือ https://your-domain.com/pos"
                                    required
                                />
                                <p className="text-xs text-slate-400 mt-2">
                                    ระบบจะต่อท้ายด้วย ?mode=customer&table=...
                                </p>
                            </div>
                            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800">
                                บันทึก
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isMoveModalOpen && moveFromTable && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-[420px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">ย้ายออเดอร์</h3>
                            <button onClick={() => setIsMoveModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="text-sm text-slate-600">
                                จากโต๊ะ: <span className="font-semibold text-slate-800">{moveFromTable.name}</span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">เลือกโต๊ะปลายทาง</label>
                                <select
                                    value={moveToTableId}
                                    onChange={(e) => setMoveToTableId(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                                >
                                    <option value="">-- เลือกโต๊ะ --</option>
                                    {tables
                                        .filter(t => t.id !== moveFromTable.id && !t.currentOrderId)
                                        .map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} ({t.status === 'AVAILABLE' ? 'ว่าง' : 'จอง'})
                                            </option>
                                        ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-2">แสดงเฉพาะโต๊ะว่างที่ยังไม่มีออเดอร์</p>
                            </div>
                            <button
                                onClick={handleConfirmMove}
                                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700"
                            >
                                ยืนยันย้ายโต๊ะ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delivery Platform Selection Modal */}
            {isDeliveryModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Bike size={24} className="text-orange-500" />
                                {deliveryStep === 'PLATFORM' ? 'เลือกช่องทาง' : 'ระบุออเดอร์'}
                            </h3>
                            <button onClick={resetDeliveryModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        {deliveryStep === 'PLATFORM' ? (
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={() => handlePlatformSelect('LINEMAN')}
                                    className="flex items-center p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-all group"
                                >
                                    <div className="w-12 h-12 bg-green-500 text-white rounded-lg flex items-center justify-center text-xl font-bold mr-4 shadow-sm group-hover:scale-105 transition-transform">L</div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-slate-800">LINE MAN</h4>
                                        <p className="text-xs text-slate-500">สร้างออเดอร์ใหม่</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handlePlatformSelect('GRAB')}
                                    className="flex items-center p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all group"
                                >
                                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xl font-bold mr-4 shadow-sm group-hover:scale-105 transition-transform">G</div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-slate-800">GrabFood</h4>
                                        <p className="text-xs text-slate-500">สร้างออเดอร์ใหม่</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handlePlatformSelect('SHOPEE')}
                                    className="flex items-center p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all group"
                                >
                                    <div className="w-12 h-12 bg-orange-500 text-white rounded-lg flex items-center justify-center text-xl font-bold mr-4 shadow-sm group-hover:scale-105 transition-transform">S</div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-slate-800">ShopeeFood</h4>
                                        <p className="text-xs text-slate-500">สร้างออเดอร์ใหม่</p>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleDeliverySubmit} className="animate-fade-in">
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        เลขที่ออเดอร์สำหรับ {selectedPlatform === 'LINEMAN' ? 'LINE MAN' : selectedPlatform === 'GRAB' ? 'GrabFood' : 'ShopeeFood'}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold text-lg">#</span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="ตัวอย่าง: 10234"
                                            value={deliveryRef}
                                            onChange={e => setDeliveryRef(e.target.value)}
                                            className="w-full pl-8 pr-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50 text-slate-900 font-medium text-lg"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDeliveryStep('PLATFORM')}
                                        className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                        <ChevronLeft size={18} /> ย้อนกลับ
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!deliveryRef}
                                        className="flex-[2] py-3 bg-primary text-white font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ยืนยันและเริ่มสั่ง
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const SettingsView = ({
    enableKDS,
    setEnableKDS,
    receiptConfig,
    setReceiptConfig,
    currentUser,
    printSettings,
    setPrintSettings,
    taxSettings,
    setTaxSettings,
    inventorySettings,
    setInventorySettings
}: {
    enableKDS: boolean,
    setEnableKDS: (val: boolean) => void,
    receiptConfig: ReceiptConfig,
    setReceiptConfig: React.Dispatch<React.SetStateAction<ReceiptConfig>>,
    currentUser: Staff,
    printSettings: PrintSettings,
    setPrintSettings: React.Dispatch<React.SetStateAction<PrintSettings>>,
    taxSettings: TaxSettings,
    setTaxSettings: React.Dispatch<React.SetStateAction<TaxSettings>>,
    inventorySettings: { enabled: boolean; lowStockThreshold: number; },
    setInventorySettings: React.Dispatch<React.SetStateAction<{ enabled: boolean; lowStockThreshold: number; }>>
}) => {
    const [activeMenu, setActiveMenu] = useState('STAFF');
    const [staffList, setStaffList] = useState(dataService.getAllStaff());
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

    // Refs for file uploads
    const logoInputRef = useRef<HTMLInputElement>(null);
    const footerInputRef = useRef<HTMLInputElement>(null);

    // Printer State
    const [printers, setPrinters] = useState<PrinterConfig[]>([
        { id: 'p1', name: 'แคชเชียร์หลัก', type: 'NETWORK', address: '192.168.1.200', connected: true, paperSize: '80mm', isCashier: true, isKitchen: false, assignedCategoryIds: [] },
        { id: 'p2', name: 'ครัวร้อน', type: 'NETWORK', address: '192.168.1.201', connected: true, paperSize: '80mm', isCashier: false, isKitchen: true, assignedCategoryIds: ['cat_1', 'cat_2'] }
    ]);
    const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null);

    const isAdmin = currentUser.role === Role.ADMIN;
    const categories = dataService.getCategories(); // Fetch categories for printer config

    const loadStaff = () => {
        setStaffList([...dataService.getAllStaff()]);
    };

    const handleSaveStaff = (staff: Staff) => {
        if (editingStaff) {
            dataService.updateStaff(staff);
        } else {
            dataService.addStaff(staff);
        }
        loadStaff();
    };

    const handleDeleteStaff = (id: string) => {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบพนักงานคนนี้?')) {
            dataService.deleteStaff(id);
            loadStaff();
        }
    };

    const handleSavePrinter = (printer: PrinterConfig) => {
        if (editingPrinter) {
            setPrinters(prev => prev.map(p => p.id === printer.id ? printer : p));
        } else {
            setPrinters(prev => [...prev, printer]);
        }
    };

    const handleDeletePrinter = (id: string) => {
        if (confirm('ยืนยันการลบเครื่องพิมพ์?')) {
            setPrinters(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'footerImageUrl') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceiptConfig(prev => ({ ...prev, [field]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const menuItems = [
        { id: 'GENERAL', label: 'พื้นฐาน (General)' },
        { id: 'PAYMENT', label: 'การชำระเงิน (Payment)' },
        { id: 'INVENTORY', label: 'คลังสินค้า (Stock)' },
        { id: 'STAFF', label: 'พนักงาน (Staff)' },
        { id: 'RECEIPT', label: 'รูปแบบใบเสร็จ (Receipt)' },
        { id: 'PRINTER', label: 'เครื่องพิมพ์ (Printer)' },
    ];

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-5 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 text-lg">การตั้งค่า</h2>
                </div>
                <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveMenu(item.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeMenu === item.id
                                ? 'bg-slate-100 text-slate-900 font-bold border-l-4 border-orange-500'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col">

                    {/* STAFF TAB */}
                    {activeMenu === 'STAFF' && (
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
                                <h2 className="text-xl font-bold text-slate-800">พนักงาน</h2>
                                {isAdmin && (
                                    <button
                                        onClick={() => { setEditingStaff(null); setIsStaffModalOpen(true); }}
                                        className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-orange-600 shadow-sm flex items-center gap-2 transition-all"
                                    >
                                        <Plus size={20} /> เพิ่มพนักงาน
                                    </button>
                                )}
                            </div>

                            <div className="space-y-0">
                                {staffList.map(staff => (
                                    <div key={staff.id} className="flex justify-between items-center p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-lg border border-slate-200">
                                                {staff.avatar || staff.name.substring(0, 2)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-base">{staff.name}</h3>
                                                <p className="text-slate-500 text-sm font-medium mt-0.5">
                                                    {staff.role === Role.ADMIN ? 'เจ้าของร้าน (Admin)' : staff.role === Role.MANAGER ? 'ผู้จัดการ (Manager)' : 'พนักงาน (Staff)'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 opacity-100">
                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => { setEditingStaff(staff); setIsStaffModalOpen(true); }}
                                                        className="px-6 py-2 rounded-lg border border-orange-500 text-orange-600 font-bold hover:bg-orange-50 transition-colors"
                                                    >
                                                        แก้ไข
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* INVENTORY TAB */}
                    {activeMenu === 'INVENTORY' && (
                        <div className="p-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">คลังสินค้า (Stock & Recipe)</h2>
                            <div className="space-y-6">
                                <div className="p-6 border border-slate-200 rounded-xl bg-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <Package size={20} className="text-primary" />
                                                ระบบตัดสต็อกจริง (Real-time Inventory)
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                เมื่อเปิดใช้งาน ระบบจะคำนวณจำนวนสินค้าที่ขายได้จากวัตถุดิบที่มี (Yield) <br />
                                                และตัดสต็อกเมื่อออเดอร์ถูกยืนยัน หากวัตถุดิบหมดจะไม่สามารถสั่งสินค้านั้นได้
                                            </p>
                                        </div>
                                        <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
                                            <input
                                                type="checkbox"
                                                checked={inventorySettings.enabled}
                                                onChange={(e) => setInventorySettings({ ...inventorySettings, enabled: e.target.checked })}
                                                id="toggleInv"
                                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-green-500 translate-x-0 checked:translate-x-6 transition-transform"
                                            />
                                            <label htmlFor="toggleInv" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${inventorySettings.enabled ? 'bg-green-500' : 'bg-slate-300'}`}></label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GENERAL TAB */}
                    {activeMenu === 'GENERAL' && (
                        <div className="p-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">พื้นฐาน (General)</h2>
                            <div className="space-y-6">
                                <div className="p-6 border border-slate-200 rounded-xl flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Monitor size={20} className="text-primary" />
                                            เปิดใช้งานจอภาพครัว (KDS)
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">แสดงเมนูสำหรับห้องครัวในแถบนำทาง เพื่อจัดการสถานะออเดอร์</p>
                                    </div>
                                    <button
                                        onClick={() => setEnableKDS(!enableKDS)}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${enableKDS ? 'bg-green-500' : 'bg-slate-300'}`}
                                    >
                                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${enableKDS ? 'translate-x-7' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PAYMENT TAB (TAX) */}
                    {activeMenu === 'PAYMENT' && (
                        <div className="p-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">การชำระเงิน (Payment)</h2>
                            <div className="space-y-6">
                                <div className="p-6 border border-slate-200 rounded-xl bg-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <Percent size={20} className="text-primary" />
                                                ภาษีมูลค่าเพิ่ม (VAT/Tax)
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">เปิดใช้งานเพื่อคำนวณภาษีท้ายใบเสร็จอัตโนมัติ</p>
                                        </div>
                                        <div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in">
                                            <input
                                                type="checkbox"
                                                checked={taxSettings.enabled}
                                                onChange={(e) => setTaxSettings({ ...taxSettings, enabled: e.target.checked })}
                                                id="toggleTax"
                                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-green-500 translate-x-0 checked:translate-x-6 transition-transform"
                                            />
                                            <label htmlFor="toggleTax" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${taxSettings.enabled ? 'bg-green-500' : 'bg-slate-300'}`}></label>
                                        </div>
                                    </div>

                                    {taxSettings.enabled && (
                                        <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-lg animate-fade-in border border-slate-200">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อเรียกภาษี (Label)</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white"
                                                    value={taxSettings.label}
                                                    onChange={e => setTaxSettings({ ...taxSettings, label: e.target.value })}
                                                />
                                            </div>
                                            <div className="w-32">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">อัตรา (%)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white"
                                                    value={taxSettings.rate}
                                                    onChange={e => setTaxSettings({ ...taxSettings, rate: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PRINTER TAB */}
                    {activeMenu === 'PRINTER' && (
                        <div className="p-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">การเชื่อมต่อเครื่องพิมพ์</h2>

                            {/* Printer List */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-slate-700">รายการเครื่องพิมพ์</h3>
                                    <button
                                        onClick={() => { setEditingPrinter(null); setIsPrinterModalOpen(true); }}
                                        className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-sm"
                                    >
                                        <Plus size={16} /> เพิ่มเครื่องพิมพ์
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {printers.map(p => (
                                        <div key={p.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${p.connected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <Printer size={28} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-slate-800 text-lg">{p.name}</div>
                                                        {p.type === 'BLUETOOTH' && <Bluetooth size={16} className="text-blue-500" />}
                                                        {p.type === 'NETWORK' && <Wifi size={16} className="text-green-500" />}
                                                        {p.type === 'USB' && <Usb size={16} className="text-slate-500" />}
                                                    </div>
                                                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{p.address || 'N/A'}</span>
                                                        <span>•</span>
                                                        <span>{p.paperSize}</span>
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
                                                        {p.isCashier && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">แคชเชียร์</span>}
                                                        {p.isKitchen && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold">ครัว/บาร์</span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    ({p.assignedCategoryIds.length > 0 ? `${p.assignedCategoryIds.length} หมวด` : 'ทุกหมวด'})
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {p.connected ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> เชื่อมต่ออยู่
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                                        <div className="w-2 h-2 rounded-full bg-slate-400"></div> ไม่ได้เชื่อมต่อ
                                                    </span>
                                                )}
                                                <button onClick={() => { setEditingPrinter(p); setIsPrinterModalOpen(true); }} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-slate-200 rounded-full transition-all"><Edit size={20} /></button>
                                                <button onClick={() => handleDeletePrinter(p.id)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-slate-200 rounded-full transition-all"><Trash2 size={20} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {printers.length === 0 && (
                                        <div className="p-8 text-center text-slate-400">
                                            ยังไม่มีเครื่องพิมพ์ในระบบ
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Print Configuration */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
                                        <div className="p-2 bg-orange-100 rounded-lg text-orange-500"><Sliders size={20} /></div>
                                        ตั้งค่าการพิมพ์อัตโนมัติ
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="text-sm font-medium text-slate-700">พิมพ์ใบเสร็จอัตโนมัติเมื่อชำระเงิน</span>
                                            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                                <input
                                                    type="checkbox"
                                                    checked={printSettings.autoPrintReceipt}
                                                    onChange={(e) => setPrintSettings({ ...printSettings, autoPrintReceipt: e.target.checked })}
                                                    id="toggle1"
                                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-green-500 translate-x-0 checked:translate-x-6 transition-transform"
                                                />
                                                <label htmlFor="toggle1" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${printSettings.autoPrintReceipt ? 'bg-green-500' : 'bg-slate-300'}`}></label>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="text-sm font-medium text-slate-700">พิมพ์ใบส่งครัวอัตโนมัติ</span>
                                            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                                <input
                                                    type="checkbox"
                                                    checked={printSettings.autoPrintKitchen}
                                                    onChange={(e) => setPrintSettings({ ...printSettings, autoPrintKitchen: e.target.checked })}
                                                    id="toggle2"
                                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-green-500 translate-x-0 checked:translate-x-6 transition-transform"
                                                />
                                                <label htmlFor="toggle2" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${printSettings.autoPrintKitchen ? 'bg-green-500' : 'bg-slate-300'}`}></label>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="text-sm font-medium text-slate-700">เปิดลิ้นชักเก็บเงินอัตโนมัติ</span>
                                            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                                <input
                                                    type="checkbox"
                                                    checked={printSettings.openCashDrawer}
                                                    onChange={(e) => setPrintSettings({ ...printSettings, openCashDrawer: e.target.checked })}
                                                    id="toggle3"
                                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-green-500 translate-x-0 checked:translate-x-6 transition-transform"
                                                />
                                                <label htmlFor="toggle3" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${printSettings.openCashDrawer ? 'bg-green-500' : 'bg-slate-300'}`}></label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-500"><FileText size={20} /></div>
                                        ทดสอบระบบ
                                    </h3>
                                    <div className="space-y-3 flex-1">
                                        <button className="w-full py-4 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                                            <Printer size={18} /> ทดสอบพิมพ์ใบเสร็จ (Test Receipt)
                                        </button>
                                        <button className="w-full py-4 bg-slate-50 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                                            <CreditCard size={18} /> ทดสอบเปิดลิ้นชัก (Test Cash Drawer)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RECEIPT TAB */}
                    {activeMenu === 'RECEIPT' && (
                        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-6">รูปแบบใบเสร็จ</h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อร้าน (Header Text)</label>
                                        <input
                                            type="text"
                                            value={receiptConfig.headerText}
                                            onChange={(e) => setReceiptConfig({ ...receiptConfig, headerText: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                                            placeholder="ชื่อร้านอาหารของคุณ"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">ที่อยู่ร้าน (Address)</label>
                                        <textarea
                                            value={receiptConfig.address}
                                            onChange={(e) => setReceiptConfig({ ...receiptConfig, address: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900 min-h-[80px]"
                                            placeholder="123 ถนนสุขุมวิท, กรุงเทพมหานคร&#10;โทร: 02-123-4567"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">โลโก้ร้าน (Logo Image)</label>
                                        <div
                                            onClick={() => logoInputRef.current?.click()}
                                            className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-accent bg-slate-50 flex flex-col items-center justify-center h-32 rounded-xl relative overflow-hidden group transition-all"
                                        >
                                            {receiptConfig.logoUrl ? (
                                                <img src={receiptConfig.logoUrl} alt="Logo Preview" className="h-full object-contain" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400">
                                                    <Upload size={24} className="mb-2" />
                                                    <span className="text-xs">คลิกเพื่ออัพโหลดรูปภาพ</span>
                                                </div>
                                            )}
                                            {receiptConfig.logoUrl && (
                                                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">
                                                    เปลี่ยนรูปภาพ
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            ref={logoInputRef}
                                            onChange={(e) => handleImageUpload(e, 'logoUrl')}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">ข้อความท้ายใบเสร็จ (Footer Text)</label>
                                        <input
                                            type="text"
                                            value={receiptConfig.footerText}
                                            onChange={(e) => setReceiptConfig({ ...receiptConfig, footerText: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                                            placeholder="ขอบคุณที่ใช้บริการ"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">รูปท้ายใบเสร็จ (Footer Image)</label>
                                        <div
                                            onClick={() => footerInputRef.current?.click()}
                                            className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-accent bg-slate-50 flex flex-col items-center justify-center h-24 rounded-xl relative overflow-hidden group transition-all"
                                        >
                                            {receiptConfig.footerImageUrl ? (
                                                <img src={receiptConfig.footerImageUrl} alt="Footer Preview" className="h-full object-contain" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400">
                                                    <Upload size={20} className="mb-2" />
                                                    <span className="text-xs">คลิกเพื่ออัพโหลดรูปภาพ (QR Code / Promotion)</span>
                                                </div>
                                            )}
                                            {receiptConfig.footerImageUrl && (
                                                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">
                                                    เปลี่ยนรูปภาพ
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            ref={footerInputRef}
                                            onChange={(e) => handleImageUpload(e, 'footerImageUrl')}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="bg-slate-100 p-6 rounded-xl flex justify-center items-start sticky top-0">
                                <div className="w-[300px] bg-white shadow-lg text-slate-800 text-sm font-sans leading-relaxed relative transition-all overflow-hidden">
                                    {/* Paper Effect */}
                                    <div className="h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>

                                    <div className="p-6 pt-6">
                                        {/* Logo */}
                                        {receiptConfig.logoUrl ? (
                                            <div className="flex justify-center mb-4">
                                                <img src={receiptConfig.logoUrl} alt="Shop Logo" className="max-h-20 object-contain" />
                                            </div>
                                        ) : (
                                            <div className="h-12 w-full bg-slate-50 mb-4 flex items-center justify-center text-slate-400 text-[10px] italic border border-dashed border-slate-200 rounded">
                                                [พื้นที่โลโก้]
                                            </div>
                                        )}

                                        {/* Header */}
                                        <div className="text-center mb-6">
                                            <h2 className="text-xl font-bold mb-1 text-slate-900">{receiptConfig.headerText}</h2>
                                            <p className="text-xs text-slate-500 whitespace-pre-wrap">{receiptConfig.address || 'ที่อยู่ร้าน...'}</p>
                                        </div>

                                        {/* Divider */}
                                        <div className="border-b-2 border-dashed border-slate-200 my-4"></div>

                                        {/* Meta */}
                                        <div className="flex justify-between text-xs mb-2 text-slate-600">
                                            <span>โต๊ะ: T-05</span>
                                            <span>25/10/2023 18:30</span>
                                        </div>
                                        <div className="flex justify-between text-xs mb-4 text-slate-600">
                                            <span>ใบเสร็จ: #10045</span>
                                            <span>แคชเชียร์: สมชาย</span>
                                        </div>

                                        {/* Divider */}
                                        <div className="border-b-2 border-dashed border-slate-200 my-4"></div>

                                        {/* Items */}
                                        <div className="space-y-2 mb-4">
                                            <div className="flex justify-between">
                                                <span>1 x ชีสเบอร์เกอร์</span>
                                                <span className="font-bold">180.00</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>2 x คราฟต์เบียร์</span>
                                                <span className="font-bold">440.00</span>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="border-b-2 border-dashed border-slate-200 my-4"></div>

                                        {/* Total */}
                                        <div className="space-y-1 mb-2 text-slate-600">
                                            <div className="flex justify-between">
                                                <span>รวมเป็นเงิน</span>
                                                <span>620.00</span>
                                            </div>
                                            {/* Tax Preview Logic */}
                                            {taxSettings.enabled && (
                                                <div className="flex justify-between text-xs">
                                                    <span>{taxSettings.label} ({taxSettings.rate}%)</span>
                                                    <span>{(620 * (taxSettings.rate / 100)).toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between text-lg font-bold mb-2 text-slate-900">
                                            <span>ยอดสุทธิ</span>
                                            <span>{(620 + (taxSettings.enabled ? 620 * (taxSettings.rate / 100) : 0)).toFixed(2)}</span>
                                        </div>

                                        {/* Divider */}
                                        <div className="border-b-2 border-dashed border-slate-200 my-4"></div>

                                        {/* Footer Text */}
                                        <div className="text-center text-xs mb-4 text-slate-500">
                                            <p>{receiptConfig.footerText}</p>
                                        </div>

                                        {/* Footer Image */}
                                        {receiptConfig.footerImageUrl ? (
                                            <div className="flex justify-center mt-4">
                                                <img src={receiptConfig.footerImageUrl} alt="Footer Promotion" className="max-h-24 object-contain" />
                                            </div>
                                        ) : (
                                            <div className="h-16 w-full bg-slate-50 mt-4 flex items-center justify-center text-slate-400 text-[10px] italic border border-dashed border-slate-200 rounded">
                                                [พื้นที่รูปท้ายบิล]
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <StaffFormModal
                    isOpen={isStaffModalOpen}
                    onClose={() => setIsStaffModalOpen(false)}
                    staff={editingStaff}
                    onSave={handleSaveStaff}
                />

                <PrinterFormModal
                    isOpen={isPrinterModalOpen}
                    onClose={() => setIsPrinterModalOpen(false)}
                    printer={editingPrinter}
                    onSave={handleSavePrinter}
                    categories={categories}
                />
            </div>
        </div >
    );
};

const ShiftModal = ({
    isOpen,
    type,
    shift,
    onConfirm,
    onClose
}: {
    isOpen: boolean,
    type: 'OPEN' | 'CLOSE',
    shift?: Shift,
    onConfirm: (amount: number, notes?: string) => void,
    onClose: () => void
}) => {
    const [amount, setAmount] = useState<string>('');
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-md">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-[480px] animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3 text-slate-800">
                        <div className={`p-3 rounded-xl ${type === 'OPEN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {type === 'OPEN' ? <Lock size={28} /> : <Unlock size={28} />}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">{type === 'OPEN' ? 'เปิดกะ / เริ่มงาน' : 'ปิดกะ / สรุปยอด'}</h3>
                            <p className="text-slate-500 text-sm mt-0.5">{type === 'OPEN' ? 'กรุณาระบุเงินทอนเริ่มต้น' : 'ตรวจสอบเงินในลิ้นชักและสรุปยอด'}</p>
                        </div>
                    </div>
                </div>

                {type === 'CLOSE' && shift && (
                    <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-100">
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                                <p className="text-slate-500 mb-1">เริ่มกะเมื่อ</p>
                                <p className="font-bold text-slate-800">{new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-1">พนักงาน</p>
                                <p className="font-bold text-slate-800">{shift.staffName}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-slate-600">
                                <span>เงินทอนเริ่มต้น</span>
                                <span>฿{shift.startingCash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>ยอดขายเงินสด</span>
                                <span className="text-green-600 font-bold">+฿{shift.totalCashSales.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-lg text-slate-800">
                                <span>ยอดเงินที่ควรมี</span>
                                <span>฿{shift.expectedCash.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            {type === 'OPEN' ? 'ระบุเงินทอนเริ่มต้น (บาท)' : 'ระบุเงินสดที่มีจริง (บาท)'}
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-slate-400 font-bold">฿</span>
                            <input
                                type="number"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-xl font-bold text-slate-900 bg-white"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            หมายเหตุ (ถ้ามี)
                        </label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 bg-white resize-none h-24"
                            placeholder={type === 'OPEN' ? "เช่น ตรวจสอบลิ้นชักแล้ว" : "ระบุสาเหตุหากยอดเงินไม่ตรง"}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {type === 'CLOSE' && Number(amount) > 0 && shift && (
                        <div className={`flex justify-between items-center p-3 rounded-lg text-sm font-bold ${Number(amount) === shift.expectedCash ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            <span>ผลต่าง (Difference)</span>
                            <span>
                                {Number(amount) - shift.expectedCash > 0 ? '+' : ''}
                                {(Number(amount) - shift.expectedCash).toLocaleString()}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        {type === 'CLOSE' && (
                            <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                                ยกเลิก
                            </button>
                        )}
                        <button
                            onClick={() => onConfirm(Number(amount), notes)}
                            disabled={!amount}
                            className={`flex-[2] py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${!amount ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
                        >
                            {type === 'OPEN' ? 'ยืนยันเปิดกะ' : 'ยืนยันปิดกะ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [currentTab, setCurrentTab] = useState('pos');
    const [currentUser, setCurrentUser] = useState<Staff | null>(null);
    const [isPinLoginOpen, setIsPinLoginOpen] = useState(false);
    const [showKDS, setShowKDS] = useState(false);
    const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>({
        logoUrl: '',
        footerImageUrl: '',
        headerText: 'ร้านอาหาร Laothini',
        footerText: 'ขอบคุณที่ใช้บริการ',
        address: '123 ถนนสุขุมวิท, กรุงเทพมหานคร\nโทร: 02-123-4567'
    });
    const [printSettings, setPrintSettings] = useState<PrintSettings>({
        autoPrintReceipt: true,
        autoPrintKitchen: true,
        openCashDrawer: true
    });

    // Tax Settings State
    const [taxSettings, setTaxSettings] = useState<TaxSettings>({
        enabled: true,
        rate: 7,
        label: 'ภาษี (VAT)'
    });

    // Inventory Settings State
    const [inventorySettings, setInventorySettings] = useState<{ enabled: boolean; lowStockThreshold: number; }>({
        enabled: true,
        lowStockThreshold: 20
    });

    const searchParams = new URLSearchParams(window.location.search);
    const customerTableId = searchParams.get('table') || searchParams.get('tableId');
    const customerToken = searchParams.get('token');
    const isCustomerMode = searchParams.get('mode') === 'customer'
        || searchParams.get('customer') === '1'
        || !!customerTableId;

    // Table Selection State
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [currentOrderId, setCurrentOrderId] = useState<string | null>(null); // For editing active orders
    const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
    const [deliveryPlatform, setDeliveryPlatform] = useState<string | null>(null);
    const [deliveryOrderNumber, setDeliveryOrderNumber] = useState<string | null>(null);

    // Shift State
    const [currentShift, setCurrentShift] = useState<Shift | undefined>(undefined);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [shiftModalType, setShiftModalType] = useState<'OPEN' | 'CLOSE'>('OPEN');

    useEffect(() => {
        // Load active shift on mount/login
        const openShift = dataService.getOpenShift();
        setCurrentShift(openShift);
        if (currentUser && !openShift) {
            // If logged in but no shift, prompt open
            setShiftModalType('OPEN');
            setIsShiftModalOpen(true);
        }
    }, [currentUser]);

    const handleOpenShift = (amount: number, notes?: string) => {
        if (!currentUser) return;
        const newShift = dataService.startShift(currentUser, amount);
        setCurrentShift(newShift);
        setIsShiftModalOpen(false);
    };

    const handleCloseShift = (amount: number, notes?: string) => {
        const closedShift = dataService.closeShift(amount, notes);
        setCurrentShift(undefined); // No active shift
        setIsShiftModalOpen(false);
        // Optionally show summary or logout
        handleLogout();
    };

    // Manager Verification State
    const [isVerifyManagerOpen, setIsVerifyManagerOpen] = useState(false);
    const [verifyManagerCallback, setVerifyManagerCallback] = useState<(() => void) | null>(null);

    const handleLogin = (staff: Staff) => {
        setCurrentUser(staff);
        setIsPinLoginOpen(false);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentTab('pos');
        setSelectedTableId(null);
        setCurrentOrderId(null);
        if (isSupabaseConfigured && supabase) {
            supabase.auth.signOut();
        }
    };

    const loadSupabaseProfile = async (userId: string) => {
        if (!supabase) return;
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id,name,role,permissions')
            .eq('id', userId)
            .maybeSingle();
        if (error || !profile) return;
        const roleValue = Object.values(Role).includes(profile.role as Role)
            ? (profile.role as Role)
            : Role.STAFF;
        const staff: Staff = {
            id: profile.id,
            name: profile.name || 'Staff',
            role: roleValue,
            pin: '',
            avatar: (profile.name || 'ST').slice(0, 2).toUpperCase(),
            permissions: profile.permissions || []
        };
        setCurrentUser(staff);
    };

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;
        supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) {
                loadSupabaseProfile(data.session.user.id);
            }
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                loadSupabaseProfile(session.user.id);
            } else {
                setCurrentUser(null);
            }
        });
        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!isSupabaseConfigured) return;
        let isMounted = true;
        const syncOrders = async () => {
            try {
                const orders = await getRecentOrdersWithItems(200);
                if (isMounted) {
                    dataService.setOrdersFromExternal(orders);
                }
            } catch (err) {
                console.warn('Failed to sync orders from Supabase', err);
            }
        };

        syncOrders();
        const interval = setInterval(syncOrders, 3000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    // Handler when user clicks a table
    const handleTableSelect = (tableId: string) => {
        setSelectedTableId(tableId);
        setCurrentOrderId(null);
        setOrderType(OrderType.DINE_IN);
        setDeliveryPlatform(null);
        setDeliveryOrderNumber(null);
        setCurrentTab('pos');
    };

    const handleTakeaway = () => {
        setSelectedTableId(null);
        setCurrentOrderId(null);
        setOrderType(OrderType.TAKEAWAY);
        setDeliveryPlatform(null);
        setDeliveryOrderNumber(null);
        setCurrentTab('pos');
    };

    const handleDeliveryStart = (platform: string, orderRef?: string) => {
        setSelectedTableId(null);
        setCurrentOrderId(null);
        setOrderType(OrderType.DELIVERY);
        setDeliveryPlatform(platform);
        setDeliveryOrderNumber(orderRef || null);
        setCurrentTab('pos');
    };

    const handleOpenOrder = (order: Order) => {
        setCurrentOrderId(order.id);
        setSelectedTableId(order.tableId || null);
        setOrderType(order.type);
        setDeliveryPlatform(order.deliveryPlatform || null);
        setDeliveryOrderNumber(order.orderNumber);
        setCurrentTab('pos');
    };

    const handleCreateOrder = (items: OrderItem[], total: number, status: OrderStatus = OrderStatus.CONFIRMED, taxAmount: number = 0, subtotal: number = 0, paymentMethod?: PaymentMethod, discountAmount: number = 0) => {
        // Logic for updating existing orders
        const targetOrderId = currentOrderId || (selectedTableId ? dataService.getTable(selectedTableId)?.currentOrderId : undefined);

        if (targetOrderId) {
            const existingOrder = dataService.getOrder(targetOrderId);
            if (existingOrder) {
                // Update existing order
                const updatedOrder: Order = {
                    ...existingOrder,
                    items: items,
                    subtotal: subtotal || (total / (1 + (taxSettings.enabled ? taxSettings.rate / 100 : 0))), // Fallback calc if not passed
                    tax: taxAmount,
                    discount: discountAmount,
                    total: total,
                    paymentMethod: paymentMethod || existingOrder.paymentMethod
                };

                // If status is becoming COMPLETED (Payment), finalize it
                if (status === OrderStatus.COMPLETED) {
                    updatedOrder.status = OrderStatus.COMPLETED;
                    dataService.updateOrder(updatedOrder);
                    dataService.updateOrderStatus(updatedOrder.id, OrderStatus.COMPLETED); // Triggers stock deduct/table free
                    alert(`ชำระเงินออเดอร์ ${updatedOrder.orderNumber} เรียบร้อย (${paymentMethod || updatedOrder.paymentMethod})`);
                } else {
                    dataService.updateOrder(updatedOrder);
                    alert(`อัปเดตออเดอร์ ${updatedOrder.orderNumber} เรียบร้อย`);
                }

                // Reset state
                setSelectedTableId(null);
                setCurrentOrderId(null);
                return;
            }
        }

        // Generate Order Number: Use Delivery Reference if available, else Generate Random
        const finalOrderNumber = (orderType === OrderType.DELIVERY && deliveryOrderNumber)
            ? deliveryOrderNumber
            : `#${Math.floor(Math.random() * 1000) + 1000}`;

        // Create New Order
        const newOrder: Order = {
            id: `ord_${Date.now()}`,
            orderNumber: finalOrderNumber,
            type: selectedTableId ? OrderType.DINE_IN : orderType, // Use specific type
            status: status, // Use passed status
            items: items,
            subtotal: subtotal || (total / (1 + (taxSettings.enabled ? taxSettings.rate / 100 : 0))),
            tax: taxAmount,
            discount: discountAmount,
            total: total,
            createdAt: new Date(),
            paymentMethod: paymentMethod || PaymentMethod.CASH,
            tableId: selectedTableId || undefined,
            deliveryPlatform: deliveryPlatform as any
        };
        dataService.createOrder(newOrder);

        // If created as COMPLETED immediately
        if (status === OrderStatus.COMPLETED) {
            dataService.updateOrderStatus(newOrder.id, OrderStatus.COMPLETED);
        }

        if (status === OrderStatus.COMPLETED) {
            alert(`รับชำระเงินเรียบร้อย (${paymentMethod})`);
        } else {
            alert(`สร้างออเดอร์ ${newOrder.orderNumber} สำเร็จ!`);
        }
        setSelectedTableId(null);
        setCurrentOrderId(null);
        // Reset delivery state
        setDeliveryPlatform(null);
        setDeliveryOrderNumber(null);
    };

    const handleVerifyManager = (onSuccess: () => void) => {
        if (isSupabaseConfigured && currentUser && currentUser.role !== Role.STAFF) {
            onSuccess();
            return;
        }
        setVerifyManagerCallback(() => onSuccess);
        setIsVerifyManagerOpen(true);
    };

    const onVerifyManagerSuccess = () => {
        if (verifyManagerCallback) verifyManagerCallback();
        setIsVerifyManagerOpen(false);
        setVerifyManagerCallback(null);
    };

    if (isCustomerMode) {
        return (
            <CustomerOrderView
                tableId={customerTableId}
                tableToken={customerToken}
                taxSettings={taxSettings}
            />
        );
    }

    if (!currentUser) {
        return (
            <>
                {isSupabaseConfigured ? (
                    <>
                        <EmailLoginModal
                            isOpen={!isPinLoginOpen}
                            onClose={() => { }}
                            onSuccess={handleLogin}
                            onUsePin={() => setIsPinLoginOpen(true)}
                        />
                        <PinModal
                            isOpen={isPinLoginOpen}
                            onClose={() => setIsPinLoginOpen(false)}
                            onSuccess={handleLogin}
                            title="เข้าสู่ระบบ Laothini"
                        />
                    </>
                ) : (
                    <PinModal
                        isOpen={true}
                        onClose={() => { }}
                        onSuccess={handleLogin}
                        title="เข้าสู่ระบบ Laothini"
                    />
                )}
            </>
        );
    }

    return (
        <div className="flex h-screen bg-slate-900 font-kanit overflow-hidden">
            <Sidebar
                currentTab={currentTab}
                setTab={(tab) => {
                    if (tab === 'pin') handleLogout();
                    else {
                        setCurrentTab(tab);
                        // Clear selections if moving away from POS
                        if (tab !== 'pos') {
                            setSelectedTableId(null);
                            setCurrentOrderId(null);
                        }
                    }
                }}
                showKDS={showKDS}
                currentUser={currentUser}
                currentShift={currentShift}
                onToggleShift={() => {
                    setShiftModalType(currentShift ? 'CLOSE' : 'OPEN');
                    setIsShiftModalOpen(true);
                }}
            />

            <main className="flex-1 bg-slate-100 rounded-l-3xl overflow-hidden shadow-2xl relative">
                <PinModal
                    isOpen={isVerifyManagerOpen}
                    onClose={() => setIsVerifyManagerOpen(false)}
                    onSuccess={onVerifyManagerSuccess}
                    title="ยืนยันสิทธิ์ผู้จัดการ"
                    requiredRole={Role.MANAGER}
                />

                {currentTab === 'tables' && (
                    <TableMap
                        onSelectTable={handleTableSelect}
                        onTabChange={setCurrentTab}
                        onTakeaway={handleTakeaway}
                        onDeliveryStart={handleDeliveryStart}
                    />
                )}
                {currentTab === 'pos' && (
                    <POSView
                        currentUser={currentUser}
                        onCreateOrder={handleCreateOrder}
                        onVerifyManager={handleVerifyManager}
                        selectedTableId={selectedTableId}
                        currentOrderId={currentOrderId}
                        orderType={orderType}
                        deliveryPlatform={deliveryPlatform}
                        deliveryOrderNumber={deliveryOrderNumber}
                        taxSettings={taxSettings}
                        inventorySettings={inventorySettings}
                    />
                )}
                {currentTab === 'active_orders' && <KitchenDisplay onOpenOrder={handleOpenOrder} />}
                {currentTab === 'delivery' && <DeliveryView />}
                {currentTab === 'history' && <HistoryView />}
                {currentTab === 'inventory' && <InventoryView currentUser={currentUser} />}
                {currentTab === 'menu' && <MenuView />}
                {currentTab === 'reports' && <Dashboard />}
                {currentTab === 'settings' && (
                    <SettingsView
                        enableKDS={showKDS}
                        setEnableKDS={setShowKDS}
                        receiptConfig={receiptConfig}
                        setReceiptConfig={setReceiptConfig}
                        currentUser={currentUser}
                        printSettings={printSettings}
                        setPrintSettings={setPrintSettings}
                        taxSettings={taxSettings}
                        setTaxSettings={setTaxSettings}
                        inventorySettings={inventorySettings}
                        setInventorySettings={setInventorySettings}
                    />
                )}

                <ShiftModal
                    isOpen={isShiftModalOpen}
                    type={shiftModalType}
                    shift={currentShift}
                    onConfirm={shiftModalType === 'OPEN' ? handleOpenShift : handleCloseShift}
                    onClose={() => setIsShiftModalOpen(false)}
                />
            </main>
        </div>
    );
};

export default App;
