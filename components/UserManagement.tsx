import React, { useState, useEffect } from 'react';
import { User, Check, X, Shield, Building, Clock } from 'lucide-react';
import { api } from '../services/api';
import { User as UserType, Client, Partner } from '../types';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserType[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800">Gestão de Usuários e Acessos</h3>
                <p className="text-sm text-slate-500">Aprove cadastros e defina permissões de portal</p>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                        <th className="px-6 py-3">Usuário</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Perfil (Role)</th>
                        <th className="px-6 py-3">Vínculo (Empresa)</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">{user.name}</div>
                                        <div className="text-xs text-slate-500">{user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                {user.approved ? 
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"><Check size={10} className="mr-1"/> Aprovado</span> :
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"><Clock size={10} className="mr-1"/> Pendente</span>
                                }
                            </td>
                            <td className="px-6 py-4">
                                <select 
                                    value={user.role} 
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    className="bg-white border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
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
                                        className="bg-white border border-slate-300 rounded px-2 py-1 text-sm w-40"
                                    >
                                        <option value="">Selecione Parceiro...</option>
                                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                )}
                                {user.role === 'client' && (
                                    <select 
                                        value={user.linkedEntityId || ''} 
                                        onChange={(e) => handleLinkChange(user.id, e.target.value)}
                                        className="bg-white border border-slate-300 rounded px-2 py-1 text-sm w-40"
                                    >
                                        <option value="">Selecione Cliente...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                )}
                                {user.role === 'admin' && <span className="text-xs text-slate-400">Acesso Total</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                                {!user.approved && (
                                    <button onClick={() => handleApprove(user)} className="text-emerald-600 hover:text-emerald-800 font-bold text-xs border border-emerald-200 bg-emerald-50 px-3 py-1 rounded">
                                        Aprovar Acesso
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};