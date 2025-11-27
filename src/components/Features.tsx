import React from 'react';
import { motion } from 'framer-motion';
import { UserFocus, Clock, ShieldCheck, ChartLineUp, WhatsappLogo, Camera } from 'phosphor-react';

const features = [
    {
        icon: <UserFocus size={32} />,
        title: "Reconhecimento Facial",
        description: "Sistema avançado de identificação por reconhecimento facial para controle de acesso e presença automática."
    },
    {
        icon: <WhatsappLogo size={32} />,
        title: "Notificações WhatsApp",
        description: "Comunicação direta com os pais através do WhatsApp, enviando alertas de entrada, saída e eventos importantes."
    },
    {
        icon: <ChartLineUp size={32} />,
        title: "Dashboard Inteligente",
        description: "Painel completo com relatórios em tempo real, estatísticas de frequência e gestão administrativa."
    },
    {
        icon: <ShieldCheck size={32} />,
        title: "Segurança Avançada",
        description: "Proteção de dados com criptografia, controle de acesso e monitoramento 24/7 para máxima segurança."
    },
    {
        icon: <Camera size={32} />,
        title: "Câmeras Estratégicas",
        description: "Sistema de monitoramento com câmeras posicionadas estrategicamente para cobertura completa da escola."
    },
    {
        icon: <Clock size={32} />,
        title: "Relatórios Detalhados",
        description: "Análises completas de frequência, comportamento e desempenho com gráficos e estatísticas avançadas."
    }
];

const Features: React.FC = () => {
    return (
        <section id="funcionalidades" className="py-20 bg-[hsl(var(--secondary)/0.3)]">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">Funcionalidades Principais</h2>
                    <p className="text-lg text-[hsl(var(--neutral-600))] max-w-2xl mx-auto">
                        Tecnologia avançada para gestão escolar completa e segura
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-[hsl(var(--card))] p-8 rounded-[var(--radius)] shadow-[0_2px_10px_rgba(0,0,0,0.05)] text-center hover:-translate-y-1 transition-transform duration-300"
                        >
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[hsl(var(--brand-blue)/0.1)] flex items-center justify-center text-[hsl(var(--brand-blue))]">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                            <p className="text-[hsl(var(--neutral-600))] leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
