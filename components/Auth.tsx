import React, { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#74b9ff] via-[#81ecec] to-[#55efc4]">
            <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[48px] shadow-2xl border border-white/20 p-10 space-y-8">
                {/* Logo Area */}
                <div className="flex flex-col items-center">
                    <div className="p-4 bg-white rounded-3xl shadow-lg mb-6 border border-slate-100 flex items-center justify-center overflow-hidden">
                        <img src="/logo.png" alt="Tuesday" className="h-20 w-auto object-contain" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Bem-vindo</h2>
                        <p className="text-slate-500 font-medium text-sm">Acesse sua plataforma operacional</p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                        <div className="relative group">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                            <input 
                                required 
                                type="email" 
                                className="block w-full pl-14 pr-6 py-4 border border-slate-200 rounded-3xl bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-sm font-bold shadow-sm placeholder-slate-300 outline-none" 
                                placeholder="seu@email.com" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</label>
                            <button type="button" className="text-[10px] font-bold text-indigo-600 hover:underline">Esqueceu?</button>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                            <input 
                                required 
                                type="password" 
                                className="block w-full pl-14 pr-6 py-4 border border-slate-200 rounded-3xl bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-sm font-bold shadow-sm placeholder-slate-300 outline-none" 
                                placeholder="••••••••" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex justify-center items-center gap-3 transform active:scale-[0.98] disabled:opacity-50 mt-4"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>ENTRAR NO SISTEMA <ArrowRight size={20}/></>
                        )}
                    </button>
                </form>

                <div className="pt-6 text-center border-t border-slate-100">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        Tuesday Operating System &copy; 2025
                    </p>
                </div>
            </div>
        </div>
    );
};