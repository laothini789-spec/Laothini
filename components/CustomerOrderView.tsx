import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { dataService } from '../services/dataService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { appendOrderItems, createOrder, getOrderById, getTableById, getTableByToken, subscribeToOrderStatus } from '../services/onlineOrderService';
import { Category, Order, OrderItem, OrderStatus, OrderType, Product, ProductOptionGroup, TaxSettings } from '../types';

interface CustomerOrderViewProps {
    tableId?: string | null;
    tableToken?: string | null;
    taxSettings: TaxSettings;
}

type SelectedOption = NonNullable<OrderItem['selectedOptions']>[number];

export const CustomerOrderView: React.FC<CustomerOrderViewProps> = ({ tableId, tableToken, taxSettings }) => {
    const [tableName, setTableName] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [lastOrderId, setLastOrderId] = useState<string | null>(null);
    const [lastOrderStatus, setLastOrderStatus] = useState<OrderStatus | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [currentTableOrderId, setCurrentTableOrderId] = useState<string | null>(null);
    const [resolvedTableId, setResolvedTableId] = useState<string | null>(tableId ?? null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [productOptionGroups, setProductOptionGroups] = useState<ProductOptionGroup[]>([]);
    const [currentOptions, setCurrentOptions] = useState<Record<string, string[]>>({});

    useEffect(() => {
        const cats = dataService.getCategories();
        setCategories(cats);
        if (cats.length > 0) setSelectedCategory(cats[0].id);
        setProducts(dataService.getProducts());
    }, []);

    useEffect(() => {
        setResolvedTableId(tableId ?? null);
    }, [tableId]);

    useEffect(() => {
        if (!tableId) {
            setTableName(null);
            setTokenError('ไม่พบหมายเลขโต๊ะ');
            return;
        }
        if (isSupabaseConfigured) {
            let isMounted = true;
            (async () => {
                try {
                    let table = await getTableById(tableId);
                    if (!table && tableToken) {
                        table = await getTableByToken(tableToken);
                    }
                    if (!isMounted) return;
                    if (!table) {
                        setTableName(null);
                        setTokenError('ไม่พบโต๊ะนี้ในระบบ');
                        return;
                    }
                    if (!table.qrToken) {
                        setTableName(null);
                        setTokenError('โต๊ะนี้ยังไม่ได้ตั้งค่า QR กรุณาติดต่อพนักงาน');
                        return;
                    }
                    setResolvedTableId(table.id);
                    setTableName(table.name);
                    setCurrentTableOrderId(table.currentOrderId || null);
                    if (table.qrToken && tableToken && table.qrToken !== tableToken) {
                        setTokenError('ลิงก์ไม่ถูกต้อง กรุณาสแกน QR ใหม่อีกครั้ง');
                        return;
                    }
                    if (table.qrToken && !tableToken) {
                        setTokenError('ลิงก์นี้ไม่มีโทเคน กรุณาสแกน QR ใหม่อีกครั้ง');
                        return;
                    }
                    setTokenError(null);
                } catch (err) {
                    setTokenError('โหลดข้อมูลโต๊ะไม่สำเร็จ');
                }
            })();
            return () => {
                isMounted = false;
            };
        }
        const table = dataService.getTable(tableId);
        if (!table) {
            setTableName(null);
            setTokenError('ไม่พบโต๊ะนี้ในระบบ');
            return;
        }
        if (!table.qrToken) {
            setTableName(null);
            setTokenError('โต๊ะนี้ยังไม่ได้ตั้งค่า QR กรุณาติดต่อพนักงาน');
            return;
        }
        setResolvedTableId(table.id);
        setTableName(table.name);
        setCurrentTableOrderId(table.currentOrderId || null);
        if (table.qrToken && tableToken && table.qrToken !== tableToken) {
            setTokenError('ลิงก์ไม่ถูกต้อง กรุณาสแกน QR ใหม่อีกครั้ง');
            return;
        }
        if (table.qrToken && !tableToken) {
            setTokenError('ลิงก์นี้ไม่มีโทเคน กรุณาสแกน QR ใหม่อีกครั้ง');
            return;
        }
        setTokenError(null);
    }, [tableId, tableToken]);

    useEffect(() => {
        if (!lastOrderId) return;
        if (isSupabaseConfigured) {
            let isMounted = true;
            (async () => {
                try {
                    const order = await getOrderById(lastOrderId);
                    if (order && isMounted) {
                        setLastOrderStatus(order.status);
                    }
                } catch (err) {
                    // Ignore fetch error; realtime will handle
                }
            })();
            const unsubscribe = subscribeToOrderStatus(lastOrderId, status => {
                if (isMounted) setLastOrderStatus(status);
            });
            return () => {
                isMounted = false;
                unsubscribe();
            };
        }
        const fetchStatus = () => {
            const order = dataService.getOrder(lastOrderId);
            if (order) {
                setLastOrderStatus(order.status);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [lastOrderId]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => p.categoryId === selectedCategory);
    }, [products, selectedCategory]);

    const addItemToCart = (product: Product, selectedOpts: SelectedOption[], priceModifier: number) => {
        const effectivePrice = product.price + priceModifier;
        setCart(prev => {
            if (selectedOpts.length === 0) {
                const existing = prev.find(item => item.productId === product.id && (!item.selectedOptions || item.selectedOptions.length === 0));
                if (existing) {
                    return prev.map(item =>
                        item.id === existing.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    );
                }
            }

            return [...prev, {
                id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                productId: product.id,
                productName: product.name,
                quantity: 1,
                price: effectivePrice,
                status: 'PENDING',
                selectedOptions: selectedOpts
            }];
        });
    };

    const addToCart = (product: Product) => {
        const optionGroups = dataService.getProductOptionGroups(product);
        if (optionGroups.length > 0) {
            setSelectedProduct(product);
            setProductOptionGroups(optionGroups);
            setCurrentOptions({});
            setIsOptionModalOpen(true);
            return;
        }
        addItemToCart(product, [], 0);
    };

    const toggleOption = (groupId: string, choiceId: string, allowMultiple: boolean) => {
        setCurrentOptions(prev => {
            const currentSelected = prev[groupId] || [];
            if (allowMultiple) {
                if (currentSelected.includes(choiceId)) {
                    return { ...prev, [groupId]: currentSelected.filter(id => id !== choiceId) };
                }
                return { ...prev, [groupId]: [...currentSelected, choiceId] };
            }
            return { ...prev, [groupId]: [choiceId] };
        });
    };

    const handleOptionConfirm = () => {
        if (!selectedProduct) return;
        let totalModifier = 0;
        const finalSelectedOptions: SelectedOption[] = [];

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

    const updateItemQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.flatMap(item => {
            if (item.id !== itemId) return [item];
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return [];
            return [{ ...item, quantity: nextQty }];
        }));
    };

    const updateItemNote = (itemId: string, note: string) => {
        setCart(prev => prev.map(item => (
            item.id === itemId ? { ...item, notes: note } : item
        )));
    };

    const removeItem = (itemId: string) => {
        setCart(prev => prev.filter(item => item.id !== itemId));
    };

    const totals = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = taxSettings.enabled ? subtotal * (taxSettings.rate / 100) : 0;
        const total = subtotal + tax;
        return { subtotal, tax, total };
    }, [cart, taxSettings]);

    const mergeWithExistingOrder = (existingOrder: Order, newItems: OrderItem[]) => {
        const mergedItems = [...existingOrder.items, ...newItems];
        const subtotal = mergedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = taxSettings.enabled ? subtotal * (taxSettings.rate / 100) : 0;
        const discount = existingOrder.discount || 0;
        const total = subtotal + tax - discount;
        const updatedOrder: Order = {
            ...existingOrder,
            items: mergedItems,
            subtotal,
            tax,
            total,
            discount
        };
        dataService.updateOrder(updatedOrder);
    };

    const handleSubmitOrder = async () => {
        if (tokenError) {
            setSuccessMessage(tokenError);
            return;
        }
        const targetTableId = resolvedTableId || tableId;
        if (!targetTableId) {
            setSuccessMessage('ไม่พบหมายเลขโต๊ะ');
            return;
        }
        if (cart.length === 0) {
            setSuccessMessage('กรุณาเลือกเมนูก่อนส่งออเดอร์');
            return;
        }
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            if (isSupabaseConfigured) {
                if (currentTableOrderId) {
                    const existingOrder = await getOrderById(currentTableOrderId);
                    if (existingOrder && existingOrder.status !== OrderStatus.COMPLETED && existingOrder.status !== OrderStatus.CANCELLED) {
                        const combinedSubtotal = existingOrder.subtotal + totals.subtotal;
                        const combinedTax = taxSettings.enabled ? combinedSubtotal * (taxSettings.rate / 100) : 0;
                        const combinedDiscount = existingOrder.discount || 0;
                        const combinedTotal = combinedSubtotal + combinedTax - combinedDiscount;
                        await appendOrderItems(currentTableOrderId, cart, {
                            subtotal: combinedSubtotal,
                            tax: combinedTax,
                            total: combinedTotal,
                            discount: combinedDiscount
                        });
                        setCart([]);
                        setSuccessMessage('เพิ่มรายการให้โต๊ะเรียบร้อยแล้ว');
                        setLastOrderId(existingOrder.id);
                        setIsSubmitting(false);
                        return;
                    }
                }

                const now = Date.now();
                const newOrder: Order = {
                    id: `ord_${now}`,
                    orderNumber: `QR-${now.toString().slice(-6)}`,
                    type: OrderType.DINE_IN,
                    status: OrderStatus.CONFIRMED,
                    items: cart,
                    subtotal: totals.subtotal,
                    tax: totals.tax,
                    discount: 0,
                    total: totals.total,
                    createdAt: new Date(),
                    tableId: targetTableId
                };
                const createdId = await createOrder(newOrder, cart);
                setCart([]);
                setSuccessMessage('ส่งออเดอร์เรียบร้อย เข้าระบบทันที');
                setLastOrderId(createdId);
                setCurrentTableOrderId(createdId);
                setIsSubmitting(false);
                return;
            }

            const table = dataService.getTable(targetTableId);
            if (!table) {
                setSuccessMessage('ไม่พบโต๊ะนี้ในระบบ');
                return;
            }

            if (table.currentOrderId) {
                const existingOrder = dataService.getOrder(table.currentOrderId);
                if (existingOrder && existingOrder.status !== OrderStatus.COMPLETED && existingOrder.status !== OrderStatus.CANCELLED) {
                    mergeWithExistingOrder(existingOrder, cart);
                    setCart([]);
                    setSuccessMessage('เพิ่มรายการให้โต๊ะเรียบร้อยแล้ว');
                    setLastOrderId(existingOrder.id);
                    return;
                }
            }

            const now = Date.now();
            const newOrder: Order = {
                id: `ord_${now}`,
                orderNumber: `QR-${now.toString().slice(-6)}`,
                type: OrderType.DINE_IN,
                status: OrderStatus.CONFIRMED,
                items: cart,
                subtotal: totals.subtotal,
                tax: totals.tax,
                discount: 0,
                total: totals.total,
                createdAt: new Date(),
                tableId: targetTableId
            };
            dataService.createOrder(newOrder);
            setCart([]);
            setSuccessMessage('ส่งออเดอร์เรียบร้อย เข้าระบบทันที');
            setLastOrderId(newOrder.id);
        } catch (err) {
            setSuccessMessage('ส่งออเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isValidOptionSelection = productOptionGroups.every(g => !g.required || (currentOptions[g.id] && currentOptions[g.id].length > 0));

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="px-6 py-5 bg-white shadow-sm border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-slate-400">OmniPOS</p>
                        <h1 className="text-xl font-bold text-slate-800">สั่งอาหารผ่าน QR</h1>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400">โต๊ะ</p>
                        <p className="text-lg font-bold text-slate-800">{tableName || 'ไม่ระบุ'}</p>
                    </div>
                </div>
                {tokenError && (
                    <div className="mt-4 bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg text-sm">
                        {tokenError}
                    </div>
                )}
                {successMessage && (
                    <div className="mt-4 space-y-2">
                        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-lg text-sm">
                            {successMessage}
                        </div>
                        {lastOrderId && (
                            <div className="bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
                                <span>สถานะออเดอร์ล่าสุด</span>
                                <span className="font-semibold text-slate-900">
                                    {lastOrderStatus || 'กำลังตรวจสอบ'}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </header>

            <div className="px-5 pt-4">
                <div className="flex gap-2 overflow-x-auto pb-3">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors ${selectedCategory === cat.id
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-1 px-5 pb-32">
                <div className="grid grid-cols-1 gap-4">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-800">{product.name}</h3>
                                    {product.description && (
                                        <p className="text-sm text-slate-500 mt-1">{product.description}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-bold text-slate-800">฿{product.price.toFixed(2)}</p>
                                    <button
                                        onClick={() => addToCart(product)}
                                        className="mt-2 inline-flex items-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-orange-600"
                                    >
                                        <Plus size={16} /> เพิ่ม
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 shadow-[0_-12px_24px_-18px_rgba(15,23,42,0.3)]">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500">ยอดรวม</p>
                        <p className="text-xl font-bold text-slate-900">฿{totals.total.toFixed(2)}</p>
                    </div>
                    <button
                        onClick={handleSubmitOrder}
                        disabled={!!tokenError}
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold shadow-lg ${tokenError || isSubmitting ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                        <ShoppingBag size={18} />
                        {isSubmitting ? 'กำลังส่ง...' : 'ส่งออเดอร์'}
                    </button>
                </div>
                <div className="mt-3 text-xs text-slate-400">
                    {taxSettings.enabled ? `รวม ${taxSettings.label} ${taxSettings.rate}% แล้ว` : 'ไม่รวมภาษี'}
                </div>
            </div>

            {cart.length > 0 && (
                <div className="fixed bottom-20 right-4 left-4 max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-4">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">ตะกร้าของคุณ</h3>
                    <div className="space-y-3 max-h-56 overflow-y-auto">
                        {cart.map(item => (
                            <div key={item.id} className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800">{item.productName}</p>
                                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            {item.selectedOptions.map(opt => opt.choiceName).join(', ')}
                                        </p>
                                    )}
                                    <input
                                        type="text"
                                        value={item.notes || ''}
                                        onChange={(e) => updateItemNote(item.id, e.target.value)}
                                        placeholder="โน้ตถึงครัว เช่น ไม่เผ็ด/ไม่ใส่ผัก"
                                        className="mt-2 w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-200 text-slate-700"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">฿{item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateItemQuantity(item.id, -1)} className="p-1 rounded-full border border-slate-200 text-slate-500">
                                        <Minus size={14} />
                                    </button>
                                    <span className="text-sm font-semibold text-slate-700">{item.quantity}</span>
                                    <button onClick={() => updateItemQuantity(item.id, 1)} className="p-1 rounded-full border border-slate-200 text-slate-500">
                                        <Plus size={14} />
                                    </button>
                                    <button onClick={() => removeItem(item.id)} className="p-1 rounded-full border border-slate-200 text-slate-400 hover:text-red-500">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isOptionModalOpen && selectedProduct && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{selectedProduct.name}</h3>
                                <p className="text-slate-500 text-sm">เลือกตัวเลือกเพิ่มเติม</p>
                            </div>
                            <button onClick={() => setIsOptionModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                <Trash2 size={20} className="rotate-45" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {productOptionGroups.map(group => (
                                <div key={group.id} className="mb-6 last:mb-0">
                                    <div className="flex justify-between items-end mb-3">
                                        <h4 className="font-bold text-slate-700 text-base">
                                            {group.name}
                                            {group.required && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">บังคับเลือก</span>}
                                        </h4>
                                        <span className="text-xs text-slate-400">
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
                                                        <span className="text-xs bg-white px-2 py-1 rounded-lg border border-slate-100 text-slate-500">
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
                        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                            <button
                                onClick={handleOptionConfirm}
                                disabled={!isValidOptionSelection}
                                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                เพิ่มลงตะกร้า
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
