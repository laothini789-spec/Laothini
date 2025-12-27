import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Image as ImageIcon, X, Save, Layers, List, Tag, Percent, Upload, Box, AlertCircle, Copy, ChevronRight, Check, Bike, DollarSign } from 'lucide-react';
import { Product, Category, ProductOptionGroup, Discount, ProductVariant, CompositeItem } from '../types';
import { dataService } from '../services/dataService';

type MenuTab = 'PRODUCTS' | 'CATEGORIES' | 'OPTIONS' | 'DISCOUNTS';

// Styles Constants
const inputClassName = "w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent text-sm bg-white text-slate-800";
const labelClassName = "block text-sm font-medium text-slate-700 mb-1";
const btnPrimaryClassName = "px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-slate-800 shadow-lg shadow-blue-500/20 transition-all";
const btnSecondaryClassName = "px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-all";

export const MenuView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<MenuTab>(() => {
        if (typeof window === 'undefined') return 'PRODUCTS';
        return (localStorage.getItem('omnipos_menu_active_tab') as MenuTab) || 'PRODUCTS';
    });
    
    // Data States
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
    const [discounts, setDiscounts] = useState<Discount[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('omnipos_menu_active_tab', activeTab);
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }, [activeTab]);

    const loadData = () => {
        setProducts([...dataService.getProducts()]);
        setCategories([...dataService.getCategories()]);
        setOptionGroups([...dataService.getOptionGroups()]);
        setDiscounts([...dataService.getDiscounts()]);
    };

    return (
        <div className="p-8 h-full bg-slate-50 flex flex-col overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">จัดการเมนู (Menu Management)</h1>
                    <p className="text-sm text-slate-500">จัดการสินค้า หมวดหมู่ ตัวเลือก และส่วนลด</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm">
                <TabButton active={activeTab === 'PRODUCTS'} onClick={() => setActiveTab('PRODUCTS')} icon={<List size={18}/>} label="รายการอาหาร" />
                <TabButton active={activeTab === 'CATEGORIES'} onClick={() => setActiveTab('CATEGORIES')} icon={<Layers size={18}/>} label="หมวดหมู่" />
                <TabButton active={activeTab === 'OPTIONS'} onClick={() => setActiveTab('OPTIONS')} icon={<Tag size={18}/>} label="ตัวเลือกเพิ่มเติม" />
                <TabButton active={activeTab === 'DISCOUNTS'} onClick={() => setActiveTab('DISCOUNTS')} icon={<Percent size={18}/>} label="ส่วนลด/โปรโมชั่น" />
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'PRODUCTS' && <ProductManager products={products} categories={categories} optionGroups={optionGroups} reload={loadData} />}
                {activeTab === 'CATEGORIES' && <CategoryManager categories={categories} reload={loadData} />}
                {activeTab === 'OPTIONS' && <OptionGroupManager groups={optionGroups} reload={loadData} />}
                {activeTab === 'DISCOUNTS' && <DiscountManager discounts={discounts} categories={categories} reload={loadData} />}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS FOR EACH TAB ---

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            active 
            ? 'bg-slate-800 text-white shadow-md' 
            : 'text-slate-500 hover:bg-slate-100'
        }`}
    >
        {icon}
        {label}
    </button>
);

// 1. PRODUCT MANAGER
const ProductManager = ({ products, categories, optionGroups, reload }: any) => {
    const [search, setSearch] = useState(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem('omnipos_menu_search') || '';
    });
    const [selectedCat, setSelectedCat] = useState(() => {
        if (typeof window === 'undefined') return 'ALL';
        return localStorage.getItem('omnipos_menu_category') || 'ALL';
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Product | null>(null);

    const filtered = products.filter((p: Product) => 
        (selectedCat === 'ALL' || p.categoryId === selectedCat) &&
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleEdit = (item: Product | null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if(confirm('ยืนยันการลบสินค้า?')) {
            dataService.deleteProduct(id);
            reload();
        }
    };

    useEffect(() => {
        try {
            localStorage.setItem('omnipos_menu_search', search);
            localStorage.setItem('omnipos_menu_category', selectedCat);
        } catch {
            // Ignore storage errors (e.g. private mode)
        }
    }, [search, selectedCat]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input 
                        type="text" placeholder="ค้นหาสินค้า..." value={search} onChange={e=>setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-slate-800"
                    />
                </div>
                <select value={selectedCat} onChange={e=>setSelectedCat(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800">
                    <option value="ALL">ทุกหมวดหมู่</option>
                    {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => handleEdit(null)} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-slate-800">
                    <Plus size={18} /> เพิ่มสินค้า
                </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-20">
                {filtered.map((p: Product) => (
                    <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-all">
                        <div className="h-32 bg-slate-200 relative">
                            {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <ImageIcon size={24} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={() => handleEdit(p)} className="p-2 bg-white rounded-full hover:text-blue-600"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(p.id)} className="p-2 bg-white rounded-full hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="p-3">
                            <h3 className="font-semibold truncate text-sm">{p.name}</h3>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-accent font-bold text-sm">฿{p.price}</span>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                                    {categories.find((c:Category) => c.id === p.categoryId)?.name || '-'}
                                </span>
                            </div>
                            {p.isComposite && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-purple-600 font-bold">
                                    <Layers size={10} /> ชุดเซ็ต
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && <ProductForm product={editingItem} categories={categories} optionGroups={optionGroups} allProducts={products} close={() => setIsModalOpen(false)} reload={reload} />}
        </div>
    );
};

// 2. CATEGORY MANAGER
const CategoryManager = ({ categories, reload }: any) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Category | null>(null);

    const handleEdit = (item: Category | null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if(confirm('การลบหมวดหมู่จะทำให้สินค้าในหมวดหมู่นี้หายไปด้วย ยืนยัน?')) {
            dataService.deleteCategory(id);
            reload();
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-end mb-4">
                <button onClick={() => handleEdit(null)} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-slate-800">
                    <Plus size={18} /> เพิ่มหมวดหมู่
                </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 font-medium text-slate-500">
                        <tr>
                            <th className="p-4">ชื่อหมวดหมู่</th>
                            <th className="p-4">ไอคอน (Code)</th>
                            <th className="p-4 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {categories.map((c: Category) => (
                            <tr key={c.id}>
                                <td className="p-4 font-medium">{c.name}</td>
                                <td className="p-4 text-slate-500">{c.icon}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleEdit(c)} className="text-blue-600 hover:underline mr-3">แก้ไข</button>
                                    <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline">ลบ</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <CategoryForm category={editingItem} close={() => setIsModalOpen(false)} reload={reload} />}
        </div>
    );
};

// 3. OPTION GROUP MANAGER
const OptionGroupManager = ({ groups, reload }: any) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ProductOptionGroup | null>(null);

    const handleEdit = (item: ProductOptionGroup | null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if(confirm('ยืนยันการลบกลุ่มตัวเลือก?')) {
            dataService.deleteOptionGroup(id);
            reload();
        }
    };

    return (
        <div className="h-full flex flex-col">
             <div className="flex justify-end mb-4">
                <button onClick={() => handleEdit(null)} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-slate-800">
                    <Plus size={18} /> เพิ่มกลุ่มตัวเลือก
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-20">
                {groups.map((g: ProductOptionGroup) => (
                    <div key={g.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleEdit(g)} className="p-1 hover:bg-slate-100 rounded mr-1"><Edit2 size={16} className="text-slate-500"/></button>
                             <button onClick={() => handleDelete(g.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={16} className="text-red-500"/></button>
                        </div>
                        <h3 className="font-bold text-slate-800">{g.name}</h3>
                        <div className="text-xs text-slate-500 mt-1 mb-3">
                            {g.required ? 'บังคับเลือก' : 'ไม่บังคับ'} • {g.allowMultiple ? 'เลือกได้หลายข้อ' : 'เลือกได้ข้อเดียว'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {g.choices.map((c, i) => (
                                <span key={i} className="inline-block px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                                    {c.name} {c.priceModifier > 0 && `(+${c.priceModifier})`}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && <OptionGroupForm group={editingItem} close={() => setIsModalOpen(false)} reload={reload} />}
        </div>
    );
};

// 4. DISCOUNT MANAGER
const DiscountManager = ({ discounts, categories, reload }: any) => {
     const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Discount | null>(null);

    const handleEdit = (item: Discount | null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if(confirm('ยืนยันการลบส่วนลด?')) {
            dataService.deleteDiscount(id);
            reload();
        }
    };

    const getAppliesToLabel = (d: Discount) => {
        if (d.specificCategoryIds && d.specificCategoryIds.length > 0) {
            return `เฉพาะ ${d.specificCategoryIds.length} หมวดหมู่`;
        }
        switch(d.appliesTo) {
            case 'FOOD': return 'เฉพาะอาหาร';
            case 'BEVERAGE': return 'เฉพาะเครื่องดื่ม';
            default: return 'ทั้งหมด';
        }
    };

    return (
        <div className="h-full flex flex-col">
             <div className="flex justify-end mb-4">
                <button onClick={() => handleEdit(null)} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-slate-800">
                    <Plus size={18} /> เพิ่มส่วนลด
                </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 font-medium text-slate-500">
                        <tr>
                            <th className="p-4">ชื่อส่วนลด</th>
                            <th className="p-4">ประเภท</th>
                            <th className="p-4">มูลค่า</th>
                            <th className="p-4">ใช้กับ</th>
                            <th className="p-4">สถานะ</th>
                            <th className="p-4 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {discounts.map((d: Discount) => (
                            <tr key={d.id}>
                                <td className="p-4 font-medium">{d.name}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${d.type === 'PERCENT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                        {d.type === 'PERCENT' ? 'เปอร์เซ็นต์ (%)' : 'ลดบาท (THB)'}
                                    </span>
                                </td>
                                <td className="p-4 font-bold">{d.value}</td>
                                <td className="p-4 text-slate-500">{getAppliesToLabel(d)}</td>
                                <td className="p-4">
                                    <span className={`w-2 h-2 rounded-full inline-block mr-2 ${d.active ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                    {d.active ? 'ใช้งาน' : 'ปิด'}
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleEdit(d)} className="text-blue-600 hover:underline mr-3">แก้ไข</button>
                                    <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:underline">ลบ</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <DiscountForm discount={editingItem} categories={categories} close={() => setIsModalOpen(false)} reload={reload} />}
        </div>
    );
};

// --- FORMS ---

const ModalLayout = ({ title, children, close }: any) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                <button onClick={close} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="p-6">{children}</div>
        </div>
    </div>
);

const ProductForm = ({ product, categories, optionGroups, allProducts, close, reload }: any) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState<Partial<Product>>(product || {
        name: '', price: 0, cost: 0, categoryId: categories[0]?.id || '', image: '', recipe: [], optionGroupIds: [],
        description: '', trackStock: false, stock: 0, isComposite: false, compositeItems: [], variants: [],
        priceDelivery: { 
            lineman: { price: 0, cost: 0, gp: 0 }, 
            grab: { price: 0, cost: 0, gp: 0 }, 
            shopeefood: { price: 0, cost: 0, gp: 0 } 
        }
    });

    // Ensure priceDelivery exists if editing old products or initializing
    useEffect(() => {
        if (!product || !product.priceDelivery) {
            setForm(prev => ({ 
                ...prev, 
                priceDelivery: { 
                    lineman: { price: 0, cost: 0, gp: 0 }, 
                    grab: { price: 0, cost: 0, gp: 0 }, 
                    shopeefood: { price: 0, cost: 0, gp: 0 } 
                } 
            }));
        }
    }, [product]);

    // Helper states for Sub-features
    const [variantInput, setVariantInput] = useState<Partial<ProductVariant>>({ name: '', price: 0, cost: 0 });
    const [compositeInput, setCompositeInput] = useState({ productId: '', quantity: 1 });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Product = {
            ...form,
            id: product?.id || `prod_${Date.now()}`,
            image: form.image || 'https://via.placeholder.com/200?text=No+Image',
            recipe: form.recipe || [],
            optionGroupIds: form.optionGroupIds || [],
            variants: form.variants || [],
            compositeItems: form.compositeItems || [],
            priceDelivery: form.priceDelivery // Save delivery prices
        } as Product;

        if (product) dataService.updateProduct(payload);
        else dataService.addProduct(payload);
        
        reload();
        close();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({...form, image: reader.result as string});
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleOptionGroup = (id: string) => {
        const current = form.optionGroupIds || [];
        if (current.includes(id)) {
            setForm({ ...form, optionGroupIds: current.filter(g => g !== id) });
        } else {
            setForm({ ...form, optionGroupIds: [...current, id] });
        }
    };

    const addVariant = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (variantInput.name) {
            setForm({
                ...form,
                variants: [...(form.variants || []), { 
                    id: `var_${Date.now()}`, 
                    name: variantInput.name, 
                    price: variantInput.price || 0, 
                    cost: variantInput.cost || 0
                }]
            });
            setVariantInput({ name: '', price: 0, cost: 0 });
        }
    };

    const removeVariant = (idx: number) => {
        const newVars = [...(form.variants || [])];
        newVars.splice(idx, 1);
        setForm({...form, variants: newVars});
    };

    const addCompositeItem = () => {
        if (compositeInput.productId) {
            setForm({
                ...form,
                compositeItems: [...(form.compositeItems || []), { productId: compositeInput.productId, quantity: compositeInput.quantity }]
            });
            setCompositeInput({ productId: '', quantity: 1 });
        }
    };

    const removeCompositeItem = (idx: number) => {
        const newItems = [...(form.compositeItems || [])];
        newItems.splice(idx, 1);
        setForm({...form, compositeItems: newItems});
    };

    const renderDeliveryInput = (platform: 'lineman' | 'grab' | 'shopeefood', label: string, color: string) => {
        const config = form.priceDelivery?.[platform] || { price: 0, cost: 0, gp: 0 };
        const updateConfig = (key: string, value: number) => {
            setForm(prev => ({
                ...prev,
                priceDelivery: {
                    ...prev.priceDelivery,
                    [platform]: { ...config, [key]: value }
                }
            }));
        };

        return (
            <div className={`p-4 rounded-lg border ${color} bg-white`}>
                <div className="font-bold mb-3 flex items-center justify-between">
                    <span>{label}</span>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] text-slate-500 mb-1">ราคาขาย (Price)</label>
                        <input 
                            className={`${inputClassName} h-8 text-sm`} 
                            type="number" min="0" 
                            placeholder={form.price?.toString()}
                            value={config.price || ''} 
                            onChange={e => updateConfig('price', Number(e.target.value))} 
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-[10px] text-slate-500 mb-1">ทุน (Cost)</label>
                            <input 
                                className={`${inputClassName} h-8 text-sm`} 
                                type="number" min="0" 
                                placeholder={form.cost?.toString()}
                                value={config.cost || ''} 
                                onChange={e => updateConfig('cost', Number(e.target.value))} 
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] text-slate-500 mb-1">หัก GP (%)</label>
                            <input 
                                className={`${inputClassName} h-8 text-sm`} 
                                type="number" min="0" max="100"
                                placeholder="0"
                                value={config.gp || ''} 
                                onChange={e => updateConfig('gp', Number(e.target.value))} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <ModalLayout title={product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'} close={close}>
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Image Upload Section */}
                <div className="flex justify-center">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-32 h-32 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 hover:border-accent cursor-pointer flex flex-col items-center justify-center overflow-hidden relative group"
                    >
                        {form.image ? (
                            <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center p-2">
                                <Upload size={24} className="mx-auto text-slate-400 mb-1" />
                                <span className="text-[10px] text-slate-500">อัพโหลดรูปภาพ</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white text-xs">
                            แก้ไข
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    </div>
                </div>

                {/* 2. Basic Info */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">ข้อมูลทั่วไป</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={labelClassName}>ชื่อสินค้า</label>
                            <input className={inputClassName} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="เช่น ข้าวกะเพราไก่ไข่ดาว" />
                        </div>
                        <div>
                            <label className={labelClassName}>หมวดหมู่</label>
                            <select className={inputClassName} value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                                {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className={labelClassName}>รายละเอียด (Description)</label>
                            <textarea 
                                className={`${inputClassName} min-h-[80px]`} 
                                value={form.description || ''} 
                                onChange={e => setForm({...form, description: e.target.value})}
                                placeholder="รายละเอียดสินค้า ส่วนประกอบ หรือคำโฆษณา..."
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Pricing & Inventory */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">ราคาและคลังสินค้า</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClassName}>ราคาขายหน้าร้าน (บาท)</label>
                            <input className={inputClassName} type="number" required min="0" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className={labelClassName}>ต้นทุนต่อหน่วย (บาท)</label>
                            <input className={inputClassName} type="number" min="0" value={form.cost || 0} onChange={e => setForm({...form, cost: Number(e.target.value)})} />
                        </div>
                    </div>

                    {/* Delivery Pricing Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                            <Bike size={18} className="text-orange-500" />
                            <h4 className="font-semibold text-sm text-slate-700">ราคาแยกตามแพลตฟอร์ม Delivery (Optional)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {renderDeliveryInput('lineman', 'Line Man', 'border-green-200 text-green-700')}
                            {renderDeliveryInput('grab', 'GrabFood', 'border-emerald-200 text-emerald-700')}
                            {renderDeliveryInput('shopeefood', 'ShopeeFood', 'border-orange-200 text-orange-700')}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">* หากไม่ระบุ จะใช้ราคาขายและต้นทุนหน้าร้านเป็นหลัก</p>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={form.trackStock} 
                                    onChange={e => setForm({...form, trackStock: e.target.checked})} 
                                    className="rounded text-primary focus:ring-primary w-4 h-4"
                                />
                                ติดตามสต็อกสินค้าลงคลัง (Track Stock)
                            </label>
                        </div>
                        {form.trackStock && (
                            <div className="mt-2 animate-fade-in">
                                <label className={labelClassName}>จำนวนคงเหลือในคลัง</label>
                                <input 
                                    className={inputClassName} 
                                    type="number" 
                                    value={form.stock || 0} 
                                    onChange={e => setForm({...form, stock: Number(e.target.value)})} 
                                    placeholder="0"
                                />
                                <p className="text-xs text-slate-500 mt-1">ระบบจะตัดสต็อกเมื่อมีการขายสินค้าชิ้นนี้</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Composite / Bundle */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                         <h3 className="font-bold text-slate-800">รายการคอมโพสิต (Composite Product)</h3>
                         <label className="flex items-center gap-2 text-xs font-semibold text-purple-600 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={form.isComposite} 
                                onChange={e => setForm({...form, isComposite: e.target.checked})} 
                            />
                            เปิดใช้งาน
                        </label>
                    </div>
                    
                    {form.isComposite && (
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 animate-fade-in">
                            <p className="text-xs text-purple-700 mb-3">รวมสินค้าอื่น ๆ มาขายเป็นชุดเดียวกัน (เช่น Set Box)</p>
                            
                            <div className="flex gap-2 mb-3">
                                <select 
                                    className={`${inputClassName} flex-1`}
                                    value={compositeInput.productId}
                                    onChange={e => setCompositeInput({...compositeInput, productId: e.target.value})}
                                >
                                    <option value="">-- เลือกสินค้า --</option>
                                    {(allProducts || []).filter((p:Product) => p.id !== form.id).map((p:Product) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.price}฿)</option>
                                    ))}
                                </select>
                                <input 
                                    type="number" 
                                    className="w-20 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent"
                                    min="1"
                                    value={compositeInput.quantity}
                                    onChange={e => setCompositeInput({...compositeInput, quantity: Number(e.target.value)})}
                                />
                                <button type="button" onClick={addCompositeItem} className={btnSecondaryClassName}>เพิ่ม</button>
                            </div>

                            <div className="space-y-2">
                                {(form.compositeItems || []).map((item, idx) => {
                                    const pName = (allProducts || []).find((p:Product) => p.id === item.productId)?.name || 'Unknown';
                                    return (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-purple-100 text-sm">
                                            <span>{pName} x {item.quantity}</span>
                                            <button type="button" onClick={() => removeCompositeItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    );
                                })}
                                {(!form.compositeItems || form.compositeItems.length === 0) && (
                                    <div className="text-center text-xs text-slate-400 py-2">ยังไม่มีสินค้าในชุด</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Variants (Flavor) */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">ตัวแปรสินค้า (Variants/Flavor)</h3>
                    <p className="text-xs text-slate-500">เพิ่มตัวแปร เช่น รสชาติ, สี หรือแบบย่อย ที่ลูกค้าสามารถพิมพ์ระบุหรือเลือกได้</p>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex gap-2 mb-2 items-end">
                            <div className="flex-[2]">
                                <label className="text-[10px] text-slate-500 mb-1 block">ชื่อตัวแปร (เช่น รสสตรอเบอร์รี่)</label>
                                <input 
                                    className={inputClassName} 
                                    placeholder="ชื่อ..." 
                                    value={variantInput.name} 
                                    onChange={e => setVariantInput({...variantInput, name: e.target.value})}
                                    onKeyDown={e => {
                                        if(e.key === 'Enter') {
                                            e.preventDefault();
                                            addVariant();
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-500 mb-1 block">ราคาขาย</label>
                                <input 
                                    className={inputClassName} 
                                    type="number" 
                                    placeholder="0" 
                                    value={variantInput.price || 0} 
                                    onChange={e => setVariantInput({...variantInput, price: Number(e.target.value)})}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-500 mb-1 block">ต้นทุน</label>
                                <input 
                                    className={inputClassName} 
                                    type="number" 
                                    placeholder="0" 
                                    value={variantInput.cost || 0} 
                                    onChange={e => setVariantInput({...variantInput, cost: Number(e.target.value)})}
                                />
                            </div>
                            <button 
                                type="button" 
                                onClick={(e) => addVariant(e)} 
                                className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 h-[38px] flex items-center justify-center"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                        
                        <div className="space-y-1">
                            {(form.variants || []).map((v, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 text-sm">
                                    <div className="flex gap-4">
                                        <span className="font-medium">{v.name}</span>
                                        <span className="text-slate-500">ราคา: {v.price}</span>
                                        <span className="text-slate-500">ทุน: {v.cost || 0}</span>
                                    </div>
                                    <button type="button" onClick={() => removeVariant(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 6. Options */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">ตัวเลือกเพิ่มเติม (Options/Add-ons)</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
                        {optionGroups.map((g: ProductOptionGroup) => (
                            <label key={g.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                <input 
                                    type="checkbox" 
                                    checked={(form.optionGroupIds || []).includes(g.id)}
                                    onChange={() => toggleOptionGroup(g.id)}
                                    className="rounded text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-slate-700">{g.name}</span>
                            </label>
                        ))}
                        {optionGroups.length === 0 && <p className="text-xs text-slate-400">ยังไม่มีกลุ่มตัวเลือก</p>}
                    </div>
                </div>

                <div className="pt-4 sticky bottom-0 bg-white border-t border-slate-100">
                    <button type="submit" className={`${btnPrimaryClassName} w-full flex items-center justify-center gap-2`}>
                        <Save size={18} /> บันทึกข้อมูล
                    </button>
                </div>
            </form>
        </ModalLayout>
    );
};

const CategoryForm = ({ category, close, reload }: any) => {
    const [form, setForm] = useState<Partial<Category>>(category || { name: '', icon: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...form, id: category?.id || `cat_${Date.now()}` } as Category;
        if (category) dataService.updateCategory(payload);
        else dataService.addCategory(payload);
        reload();
        close();
    };

    return (
        <ModalLayout title={category ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'} close={close}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={labelClassName}>ชื่อหมวดหมู่</label>
                    <input className={inputClassName} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div>
                    <label className={labelClassName}>ไอคอน (Lucide Icon Name)</label>
                    <input className={inputClassName} value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} placeholder="เช่น Pizza, Coffee" />
                    <p className="text-xs text-slate-400 mt-1">ใช้ชื่อไอคอนจาก Lucide React Library</p>
                </div>
                <button type="submit" className={`${btnPrimaryClassName} w-full`}>บันทึก</button>
            </form>
        </ModalLayout>
    );
};

const OptionGroupForm = ({ group, close, reload }: any) => {
    const [form, setForm] = useState<Partial<ProductOptionGroup>>(group || { 
        name: '', required: false, allowMultiple: false, choices: [] 
    });
    const [choiceInput, setChoiceInput] = useState({ name: '', priceModifier: 0 });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...form, id: group?.id || `opt_${Date.now()}` } as ProductOptionGroup;
        if (group) dataService.updateOptionGroup(payload);
        else dataService.addOptionGroup(payload);
        reload();
        close();
    };

    const addChoice = () => {
        if(choiceInput.name) {
            setForm({
                ...form, 
                choices: [...(form.choices || []), { ...choiceInput }]
            });
            setChoiceInput({ name: '', priceModifier: 0 });
        }
    };

    const removeChoice = (idx: number) => {
        const newChoices = [...(form.choices || [])];
        newChoices.splice(idx, 1);
        setForm({ ...form, choices: newChoices });
    };

    return (
        <ModalLayout title={group ? 'แก้ไขกลุ่มตัวเลือก' : 'เพิ่มกลุ่มตัวเลือก'} close={close}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={labelClassName}>ชื่อกลุ่มตัวเลือก</label>
                    <input className={inputClassName} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="เช่น ระดับความหวาน, Toppings" />
                </div>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.required} onChange={e => setForm({...form, required: e.target.checked})} className="rounded text-primary focus:ring-primary" />
                        <span className="text-sm">จำเป็นต้องเลือก</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.allowMultiple} onChange={e => setForm({...form, allowMultiple: e.target.checked})} className="rounded text-primary focus:ring-primary" />
                        <span className="text-sm">เลือกได้หลายข้อ</span>
                    </label>
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <label className={labelClassName}>ตัวเลือกย่อย (Choices)</label>
                    <div className="flex gap-2 mb-2">
                        <input className={`${inputClassName} flex-[2]`} placeholder="ชื่อตัวเลือก" value={choiceInput.name} onChange={e => setChoiceInput({...choiceInput, name: e.target.value})} />
                        <input className={`${inputClassName} flex-1`} type="number" placeholder="+ราคา" value={choiceInput.priceModifier} onChange={e => setChoiceInput({...choiceInput, priceModifier: Number(e.target.value)})} />
                        <button type="button" onClick={addChoice} className={btnSecondaryClassName}><Plus size={18}/></button>
                    </div>
                    <div className="space-y-2 bg-slate-50 p-2 rounded-lg max-h-40 overflow-y-auto">
                        {(form.choices || []).map((c, i) => (
                            <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-sm">
                                <span>{c.name} {c.priceModifier > 0 ? `(+${c.priceModifier})` : ''}</span>
                                <button type="button" onClick={() => removeChoice(i)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                            </div>
                        ))}
                        {(!form.choices || form.choices.length === 0) && <p className="text-xs text-center text-slate-400">ยังไม่มีตัวเลือก</p>}
                    </div>
                </div>

                <button type="submit" className={`${btnPrimaryClassName} w-full`}>บันทึก</button>
            </form>
        </ModalLayout>
    );
};

const DiscountForm = ({ discount, categories, close, reload }: any) => {
    const [form, setForm] = useState<Partial<Discount>>(discount || { 
        name: '', type: 'PERCENT', value: 0, active: true, appliesTo: 'ALL', specificCategoryIds: []
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...form, id: discount?.id || `disc_${Date.now()}` } as Discount;
        if (discount) dataService.updateDiscount(payload);
        else dataService.addDiscount(payload);
        reload();
        close();
    };

    const toggleCategory = (catId: string) => {
        const current = form.specificCategoryIds || [];
        if(current.includes(catId)) {
            setForm({ ...form, specificCategoryIds: current.filter(id => id !== catId) });
        } else {
            setForm({ ...form, specificCategoryIds: [...current, catId] });
        }
    };

    return (
        <ModalLayout title={discount ? 'แก้ไขส่วนลด' : 'เพิ่มส่วนลด'} close={close}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={labelClassName}>ชื่อโปรโมชั่น/ส่วนลด</label>
                    <input className={inputClassName} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClassName}>ประเภท</label>
                        <select className={inputClassName} value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                            <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                            <option value="FIXED">จำนวนเงิน (บาท)</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClassName}>มูลค่า</label>
                        <input className={inputClassName} type="number" required value={form.value} onChange={e => setForm({...form, value: Number(e.target.value)})} />
                    </div>
                </div>
                
                <div>
                    <label className={labelClassName}>เงื่อนไขการใช้</label>
                    <select className={inputClassName} value={form.appliesTo} onChange={e => setForm({...form, appliesTo: e.target.value as any})}>
                        <option value="ALL">ใช้ได้กับทุกเมนู</option>
                        <option value="FOOD">เฉพาะอาหาร</option>
                        <option value="BEVERAGE">เฉพาะเครื่องดื่ม</option>
                    </select>
                </div>

                {/* Specific Category Selection (Optional) */}
                 <div className="border border-slate-100 rounded-lg p-3">
                    <label className="block text-xs font-bold text-slate-500 mb-2">ระบุหมวดหมู่ที่ร่วมรายการ (ถ้าไม่เลือก จะใช้ตามเงื่อนไขด้านบน)</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((c: Category) => (
                            <button
                                type="button"
                                key={c.id}
                                onClick={() => toggleCategory(c.id)}
                                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                                    (form.specificCategoryIds || []).includes(c.id)
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="rounded text-primary focus:ring-primary" />
                        <span className="text-sm font-medium">เปิดใช้งานทันที</span>
                    </label>
                </div>

                <button type="submit" className={`${btnPrimaryClassName} w-full`}>บันทึก</button>
            </form>
        </ModalLayout>
    );
};
