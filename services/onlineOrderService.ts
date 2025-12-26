import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Order, OrderItem, OrderStatus, OrderType, PaymentMethod, Table } from '../types';

type DbTable = {
    id: string;
    name: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
    capacity: number;
    current_order_id?: string | null;
    qr_token?: string | null;
};

type DbOrder = {
    id: string;
    order_number: string;
    table_id?: string | null;
    type: OrderType;
    status: OrderStatus;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    created_at: string;
    payment_method?: PaymentMethod | null;
};

const requireSupabase = () => {
    if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured');
    }
    return supabase;
};

const mapTable = (table: DbTable): Table => ({
    id: table.id,
    name: table.name,
    status: table.status,
    capacity: table.capacity,
    currentOrderId: table.current_order_id || undefined,
    qrToken: table.qr_token || undefined
});

const mapOrder = (order: DbOrder): Order => ({
    id: order.id,
    orderNumber: order.order_number,
    tableId: order.table_id || undefined,
    type: order.type,
    status: order.status,
    subtotal: order.subtotal,
    tax: order.tax,
    discount: order.discount,
    total: order.total,
    createdAt: new Date(order.created_at),
    paymentMethod: order.payment_method || undefined,
    items: []
});

export const getTableById = async (tableId: string) => {
    const client = requireSupabase();
    const { data, error } = await client
        .from('tables')
        .select('*')
        .eq('id', tableId)
        .maybeSingle();
    if (error) throw error;
    return data ? mapTable(data as DbTable) : null;
};

export const getOrderById = async (orderId: string) => {
    const client = requireSupabase();
    const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
    if (error) throw error;
    return data ? mapOrder(data as DbOrder) : null;
};

export const createOrder = async (order: Order, items: OrderItem[]) => {
    const client = requireSupabase();
    const { data, error } = await client
        .from('orders')
        .insert({
            order_number: order.orderNumber,
            table_id: order.tableId || null,
            type: order.type,
            status: order.status,
            subtotal: order.subtotal,
            tax: order.tax,
            discount: order.discount,
            total: order.total,
            created_at: order.createdAt.toISOString(),
            payment_method: order.paymentMethod || null
        })
        .select('id')
        .single();
    if (error) throw error;

    const orderId = data.id as string;
    if (items.length > 0) {
        const { error: itemError } = await client.from('order_items').insert(
            items.map(item => ({
                order_id: orderId,
                product_id: item.productId,
                product_name: item.productName,
                quantity: item.quantity,
                price: item.price,
                status: item.status,
                notes: item.notes || null,
                selected_options: item.selectedOptions || []
            }))
        );
        if (itemError) throw itemError;
    }

    if (order.tableId) {
        await client
            .from('tables')
            .update({ status: 'OCCUPIED', current_order_id: orderId })
            .eq('id', order.tableId);
    }

    return orderId;
};

export const appendOrderItems = async (orderId: string, items: OrderItem[], totals: { subtotal: number; tax: number; total: number; discount: number; }) => {
    const client = requireSupabase();
    if (items.length > 0) {
        const { error: itemError } = await client.from('order_items').insert(
            items.map(item => ({
                order_id: orderId,
                product_id: item.productId,
                product_name: item.productName,
                quantity: item.quantity,
                price: item.price,
                status: item.status,
                notes: item.notes || null,
                selected_options: item.selectedOptions || []
            }))
        );
        if (itemError) throw itemError;
    }

    const { error } = await client
        .from('orders')
        .update({
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            discount: totals.discount
        })
        .eq('id', orderId);
    if (error) throw error;
};

export const subscribeToOrderStatus = (orderId: string, onUpdate: (status: OrderStatus) => void) => {
    if (!isSupabaseConfigured || !supabase) return () => {};
    const channel = supabase
        .channel(`order-status-${orderId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
            payload => {
                const updated = payload.new as DbOrder;
                if (updated?.status) onUpdate(updated.status);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};
