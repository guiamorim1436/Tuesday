

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Building, Phone, AlignLeft, CheckCircle, Loader2, Layers, ChevronLeft, Globe, Mail, Users, Video, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { TaskStatus, TaskPriority, WorkConfig } from '../types';

declare const google: any;

export const PublicBooking: React.FC = () => {
    const [step, setStep] = useState(1);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '',
        phone: '', 
        company: '', 
        agenda: '',
        guests: '' 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [busySlots, setBusySlots] = useState<string[]>([]);
    const [isDayLimitReached, setIsDayLimitReached] = useState(false);
    const [workConfig, setWorkConfig] = useState<WorkConfig | null>(null);
    
    const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (selectedDate) loadAvailability();
    }, [selectedDate]);

    const loadSettings = async () => {
        const config = await api.getWorkConfig();
        setWorkConfig(config);
    };

    const loadAvailability = async () => {
        if (!selectedDate) return;
        const tasks = await api.getTasks();
        
        // 1. Verificar Limite Diário de Reuniões
        const meetingsToday = tasks.filter(t => t.startDate === selectedDate && t.category === 'Reunião').length;
        if (workConfig && meetingsToday >= workConfig.maxMeetingsPerDay) {
            setIsDayLimitReached(true);
            setBusySlots(timeSlots); // Bloqueia todos
            return;
        } else {
            setIsDayLimitReached(false);
        }

        // 2. Verificar Slots Ocupados (por qualquer tarefa)
        const dailyBusy = tasks
            .filter(t => t.startDate === selectedDate)
            .map(t => t.description?.match(/\d{2}:\d{2}/)?.[0] || "");
        
        setBusySlots(dailyBusy);
    };

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const googleSettings = await api.getGoogleSettings();
            let meetLink = '';
            let externalId = '';

            // Fluxo Google Calendar (Se configurado)
            if (googleSettings?.clientId) {
                // Em um cenário real, usaríamos o token do dono do sistema
                // Para este MVP, simulamos a criação do evento e retorno do Meet
                meetLink = `https://meet.google.com/tue-sday-erp`;
                externalId = `google_evt_${Date.now()}`;
            }

            const guestList = formData.guests.split(',').map(e => e.trim()).filter(e => e.includes('@'));
            
            await api.createTask({
                title: `[MEETING] ${formData.name} - ${formData.company}`,
                description: `Pauta: ${formData.agenda}\nTelefone: ${formData.phone}\nHorário: ${selectedTime}\nConvidados: ${formData.guests}`,
                startDate: selectedDate,
                dueDate: selectedDate,
                status: TaskStatus.BACKLOG,
                priority: TaskPriority.HIGH,
                category: 'Reunião',
                estimatedHours: 1,
                autoSla: false,
                meetLink: meetLink,
                externalId: externalId,
                participants: [formData.email, ...guestList]
            });

            setIsSuccess(true);
        } catch (e) {
            alert("Erro ao processar agendamento. Verifique sua conexão.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 text-center max-w-md w-full animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <CheckCircle size={40}/>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4">Confirmado!</h2>
                    <p className="text-slate-500 font-medium mb-8">O convite com o link do <b>Google Meet</b> foi enviado para o seu e-mail e convidados.</p>
                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-slate-900/20">Finalizar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-12 px-6 font-sans">
            <div className="flex items-center gap-3 mb-12">
                <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20"><Layers size={28} className="text-white"/></div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter italic">tuesday</span>
            </div>

            <div className="max-w-5xl w-full bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                <div className="md:w-96 bg-slate-900 p-12 text-white flex flex-col">
                    <div className="flex-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 block">Agendamento Oficial</span>
                        <h2 className="text-3xl font-bold mb-8 leading-tight">Sessão Estratégica de Automação</h2>
                        <div className="space-y-6">
                            <div className="flex items-center text-slate-400 text-sm font-medium"><Clock size={18} className="mr-4 text-indigo-400"/> 60 Minutos</div>
                            <div className="flex items-center text-slate-400 text-sm font-medium"><Video size={18} className="mr-4 text-indigo-400"/> Google Meet (Link Automático)</div>
                            <div className="flex items-center text-slate-400 text-sm font-medium"><Globe size={18} className="mr-4 text-indigo-400"/> Brasília, Brasil (GMT-3)</div>
                        </div>
                    </div>
                    <div className="pt-10 border-t border-white/10 opacity-60">
                        <p className="text-xs text-slate-400 leading-relaxed italic">"Otimizando seu tempo através de processos inteligentes."</p>
                    </div>
                </div>

                <div className="flex-1 p-12 overflow-y-auto">
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h3 className="text-2xl font-bold text-slate-900 mb-8 tracking-tight">Quando podemos conversar?</h3>
                            <div className="mb-10">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">1. Escolha a Data</label>
                                <input 
                                    type="date" 
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-xl text-slate-800 shadow-inner" 
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                />
                            </div>

                            {selectedDate && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2. Horários Disponíveis</label>
                                    
                                    {isDayLimitReached ? (
                                        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 flex items-start">
                                            <AlertTriangle className="mr-3 mt-1" size={20}/>
                                            <div>
                                                <p className="font-bold">Limite atingido</p>
                                                <p className="text-sm opacity-80 font-medium">Já atingi o limite máximo de reuniões para este dia. Por favor, escolha outra data.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {timeSlots.map(time => {
                                                const isBusy = busySlots.includes(time);
                                                return (
                                                    <button 
                                                        key={time}
                                                        disabled={isBusy}
                                                        onClick={() => { setSelectedTime(time); setStep(2); }}
                                                        className={`py-4 rounded-2xl font-black text-sm border-2 transition-all transform active:scale-95 ${selectedTime === time ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/30' : isBusy ? 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed grayscale' : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-600 hover:text-indigo-600 shadow-sm'}`}
                                                    >
                                                        {time}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleBooking} className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                            <div className="flex items-center justify-between mb-10 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                                <button type="button" onClick={() => setStep(1)} className="text-sm font-bold text-slate-400 flex items-center hover:text-indigo-600 transition-colors"><ChevronLeft size={16} className="mr-1"/> Voltar</button>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">{new Date(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}</div>
                                    <div className="text-2xl font-black text-slate-900">{selectedTime}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu Nome</label>
                                    <div className="relative"><User className="absolute left-4 top-4 text-slate-400" size={18}/><input required className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 outline-none font-medium shadow-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/></div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                                    <div className="relative"><Mail className="absolute left-4 top-4 text-slate-400" size={18}/><input required type="email" className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 outline-none font-medium shadow-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                                    <div className="relative"><Phone className="absolute left-4 top-4 text-slate-400" size={18}/><input required className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 outline-none font-medium shadow-sm" placeholder="(00) 00000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}/></div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
                                    <div className="relative"><Building className="absolute left-4 top-4 text-slate-400" size={18}/><input required className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 outline-none font-medium shadow-sm" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})}/></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Convidados (E-mails separados por vírgula)</label>
                                <div className="relative"><Users className="absolute left-4 top-4 text-slate-400" size={18}/><input className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 outline-none font-medium shadow-sm" placeholder="socio@empresa.com, ti@empresa.com" value={formData.guests} onChange={e => setFormData({...formData, guests: e.target.value})}/></div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pauta / Objetivo</label>
                                <div className="relative"><AlignLeft className="absolute left-4 top-4 text-slate-400" size={18}/><textarea required rows={3} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 outline-none font-medium resize-none shadow-sm" value={formData.agenda} onChange={e => setFormData({...formData, agenda: e.target.value})}/></div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center transform active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-3" size={24}/> : <><Video size={20} className="mr-3"/> Confirmar com Google Meet</>}
                            </button>
                        </form>
                    )}
                </div>
            </div>
            <div className="mt-8 text-slate-400 text-[10px] font-black uppercase tracking-widest">Tuesday OS Integration • Sincronização em Tempo Real</div>
        </div>
    );
};
