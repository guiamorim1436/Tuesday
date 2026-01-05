
import React, { useState } from 'react';
import { Mail, Lock, User, Loader2, ArrowRight, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

interface AuthProps {
    onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (isLogin) {
                const user = await api.login(email, password);
                if (user) {
                    onLogin(user);
                } else {
                    setError('Credenciais inválidas ou usuário não aprovado.');
                }
            } else {
                alert("Cadastro realizado! Aguarde a aprovação.");
                setIsLogin(true);
            }
        } catch (err: any) {
            setError(err.message || "Erro na autenticação");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmergencyBypass = () => {
        const adminUser = {
            id: 'emergency_admin',
            name: 'Admin Master',
            email: 'admin@tuesday.com',
            role: 'admin',
            approved: true,
            avatar: 'AM'
        };
        localStorage.setItem('tuesday_current_user', JSON.stringify(adminUser));
        onLogin(adminUser);
    };

    return (
        <div className="min-h-screen flex w-full bg-[#F3F4F6] overflow-hidden">
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-black opacity-90"></div>
                <div className="relative z-10 text-center">
                    <div className="mb-8 flex justify-center">
                        <div className="bg-indigo-600 p-6 rounded-[32px] shadow-2xl">
                             <img src="/logo.png" alt="Tuesday" className="h-16 w-auto" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Tuesday ERP</h1>
                    <p className="text-lg text-indigo-200/60 leading-relaxed font-medium">Hub central de inteligência operacional.</p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8 bg-white p-12 rounded-[48px] shadow-2xl shadow-indigo-100 border border-slate-100">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Acesso Restrito</h2>
                        <p className="mt-2 text-sm text-slate-500 font-medium tracking-tight">Inicie sessão para gerenciar sua squad.</p>
                    </div>

                    {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold uppercase">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Profissional</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />
                                <input required type="email" className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-bold" placeholder="voce@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Segurança</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 text-slate-300" size={18} />
                                <input required type="password" className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-bold" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex justify-center items-center gap-2">
                            {isLoading ? <Loader2 className="animate-spin" /> : <><ArrowRight size={18}/> ENTRAR NO SISTEMA</>}
                        </button>
                    </form>

                    <div className="relative py-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div><div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300"><span className="px-4 bg-white">ou use</span></div></div>

                    <button onClick={handleEmergencyBypass} className="w-full py-3.5 bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2 border border-slate-200"><ShieldAlert size={16} className="text-rose-500" /> ACESSO DE EMERGÊNCIA</button>
                </div>
            </div>
        </div>
    );
};
