import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, MessageSquare, MonitorStop, RefreshCw } from 'lucide-react';
import { chatWithStoreData } from '../services/geminiService';
import { Order } from '../types';

interface AIChatAssistantProps {
    orders: Order[];
}

interface Message {
    id: string;
    role: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

export const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ orders }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'ai',
            text: 'สวัสดีครับ! ผมคือ OmniBot ผู้ช่วยอัจฉริยะ 🤖 มีอะไรให้ผมช่วยเช็คยอดขายหรือข้อมูลร้านไหมครับ?',
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsTyping(true);

        try {
            const reply = await chatWithStoreData(userMessage.text, orders);
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: reply,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'ai',
                text: 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ ลองถามใหม่นะครับ',
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestions = [
        "ยอดขายวันนี้เท่าไหร่?",
        "เมนูไหนขายดีสุด?",
        "เปรียบเทียบยอดขายกับเมื่อวาน",
        "สรุปภาพรวมให้หน่อย"
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[350px] md:w-[400px] h-[500px] flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                                <Sparkles size={18} className="text-yellow-300" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">OmniBot Assistant</h3>
                                <div className="text-[10px] text-blue-100 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                    Online
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-sm'
                                            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'
                                        }`}
                                >
                                    {msg.text}
                                    <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                                        {msg.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions Area (Only show if few messages) */}
                    {messages.length < 3 && (
                        <div className="px-4 py-2 bg-slate-50 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setInputText(s);
                                        // Optional: Auto send immediately
                                        // handleSend(); 
                                    }}
                                    className="whitespace-nowrap px-3 py-1 bg-white border border-blue-100 text-blue-600 text-xs rounded-full hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-slate-100">
                        <div className="flex gap-2 items-center bg-slate-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="ถามเกี่ยวกับยอดขาย..."
                                className="flex-1 bg-transparent text-sm focus:outline-none text-slate-700 placeholder:text-slate-400"
                                disabled={isTyping}
                                autoFocus
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputText.trim() || isTyping}
                                className={`p-1.5 rounded-full transition-all ${inputText.trim() && !isTyping
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-700 rotate-90' : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                    }`}
            >
                {isOpen ? (
                    <X className="text-white" size={24} />
                ) : (
                    <div className="relative">
                        <Sparkles className="text-white absolute -top-1 -right-1 animate-pulse" size={12} />
                        <MessageSquare className="text-white" size={24} />
                    </div>
                )}
            </button>
        </div>
    );
};
