import React, { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, Globe, Zap } from 'lucide-react';
import { api } from '../services/api';

interface AuthProps {
    onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const user = await api.login(email, password);
            if (user) {
                onLogin(user);
            } else {
                setError('Credenciais inválidas ou acesso não autorizado.');
            }
        } catch (err: any) {
            setError(err.message || "Falha na conexão com o servidor de autenticação");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex w-full bg-white overflow-hidden">
            {/* Lado Esquerdo: Identidade Visual Tenno HUB */}
            <div className="hidden lg:flex w-1/2 relative tenno-gradient items-center justify-center p-20 overflow-hidden">
                {/* Elementos Decorativos de Fundo */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]"></div>
                
                <div className="relative z-10 w-full max-w-lg">
                    <div className="mb-12 inline-flex p-4 bg-white/5 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-2xl">
                         <img src="/logo.png" alt="Tuesday Logo" className="h-20 w-auto" />
                    </div>
                    
                    <h1 className="text-6xl font-black text-white mb-6 tracking-tighter leading-tight">
                        Seu ecossistema<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">operacional.</span>
                    </h1>
                    
                    <p className="text-xl text-indigo-200/60 leading-relaxed font-medium mb-12 max-w-md">
                        Centralize operações, CRM e financeiro em uma plataforma de alta performance.
                    </p>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 tenno-glass rounded-3xl">
                            <Zap className="text-blue-400 mb-3" size={24}/>
                            <h4 className="text-white font-bold text-sm">Alta Performance</h4>
                            <p className="text-indigo-200/40 text-xs mt-1">Otimizado para agências B2B.</p>
                        </div>
                        <div className="p-6 tenno-glass rounded-3xl">
                            <ShieldCheck className="text-indigo-400 mb-3" size={24}/>
                            <h4 className="text-white font-bold text-sm">Governança</h4>
                            <p className="text-indigo-200/40 text-xs mt-1">Segurança e controle de SLA.</p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-10 left-20 flex items-center gap-6 text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">
                    <span>Tenno HUB &copy; 2025</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                    <span className="flex items-center gap-1.5"><Globe size={12}/> Global Cloud</span>
                </div>
            </div>

            {/* Lado Direito: Formulário de Login */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50/30">
                <div className="w-full max-w-md space-y-10">
                    <div className="lg:hidden mb-8">
                        <img src="/logo.png" alt="Tuesday" className="h-12 w-auto mb-6" />
                        <h2 className="text-3xl font-black text-slate-900">Tuesday</h2>
                    </div>

                    <div className="hidden lg:block">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Bem-vindo de volta</h2>
                        <p className="text-slate-500 font-medium">Acesse o Tenno HUB para gerenciar sua operação.</p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ID de Usuário / Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                <input 
                                    required 
                                    type="email" 
                                    className="block w-full pl-14 pr-6 py-4.5 border border-slate-200 rounded-3xl bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-sm font-bold shadow-sm placeholder-slate-300" 
                                    placeholder="seu@email.com" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Senha de Segurança</label>
                                <button type="button" className="text-[10px] font-bold text-indigo-600 hover:underline">Esqueceu a senha?</button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                <input 
                                    required 
                                    type="password" 
                                    className="block w-full pl-14 pr-6 py-4.5 border border-slate-200 rounded-3xl bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-sm font-bold shadow-sm placeholder-slate-300" 
                                    placeholder="••••••••" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex justify-center items-center gap-3 transform active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>ENTRAR NO TENNO HUB <ArrowRight size={20}/></>
                            )}
                        </button>
                    </form>

                    <div className="pt-10 text-center">
                        <p className="text-slate-400 text-xs font-medium">
                            Não tem uma conta? <button className="text-indigo-600 font-bold hover:underline">Solicite acesso à sua gerência.</button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};