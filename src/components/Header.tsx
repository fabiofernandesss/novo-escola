import React, { useState, useEffect } from 'react';
import { List, X } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { href: '/#quem-somos', label: 'Quem Somos' },
        { href: '/#seguranca', label: 'Segurança' },
        { href: '/#funcionalidades', label: 'Funcionalidades' },
        { href: '/#faq', label: 'FAQ' },
        { href: '/#contato', label: 'Contato' },
    ];

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b border-[hsl(var(--border))] ${isScrolled ? 'bg-[hsl(var(--background)/0.95)] backdrop-blur-md py-2' : 'bg-[hsl(var(--background)/0.8)] backdrop-blur-md py-3'
                }`}
        >
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className="flex items-center">
                    <a href="/">
                        <img
                            src="/img/logo-horizonal.png"
                            alt="Escola Log Logo"
                            className="h-10 w-auto object-contain"
                        />
                    </a>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-[hsl(var(--neutral-600))] hover:text-[hsl(var(--foreground))] font-medium transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden lg:flex items-center gap-4">
                    <a href="/auth" className="btn-outline px-4 py-2 rounded-[var(--radius)] font-medium">
                        Entrar
                    </a>
                    <a href="/#contato" className="btn-primary px-4 py-2 rounded-[var(--radius)] font-medium">
                        Agende Demo
                    </a>
                </div>

                {/* Mobile Actions */}
                <div className="lg:hidden flex items-center gap-4">
                    <a href="/auth" className="flex items-center gap-1 bg-[hsl(var(--brand-blue))] text-white px-3 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[hsl(var(--brand-blue)/0.9)] transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                            <polyline points="10,17 15,12 10,7"></polyline>
                            <line x1="15" y1="12" x2="3" y2="12"></line>
                        </svg>
                        <span>Entrar</span>
                    </a>
                    <button
                        className="text-[hsl(var(--foreground))] p-2"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black z-[100] p-8 flex flex-col"
                        style={{ backgroundColor: '#000000' }}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <img src="/img/logo-horizonal-branca.png" alt="Escola Log" className="h-10 w-auto" />
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-white p-2"
                            >
                                <X size={24} weight="bold" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <a
                                href="/auth"
                                className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white py-4 px-8 rounded-full font-semibold text-center mb-4 flex items-center justify-center gap-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                🔒 Entrar no Sistema
                            </a>

                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="text-white font-medium py-4 border-b border-gray-800 hover:text-[hsl(var(--brand-blue))] transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Header;
