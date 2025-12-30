
import React, { useState } from 'react';
import { Layers, Lock, Mail, User, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
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

    const handleDevBypass = async () => {
        // Force creates a temporary admin session
        const devUser = {
            id: 'dev-admin',
            name: 'Dev Admin',
            email: 'dev@admin.com',
            role: 'admin',
            approved: true,
            avatar: 'DV'
        };
        localStorage.setItem('tuesday_current_user', JSON.stringify(devUser));
        onLogin(devUser);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col md:flex-row max-w-4xl">
                {/* Brand Side */}
                <div className="bg-slate-900 p-10 flex flex-col justify-between md:w-1/2 text-white">
                    <div>
                        <div className="bg-indigo-500 p-2 rounded-lg w-fit mb-6">
                            <Layers size={32} />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Tuesday ERP</h1>
                        <p className="text-slate-400">Gestão centralizada para agências e consultorias.</p>
                    </div>
                    <div className="mt-10 md:mt-0">
                        <p className="text-sm text-slate-500">© 2024 Tuesday Inc.</p>
                    </div>
                </div>

                {/* Form Side */}
                <div className="p-10 md:w-1/2">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">{isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}</h2>
                    
                    {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                    <input required type="text" className="pl-10 w-full border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Seu Nome" value={name} onChange={e => setName(e.target.value)}/>
                                </div>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                <input required type="email" className="pl-10 w-full border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="nome@empresa.com" value={email} onChange={e => setEmail(e.target.value)}/>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                <input required type="password" className="pl-10 w-full border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}/>
                            </div>
                        </div>

                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Conta</label>
                                <select value={role} onChange={e => setRole(e.target.value)} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="client">Sou Cliente</option>
                                    <option value="partner">Sou Parceiro</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Seu acesso precisará ser aprovado por um administrador.</p>
                            </div>
                        )}

                        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center">
                            {isLoading ? <Loader2 className="animate-spin"/> : (isLogin ? 'Entrar' : 'Cadastrar')}
                        </button>
                    </form>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={handleDevBypass}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg transition-colors flex items-center justify-center text-xs"
                        >
                            <ShieldAlert size={14} className="mr-2"/> Modo Admin (Dev Bypass)
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-indigo-600 hover:underline font-medium">
                            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
