import React from 'react';
import {
    Armchair,
    UtensilsCrossed,
    ClipboardList,
    Bike,
    History,
    Package,
    Tags,
    BarChart,
    Settings,
    LogOut,
    Lock,
    Unlock
} from 'lucide-react';
import { Staff, Role, Shift } from '../types';

interface SidebarProps {
    currentTab: string;
    setTab: (tab: string) => void;
    showKDS: boolean;
    currentUser: Staff | null;
    currentShift: Shift | undefined;
    onToggleShift: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setTab, showKDS, currentUser, currentShift, onToggleShift }) => {

    // Permission Helper
    const hasPermission = (perm: string) => {
        if (!currentUser) return false;
        if (currentUser.role === Role.ADMIN) return true; // Admin has all access

        // If permissions are explicitly defined, use them
        if (currentUser.permissions && currentUser.permissions.length > 0) {
            return currentUser.permissions.includes(perm);
        }

        // Fallback for legacy users or undefined permissions (Default Roles)
        if (currentUser.role === Role.MANAGER) return true;
        if (currentUser.role === Role.STAFF) {
            // Staff defaults
            return ['access_pos', 'access_kitchen'].includes(perm);
        }
        return false;
    };

    const allNavItems = [
        { id: 'tables', icon: <Armchair size={24} />, label: 'การจัดการโต๊ะ', desc: 'ผังร้านและสถานะ', perm: 'access_pos' },
        { id: 'pos', icon: <UtensilsCrossed size={24} />, label: 'สั่งและชำระเงิน', desc: 'แคชเชียร์/ขาย', perm: 'access_pos' },
        { id: 'active_orders', icon: <ClipboardList size={24} />, label: 'ออเดอร์ที่เปิดอยู่', desc: 'รายการส่งครัว', perm: 'access_kitchen' },
        { id: 'history', icon: <History size={24} />, label: 'ประวัติใบเสร็จ', desc: 'ค้นหา/ยกเลิกบิล', perm: 'access_history' },
        { id: 'inventory', icon: <Package size={24} />, label: 'สินค้าคงคลัง', desc: 'วัตถุดิบ/Stock', perm: 'access_inventory' },
        { id: 'menu', icon: <Tags size={24} />, label: 'เมนูและโปรโมชั่น', desc: 'จัดการสินค้า', perm: 'access_menu' },
        { id: 'reports', icon: <BarChart size={24} />, label: 'รายงาน', desc: 'วิเคราะห์ยอดขาย', perm: 'access_reports' },
        { id: 'settings', icon: <Settings size={24} />, label: 'ตั้งค่า', desc: 'ตั้งค่าระบบ', perm: 'access_settings' },
    ];

    // Filter Items
    const navItems = allNavItems.filter(item => hasPermission(item.perm));

    // Add Logout Button manually at the end
    const logoutItem = { id: 'pin', icon: <LogOut size={24} />, label: 'กลับไปสู่หน้า PIN', desc: 'ออกจากระบบ' };

    return (
        <div className="w-20 lg:w-72 bg-slate-900 text-slate-400 flex flex-col h-full shadow-2xl transition-all duration-300 font-kanit z-20">
            {/* Header / Logo */}
            <div className="p-4 flex items-center justify-center lg:justify-start border-b border-slate-800 h-20 flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg">L</div>
                <div className="hidden lg:block ml-3">
                    <div className="font-bold text-lg text-white leading-none">Laothini</div>
                    <div className="text-[10px] text-slate-500 mt-1">by FoodStory</div>
                </div>
            </div>

            {/* Navigation List (Scrollable) */}
            <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3 custom-scrollbar">
                {navItems.map((item, index) => {
                    const isActive = currentTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            className={`w-full flex items-center p-3 rounded-xl transition-all relative group mb-1
                                ${isActive
                                    ? 'bg-slate-800 text-white shadow-md'
                                    : 'hover:bg-slate-800/50 hover:text-white'}`}
                        >
                            {/* Active Indicator */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-orange-500 rounded-r-full"></div>
                            )}

                            {/* Icon */}
                            <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-orange-500' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                {item.icon}
                            </span>

                            {/* Text Content */}
                            <div className="hidden lg:flex flex-col items-start ml-4 overflow-hidden">
                                <span className={`text-sm font-semibold tracking-wide ${isActive ? 'text-white' : 'text-slate-300'}`}>
                                    {index + 1}. {item.label}
                                </span>
                                <span className="text-[10px] text-slate-500 truncate group-hover:text-slate-400">
                                    {item.desc}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-800 space-y-2">
                {/* Shift Button */}
                {currentUser && (
                    <button
                        onClick={onToggleShift}
                        className={`w-full flex items-center p-3 rounded-xl transition-all group ${currentShift
                                ? 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-red-900/50'
                                : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/50'
                            }`}
                        title={currentShift ? "ปิดกะ (Close Shift)" : "เปิดกะ (Open Shift)"}
                    >
                        <span className={`flex-shrink-0 ${currentShift ? 'text-red-400' : 'text-green-500'}`}>
                            {currentShift ? <Lock size={20} /> : <Unlock size={20} />}
                        </span>
                        <div className="hidden lg:flex flex-col items-start ml-3">
                            <span className={`text-xs font-bold ${currentShift ? 'text-slate-300 group-hover:text-red-300' : 'text-green-400 group-hover:text-green-300'}`}>
                                {currentShift ? 'ปิดกะ (Close Shift)' : 'เปิดกะ (Open Shift)'}
                            </span>
                            {currentShift && <span className="text-[10px] text-slate-500">ID: {currentShift.id.slice(-6)}</span>}
                        </div>
                    </button>
                )}

                <button
                    onClick={() => setTab(logoutItem.id)}
                    className="w-full flex items-center p-3 rounded-xl hover:bg-red-900/20 hover:text-red-400 text-slate-500 transition-all group"
                >
                    <span className="flex-shrink-0">{logoutItem.icon}</span>
                    <div className="hidden lg:flex flex-col items-start ml-4">
                        <span className="text-sm font-semibold">{logoutItem.label}</span>
                    </div>
                </button>
                <div className="text-center text-[10px] text-slate-700 mt-2">
                    v1.0.0
                </div>
            </div>
        </div>
    );
};