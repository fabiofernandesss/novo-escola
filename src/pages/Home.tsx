import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import AboutUs from '../components/AboutUs';
import Features from '../components/Features';
import Security from '../components/Security';
import FAQ from '../components/FAQ';
import DownloadSection from '../components/DownloadSection';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { WhatsappLogo } from 'phosphor-react';

const Home: React.FC = () => {
    return (
        <div className="home-page">
            <Header />
            <Hero />
            <AboutUs />
            <Features />
            <Security />
            <FAQ />
            <DownloadSection />
            <Contact />
            <Footer />

            {/* Floating WhatsApp Button */}
            <a
                href="https://wa.me/5511969039674"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-5 right-5 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg z-50 hover:scale-110 transition-transform duration-300"
                aria-label="Contato WhatsApp"
            >
                <WhatsappLogo size={32} weight="fill" color="white" />
            </a>
        </div>
    );
};

export default Home;
