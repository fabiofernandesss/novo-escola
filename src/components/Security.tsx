import React from 'react';
import { motion } from 'framer-motion';
import { LockKey, Shield, Eye, Database } from 'phosphor-react';

const Security: React.FC = () => {
    return (
        <section id="seguranca" className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-[hsl(var(--brand-blue)/0.1)] text-[hsl(var(--brand-blue))] text-sm font-semibold mb-4 border border-[hsl(var(--brand-blue)/0.2)]">
                            Segurança e Privacidade
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6 font-display">
                            Proteção Total dos Seus Dados
                        </h2>
                        <p className="text-lg text-[hsl(var(--neutral-600))] mb-8 leading-relaxed">
                            Nosso sistema utiliza as mais avançadas tecnologias de segurança para proteger os dados dos estudantes e garantir a privacidade de todas as informações. Cumprimos rigorosamente a LGPD e padrões internacionais de proteção de dados.
                        </p>
                        <a
                            href="#contato"
                            className="btn-hero inline-flex items-center gap-2"
                        >
                            Saiba Mais sobre Segurança
                        </a>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="grid grid-cols-2 gap-4"
                    >
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100">
                            <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center text-[hsl(var(--brand-blue))] mb-4">
                                <LockKey size={24} weight="duotone" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">Criptografia</h3>
                            <p className="text-sm text-[hsl(var(--neutral-600))]">End-to-end encryption</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-lg border border-purple-100 mt-8">
                            <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center text-purple-600 mb-4">
                                <Shield size={24} weight="duotone" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">LGPD</h3>
                            <p className="text-sm text-[hsl(var(--neutral-600))]">Conformidade total</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-lg border border-green-100">
                            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center text-green-600 mb-4">
                                <Eye size={24} weight="duotone" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">Monitoramento</h3>
                            <p className="text-sm text-[hsl(var(--neutral-600))]">24/7 vigilância</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-lg border border-orange-100 mt-8">
                            <div className="bg-orange-100 w-12 h-12 rounded-xl flex items-center justify-center text-orange-600 mb-4">
                                <Database size={24} weight="duotone" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">Backup</h3>
                            <p className="text-sm text-[hsl(var(--neutral-600))]">Dados protegidos</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Security;
