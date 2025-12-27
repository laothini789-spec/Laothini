import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, Lock, Armchair, Save, ShoppingBag, Bike, TicketPercent, ChevronDown } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Product, OrderItem, Staff, Role, Category, Table, OrderStatus, OrderType, TaxSettings, PaymentMethod, Discount, ProductOptionGroup } from '../types';

interface POSViewProps {
    onCreateOrder: (items: OrderItem[], total: number, status?: OrderStatus, taxAmount?: number, subtotal?: number, paymentMethod?: PaymentMethod, discountAmount?: number) => void;
    currentUser: Staff;
    onVerifyManager: (onSuccess: () => void) => void;
    selectedTableId: string | null;
    currentOrderId?: string | null;
    orderType: OrderType;
    deliveryPlatform?: string | null;
    deliveryOrderNumber?: string | null;
    taxSettings: TaxSettings;
    inventorySettings: { enabled: boolean; lowStockThreshold: number; }; // New Prop
}

export const POSView: React.FC<POSViewProps> = ({
    onCreateOrder,
    currentUser,
    onVerifyManager,
    selectedTableId,
    currentOrderId,
    orderType,
    deliveryPlatform,
    deliveryOrderNumber,
    taxSettings,
    inventorySettings
}) => {
    // Dynamic Data States
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [currentTable, setCurrentTable] = useState<Table | undefined>(undefined);

    // UI States
    const [selectedCategory, setSelectedCategory] = useState<string>(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem('omnipos_pos_category') || '';
    });
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [search, setSearch] = useState(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem('omnipos_pos_search') || '';
    });
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
    const [selectedDiscountId, setSelectedDiscountId] = useState<string | null>(null);

    // Option Modal State
    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [currentOptions, setCurrentOptions] = useState<Record<string, string[]>>({}); // groupId -> [choiceId]
    const [productOptionGroups, setProductOptionGroups] = useState<ProductOptionGroup[]>([]);

    // Fetch Discounts
    const discounts = useMemo(() => dataService.getDiscounts().filter(d => d.active), []);

    useEffect(() => {
        const cats = dataService.getCategories();
        setCategories(cats);
        if (cats.length > 0) {
            const stored = typeof window !== 'undefined' ? localStorage.getItem('omnipos_pos_category') : null;
            const fallback = cats[0].id;
            const resolved = stored && cats.some(c => c.id === stored) ? stored : fallback;
            setSelectedCategory(resolved);
        }
        setProducts(dataService.getProducts());
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('omnipos_pos_search', search);
            if (selectedCategory) {
                localStorage.setItem('omnipos_pos_category', selectedCategory);
            }
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }, [search, selectedCategory]);

    // Effect to handle Order Loading (Edit Mode or Table Selection)
    useEffect(() => {
        // Priority 1: Direct Order Edit (Active Orders > Open Order)
        if (currentOrderId) {
            const order = dataService.getOrder(currentOrderId);
            if (order) {
                // Deep copy to prevent mutating store directly before save
                setCart(JSON.parse(JSON.stringify(order.items)));

                // If this order is linked to a table, set the table info for display
                if (order.tableId) {
                    const table = dataService.getTable(order.tableId);
                    setCurrentTable(table);
                } else {
                    setCurrentTable(undefined);
                }
                return;
            }
        }

        // Priority 2: Table Selection
        if (selectedTableId) {
            const table = dataService.getTable(selectedTableId);
            setCurrentTable(table);

            if (table && table.currentOrderId) {
                // Table is occupied, load existing order
                const existingOrder = dataService.getOrder(table.currentOrderId);
                if (existingOrder) {
                    setCart(JSON.parse(JSON.stringify(existingOrder.items)));
                } else {
                    setCart([]);
                }
            } else {
                // Table is empty, clear cart
                setCart([]);
            }
        } else {
            // New Order (Takeaway/Delivery started fresh)
            setCurrentTable(undefined);
            setCart([]);
        }
    }, [selectedTableId, currentOrderId]);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.categoryId === selectedCategory &&
            p.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [selectedCategory, search, products]);

    const getProductPrice = (product: Product) => {
        // Determine price based on delivery platform
        if (orderType === OrderType.DELIVERY && deliveryPlatform) {
            if (deliveryPlatform === 'LINEMAN' && product.priceDelivery?.lineman && product.priceDelivery.lineman.price > 0) {
                return product.priceDelivery.lineman.price;
            }
            if (deliveryPlatform === 'GRAB' && product.priceDelivery?.grab && product.priceDelivery.grab.price > 0) {
                return product.priceDelivery.grab.price;
            }
            if (deliveryPlatform === 'SHOPEE' && product.priceDelivery?.shopeefood && product.priceDelivery.shopeefood.price > 0) {
                return product.priceDelivery.shopeefood.price;
            }
        }
        // Default to base price (Storefront)
        return product.price;
    };

    const addToCart = (product: Product) => {
        // Check for Options
        const optionGroups = dataService.getProductOptionGroups(product);
        if (optionGroups.length > 0) {
            setSelectedProduct(product);
            setProductOptionGroups(optionGroups);
            setCurrentOptions({});
            setIsOptionModalOpen(true);
            return;
        }

        // Direct Add (No Options)
        addItemToCart(product, [], 0); // No options, 0 extra price
    };

    const addItemToCart = (product: Product, selectedOpts: any[], priceModifier: number) => {
        const effectivePrice = getProductPrice(product) + priceModifier;

        setCart(prev => { /* Logic to add to cart, accounting for options uniqueness? */
            // For simplicity, if it has options, we always add as new line item to avoid complex merging logic for now
            if (selectedOpts.length > 0) {
                return [...prev, {
                    id: `tmp_${Date.now()}`,
                    productId: product.id,
                    productName: product.name,
                    quantity: 1,
                    price: effectivePrice,
                    status: 'PENDING',
                    selectedOptions: selectedOpts
                }];
            }

            // Original Logic for simple products
            const existing = prev.find(item => item.productId === product.id && (!item.selectedOptions || item.selectedOptions.length === 0));
            if (existing) {
                return prev.map(item =>
                    item.id === existing.id
                        ? { ...item, quantity: item.quantity + 1, price: effectivePrice }
                        : item
                );
            }
            return [...prev, {
                id: `tmp_${Date.now()}`,
                productId: product.id,
                productName: product.name,
                quantity: 1,
                price: effectivePrice,
                status: 'PENDING',
                selectedOptions: []
            }];
        });
    };

    const handleOptionConfirm = () => {
        if (!selectedProduct) return;

        // Calculate Total Modifier Price & Gather Selected Options
        let totalModifier = 0;
        const finalSelectedOptions: any[] = [];

        productOptionGroups.forEach(group => {
            const selectedIds = currentOptions[group.id] || [];
            selectedIds.forEach(choiceId => {
                const choice = group.choices.find(c => c.id === choiceId);
                if (choice) {
                    totalModifier += choice.priceModifier;
                    finalSelectedOptions.push({
                        groupId: group.id,
                        groupName: group.name,
                        choiceId: choice.id,
                        choiceName: choice.name,
                        priceModifier: choice.priceModifier
                    });
                }
            });
        });

        addItemToCart(selectedProduct, finalSelectedOptions, totalModifier);
        setIsOptionModalOpen(false);
        setSelectedProduct(null);
    };

    const toggleOption = (groupId: string, choiceId: string, allowMultiple: boolean) => {
        setCurrentOptions(prev => {
            const currentSelected = prev[groupId] || [];
            if (allowMultiple) {
                if (currentSelected.includes(choiceId)) {
                    return { ...prev, [groupId]: currentSelected.filter(id => id !== choiceId) };
                } else {
                    return { ...prev, [groupId]: [...currentSelected, choiceId] };
                }
            } else {
                return { ...prev, [groupId]: [choiceId] };
            }
        });
    };

    const updateQty = (id: string, delta: number) => {
        // Validation for removing items if user is STAFF (only if item is already saved/cooking - simulated here for all items)
        if (delta < 0 && currentUser.role === Role.STAFF) {
            // Check if item is status 'PENDING', staff can delete. If 'COOKING', need manager.
            // For simplicity, we assume removing anything requires manager if in strict mode, 
            // but usually removing "Pending" items is allowed.
            // Let's allow Staff to remove items for now unless it's a strict void.
        }
        executeQtyUpdate(id, delta);
    };

    const executeQtyUpdate = (id: string, delta: number) => {
        setCart(prev => {
            const updated = prev.map(item => {
                if (item.id === id) {
                    const newQty = Math.max(0, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0);
            
            // Update products to reflect stock changes if inventory is enabled
            if (inventorySettings.enabled) {
                setProducts([...dataService.getProducts()]);
            }
            
            return updated;
        });
    };

    // --- CALCULATION    // Calcs
    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [cart]);

    const discountAmount = useMemo(() => {
        if (!selectedDiscountId) return 0;
        const discount = discounts.find(d => d.id === selectedDiscountId);
        if (!discount) return 0;

        if (discount.type === 'FIXED') {
            return discount.value;
        } else {
            // Percent
            return subtotal * (discount.value / 100);
        }
    }, [subtotal, selectedDiscountId, discounts]);

    const afterDiscount = Math.max(0, subtotal - discountAmount);

    const taxAmount = useMemo(() => {
        if (!taxSettings.enabled) return 0;
        return afterDiscount * (taxSettings.rate / 100);
    }, [afterDiscount, taxSettings]);

    const finalTotal = afterDiscount + taxAmount;

    // Header Display Logic
    const getHeaderInfo = () => {
        if (orderType === OrderType.DELIVERY) {
            let platformName = deliveryPlatform || 'Unknown Platform';
            let colorClass = 'bg-slate-100 text-slate-700';

            if (deliveryPlatform === 'GRAB') {
                platformName = 'GrabFood';
                colorClass = 'bg-green-100 text-green-700';
            } else if (deliveryPlatform === 'LINEMAN') {
                platformName = 'LINE MAN';
                colorClass = 'bg-green-50 text-green-600'; // Slightly different green
            } else if (deliveryPlatform === 'SHOPEE') {
                platformName = 'ShopeeFood';
                colorClass = 'bg-orange-100 text-orange-700';
            }

            // Add order number if exists
            const displayTitle = deliveryOrderNumber
                ? `${platformName} (${deliveryOrderNumber})`
                : platformName;

            return {
                title: `เดลิเวอรี่: ${displayTitle}`,
                icon: <Bike size={24} />,
                bgClass: colorClass
            };
        }
        if (orderType === OrderType.TAKEAWAY) {
            return {
                title: 'สั่งกลับบ้าน (Takeaway)',
                icon: <ShoppingBag size={24} />,
                bgClass: 'bg-blue-100 text-blue-700'
            };
        }
        if (currentTable) {
            return {
                title: `กำลังสั่งสำหรับ: ${currentTable.name}`,
                icon: <Armchair size={24} />,
                bgClass: 'bg-green-100 text-green-700'
            };
        }
        // Fallback for general editing without table (e.g. editing a takeaway from list)
        if (currentOrderId && !currentTable) {
            return {
                title: 'แก้ไขรายการ (Editing Order)',
                icon: <ShoppingBag size={24} />,
                bgClass: 'bg-orange-100 text-orange-700'
            };
        }
        return {
            title: 'ออเดอร์ทั่วไป (General Order)',
            icon: <ShoppingBag size={24} />,
            bgClass: 'bg-slate-100 text-slate-700'
        };
    };

    const headerInfo = getHeaderInfo();

    return (
        <div className="flex h-full bg-slate-100">
            {/* Left Side: Product Grid */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Categories */}
                <div className="bg-white p-4 shadow-sm flex gap-3 overflow-x-auto whitespace-nowrap">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === cat.id
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="p-4 pb-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-900"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-24">
                    {filteredProducts.map(product => {
                        const displayPrice = getProductPrice(product);
                        // Check stock only if inventory tracking is enabled
                        const stock = inventorySettings.enabled ? dataService.calculateMaxYield(product.id) : 9999;
                        const isOutOfStock = inventorySettings.enabled && stock <= 0;

                        return (
                            <div
                                key={product.id}
                                onClick={() => !isOutOfStock && addToCart(product)}
                                className={`rounded-xl shadow-sm transition-all border overflow-hidden group relative ${isOutOfStock
                                    ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
                                    : 'bg-white hover:shadow-md cursor-pointer border-transparent hover:border-accent'
                                    }`}
                            >
                                {/* Stock Indicators */}
                                {isOutOfStock && (
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex justify-center">
                                        <span className="bg-red-500/90 backdrop-blur text-white px-3 py-1 text-xs font-bold rounded-full shadow-sm">
                                            สินค้าหมด
                                        </span>
                                    </div>
                                )}
                                {!isOutOfStock && stock < 20 && stock < 9999 && (
                                    <div className="absolute top-2 right-2 z-10">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shadow-sm text-white ${stock < 5 ? 'bg-red-500' : 'bg-orange-500'}`}>
                                            เหลือ {stock}
                                        </span>
                                    </div>
                                )}

                                <div className="h-32 bg-slate-200 relative overflow-hidden">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className={`w-full h-full object-cover transition-transform ${isOutOfStock ? 'grayscale' : 'group-hover:scale-105'}`}
                                    />
                                </div>
                                <div className="p-3">
                                    <h3 className="font-semibold text-slate-800 text-sm truncate">{product.name}</h3>
                                    <p className={`font-bold mt-1 ${isOutOfStock ? 'text-slate-400' : 'text-accent'}`}>฿{displayPrice}</p>
                                    {orderType === OrderType.DELIVERY && deliveryPlatform && (
                                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                            <Bike size={10} /> ราคา {deliveryPlatform}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right Side: Cart */}
            <div className="w-96 bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
                <div className="p-5 border-b border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">รายการสั่งซื้อ</h2>
                            <p className="text-xs text-slate-400 mt-1 font-medium truncate max-w-[200px]" title={typeof headerInfo.title === 'string' ? headerInfo.title : ''}>
                                {headerInfo.title}
                            </p>
                        </div>
                        <div className={`${headerInfo.bgClass} p-2 rounded-lg transition-colors flex-shrink-0`}>
                            {headerInfo.icon}
                        </div>
                    </div>

                    {currentUser.role === Role.STAFF && (
                        <div className="flex items-center gap-1 text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded w-fit">
                            <Lock size={12} />
                            <span>Staff Mode</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <Search size={48} className="mb-2" />
                            <p>เลือกสินค้าเพื่อเริ่มรายการ</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex-1">
                                    <h4 className="font-medium text-sm text-slate-800">{item.productName}</h4>
                                    {/* Selected Options Display */}
                                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {item.selectedOptions.map((opt, idx) => (
                                                <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500 flex items-center gap-1">
                                                    {opt.choiceName}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="text-xs text-slate-500 mt-1">฿{item.price} x {item.quantity}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateQty(item.id, -1)}
                                        className={`p-1 rounded text-slate-600 ${currentUser.role === Role.STAFF ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-slate-200'}`}
                                        title={currentUser.role === Role.STAFF ? "ต้องใช้รหัสผู้จัดการเพื่อลบ" : "ลดจำนวน"}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-slate-200 rounded text-slate-600">
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="ml-3 font-bold text-sm text-slate-800 w-12 text-right">
                                    ฿{item.price * item.quantity}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Totals */}
                <div className="p-5 bg-white border-t border-slate-100">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>รวมเป็นเงิน (Subtotal)</span>
                            <span>฿{subtotal.toFixed(2)}</span>
                        </div>

                        {/* Discount Selector - Dropdown Style */}
                        <div className="flex items-center gap-2 mb-3 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-slate-700 min-w-[80px]">
                                <TicketPercent size={16} />
                                <span className="text-sm font-bold">ส่วนลด</span>
                            </div>
                            <div className="flex-1 relative">
                                <select
                                    value={selectedDiscountId || ''}
                                    onChange={(e) => setSelectedDiscountId(e.target.value || null)}
                                    className="w-full p-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                    <option value="">-- ไม่ระบุ --</option>
                                    {discounts.map(disc => (
                                        <option key={disc.id} value={disc.id}>
                                            {disc.name} {disc.type === 'PERCENT' ? `(-${disc.value}%)` : `(-฿${disc.value})`}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>

                        {selectedDiscountId && (
                            <div className="flex justify-between text-sm text-green-600 font-bold pb-2">
                                <span>ส่วนลด (Discount)</span>
                                <span>-฿{discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {taxSettings.enabled && (
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>{taxSettings.label} ({taxSettings.rate}%)</span>
                                <span>฿{taxAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-bold text-slate-900 mt-2 pt-2 border-t border-slate-100">
                            <span>ยอดสุทธิ</span>
                            <span>฿{finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <button
                            onClick={() => setSelectedPayment(PaymentMethod.CASH)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedPayment === PaymentMethod.CASH
                                ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Banknote size={20} className={`mb-1 ${selectedPayment === PaymentMethod.CASH ? 'text-green-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">เงินสด</span>
                        </button>
                        <button
                            onClick={() => setSelectedPayment(PaymentMethod.CREDIT_CARD)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedPayment === PaymentMethod.CREDIT_CARD
                                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <CreditCard size={20} className={`mb-1 ${selectedPayment === PaymentMethod.CREDIT_CARD ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">บัตรเครดิต</span>
                        </button>
                        <button
                            onClick={() => setSelectedPayment(PaymentMethod.PROMPTPAY)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedPayment === PaymentMethod.PROMPTPAY
                                ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <QrCode size={20} className={`mb-1 ${selectedPayment === PaymentMethod.PROMPTPAY ? 'text-purple-600' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold">สแกนจ่าย</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            disabled={cart.length === 0}
                            onClick={() => {
                                onCreateOrder(cart, finalTotal, OrderStatus.CONFIRMED, taxAmount, subtotal, undefined, discountAmount);

                                // Clear State
                                setCart([]);
                                setSelectedPayment(null);
                                setSelectedDiscountId(null);
                                setSearch('');
                                setProducts([...dataService.getProducts()]); // Refresh stock logic
                            }}
                            className="bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 disabled:bg-slate-50 disabled:text-slate-300 py-3.5 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 border border-slate-200"
                        >
                            <Save size={20} /> บันทึก
                        </button>
                        <button
                            disabled={cart.length === 0}
                            onClick={() => {
                                if (!selectedPayment) {
                                    alert('กรุณาเลือกช่องทางการชำระเงิน (เงินสด / บัตรเครดิต / สแกนจ่าย)');
                                    return;
                                }
                                // Validate payment method before processing
                                const validPaymentMethods = Object.values(PaymentMethod);
                                if (!validPaymentMethods.includes(selectedPayment)) {
                                    alert('ช่องทางการชำระเงินไม่ถูกต้อง');
                                    return;
                                }
                                onCreateOrder(cart, finalTotal, OrderStatus.COMPLETED, taxAmount, subtotal, selectedPayment, discountAmount);

                                // Clear State
                                setCart([]);
                                setSelectedPayment(null);
                                setSelectedDiscountId(null);
                                setSearch('');
                                setProducts([...dataService.getProducts()]); // Refresh stock logic
                            }}
                            className={`py-3.5 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${cart.length === 0
                                ? 'bg-slate-300 text-white cursor-not-allowed shadow-none'
                                : 'bg-slate-800 text-white hover:bg-slate-900 hover:shadow-xl hover:-translate-y-0.5'
                                }`}
                        >
                            {cart.length > 0 && !selectedPayment ? 'ชำระเงิน (เลือกช่องทาง)' : 'ชำระเงิน'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Product Option Modal */}
            {isOptionModalOpen && selectedProduct && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{selectedProduct.name}</h3>
                                <p className="text-slate-500 text-sm">ปรับแต่งรายละเอียดสินค้า</p>
                            </div>
                            <button onClick={() => setIsOptionModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                <Trash2 size={20} className="rotate-45" /> {/* Use X icon if available, reusing Trash for close/cancel visually */}
                            </button>
                        </div>

                        {/* Options Content */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            {productOptionGroups.map(group => (
                                <div key={group.id} className="mb-6 last:mb-0">
                                    <div className="flex justify-between items-end mb-3">
                                        <h4 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                                            {group.name}
                                            {group.required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">บังคับเลือก</span>}
                                        </h4>
                                        <span className="text-xs text-slate-400 font-normal">
                                            {group.allowMultiple ? 'เลือกได้หลายข้อ' : 'เลือกได้ 1 ข้อ'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {group.choices.map(choice => {
                                            const isSelected = (currentOptions[group.id] || []).includes(choice.id);
                                            return (
                                                <button
                                                    key={choice.id}
                                                    onClick={() => toggleOption(group.id, choice.id, group.allowMultiple)}
                                                    className={`flex justify-between items-center p-3 rounded-xl border transition-all ${isSelected
                                                        ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <span className="font-medium">{choice.name}</span>
                                                    {choice.priceModifier > 0 && (
                                                        <span className="text-sm bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm text-slate-500">
                                                            +{choice.priceModifier}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                            <button
                                onClick={handleOptionConfirm}
                                disabled={!productOptionGroups.every(g => !g.required || (currentOptions[g.id] && currentOptions[g.id].length > 0))}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex justify-between px-6"
                            >
                                <span>ยืนยัน</span>
                                <span>
                                    ฿{(getProductPrice(selectedProduct) + productOptionGroups.reduce((acc, g) => {
                                        const selectedIds = currentOptions[g.id] || [];
                                        const groupTotal = selectedIds.reduce((sum, id) => {
                                            const choice = g.choices.find(c => c.id === id);
                                            return sum + (choice ? choice.priceModifier : 0);
                                        }, 0);
                                        return acc + groupTotal;
                                    }, 0)).toFixed(2)}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
