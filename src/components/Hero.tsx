import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'phosphor-react';

const Hero: React.FC = () => {
    return (
        <section id="home" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-[image:var(--gradient-hero)] pointer-events-none" />

            {/* Floating Bubbles */}
            <div className="floating-bubbles" aria-hidden="true">
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
            </div>

            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center gap-2 bg-[hsl(var(--brand-blue)/0.1)] border border-[hsl(var(--brand-blue)/0.3)] text-[hsl(var(--brand-blue))] px-4 py-1 rounded-full text-sm font-medium mb-6">
                        Login via WhatsApp • Educação segura e moderna
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6 font-display">
                        Sistema de monitoramento inteligente com reconhecimento facial
                    </h1>

                    <p className="text-lg text-[hsl(var(--neutral-600))] mb-8 max-w-lg leading-relaxed">
                        Registra presença por reconhecimento facial, envia notificações automáticas aos pais via WhatsApp e oferece gestão completa com dashboards, câmeras estratégicas e comunicação direta entre escola, família e rede pública.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <a href="https://wa.me/5511969039674" target="_blank" rel="noopener noreferrer" className="btn-hero">
                            Agende uma demonstração gratuita
                        </a>
                        <a href="#funcionalidades" className="btn-outline px-6 py-3 rounded-full font-semibold">
                            Ver Funcionalidades
                        </a>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative"
                >
                    <div className="relative max-w-[600px] mx-auto">
                        <img
                            src="/img/banner.jpg"
                            alt="Aluno chegando à escola"
                            className="w-full h-auto rounded-2xl shadow-2xl"
                        />

                        {/* Floating Check Icon */}
                        <div className="absolute -top-4 -left-4 w-16 h-16 bg-[hsl(var(--brand-green)/0.1)] border border-[hsl(var(--brand-green)/0.3)] rounded-full flex items-center justify-center animate-float">
                            <Check size={28} weight="bold" className="text-[hsl(var(--brand-green))]" />
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
