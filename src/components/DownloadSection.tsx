import React from 'react';
import { motion } from 'framer-motion';
import { GooglePlayLogo, AppStoreLogo, CheckCircle, Bell } from 'phosphor-react';

const DownloadSection: React.FC = () => {
    return (
        <section id="download" className="py-20 bg-[hsl(var(--brand-blue))] relative overflow-hidden">
            {/* Background Patterns */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="md:w-1/2 text-white">
                        <motion.h2
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-5xl font-bold mb-6 font-display"
                        >
                            Leve a segurança da escola para o seu bolso
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-blue-50 text-lg mb-8 max-w-lg"
                        >
                            Acompanhe a frequência, receba notificações em tempo real e comunique-se com a escola através do nosso aplicativo.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <button className="bg-black text-white px-6 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-900 transition-colors shadow-lg">
                                <GooglePlayLogo size={32} weight="fill" />
                                <div className="text-left">
                                    <p className="text-xs uppercase">Disponível no</p>
                                    <p className="text-sm font-bold">Google Play</p>
                                </div>
                            </button>
                            <button className="bg-black text-white px-6 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-900 transition-colors shadow-lg">
                                <AppStoreLogo size={32} weight="fill" />
                                <div className="text-left">
                                    <p className="text-xs uppercase">Baixar na</p>
                                    <p className="text-sm font-bold">App Store</p>
                                </div>
                            </button>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="md:w-1/2 flex justify-center"
                    >
                        {/* Realistic Phone Mockup */}
                        <div className="relative w-[300px] h-[600px] bg-gray-900 rounded-[3rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden ring-4 ring-black/20">
                            {/* Dynamic Island / Notch */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-30 flex items-center justify-center">
                                <div className="w-16 h-4 bg-gray-800 rounded-full opacity-50"></div>
                            </div>

                            {/* Screen Content */}
                            <div className="w-full h-full bg-gray-100 flex flex-col relative">
                                {/* Status Bar */}
                                <div className="h-10 bg-white w-full flex justify-between items-center px-6 text-[10px] font-bold text-gray-800 pt-2">
                                    <span>9:41</span>
                                    <div className="flex gap-1">
                                        <div className="w-4 h-3 bg-gray-800 rounded-sm"></div>
                                        <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                                    </div>
                                </div>

                                {/* App Header */}
                                <div className="bg-white p-6 pt-4 pb-4 border-b border-gray-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                        <div className="font-bold text-gray-800">Escola Log</div>
                                        <Bell size={24} className="text-gray-600" />
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">Olá, Maria</div>
                                    <div className="text-gray-500 text-sm">Mãe do João Silva</div>
                                </div>

                                {/* App Body */}
                                <div className="p-4 flex-1 overflow-hidden relative">
                                    {/* Simulated Notification Popup */}
                                    <motion.div
                                        initial={{ y: -100, opacity: 0 }}
                                        whileInView={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 1.5, type: "spring", stiffness: 120 }}
                                        viewport={{ once: true }}
                                        className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 z-20"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="bg-[hsl(var(--brand-blue))] p-2 rounded-xl text-white">
                                                <CheckCircle size={20} weight="fill" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center w-full gap-2">
                                                    <h4 className="font-bold text-gray-900 text-sm">Entrada Confirmada</h4>
                                                    <span className="text-[10px] text-gray-500">Agora</span>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    João Silva acabou de chegar na escola.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Existing Cards (Blurred/Background) */}
                                    <div className="space-y-3 mt-2 opacity-80">
                                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-gray-800 text-sm">Comunicado</span>
                                                <span className="text-[10px] text-gray-500">Ontem</span>
                                            </div>
                                            <p className="text-xs text-gray-600">Reunião de pais na próxima sexta-feira às 19h.</p>
                                        </div>

                                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-gray-800 text-sm">Lição de Casa</span>
                                                <span className="text-[10px] text-gray-500">Hoje</span>
                                            </div>
                                            <p className="text-xs text-gray-600">Matemática: Páginas 45-48.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Nav */}
                                <div className="bg-white p-4 border-t flex justify-around text-gray-400 pb-8">
                                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                                    <div className="w-6 h-6 bg-[hsl(var(--brand-blue))] rounded-full"></div>
                                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default DownloadSection;
