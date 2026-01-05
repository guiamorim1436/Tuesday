
import React, { useState, useEffect } from 'react';
import { Shield, Check, X, UserCog, Loader2, Save, Trash2, Edit2, Lock, Eye, Plus, Clock } from 'lucide-react';
import { User, UserPermissions } from '../types';
import { api } from '../services/api';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<User>>({
        permissions: {
            tasks: { view: true, edit: true, delete: false },
            clients: { view: true, edit: false, delete: false },
            finance: { view: false, edit: false, delete: false },
            settings: { view: false, edit: false }
        }
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const u = await api.getUsers();
            setUsers(u);
        } finally { setIsLoading(false); }
    };

    const togglePermission = (module: keyof UserPermissions, action: string) => {
        const perms = { ...currentUser.permissions } as any;
        perms[module][action] = !perms[module][action];
        setCurrentUser({ ...currentUser, permissions: perms });
    };

    if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;

    return (
        <div className="flex flex-col h-full bg-[#F3F4F6]">
            <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center sticky top-0 z-20 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gestão de Governança</h2>
                    <p className="text-sm text-slate-500 font-medium">Controle de acessos e permissões granulares</p>
                </div>
                <button onClick={() => { setCurrentUser({ permissions: { tasks: { view: true, edit: false, delete: false }, clients: { view: false, edit: false, delete: false }, finance: { view: false, edit: false, delete: false }, settings: { view: false, edit: false } } as any }); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2"><Plus size={18}/> Novo Usuário</button>
            </div>

            <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usuário</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Perfil</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center font-black text-indigo-700 uppercase border border-indigo-200">{u.name.charAt(0)}</div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                                                <p className="text-xs text-slate-400 font-medium">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase ${u.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-50 text-slate-400'}`}>{u.role}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        {u.approved ? 
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><Check size={14}/> Aprovado</span> :
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500"><Clock size={14}/> Pendente</span>
                                        }
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><Edit2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95">
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3"><Shield className="text-indigo-600"/> Perfil de Governança</h3>
                                <p className="text-sm text-slate-500 font-medium">Defina exatamente o que este usuário pode ver ou fazer</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all"><X size={28}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Informações Básicas</h4>
                                <div className="space-y-4">
                                    <input className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Nome Completo"/>
                                    <input className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" placeholder="Email Corporativo"/>
                                    <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                                        <option value="client">Perfil: Cliente</option>
                                        <option value="partner">Perfil: Parceiro</option>
                                        <option value="admin">Perfil: Administrador</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Matriz de Permissões</h4>
                                <div className="space-y-3">
                                    {Object.entries(currentUser.permissions || {}).map(([module, actions]) => (
                                        <div key={module} className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                                            <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Lock size={12} className="text-indigo-600"/> {module === 'tasks' ? 'Operações' : module === 'clients' ? 'Clientes' : module === 'finance' ? 'Financeiro' : 'Configurações'}
                                            </h5>
                                            <div className="flex flex-wrap gap-4">
                                                {Object.entries(actions).map(([action, active]) => (
                                                    <button 
                                                        key={action}
                                                        onClick={() => togglePermission(module as any, action)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                            active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'
                                                        }`}
                                                    >
                                                        {active ? <Check size={12}/> : <Eye size={12}/>}
                                                        {action === 'view' ? 'Ver' : action === 'edit' ? 'Editar' : 'Excluir'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-600 font-bold hover:bg-white rounded-2xl transition-all">Cancelar</button>
                            <button className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 flex items-center gap-2"><Save size={18}/> Salvar Credenciais</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
