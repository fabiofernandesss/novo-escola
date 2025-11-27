import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
    {
        question: "Como funciona o reconhecimento facial antifraude?",
        answer: "Utilizamos algoritmos de inteligência artificial que analisam múltiplos pontos faciais para garantir autenticidade. O sistema detecta tentativas de fraude usando fotos ou vídeos, protegendo contra falsificações."
    },
    {
        question: "Quais perfis existem no sistema?",
        answer: "O sistema possui perfis para administradores escolares, professores, pais/responsáveis e gestores públicos. Cada perfil tem permissões específicas para garantir segurança e privacidade dos dados."
    },
    {
        question: "Como é feita a integração com WhatsApp?",
        answer: "A integração é automática através da API oficial do WhatsApp Business. Os pais cadastram o número ao criar a conta e recebem notificações instantâneas sobre entrada, saída e eventos da escola."
    },
    {
        question: "O sistema funciona offline?",
        answer: "O reconhecimento facial funciona localmente mesmo sem internet. As notificações são enviadas quando a conexão é restabelecida, garantindo continuidade do serviço."
    },
    {
        question: "Como é garantida a segurança dos dados?",
        answer: "Utilizamos criptografia end-to-end, servidores em nuvem com certificação internacional, backups automáticos diários e conformidade total com a LGPD."
    },
    {
        question: "Qual o tempo de implementação?",
        answer: "A implementação completa leva de 7 a 14 dias úteis, incluindo instalação de câmeras, cadastramento inicial e treinamento da equipe escolar."
    },
    {
        question: "O sistema gera relatórios personalizados?",
        answer: "Sim! Oferecemos dashboards personalizáveis com relatórios de frequência, estatísticas de entrada/saída, análises por turma e gráficos comparativos por período."
    },
    {
        question: "Como funciona o suporte técnico?",
        answer: "Oferecemos suporte humanizado via WhatsApp, e-mail e telefone, de segunda a sexta das 8h às 18h, com atendimento emergencial 24/7 para problemas críticos."
    },
    {
        question: "É possível integrar com outros sistemas?",
        answer: "Sim, o Escola Log possui API aberta para integração com sistemas de gestão escolar, ERPs educacionais e plataformas de ensino."
    },
    {
        question: "Qual o investimento necessário?",
        answer: "O investimento varia conforme o tamanho da escola e número de alunos. Entre em contato para uma proposta personalizada e demonstração gratuita."
    }
];

const FAQ: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="py-20 bg-[hsl(var(--secondary)/0.3)]">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">Perguntas Frequentes</h2>
                    <p className="text-lg text-[hsl(var(--neutral-600))]">
                        Tire suas dúvidas sobre o Escola Log
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] overflow-hidden ${openIndex === index ? 'active' : ''}`}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full px-6 py-5 flex justify-between items-center text-left hover:bg-[hsl(var(--secondary)/0.5)] transition-colors"
                            >
                                <span className="font-semibold text-gray-900 pr-8">{faq.question}</span>
                                <motion.div
                                    animate={{ rotate: openIndex === index ? 45 : 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-[hsl(var(--brand-blue))] flex-shrink-0 text-2xl font-light"
                                >
                                    +
                                </motion.div>
                            </button>

                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 pb-5 text-[hsl(var(--neutral-600))] leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
