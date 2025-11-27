import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WhatsappLogo, X } from 'phosphor-react';

const Contact: React.FC = () => {
    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        instituicao: '',
        mensagem: '',
        termo: false
    });

    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 10) {
            return digits.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, '($1) $2-$3');
        } else {
            return digits.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*/, '($1) $2-$3');
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, telefone: formatPhone(e.target.value) });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const message = `Olá! Gostaria de agendar uma demonstração do Escola Log.\n\nNome: ${formData.nome}\nTelefone: ${formData.telefone}\nInstituição: ${formData.instituicao}\nMensagem: ${formData.mensagem || 'Sem mensagem adicional'}`;
        const whatsappUrl = `https://wa.me/5511969039674?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <section id="contato" className="py-20 bg-[hsl(var(--card))]">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto items-center">
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">Fale com a gente</h2>
                        <p className="text-[hsl(var(--neutral-600))] mb-8 text-lg">
                            Agende uma demonstração ou tire dúvidas sobre implantação e planos.
                        </p>
                        <ul className="text-[hsl(var(--neutral-600))] space-y-2 inline-block text-left">
                            <li>• Resposta em até 1 dia útil</li>
                            <li>• Demonstração personalizada</li>
                            <li>• Suporte humanizado, sem bots</li>
                        </ul>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-[hsl(var(--border))]">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nome"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-[hsl(var(--border))] focus:border-[hsl(var(--brand-blue))] focus:ring-2 focus:ring-[hsl(var(--brand-blue)/0.2)] outline-none transition-all"
                            />

                            <input
                                type="tel"
                                placeholder="Telefone"
                                value={formData.telefone}
                                onChange={handlePhoneChange}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-[hsl(var(--border))] focus:border-[hsl(var(--brand-blue))] focus:ring-2 focus:ring-[hsl(var(--brand-blue)/0.2)] outline-none transition-all"
                            />

                            <input
                                type="text"
                                placeholder="Instituição"
                                value={formData.instituicao}
                                onChange={(e) => setFormData({ ...formData, instituicao: e.target.value })}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-[hsl(var(--border))] focus:border-[hsl(var(--brand-blue))] focus:ring-2 focus:ring-[hsl(var(--brand-blue)/0.2)] outline-none transition-all"
                            />

                            <textarea
                                placeholder="Mensagem"
                                value={formData.mensagem}
                                onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-3 rounded-lg border border-[hsl(var(--border))] focus:border-[hsl(var(--brand-blue))] focus:ring-2 focus:ring-[hsl(var(--brand-blue)/0.2)] outline-none transition-all resize-none"
                            />

                            <div className="flex items-start gap-2 text-sm text-[hsl(var(--neutral-600))]">
                                <input
                                    type="checkbox"
                                    checked={formData.termo}
                                    onChange={(e) => setFormData({ ...formData, termo: e.target.checked })}
                                    required
                                    className="mt-1 w-4 h-4 text-[hsl(var(--brand-blue))] rounded focus:ring-2 focus:ring-[hsl(var(--brand-blue)/0.2)]"
                                />
                                <label>
                                    Concordo com os <button type="button" onClick={() => setShowTerms(true)} className="text-[hsl(var(--brand-blue))] hover:underline">Termos de Uso</button> e <button type="button" onClick={() => setShowPrivacy(true)} className="text-[hsl(var(--brand-blue))] hover:underline">Política de Privacidade</button>
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <WhatsappLogo size={24} weight="fill" />
                                Enviar WhatsApp
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Terms Modal */}
            <AnimatePresence>
                {showTerms && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowTerms(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <h3 className="text-xl font-bold text-[hsl(var(--brand-blue))] font-display">Termos de Uso</h3>
                                <button onClick={() => setShowTerms(false)} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4 text-gray-600 leading-relaxed">
                                <h4 className="font-bold text-gray-900">1. Aceitação dos Termos</h4>
                                <p>Ao acessar e utilizar a plataforma Escola Log, você concorda em cumprir e estar vinculado aos presentes Termos de Uso.</p>

                                <h4 className="font-bold text-gray-900">2. Descrição do Serviço</h4>
                                <p>A Escola Log é uma plataforma de gestão escolar que oferece controle de frequência com reconhecimento facial, alertas para pais e painel em tempo real.</p>

                                <h4 className="font-bold text-gray-900">3. Responsabilidades</h4>
                                <p>O usuário compromete-se a fornecer informações verdadeiras e utilizar o sistema apenas para fins educacionais legítimos.</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Privacy Modal */}
            <AnimatePresence>
                {showPrivacy && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowPrivacy(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <h3 className="text-xl font-bold text-[hsl(var(--brand-blue))] font-display">Política de Privacidade</h3>
                                <button onClick={() => setShowPrivacy(false)} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4 text-gray-600 leading-relaxed">
                                <h4 className="font-bold text-gray-900">1. Informações Gerais</h4>
                                <p>Esta Política de Privacidade descreve como a Escola Log coleta, usa e protege suas informações pessoais, em conformidade com a LGPD.</p>

                                <h4 className="font-bold text-gray-900">2. Dados Coletados</h4>
                                <p>Coletamos dados de identificação, contato, biométricos (com consentimento) e acadêmicos para fins de gestão escolar.</p>

                                <h4 className="font-bold text-gray-900">3. Segurança</h4>
                                <p>Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado.</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default Contact;
