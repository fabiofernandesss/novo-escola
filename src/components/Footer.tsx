import React from 'react';
import { WhatsappLogo, EnvelopeSimple } from 'phosphor-react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-[hsl(var(--neutral-900))] text-white py-12 text-center md:text-left">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    {/* Logo & Description */}
                    <div className="flex flex-col items-center md:items-start">
                        <img
                            src="/img/logo-horizonal-branca.png"
                            alt="Escola Log"
                            className="h-10 w-auto mb-4"
                        />
                        <p className="text-gray-400 leading-relaxed">
                            Tecnologia educacional inovadora para um futuro mais seguro e conectado.
                        </p>
                    </div>

                    {/* Contact */}
                    <div className="flex flex-col items-center md:items-start">
                        <h3 className="text-[hsl(var(--brand-blue))] font-bold text-lg mb-4 font-display">Contato</h3>
                        <div className="space-y-2 text-gray-400">
                            <p className="flex items-center gap-2 justify-center md:justify-start">
                                <span>WhatsApp: (11) 96903-9674</span>
                            </p>
                            <p className="flex items-center gap-2 justify-center md:justify-start">
                                <span>E-mail: contato@escolalog.com</span>
                            </p>
                        </div>
                    </div>

                    {/* Useful Links */}
                    <div className="flex flex-col items-center md:items-start">
                        <h3 className="text-[hsl(var(--brand-blue))] font-bold text-lg mb-4 font-display">Links Úteis</h3>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="#quem-somos" className="hover:text-white transition-colors">Quem Somos</a></li>
                            <li><a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a></li>
                            <li><a href="#seguranca" className="hover:text-white transition-colors">Segurança</a></li>
                            <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
                    <p>&copy; 2024 Escola Log. Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
