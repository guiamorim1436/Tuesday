
import React, { useState } from 'react';
import { Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';
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

    return (
        <div className="min-h-screen flex w-full bg-white overflow-hidden font-sans">
            {/* Left Side - Visual Identity */}
            <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 items-center justify-center p-12 overflow-hidden">
                {/* Decorative background shapes */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl mix-blend-overlay"></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-teal-300 blur-3xl mix-blend-overlay"></div>
                </div>

                <div className="relative z-10 text-center text-white max-w-lg">
                    <div className="mb-8 flex justify-center">
                        {/* Logo Container - Expects logo.png in public folder, falls back to text/icon if missing */}
                        <img 
                            src="/logo.png" 
                            alt="Tuesday Logo" 
                            className="h-32 object-contain drop-shadow-lg"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = document.getElementById('logo-fallback');
                                if(fallback) fallback.style.display = 'flex';
                            }}
                        />
                        <div id="logo-fallback" className="hidden flex-col items-center">
                            <div className="text-6xl font-bold tracking-tighter mb-2">Tuesday</div>
                            <div className="w-16 h-1 bg-white/50 rounded-full"></div>
                        </div>
                    </div>
                    
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">Gestão Inteligente para Agências</h1>
                    <p className="text-lg text-blue-100 leading-relaxed">
                        Centralize operações, financeiro e relacionamento em uma única plataforma escalável.
                    </p>
                </div>
                
                <div className="absolute bottom-8 text-blue-200 text-xs tracking-wider font-medium">
                    POWERED BY TENNO HUB
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 lg:bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                            {isLogin ? 'Acessar Plataforma' : 'Criar nova conta'}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                            {isLogin ? 'Entre com suas credenciais para continuar.' : 'Preencha os dados abaixo para solicitar acesso.'}
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-slate-700">Nome Completo</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input 
                                        required 
                                        type="text" 
                                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all" 
                                        placeholder="Seu Nome" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-700">Email Corporativo</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input 
                                    required 
                                    type="email" 
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all" 
                                    placeholder="nome@empresa.com" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium text-slate-700">Senha</label>
                                {isLogin && <a href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">Esqueceu?</a>}
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input 
                                    required 
                                    type="password" 
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all" 
                                    placeholder="••••••••" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-slate-700">Perfil de Acesso</label>
                                <div className="relative">
                                    <select value={role} onChange={e => setRole(e.target.value)} className="block w-full pl-3 pr-10 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all appearance-none">
                                        <option value="client">Sou Cliente</option>
                                        <option value="partner">Sou Parceiro</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Entrar na Plataforma' : 'Criar Conta')}
                        </button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-slate-50 lg:bg-white text-slate-500">Ou</span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <button 
                                onClick={() => setIsLogin(!isLogin)} 
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center transition-colors"
                            >
                                {isLogin ? 'Criar uma nova conta' : 'Já possui uma conta? Entrar'} <ArrowRight size={14} className="ml-1"/>
                            </button>
                        </div>
                    </div>
                    
                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400">© 2025 Tenno HUB. Todos os direitos reservados.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
