
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Send, MoreVertical, CheckCheck, Smile, Loader2, MessageSquare, ChevronRight, X, Info } from 'lucide-react';
import { api } from '../services/api';
import { supabase, isConfigured } from '../lib/supabaseClient';

interface ChatMessage {
    id: string;
    remote_jid: string;
    content: string;
    from_me: boolean;
    created_at: string;
    read_at?: string;
}

interface ChatContact {
    id: string;
    name: string;
    remote_jid: string;
    last_message: string;
    unread_count: number;
    updated_at: string;
}

export const ChatModule: React.FC = () => {
    const [contacts, setContacts] = useState<ChatContact[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatContact | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- REALTIME SUBSCRIPTION ---
    useEffect(() => {
        if (!isConfigured) return;
        
        const channel = supabase
            .channel('chat-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                const newMsg = payload.new as ChatMessage;
                // Se a mensagem for da conversa ativa, atualiza a tela
                if (selectedChat && newMsg.remote_jid === selectedChat.remote_jid) {
                    setMessages(prev => [...prev, newMsg]);
                    api.markChatAsRead(selectedChat.id);
                }
                loadContacts(); // Recarrega lista lateral para atualizar "last_message" e "unread_count"
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedChat]);

    useEffect(() => {
        loadContacts();
    }, []);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const loadContacts = async () => {
        const data = await api.getChatConversations();
        setContacts(data as any);
        setIsLoading(false);
    };

    const handleSelectChat = async (contact: ChatContact) => {
        setSelectedChat(contact);
        const msgs = await api.getChatMessages(contact.id);
        setMessages(msgs as any);
        await api.markChatAsRead(contact.id);
        loadContacts(); // Zera o contador de não lidas na UI
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        const text = newMessage;
        setNewMessage('');
        try {
            await api.sendMessage(selectedChat.remote_jid, text);
        } catch (e) {
            alert("Falha ao enviar mensagem.");
            setNewMessage(text);
        }
    };

    const filteredContacts = contacts.filter(c => 
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.remote_jid.includes(searchTerm)
    );

    if (isLoading) return <div className="flex h-full items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Sincronizando Mensagens...</div>;

    return (
        <div className="flex h-full bg-[#F3F4F6] overflow-hidden p-6 gap-6">
            {/* Sidebar */}
            <div className="w-96 bg-white rounded-[40px] shadow-xl border border-slate-200/60 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-black text-slate-900 mb-4">Conversas</h2>
                    <div className="relative">
                        <Search className="absolute left-4 top-3 text-slate-400" size={18}/>
                        <input 
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                            placeholder="Buscar JID ou Nome..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredContacts.map(c => (
                        <div key={c.id} onClick={() => handleSelectChat(c)} className={`p-5 flex items-center gap-4 cursor-pointer transition-all border-l-4 ${selectedChat?.id === c.id ? 'bg-indigo-50 border-indigo-600' : 'hover:bg-slate-50 border-transparent'}`}>
                            <div className="relative">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400">{c.name?.charAt(0) || '?'}</div>
                                {c.unread_count > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">{c.unread_count}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-slate-800 text-sm truncate">{c.name || c.remote_jid}</h4>
                                    <span className="text-[9px] font-bold text-slate-400">{new Date(c.updated_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{c.last_message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat */}
            <div className="flex-1 bg-white rounded-[40px] shadow-xl border border-slate-200/60 flex flex-col overflow-hidden relative">
                {selectedChat ? (
                    <>
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black">{selectedChat.name?.charAt(0) || '?'}</div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">{selectedChat.name || selectedChat.remote_jid}</h3>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">{selectedChat.remote_jid}</span>
                                </div>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-6 bg-slate-50/20 custom-scrollbar">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] ${msg.from_me ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-4 rounded-[20px] shadow-sm ${msg.from_me ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'}`}>
                                            <p className="text-sm font-medium">{msg.content}</p>
                                        </div>
                                        <div className={`flex items-center gap-1 mt-1 px-1 ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                                            <span className="text-[9px] font-bold text-slate-300">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            {msg.from_me && <CheckCheck size={10} className={msg.read_at ? "text-indigo-400" : "text-slate-300"}/>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-slate-100">
                            <div className="flex items-center gap-4 bg-slate-50 rounded-3xl p-2 pr-4 border border-slate-200">
                                <button className="p-3 text-slate-400 hover:text-indigo-600 transition-colors"><Smile size={20}/></button>
                                <input 
                                    className="flex-1 bg-transparent border-none py-3 text-sm font-bold text-slate-800 outline-none" 
                                    placeholder="Digite sua resposta..." 
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50">
                                    <Send size={18}/>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-300">
                        <MessageSquare size={64} className="mb-4 opacity-20"/>
                        <h3 className="text-xl font-black">Central de Mensagens</h3>
                        <p className="text-sm max-w-xs mt-2">Selecione uma conversa para visualizar o histórico e responder em tempo real.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
