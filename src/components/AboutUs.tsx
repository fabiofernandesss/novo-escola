import React from 'react';
import { motion } from 'framer-motion';
import { RocketLaunch, Heart, UsersThree } from 'phosphor-react';

const AboutUs: React.FC = () => {
    return (
        <section id="quem-somos" className="py-20 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">Quem Somos</h2>
                    <p className="text-lg text-[hsl(var(--neutral-600))] max-w-2xl mx-auto">
                        Conheça nossa missão, valores e o que fazemos para transformar a gestão escolar
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mx-auto">
                    {/* Mission Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center p-8 rounded-2xl border border-[hsl(var(--brand-blue)/0.2)] bg-gradient-to-br from-[hsl(var(--brand-blue)/0.1)] to-[hsl(var(--brand-blue)/0.05)]"
                    >
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-blue)/0.8)]">
                            <RocketLaunch size={32} weight="fill" />
                        </div>
                        <h3 className="text-xl font-bold mb-4 text-[hsl(var(--brand-blue))]">Nossa Missão</h3>
                        <p className="text-[hsl(var(--neutral-600))] leading-relaxed">
                            Transformar a gestão escolar através de tecnologia inovadora, proporcionando segurança, eficiência e transparência para toda a comunidade educacional.
                        </p>
                    </motion.div>

                    {/* Values Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-center p-8 rounded-2xl border border-[hsl(var(--brand-green)/0.2)] bg-gradient-to-br from-[hsl(var(--brand-green)/0.1)] to-[hsl(var(--brand-green)/0.05)]"
                    >
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-[hsl(var(--brand-green))] to-[hsl(var(--brand-green)/0.8)]">
                            <Heart size={32} weight="fill" />
                        </div>
                        <h3 className="text-xl font-bold mb-4 text-[hsl(var(--brand-green))]">Nossos Valores</h3>
                        <p className="text-[hsl(var(--neutral-600))] leading-relaxed">
                            Priorizamos a segurança dos dados, inovação constante, transparência nas relações e excelência no atendimento, sempre respeitando a privacidade e os direitos de cada usuário.
                        </p>
                    </motion.div>

                    {/* What We Do Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-center p-8 rounded-2xl border border-[hsl(var(--brand-blue)/0.2)] bg-gradient-to-br from-[hsl(var(--brand-blue)/0.1)] to-[hsl(var(--brand-green)/0.1)]"
                    >
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))]">
                            <UsersThree size={32} weight="fill" />
                        </div>
                        <h3 className="text-xl font-bold mb-4 text-[hsl(var(--brand-blue))]">O que Fazemos</h3>
                        <p className="text-[hsl(var(--neutral-600))] leading-relaxed">
                            Desenvolvemos soluções completas de gestão escolar com reconhecimento facial, controle de frequência inteligente e comunicação automatizada via WhatsApp.
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default AboutUs;
