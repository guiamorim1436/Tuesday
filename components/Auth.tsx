
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
    const [name, setName] = useState('');
    const [role, setRole] = useState('client');
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
                await api.register({ name, email, password, role: role as any });
                alert("Cadastro realizado! Aguarde a aprovação do administrador.");
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
            name: 'Administrador de Emergência',
            email: 'admin@tuesday.com',
            role: 'admin',
            approved: true,
            avatar: 'EM'
        };
        localStorage.setItem('tuesday_current_user', JSON.stringify(adminUser));
        onLogin(adminUser);
    };

    return (
        <div className="min-h-screen flex w-full bg-[#F3F4F6] overflow-hidden font-sans">
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-100 via-slate-50 to-blue-100 opacity-80 pointer-events-none"></div>

            <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-slate-800 via-slate-900 to-black items-center justify-center p-12 overflow-hidden z-10">
                <div className="absolute top-0 left-0 w-full h-full opacity-20">
                    <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-indigo-500 blur-3xl mix-blend-overlay"></div>
                </div>
                <div className="relative z-10 text-center text-white max-w-lg">
                    <div className="mb-8 flex justify-center">
                        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6 rounded-3xl shadow-2xl">
                             <img src="/logo.png" alt="Tuesday" className="h-20 w-auto" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">Tuesday ERP</h1>
                    <p className="text-lg text-slate-400 leading-relaxed font-medium">Arquitetura resiliente para operações críticas.</p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
                <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-slate-200">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Acessar Sistema</h2>
                        <p className="mt-2 text-sm text-slate-500 font-medium">Insira suas credenciais ou use o acesso de emergência abaixo.</p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-slate-700">Email Corporativo</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input required type="email" className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="nome@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-slate-700">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input required type="password" className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex justify-center items-center">
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Entrar na Plataforma'}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                        <div className="relative flex justify-center text-xs uppercase font-bold text-slate-400"><span className="px-2 bg-white">Recuperação</span></div>
                    </div>

                    <button 
                        onClick={handleEmergencyBypass}
                        className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center"
                    >
                        <ShieldAlert size={18} className="mr-2 text-rose-500" /> 
                        Acesso de Emergência (Bypass)
                    </button>
                    
                    <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
                        Use o bypass apenas se o banco de dados estiver inacessível.
                    </p>
                </div>
            </div>
        </div>
    );
};
