import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { EnvelopeSimple, LockKey, User, Phone, ArrowLeft, CheckCircle, WarningCircle } from 'phosphor-react';
import { translateAuthError } from '../utils/authErrors';

type AuthMode = 'login' | 'signup' | 'recovery' | 'reset';

const Auth: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mode, setMode] = useState<AuthMode>('login');
    const [step, setStep] = useState(1); // For signup wizard
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        // Check for hash fragment for password reset
        const hash = location.hash;
        if (hash && hash.includes('type=recovery')) {
            setMode('reset');
        }
    }, [location]);

    const formatPhone = (value: string) => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');
        // Limit to 11 digits
        const limited = digits.slice(0, 11);

        if (limited.length <= 2) return limited;
        if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(formatPhone(e.target.value));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { data: authData, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setMessage({ type: 'error', text: translateAuthError(error.message) });
            setLoading(false);
            return;
        }

        if (authData.user) {
            // Fetch user role and status
            const { data: userData, error: userError } = await supabase
                .from('usuarios')
                .select('tipo_usuario, status, status_liberacao')
                .eq('auth_uid', authData.user.id)
                .single();

            if (userError) {
                console.error('Error fetching user data:', userError);
                // Fallback to home if role fetch fails, or handle error
                navigate('/');
            } else {
                // Check status - Redirect to awaiting approval if inactive or not approved
                if (userData?.status === 'inativo' || userData?.status_liberacao === 'NaoLiberado' || userData?.status_liberacao === 'Desativado') {
                    navigate('/awaiting-approval');
                    return;
                }

                // Redirect based on user type
                if (userData?.status === 'ativo' && userData?.status_liberacao === 'Liberado') {
                    if (userData?.tipo_usuario === 'admin') {
                        navigate('/admin');
                    } else if (userData?.tipo_usuario === 'professor') {
                        navigate('/professor');
                    } else if (userData?.tipo_usuario === 'responsavel') {
                        navigate('/responsavel');
                    } else {
                        navigate('/'); // Other user types go to home
                    }
                } else {
                    navigate('/');
                }
            }
        }
        setLoading(false);
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        // 1. Sign up auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            setMessage({ type: 'error', text: translateAuthError(authError.message) });
            setLoading(false);
            return;
        }

        if (authData.user) {
            // 2. Insert into usuarios table
            const { error: dbError } = await supabase
                .from('usuarios')
                .insert([
                    {
                        auth_uid: authData.user.id,
                        email: email,
                        nome: name,
                        whatsapp: phone,
                        tipo_usuario: 'responsavel', // Default role
                        status_liberacao: 'NaoLiberado',
                        status: 'inativo' // Explicitly set status to inativo for new signups if that's the logic, or let default handle it. 
                        // Assuming default might be 'ativo' or 'inativo' in DB, but let's be safe if we want them to wait.
                        // Actually, user said "when user has status inactive", implying it's a state they are in.
                        // New users go to awaiting approval anyway.
                    },
                ]);

            if (dbError) {
                console.error('Error creating user profile:', dbError);
                setMessage({ type: 'error', text: 'Erro ao criar perfil. Tente novamente.' });
            } else {
                // Redirect to awaiting approval
                navigate('/awaiting-approval');
            }
        }
        setLoading(false);
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth#type=recovery`,
        });

        if (error) {
            setMessage({ type: 'error', text: translateAuthError(error.message) });
        } else {
            setMessage({ type: 'success', text: 'Link de recuperação enviado para seu e-mail.' });
        }
        setLoading(false);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            setMessage({ type: 'error', text: translateAuthError(error.message) });
        } else {
            setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
            setTimeout(() => setMode('login'), 2000);
        }
        setLoading(false);
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    return (
        <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[hsl(var(--brand-blue)/0.1)] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[hsl(var(--brand-green)/0.1)] rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative z-10"
            >
                {/* Header */}
                <div className="bg-[hsl(var(--brand-blue))] p-8 text-center text-white relative">
                    <button
                        onClick={() => navigate('/')}
                        className="absolute top-4 left-4 text-white/80 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <img src="/img/icone.png" alt="Escola Log" className="h-12 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold font-display">
                        {mode === 'login' && 'Bem-vindo de volta!'}
                        {mode === 'signup' && 'Crie sua conta'}
                        {mode === 'recovery' && 'Recuperar Senha'}
                        {mode === 'reset' && 'Nova Senha'}
                    </h2>
                    <p className="text-blue-100 text-sm mt-2">
                        {mode === 'login' && 'Acesse sua conta para continuar'}
                        {mode === 'signup' && 'Junte-se a nós em poucos passos'}
                        {mode === 'recovery' && 'Digite seu e-mail para receber o link'}
                        {mode === 'reset' && 'Digite sua nova senha'}
                    </p>
                </div>

                {/* Body */}
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`mb-6 p-4 rounded-lg flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}
                            >
                                {message.type === 'success' ? <CheckCircle size={20} /> : <WarningCircle size={20} />}
                                {message.text}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* LOGIN FORM */}
                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                <div className="relative">
                                    <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none transition-all"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                <div className="relative">
                                    <LockKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="text-right mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setMode('recovery')}
                                        className="text-xs text-[hsl(var(--brand-blue))] hover:underline"
                                    >
                                        Esqueceu a senha?
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[hsl(var(--brand-blue))] text-white py-3 rounded-lg font-semibold hover:bg-[hsl(var(--brand-blue)/0.9)] transition-colors disabled:opacity-70"
                            >
                                {loading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </form>
                    )}

                    {/* SIGNUP WIZARD */}
                    {mode === 'signup' && (
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div className="mb-6">
                                <div className="flex justify-between mb-2">
                                    {[1, 2, 3, 4].map((s) => (
                                        <div
                                            key={s}
                                            className={`h-1 w-full mx-1 rounded-full transition-colors ${s <= step ? 'bg-[hsl(var(--brand-blue))]' : 'bg-gray-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-center text-xs text-gray-500">Passo {step} de 4</p>
                            </div>

                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                    >
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Qual seu e-mail?</label>
                                        <div className="relative">
                                            <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none"
                                                placeholder="seu@email.com"
                                                autoFocus
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                    >
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Como devemos te chamar?</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <input
                                                type="text"
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none"
                                                placeholder="Seu nome completo"
                                                autoFocus
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                    >
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Seu WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <input
                                                type="tel"
                                                required
                                                value={phone}
                                                onChange={handlePhoneChange}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none"
                                                placeholder="(11) 99999-9999"
                                                autoFocus
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -20, opacity: 0 }}
                                    >
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Crie uma senha segura</label>
                                        <div className="relative">
                                            <LockKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none"
                                                placeholder="Mínimo 6 caracteres"
                                                autoFocus
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex gap-3 mt-6">
                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        Voltar
                                    </button>
                                )}
                                {step < 4 ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="flex-1 bg-[hsl(var(--brand-blue))] text-white py-3 rounded-lg font-semibold hover:bg-[hsl(var(--brand-blue)/0.9)] transition-colors"
                                    >
                                        Próximo
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-[hsl(var(--brand-green))] text-white py-3 rounded-lg font-semibold hover:bg-[hsl(var(--brand-green)/0.9)] transition-colors disabled:opacity-70"
                                    >
                                        {loading ? 'Criando...' : 'Finalizar'}
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    {/* RECOVERY FORM */}
                    {mode === 'recovery' && (
                        <form onSubmit={handleRecovery} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail cadastrado</label>
                                <div className="relative">
                                    <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none transition-all"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[hsl(var(--brand-blue))] text-white py-3 rounded-lg font-semibold hover:bg-[hsl(var(--brand-blue)/0.9)] transition-colors disabled:opacity-70"
                            >
                                {loading ? 'Enviando...' : 'Enviar Link'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full text-gray-500 text-sm hover:text-gray-700"
                            >
                                Voltar para Login
                            </button>
                        </form>
                    )}

                    {/* RESET FORM */}
                    {mode === 'reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                                <div className="relative">
                                    <LockKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent outline-none transition-all"
                                        placeholder="Nova senha segura"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[hsl(var(--brand-blue))] text-white py-3 rounded-lg font-semibold hover:bg-[hsl(var(--brand-blue)/0.9)] transition-colors disabled:opacity-70"
                            >
                                {loading ? 'Atualizando...' : 'Atualizar Senha'}
                            </button>
                        </form>
                    )}

                    {/* Footer Links */}
                    {(mode === 'login' || mode === 'signup') && (
                        <div className="mt-8 text-center pt-6 border-t border-gray-100">
                            <p className="text-sm text-gray-600">
                                {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                                <button
                                    onClick={() => {
                                        setMode(mode === 'login' ? 'signup' : 'login');
                                        setStep(1);
                                        setMessage(null);
                                    }}
                                    className="ml-2 font-semibold text-[hsl(var(--brand-blue))] hover:underline"
                                >
                                    {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;
