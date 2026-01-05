
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Building, Phone, AlignLeft, CheckCircle, Loader2, Layers, ChevronRight, ChevronLeft, Globe } from 'lucide-react';
import { api } from '../services/api';
import { TaskStatus, TaskPriority } from '../types';

export const PublicBooking: React.FC = () => {
    const [step, setStep] = useState(1);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [formData, setFormData] = useState({ name: '', phone: '', company: '', agenda: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [busySlots, setBusySlots] = useState<string[]>([]);
    
    // Configurações de horários disponíveis (exemplo fixo: 09:00 às 17:00)
    const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

    useEffect(() => {
        loadAvailability();
    }, [selectedDate]);

    const loadAvailability = async () => {
        if (!selectedDate) return;
        // Puxar tarefas do sistema para o dia selecionado e marcar slots ocupados
        const tasks = await api.getTasks();
        const dailyBusy = tasks
            .filter(t => t.startDate === selectedDate)
            .map(t => {
                // Simplificação: se houver tarefa começando naquela hora, bloqueia
                return t.description?.match(/\d{2}:\d{2}/)?.[0] || "";
            });
        setBusySlots(dailyBusy);
    };

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Criar uma tarefa especial no ERP para o agendamento
            await api.createTask({
                title: `[AGENDAMENTO] ${formData.name} - ${formData.company}`,
                description: `Pauta: ${formData.agenda}\nTelefone: ${formData.phone}\nEmpresa: ${formData.company}\nHorário: ${selectedTime}`,
                startDate: selectedDate,
                status: TaskStatus.BACKLOG,
                priority: TaskPriority.MEDIUM,
                category: 'Reunião',
                estimatedHours: 1,
                autoSla: false
            });
            setIsSuccess(true);
        } catch (e) {
            alert("Erro ao realizar agendamento. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 text-center max-w-md w-full animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <CheckCircle size={40}/>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4">Agendado!</h2>
                    <p className="text-slate-500 font-medium mb-8">Sua reunião foi confirmada e adicionada à nossa pauta operacional. Você receberá um convite por email em breve.</p>
                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all">Fechar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-12 px-6 font-sans">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
                <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20"><Layers size={28} className="text-white"/></div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter italic">tuesday</span>
            </div>

            <div className="max-w-4xl w-full bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col md:flex-row">
                {/* Lateral Info */}
                <div className="md:w-80 bg-slate-900 p-10 text-white flex flex-col">
                    <div className="flex-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 block">Agendamento Online</span>
                        <h2 className="text-2xl font-bold mb-6">Reunião de Diagnóstico</h2>
                        <div className="space-y-4">
                            <div className="flex items-center text-slate-400 text-sm"><Clock size={16} className="mr-3"/> 60 min</div>
                            <div className="flex items-center text-slate-400 text-sm"><Globe size={16} className="mr-3"/> Brasília (GMT-3)</div>
                        </div>
                    </div>
                    <div className="pt-10 border-t border-white/10">
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">Selecione o melhor dia e horário para conversarmos sobre seus processos.</p>
                    </div>
                </div>

                {/* Booking Content */}
                <div className="flex-1 p-10">
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h3 className="text-xl font-bold text-slate-800 mb-8">Selecione o Dia</h3>
                            <div className="mb-8">
                                <input 
                                    type="date" 
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-lg text-slate-700" 
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                />
                            </div>

                            {selectedDate && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Horários Disponíveis</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {timeSlots.map(time => {
                                            const isBusy = busySlots.includes(time);
                                            return (
                                                <button 
                                                    key={time}
                                                    disabled={isBusy}
                                                    onClick={() => { setSelectedTime(time); setStep(2); }}
                                                    className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${selectedTime === time ? 'bg-indigo-600 border-indigo-600 text-white' : isBusy ? 'bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-600'}`}
                                                >
                                                    {time}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleBooking} className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                            <div className="flex items-center justify-between mb-8">
                                <button onClick={() => setStep(1)} className="text-sm font-bold text-indigo-600 flex items-center hover:underline"><ChevronLeft size={16}/> Voltar para o calendário</button>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-slate-400 uppercase">{new Date(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                                    <div className="text-lg font-black text-slate-800">{selectedTime}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu Nome</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                                        <input required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                                        <input required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="(00) 00000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}/>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sua Empresa</label>
                                <div className="relative">
                                    <Building className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                                    <input required className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})}/>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">O que gostaria de conversar? (Pauta)</label>
                                <div className="relative">
                                    <AlignLeft className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                                    <textarea required rows={3} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" value={formData.agenda} onChange={e => setFormData({...formData, agenda: e.target.value})}/>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center transform active:scale-95"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <><Calendar size={18} className="mr-2"/> Confirmar Reunião</>}
                            </button>
                        </form>
                    )}
                </div>
            </div>
            <div className="mt-8 text-slate-400 text-xs font-medium">Powered by Tuesday Operating System</div>
        </div>
    );
};
