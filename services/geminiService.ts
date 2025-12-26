import { Order } from "../types";
import { supabase, isSupabaseConfigured } from './supabaseClient';

type ItemStats = { quantity: number; revenue: number };

const ensureDate = (value: Date | string) => value instanceof Date ? value : new Date(value);

const formatTime = (value: Date | string) => ensureDate(value).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
});

const extractResponseText = async (modelResponse: any): Promise<string> => {
    if (!modelResponse) return '';

    const resolveValue = async (value: any): Promise<string | null> => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'function') {
            return resolveValue(value());
        }
        if (typeof value.then === 'function') {
            const awaited = await value;
            return resolveValue(awaited);
        }
        return null;
    };

    const directSources = [
        modelResponse.text,
        modelResponse.response?.text
    ];

    for (const source of directSources) {
        const resolved = await resolveValue(source);
        if (resolved && resolved.trim()) return resolved.trim();
    }

    const textFields = [
        modelResponse.output_text,
        modelResponse.response?.output_text
    ];

    for (const field of textFields) {
        const resolved = await resolveValue(field);
        if (resolved && resolved.trim()) return resolved.trim();
    }

    const flattenCandidates = (nodes: any) => {
        if (!Array.isArray(nodes)) return '';
        return nodes
            .map((node: any) => {
                const parts = node?.content ?? node?.parts;
                if (!Array.isArray(parts)) return '';
                return parts.map((part: any) => part?.text ?? '').join('');
            })
            .filter(Boolean)
            .join('\n')
            .trim();
    };

    return (
        flattenCandidates(modelResponse.response?.candidates) ||
        flattenCandidates(modelResponse.output) ||
        ''
    );
};

export const generateShiftReport = async (orders: Order[]) => {
    try {
        if (!isSupabaseConfigured || !supabase) {
            console.warn("Supabase not configured for Gemini");
            return "ยังไม่ได้ตั้งค่า AI Server";
        }

        if (!orders || orders.length === 0) {
            return "ยังไม่มีข้อมูลออเดอร์สำหรับสร้างรายงาน";
        }

        const sortedOrders = [...orders].sort(
            (a, b) => ensureDate(a.createdAt).getTime() - ensureDate(b.createdAt).getTime()
        );

        const firstOrderTime = formatTime(sortedOrders[0].createdAt);
        const lastOrderTime = formatTime(sortedOrders[sortedOrders.length - 1].createdAt);
        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);

        const orderTypeSummary: Record<string, ItemStats> = {};
        const itemMap = new Map<string, ItemStats>();

        orders.forEach(order => {
            const typeStats = orderTypeSummary[order.type] || { quantity: 0, revenue: 0 };
            typeStats.quantity += 1;
            typeStats.revenue += order.total;
            orderTypeSummary[order.type] = typeStats;

            order.items.forEach(item => {
                const entry = itemMap.get(item.productName) || { quantity: 0, revenue: 0 };
                entry.quantity += item.quantity;
                entry.revenue += item.quantity * item.price;
                itemMap.set(item.productName, entry);
            });
        });

        const topItems = Array.from(itemMap.entries())
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 5)
            .map(([name, data]) => ({
                name,
                quantity: data.quantity,
                revenue: data.revenue
            }));

        const orderSnapshots = sortedOrders.slice(-15).map(order => ({
            orderNumber: order.orderNumber,
            total: order.total,
            type: order.type,
            channel: order.deliveryPlatform ?? (order.tableId ? `TABLE_${order.tableId}` : 'COUNTER'),
            time: formatTime(order.createdAt),
            items: order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')
        }));

        const structuredData = {
            timeframe: `${firstOrderTime} - ${lastOrderTime}`,
            totals: {
                orders: orders.length,
                sales: totalSales,
                avgPerOrder: totalSales / orders.length
            },
            orderTypes: Object.entries(orderTypeSummary).map(([type, data]) => ({
                type,
                count: data.quantity,
                revenue: data.revenue
            })),
            topItems,
            recentOrders: orderSnapshots
        };

        const prompt = `
คุณคือ AI ผู้ช่วยผู้จัดการร้านอาหาร หน้าที่คืออ่านข้อมูลยอดขายและสร้างสรุปภาษาไทยที่เข้าใจง่าย
ข้อมูลขาย (JSON): ${JSON.stringify(structuredData, null, 2)}

โปรดสรุปหัวข้อดังนี้:
1. ไฮไลต์ยอดขายรวมและจำนวนบิล (ให้ตัวเลขไทยพร้อมหน่วย)
2. Top 2-3 เมนูขายดีพร้อม insight สั้นๆ
3. คำแนะนำสำหรับกะถัดไป 2 ประโยค (เช่น ควรสต็อกอะไรเพิ่ม หรือโปรโมชันที่ควรดัน)

ใช้ภาษามืออาชีพ เป็นกันเอง และตอบกลับเป็น Markdown ที่อ่านง่าย
        `;

        const { data, error } = await supabase.functions.invoke('gemini', {
            body: { action: 'shift_report', prompt, model: 'gemini-2.5-flash' }
        });
        if (error) {
            console.error("Gemini Function Error:", error);
            return "เกิดข้อผิดพลาดในการสร้างรายงาน AI โปรดลองใหม่อีกครั้ง";
        }
        return data?.text || "ไม่สามารถสร้างรายงานได้ โปรดลองใหม่อีกครั้ง";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "เกิดข้อผิดพลาดในการสร้างรายงาน AI โปรดลองใหม่อีกครั้ง";
    }
};

export const chatWithStoreData = async (query: string, orders: Order[]) => {
    try {
        if (!isSupabaseConfigured || !supabase) {
            return "ยังไม่ได้ตั้งค่า AI Server";
        }

        // Reuse the logic to prepare data context
        // NOTE: In a real app we might want to refactor this data prep into a shared function
        // but for now we keep it self-contained to avoid breaking changes.

        let contextData = "ไม่มีข้อมูลยอดขาย";

        if (orders && orders.length > 0) {
            const sortedOrders = [...orders].sort(
                (a, b) => ensureDate(a.createdAt).getTime() - ensureDate(b.createdAt).getTime()
            );

            const totalSales = orders.reduce((sum, order) => sum + order.total, 0);

            // Simple Item Stats
            const itemMap = new Map<string, { quantity: number; revenue: number }>();
            orders.forEach(order => {
                order.items.forEach(item => {
                    const entry = itemMap.get(item.productName) || { quantity: 0, revenue: 0 };
                    entry.quantity += item.quantity;
                    entry.revenue += item.quantity * item.price;
                    itemMap.set(item.productName, entry);
                });
            });

            const topItems = Array.from(itemMap.entries())
                .sort((a, b) => b[1].quantity - a[1].quantity) // Sort by Quantity for "Popularity"
                .slice(0, 10)
                .map(([name, data]) => `${name} (${data.quantity} ที่, ฿${data.revenue})`);

            contextData = JSON.stringify({
                summary: {
                    totalOrders: orders.length,
                    totalSales: totalSales,
                    avgTicket: Math.round(totalSales / orders.length)
                },
                topSellingItems: topItems,
                lastOrderTime: formatTime(sortedOrders[sortedOrders.length - 1].createdAt)
            }, null, 2);
        }

        const prompt = `
คุณคือ "OmniBot" ผู้ช่วยจัดการร้านอาหารอัจฉริยะ 
หน้าที่ของคุณคือตอบคำถามเจ้าของร้านโดยใช้ข้อมูลจริงที่มี
ข้อมูลร้านปัจจุบัน (Context):
${contextData}

คำถามจากผู้ใช้: "${query}"

แนวทางการตอบ:
1. ตอบสั้นกระชับ (ไม่เกิน 3-4 บรรทัด) ยกเว้นถูกถามให้แจกแจงละเอียด
2. ใช้ภาษาไทยที่สุภาพ เป็นกันเอง และดูเป็นมืออาชีพ (ลงท้ายด้วย ครับ/ค่ะ ตามความเหมาะสม)
3. ถ้าข้อมูลไม่พอ ให้บอกตรงๆ ว่าไม่มีข้อมูลส่วนนั้น
4. ถ้าถูกถามเรื่องทั่วไปที่ไม่เกี่ยวกับร้าน ให้ตอบสั้นๆ และวกกลับมาเรื่องร้าน
`;

        const { data, error } = await supabase.functions.invoke('gemini', {
            body: { action: 'chat', prompt, model: 'gemini-2.5-flash' }
        });
        if (error) {
            console.error("Gemini Function Error:", error);
            return "ขออภัย ระบบไม่สามารถประมวลผลคำตอบได้ในขณะนี้";
        }
        return data?.text || "ขออภัย ระบบไม่สามารถประมวลผลคำตอบได้ในขณะนี้";

    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Assistant";
    }
};
