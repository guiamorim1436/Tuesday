
import React, { useState, useEffect } from 'react';
import { User, Check, X, Shield, Building, Clock, Plus, Save, Edit2 } from 'lucide-react';
import { api } from '../services/api';
import { User as UserType, Client, Partner } from '../types';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserType[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    
    // User State
    const [currentUser, setCurrentUser] = useState<Partial<UserType>>({
        name: '',
        email: '',
        role: 'client',
        password: '', 
        linkedEntityId: '',
        permissions: { canDelete: false, viewFinance: false, manageUsers: false }
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

    const handleOpenModal = (user?: UserType) => {
        if (user) {
            setModalMode('edit');
            setCurrentUser({ ...user, password: '' }); // Don't show password
        } else {
            setModalMode('create');
            setCurrentUser({ 
                name: '', email: '', role: 'client', password: '', linkedEntityId: '',
                permissions: { canDelete: false, viewFinance: false, manageUsers: false }
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!currentUser.name || !currentUser.email) return alert('Nome e Email são obrigatórios');
        
        try {
            if (modalMode === 'create') {
                const created = await api.createUser(currentUser);
                setUsers([created, ...users]);
            } else {
                if (!currentUser.id) return;
                // If password is empty, don't send it to update logic (handled in backend usually, here simplified)
                const updated = await api.updateUser(currentUser as UserType);
                setUsers(users.map(u => u.id === updated.id ? updated : u));
            }
            setIsModalOpen(false);
        } catch (e: any) {
            alert("Erro ao salvar usuário: " + e.message);
        }
    };

    const handleApprove = async (user: UserType) => {
        await api.updateUser({ ...user, approved: true });
        loadData();
    };

    const togglePermission = (key: string) => {
        const currentPerms = currentUser.permissions || {};
        setCurrentUser({
            ...currentUser,
            permissions: { ...currentPerms, [key]: !currentPerms[key] }
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="px-6 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Gestão de Usuários e Acessos</h3>
                    <p className="text-sm text-slate-500">Aprove cadastros e defina permissões granulares</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
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
                            <th className="px-6 py-4">Vínculo</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
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
                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {user.role === 'partner' && partners.find(p => p.id === user.linkedEntityId)?.name}
                                    {user.role === 'client' && clients.find(c => c.id === user.linkedEntityId)?.name}
                                    {user.role === 'admin' && 'Global'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end space-x-2">
                                        {!user.approved && (
                                            <button onClick={() => handleApprove(user)} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs border border-emerald-300 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                                                Aprovar
                                            </button>
                                        )}
                                        <button onClick={() => handleOpenModal(user)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-slate-100 transition-colors">
                                            <Edit2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CREATE/EDIT USER MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800">{modalMode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        
                        <div className="p-6 space-y-5 overflow-y-auto">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                                    <input 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={currentUser.name} 
                                        onChange={e => setCurrentUser({...currentUser, name: e.target.value})}
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Email Corporativo</label>
                                    <input 
                                        type="email"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" 
                                        value={currentUser.email} 
                                        onChange={e => setCurrentUser({...currentUser, email: e.target.value})}
                                        placeholder="joao@empresa.com"
                                        disabled={modalMode === 'edit'} // Prevent email change for consistency
                                    />
                                </div>
                                {modalMode === 'create' && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Senha Provisória</label>
                                        <input 
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            value={currentUser.password} 
                                            onChange={e => setCurrentUser({...currentUser, password: e.target.value})}
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Perfil de Acesso</label>
                                        <select 
                                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={currentUser.role}
                                            onChange={e => setCurrentUser({...currentUser, role: e.target.value as any, linkedEntityId: ''})}
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
                                            value={currentUser.linkedEntityId || ''}
                                            onChange={e => setCurrentUser({...currentUser, linkedEntityId: e.target.value})}
                                            disabled={currentUser.role === 'admin'}
                                        >
                                            <option value="">Selecione...</option>
                                            {currentUser.role === 'client' && clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            {currentUser.role === 'partner' && partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Permissions Section */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><Shield size={14} className="mr-2 text-indigo-600"/> Permissões Granulares</h4>
                                <div className="space-y-2">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                            checked={currentUser.permissions?.canDelete || false}
                                            onChange={() => togglePermission('canDelete')}
                                        />
                                        <span className="text-sm text-slate-700">Pode excluir registros (Task, Cliente, etc)</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                            checked={currentUser.permissions?.viewFinance || false}
                                            onChange={() => togglePermission('viewFinance')}
                                        />
                                        <span className="text-sm text-slate-700">Acesso ao Módulo Financeiro</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                            checked={currentUser.permissions?.manageUsers || false}
                                            onChange={() => togglePermission('manageUsers')}
                                        />
                                        <span className="text-sm text-slate-700">Gestão de Usuários</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={handleSaveUser} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center transition-colors shadow-sm"><Save size={18} className="mr-2"/>Salvar Usuário</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
