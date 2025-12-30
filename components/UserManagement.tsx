
import React, { useState, useEffect } from 'react';
import { User, Check, X, Shield, Building, Clock, Plus, Save } from 'lucide-react';
import { api } from '../services/api';
import { User as UserType, Client, Partner } from '../types';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserType[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // New User State
    const [newUser, setNewUser] = useState<Partial<UserType>>({
        name: '',
        email: '',
        role: 'client',
        password: '', // In a real app, this might be handled by an invite link
        linkedEntityId: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [u, c, p] = await Promise.all([
            api.getUsers(),
            api.getClients(),
            api.getPartners()
        ]);
        setUsers(u);
        setClients(c);
        setPartners(p);
    };

    const handleCreateUser = async () => {
        if (!newUser.name || !newUser.email) return alert('Nome e Email são obrigatórios');
        try {
            const created = await api.createUser(newUser);
            setUsers([created, ...users]);
            setIsModalOpen(false);
            setNewUser({ name: '', email: '', role: 'client', password: '', linkedEntityId: '' });
        } catch (e: any) {
            alert("Erro ao criar usuário: " + e.message);
        }
    };

    const handleApprove = async (user: UserType) => {
        await api.updateUser({ ...user, approved: true });
        loadData();
    };

    const handleRoleChange = async (userId: string, role: any) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            await api.updateUser({ ...user, role });
            loadData();
        }
    };

    const handleLinkChange = async (userId: string, entityId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            await api.updateUser({ ...user, linkedEntityId: entityId });
            loadData();
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="px-6 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Gestão de Usuários e Acessos</h3>
                    <p className="text-sm text-slate-500">Aprove cadastros e defina permissões de portal</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                    <Plus size={16} /> <span>Novo Usuário</span>
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Usuário</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Perfil (Role)</th>
                            <th className="px-6 py-4">Vínculo (Empresa)</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mr-3 border border-indigo-200">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">{user.name}</div>
                                            <div className="text-xs text-slate-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.approved ? 
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"><Check size={12} className="mr-1"/> Aprovado</span> :
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"><Clock size={12} className="mr-1"/> Pendente</span>
                                    }
                                </td>
                                <td className="px-6 py-4">
                                    <select 
                                        value={user.role} 
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
                                    >
                                        <option value="admin">Administrador</option>
                                        <option value="partner">Parceiro</option>
                                        <option value="client">Cliente</option>
                                        <option value="pending">Sem Acesso</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    {user.role === 'partner' && (
                                        <select 
                                            value={user.linkedEntityId || ''} 
                                            onChange={(e) => handleLinkChange(user.id, e.target.value)}
                                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 w-48 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                        >
                                            <option value="">Selecione Parceiro...</option>
                                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    )}
                                    {user.role === 'client' && (
                                        <select 
                                            value={user.linkedEntityId || ''} 
                                            onChange={(e) => handleLinkChange(user.id, e.target.value)}
                                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 w-48 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                        >
                                            <option value="">Selecione Cliente...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    )}
                                    {user.role === 'admin' && <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">Acesso Global</span>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {!user.approved && (
                                        <button onClick={() => handleApprove(user)} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs border border-emerald-300 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                                            Aprovar Acesso
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CREATE USER MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800">Novo Usuário</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                                <input 
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    value={newUser.name} 
                                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Email Corporativo</label>
                                <input 
                                    type="email"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    value={newUser.email} 
                                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                                    placeholder="joao@empresa.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Senha Provisória</label>
                                <input 
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    value={newUser.password} 
                                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Perfil de Acesso</label>
                                    <select 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newUser.role}
                                        onChange={e => setNewUser({...newUser, role: e.target.value as any, linkedEntityId: ''})}
                                    >
                                        <option value="client">Cliente</option>
                                        <option value="partner">Parceiro</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Vínculo</label>
                                    <select 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                        value={newUser.linkedEntityId || ''}
                                        onChange={e => setNewUser({...newUser, linkedEntityId: e.target.value})}
                                        disabled={newUser.role === 'admin'}
                                    >
                                        <option value="">Selecione...</option>
                                        {newUser.role === 'client' && clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        {newUser.role === 'partner' && partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={handleCreateUser} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center transition-colors shadow-sm"><Save size={18} className="mr-2"/>Criar Usuário</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
