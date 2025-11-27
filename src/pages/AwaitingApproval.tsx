import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';

const AwaitingApproval: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[hsl(var(--brand-blue)/0.1)] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[hsl(var(--brand-green)/0.1)] rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center relative z-10"
            >
                <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock size={40} className="text-yellow-500" weight="fill" />
                </div>

                <h2 className="text-2xl font-bold font-display mb-4 text-gray-900">Cadastro em Análise</h2>

                <p className="text-gray-600 mb-8">
                    Seu cadastro foi recebido com sucesso! Agora, nossa equipe irá verificar suas informações para liberar seu acesso.
                </p>

                <div className="bg-blue-50 p-4 rounded-lg text-left mb-8">
                    <div className="flex items-start gap-3">
                        <CheckCircle size={24} className="text-[hsl(var(--brand-blue))] mt-0.5" weight="fill" />
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm">O que acontece agora?</h4>
                            <p className="text-xs text-gray-600 mt-1">
                                Você receberá uma notificação assim que seu acesso for liberado. Isso geralmente leva menos de 24 horas úteis.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-[hsl(var(--brand-blue))] text-white py-3 rounded-lg font-semibold hover:bg-[hsl(var(--brand-blue)/0.9)] transition-colors"
                >
                    Voltar para o Início
                </button>
            </motion.div>
        </div>
    );
};

export default AwaitingApproval;
