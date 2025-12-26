import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, Package, Sparkles, Layers, Percent, Calendar, Download, Clock } from 'lucide-react';
import { dataService } from '../services/dataService';
import { generateShiftReport } from '../services/geminiService';
import { PaymentMethod, OrderStatus } from '../types';
import { AIChatAssistant } from './AIChatAssistant';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

type DateRange = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL';
type ReportSectionId = 'SUMMARY' | 'PRODUCTS' | 'CATEGORIES' | 'STAFF' | 'PAYMENTS' | 'RECEIPTS' | 'OPTIONS';

export const Dashboard: React.FC = () => {
    // Get Data
    const allOrders = dataService.getOrders();
    const products = dataService.getProducts();
    const ingredients = dataService.getIngredients();
    const categories = dataService.getCategories();
    const shifts = dataService.getShifts();

    const [dateRange, setDateRange] = useState<DateRange>('TODAY');
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [activeReport, setActiveReport] = useState<ReportSectionId>('SUMMARY');

    const reportSections: { id: ReportSectionId; label: string }[] = [
        { id: 'SUMMARY', label: 'สรุปรายงาน' },
        { id: 'PRODUCTS', label: 'ยอดขายตามสินค้า' },
        { id: 'CATEGORIES', label: 'ยอดขายตามหมวดหมู่' },
        { id: 'OPTIONS', label: 'ยอดขายตามการตั้งค่า' },
    ];

    // --- FILTER LOGIC ---
    const filteredOrders = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return allOrders.filter(o => {
            // Basic Status Filter
            if (o.status === OrderStatus.CANCELLED) return false;

            const orderDate = new Date(o.createdAt);

            switch (dateRange) {
                case 'TODAY':
                    return orderDate >= startOfDay;
                case 'YESTERDAY':
                    const yesterStart = new Date(startOfDay);
                    yesterStart.setDate(yesterStart.getDate() - 1);
                    const yesterEnd = new Date(startOfDay);
                    return orderDate >= yesterStart && orderDate < yesterEnd;
                case 'WEEK':
                    const weekStart = new Date(startOfDay);
                    weekStart.setDate(weekStart.getDate() - 7);
                    return orderDate >= weekStart;
                case 'MONTH':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    return orderDate >= monthStart;
                case 'ALL':
                default:
                    return true;
            }
        });
    }, [allOrders, dateRange]);

    // --- STATISTICS ---
    const totalSales = useMemo(() => filteredOrders.reduce((sum, o) => sum + o.total, 0), [filteredOrders]);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // --- CHARTS DATA ---

    // 1. Sales Trend (Hourly for Today/Yesterday, Daily for Week/Month)
    const salesTrendData = useMemo(() => {
        if (dateRange === 'WEEK' || dateRange === 'MONTH' || dateRange === 'ALL') {
            // Daily Grouping
            const dailyData: Record<string, { date: string, sales: number }> = {};
            filteredOrders.forEach(o => {
                const dateKey = new Date(o.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
                if (!dailyData[dateKey]) dailyData[dateKey] = { date: dateKey, sales: 0 };
                dailyData[dateKey].sales += o.total;
            });
            return Object.values(dailyData);
        } else {
            // Hourly Grouping
            const hours = new Array(24).fill(0).map((_, i) => ({
                name: `${i}:00`,
                sales: 0
            }));
            filteredOrders.forEach(order => {
                const h = new Date(order.createdAt).getHours();
                if (hours[h]) hours[h].sales += order.total;
            });
            // Show operating hours
            return hours.slice(8, 23);
        }
    }, [filteredOrders, dateRange]);

    // 2. Sales by Category
    const categorySalesData = useMemo(() => {
        const catStats: Record<string, number> = {};

        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const cat = categories.find(c => c.id === product.categoryId);
                    const catName = cat ? cat.name : 'อื่นๆ';
                    catStats[catName] = (catStats[catName] || 0) + (item.price * item.quantity);
                }
            });
        });

        return Object.entries(catStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredOrders, products, categories]);

    // 4. Top Selling Products
    const topProductsData = useMemo(() => {
        const productStats: Record<string, { name: string, qty: number, total: number }> = {};
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                const key = item.productId;
                if (!productStats[key]) productStats[key] = { name: item.productName, qty: 0, total: 0 };
                productStats[key].qty += item.quantity;
                productStats[key].total += item.price * item.quantity;
            });
        });
        return Object.values(productStats).sort((a, b) => b.qty - a.qty).slice(0, 5);
    }, [filteredOrders]);

    // -- Stock Value (Global, not filtered by date)
    const stockValue = useMemo(() => ingredients.reduce((sum, ing) => sum + (ing.currentStock * (ing.costPerUnit || 0)), 0), [ingredients]);

    // -- Est Profit
    const estimatedProfit = useMemo(() => {
        let cost = 0;
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const itemCost = product.recipe.reduce((sum, rItem) => {
                        const ing = ingredients.find(i => i.id === rItem.ingredientId);
                        return sum + ((ing?.costPerUnit || 0) * rItem.quantity);
                    }, 0);
                    cost += itemCost * item.quantity;
                }
            });
        });
        return totalSales - cost;
    }, [filteredOrders, products, ingredients]);

    const productSalesData = useMemo(() => {
        const productStats: Record<string, { name: string, qty: number, total: number }> = {};
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                if (!productStats[item.productId]) {
                    productStats[item.productId] = { name: item.productName, qty: 0, total: 0 };
                }
                productStats[item.productId].qty += item.quantity;
                productStats[item.productId].total += item.price * item.quantity;
            });
        });
        return Object.values(productStats).sort((a, b) => b.total - a.total);
    }, [filteredOrders]);

    const paymentSalesData = useMemo(() => {
        const paymentStats: Record<string, { count: number, total: number }> = {};
        filteredOrders.forEach(order => {
            const method = order.paymentMethod || 'UNKNOWN';
            if (!paymentStats[method]) paymentStats[method] = { count: 0, total: 0 };
            paymentStats[method].count += 1;
            paymentStats[method].total += order.total;
        });
        return Object.entries(paymentStats).map(([method, stats]) => ({
            method,
            count: stats.count,
            total: stats.total
        })).sort((a, b) => b.total - a.total);
    }, [filteredOrders]);

    const optionSalesData = useMemo(() => {
        const optionStats: Record<string, { name: string, qty: number, total: number }> = {};
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                item.selectedOptions?.forEach(option => {
                    const key = `${option.groupName} - ${option.choiceName}`;
                    if (!optionStats[key]) {
                        optionStats[key] = { name: key, qty: 0, total: 0 };
                    }
                    optionStats[key].qty += item.quantity;
                    optionStats[key].total += option.priceModifier * item.quantity;
                });
            });
        });
        return Object.values(optionStats).sort((a, b) => b.total - a.total);
    }, [filteredOrders]);

    const staffShiftData = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const isInRange = (date: Date) => {
            switch (dateRange) {
                case 'TODAY':
                    return date >= startOfDay;
                case 'YESTERDAY': {
                    const yesterStart = new Date(startOfDay);
                    yesterStart.setDate(yesterStart.getDate() - 1);
                    const yesterEnd = new Date(startOfDay);
                    return date >= yesterStart && date < yesterEnd;
                }
                case 'WEEK': {
                    const weekStart = new Date(startOfDay);
                    weekStart.setDate(weekStart.getDate() - 7);
                    return date >= weekStart;
                }
                case 'MONTH': {
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    return date >= monthStart;
                }
                case 'ALL':
                default:
                    return true;
            }
        };

        const shiftStats: Record<string, { staffName: string, shifts: number, totalCash: number }> = {};
        shifts.forEach(shift => {
            if (!isInRange(new Date(shift.startTime))) return;
            if (!shiftStats[shift.staffId]) {
                shiftStats[shift.staffId] = { staffName: shift.staffName, shifts: 0, totalCash: 0 };
            }
            shiftStats[shift.staffId].shifts += 1;
            shiftStats[shift.staffId].totalCash += shift.totalCashSales || 0;
        });

        return Object.values(shiftStats).sort((a, b) => b.totalCash - a.totalCash);
    }, [shifts, dateRange]);

    const formatPaymentMethod = (method?: PaymentMethod | string) => {
        switch (method) {
            case PaymentMethod.CASH:
                return 'เงินสด';
            case PaymentMethod.CREDIT_CARD:
                return 'บัตรเครดิต';
            case PaymentMethod.PROMPTPAY:
                return 'พร้อมเพย์';
            case PaymentMethod.QR_CODE:
                return 'สแกน QR';
            case PaymentMethod.TRANSFER:
                return 'โอนเงิน';
            case 'UNKNOWN':
            default:
                return 'ไม่ระบุ';
        }
    };

    const handleGenerateReport = async () => {
        setLoadingAi(true);
        const report = await generateShiftReport(filteredOrders); // Send filtered orders to AI
        setAiReport(report);
        setLoadingAi(false);
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 font-sans">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="text-primary" /> สรุปผลการดำเนินงาน (Dashboard)
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">วิเคราะห์ยอดขายและแนวโน้มธุรกิจของคุณ</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 px-3 py-2 text-slate-500 text-sm font-medium border-r border-slate-100">
                        <Calendar size={16} /> ช่วงเวลา:
                    </div>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as DateRange)}
                        className="bg-transparent text-slate-700 font-bold text-sm focus:outline-none cursor-pointer py-1 pr-2"
                    >
                        <option value="TODAY">วันนี้ (Today)</option>
                        <option value="YESTERDAY">เมื่อวาน (Yesterday)</option>
                        <option value="WEEK">7 วันล่าสุด (This Week)</option>
                        <option value="MONTH">เดือนนี้ (This Month)</option>
                        <option value="ALL">ทั้งหมด (All Time)</option>
                    </select>
                </div>

                <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                    <Download size={16} /> ส่งออกไฟล์ (Export)
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">หัวข้อรายงาน</h2>
                <p className="text-sm text-slate-500 mb-3">เลือกหัวข้อที่ต้องการแสดง</p>
                <div className="flex flex-wrap gap-2 text-slate-700 font-semibold">
                    {reportSections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveReport(section.id)}
                            className={`px-3 py-2 rounded-lg transition-colors border ${activeReport === section.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                            aria-pressed={activeReport === section.id}
                        >
                            {section.label}
                        </button>
                    ))}
                </div>
            </div>
            <div>
            {activeReport === 'SUMMARY' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <KPICard
                            title="ยอดขายรวม (Total Sales)"
                            value={`฿${totalSales.toLocaleString()}`}
                            subValue={`${totalOrders} ออเดอร์`}
                            icon={<DollarSign size={24} />}
                            color="green"
                        />
                        <KPICard
                            title="กำไรโดยประมาณ (Est. Profit)"
                            value={`฿${estimatedProfit.toLocaleString()}`}
                            subValue={`กำไร ${(totalSales > 0 ? (estimatedProfit / totalSales) * 100 : 0).toFixed(1)}%`}
                            icon={<Wallet size={24} />}
                            color="teal"
                        />
                        <KPICard
                            title="ยอดเฉลี่ยต่อบิล (Avg. Ticket)"
                            value={`฿${avgOrderValue.toFixed(0)}`}
                            subValue="บาท / ออเดอร์"
                            icon={<Percent size={24} />}
                            color="blue"
                        />
                        <KPICard
                            title="มูลค่าสต็อก (Inventory)"
                            value={`฿${stockValue.toLocaleString()}`}
                            subValue="ทุนจมในวัตถุดิบ"
                            icon={<Layers size={24} />}
                            color="orange"
                        />
                    </div>

                    {/* Main Charts Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Sales Trend Chart */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 text-lg">แนวโน้มยอดขาย ({dateRange === 'TODAY' || dateRange === 'YESTERDAY' ? 'รายชั่วโมง' : 'รายวัน'})</h3>
                            </div>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={salesTrendData}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey={dateRange === 'WEEK' || dateRange === 'MONTH' ? 'date' : 'name'} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `฿${value}`} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดขาย']}
                                        />
                                        <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Sales by Category (Pie) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 text-lg mb-4">สัดส่วนตามหมวดหมู่สินค้า</h3>
                            <div className="h-[300px] flex flex-col items-center justify-center">
                                {categorySalesData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categorySalesData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {categorySalesData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(val: number) => `฿${val.toLocaleString()}`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-slate-400 flex flex-col items-center">
                                        <Package size={48} className="mb-2 opacity-20" />
                                        <p>ไม่มีข้อมูลการขาย</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Drill Down: Top Products & Recent Orders */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Top Products */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                <Sparkles className="text-yellow-500" size={20} /> เมนูขายดี (Top Items)
                            </h3>
                            <div className="space-y-5">
                                {topProductsData.map((item, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-slate-700">{item.name}</span>
                                                <span className="font-medium text-slate-900">{item.qty} ที่</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-yellow-400 rounded-full"
                                                    style={{ width: `${(item.qty / (topProductsData[0]?.qty || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right min-w-[80px]">
                                            <span className="text-xs text-slate-400">ยอดรวม</span>
                                            <div className="font-bold text-slate-700">฿{item.total.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Transaction Table */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                            <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                <Clock className="text-slate-500" size={20} /> รายการล่าสุด (Recent Transactions)
                            </h3>
                            <div className="flex-1 overflow-auto -mx-2 px-2">
                                <table className="w-full text-sm">
                                    <thead className="text-slate-500 border-b border-slate-100">
                                        <tr>
                                            <th className="text-left font-medium py-2">เวลา</th>
                                            <th className="text-left font-medium py-2">โต๊ะ</th>
                                            <th className="text-right font-medium py-2">ยอดเงิน</th>
                                            <th className="text-center font-medium py-2">สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredOrders.slice().reverse().slice(0, 8).map(order => (
                                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 text-slate-600">
                                                    {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-3 font-medium text-slate-800">
                                                    {order.type === 'DINE_IN' ? dataService.getTable(order.tableId || '')?.name || 'โต๊ะที่ไม่ระบุ' : 'กลับบ้าน'}
                                                </td>
                                                <td className="py-3 text-right font-bold text-slate-800">
                                                    ฿{order.total.toLocaleString()}
                                                </td>
                                                <td className="py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {order.status === 'COMPLETED' ? 'สำเร็จ' : order.status === 'CANCELLED' ? 'ยกเลิก' : order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredOrders.length === 0 && <p className="text-center text-slate-400 py-8">ไม่มีรายการในช่วงเวลานี้</p>}
                            </div>
                        </div>
                    </div>

                    {/* AI Report Section */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                    <Sparkles className="text-yellow-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">วิเคราะห์ผลประกอบการด้วย Gemini AI</h2>
                                    <p className="text-slate-400 text-sm">ผู้ช่วยอัจฉริยะวิเคราะห์ยอดขายและแนะนำกลยุทธ์</p>
                                </div>
                            </div>
                            <button
                                onClick={handleGenerateReport}
                                disabled={loadingAi}
                                className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg"
                            >
                                {loadingAi ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={16} />}
                                {loadingAi ? 'กำลังวิเคราะห์ข้อมูล...' : 'วิเคราะห์ข้อมูลเดี๋ยวนี้'}
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 min-h-[100px] text-slate-200 leading-relaxed font-light">
                            {aiReport ? (
                                <div className="whitespace-pre-line animate-fade-in">{aiReport}</div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-white/30 gap-3">
                                    <Sparkles size={32} />
                                    <p>กดปุ่ม "วิเคราะห์ข้อมูลเดี๋ยวนี้" เพื่อให้ AI ช่วยสรุปภาพรวมและหาโอกาสทางธุรกิจ</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Chat Assistant Widget */}
                    <AIChatAssistant orders={filteredOrders} />
                </>
            )}

            {activeReport === 'PRODUCTS' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 text-lg mb-4">ยอดขายตามสินค้า</h3>
                    <div className="overflow-auto -mx-2 px-2">
                        <table className="w-full text-sm">
                            <thead className="text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="text-left font-medium py-2">สินค้า</th>
                                    <th className="text-right font-medium py-2">จำนวน</th>
                                    <th className="text-right font-medium py-2">ยอดขาย</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {productSalesData.map(item => (
                                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 text-slate-700 font-medium">{item.name}</td>
                                        <td className="py-3 text-right text-slate-700">{item.qty}</td>
                                        <td className="py-3 text-right font-bold text-slate-800">฿{item.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {productSalesData.length === 0 && <p className="text-center text-slate-400 py-8">ไม่มีข้อมูลการขาย</p>}
                    </div>
                </div>
            )}

            {activeReport === 'CATEGORIES' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 text-lg mb-4">สัดส่วนตามหมวดหมู่สินค้า</h3>
                        <div className="h-[320px] flex flex-col items-center justify-center">
                            {categorySalesData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categorySalesData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={95}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categorySalesData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => `฿${val.toLocaleString()}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-slate-400 flex flex-col items-center">
                                    <Package size={48} className="mb-2 opacity-20" />
                                    <p>ไม่มีข้อมูลการขาย</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 text-lg mb-4">รายการหมวดหมู่</h3>
                        <div className="overflow-auto -mx-2 px-2">
                            <table className="w-full text-sm">
                                <thead className="text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="text-left font-medium py-2">หมวดหมู่</th>
                                        <th className="text-right font-medium py-2">ยอดขาย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {categorySalesData.map(item => (
                                        <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 text-slate-700 font-medium">{item.name}</td>
                                            <td className="py-3 text-right font-bold text-slate-800">฿{item.value.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {categorySalesData.length === 0 && <p className="text-center text-slate-400 py-8">ไม่มีข้อมูลการขาย</p>}
                        </div>
                    </div>
                </div>
            )}

            {activeReport === 'STAFF' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 text-lg mb-4">ยอดขายแยกตามพนักงาน (จากยอดเงินสดในกะ)</h3>
                    <div className="overflow-auto -mx-2 px-2">
                        <table className="w-full text-sm">
                            <thead className="text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="text-left font-medium py-2">พนักงาน</th>
                                    <th className="text-right font-medium py-2">จำนวนกะ</th>
                                    <th className="text-right font-medium py-2">ยอดเงินสด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {staffShiftData.map(item => (
                                    <tr key={item.staffName} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 text-slate-700 font-medium">{item.staffName}</td>
                                        <td className="py-3 text-right text-slate-700">{item.shifts}</td>
                                        <td className="py-3 text-right font-bold text-slate-800">฿{item.totalCash.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {staffShiftData.length === 0 && <p className="text-center text-slate-400 py-8">ไม่มีข้อมูลกะในช่วงเวลานี้</p>}
                    </div>
                </div>
            )}

            {activeReport === 'PAYMENTS' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 text-lg mb-4">ยอดขายแยกตามประเภทการชำระเงิน</h3>
                    <div className="overflow-auto -mx-2 px-2">
                        <table className="w-full text-sm">
                            <thead className="text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="text-left font-medium py-2">ช่องทาง</th>
                                    <th className="text-right font-medium py-2">จำนวนบิล</th>
                                    <th className="text-right font-medium py-2">ยอดขาย</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paymentSalesData.map(item => (
                                    <tr key={item.method} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 text-slate-700 font-medium">{formatPaymentMethod(item.method)}</td>
                                        <td className="py-3 text-right text-slate-700">{item.count}</td>
                                        <td className="py-3 text-right font-bold text-slate-800">฿{item.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {paymentSalesData.length === 0 && <p className="text-center text-slate-400 py-8">ไม่มีข้อมูลการชำระเงิน</p>}
                    </div>
                </div>
            )}

            {activeReport === 'RECEIPTS' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 text-lg mb-4">ใบเสร็จรับเงิน</h3>
                    <div className="overflow-auto -mx-2 px-2">
                        <table className="w-full text-sm">
                            <thead className="text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="text-left font-medium py-2">เลขที่บิล</th>
                                    <th className="text-left font-medium py-2">เวลา</th>
                                    <th className="text-right font-medium py-2">ยอดเงิน</th>
                                    <th className="text-right font-medium py-2">ชำระเงิน</th>
                                    <th className="text-right font-medium py-2">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredOrders.slice().reverse().map(order => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 text-slate-700 font-medium">{order.orderNumber}</td>
                                        <td className="py-3 text-slate-600">
                                            {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-3 text-right font-bold text-slate-800">฿{order.total.toLocaleString()}</td>
                                        <td className="py-3 text-right text-slate-700">{formatPaymentMethod(order.paymentMethod)}</td>
                                        <td className="py-3 text-right">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                {order.status === 'COMPLETED' ? 'สำเร็จ' : order.status === 'CANCELLED' ? 'ยกเลิก' : order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredOrders.length === 0 && <p className="text-center text-slate-400 py-8">ไม่มีใบเสร็จในช่วงเวลานี้</p>}
                    </div>
                </div>
            )}

            {activeReport === 'OPTIONS' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 text-lg mb-4">ยอดขายแยกตามตัวเลือกเพิ่มเติม</h3>
                    <div className="overflow-auto -mx-2 px-2">
                        <table className="w-full text-sm">
                            <thead className="text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="text-left font-medium py-2">ตัวเลือก</th>
                                    <th className="text-right font-medium py-2">จำนวน</th>
                                    <th className="text-right font-medium py-2">ยอดเพิ่ม</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {optionSalesData.map(item => (
                                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 text-slate-700 font-medium">{item.name}</td>
                                        <td className="py-3 text-right text-slate-700">{item.qty}</td>
                                        <td className="py-3 text-right font-bold text-slate-800">฿{item.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {optionSalesData.length === 0 && <p className="text-center text-slate-400 py-8">ไม่มีข้อมูลตัวเลือกเพิ่มเติม</p>}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

// Helper Component for consistency
const KPICard = ({ title, value, subValue, icon, color }: { title: string, value: string, subValue: string, icon: React.ReactNode, color: string }) => {
    const colorStyles: Record<string, string> = {
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        orange: 'bg-orange-50 text-orange-600',
        teal: 'bg-teal-50 text-teal-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorStyles[color] || 'bg-slate-50 text-slate-600'}`}>
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
                <p className="text-xs text-slate-400 mt-2 font-medium">{subValue}</p>
            </div>
        </div>
    );
};

// Simple Wallet Icon
const Wallet = ({ size, className }: { size: number, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
);
