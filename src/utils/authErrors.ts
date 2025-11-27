export const translateAuthError = (error: string): string => {
    const message = error.toLowerCase();

    if (message.includes('invalid login credentials')) {
        return 'E-mail ou senha incorretos.';
    }
    if (message.includes('email not confirmed')) {
        return 'E-mail não confirmado. Verifique sua caixa de entrada.';
    }
    if (message.includes('user already registered')) {
        return 'Este e-mail já está cadastrado.';
    }
    if (message.includes('password should be at least 6 characters')) {
        return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (message.includes('invalid email')) {
        return 'E-mail inválido.';
    }
    if (message.includes('rate limit exceeded')) {
        return 'Muitas tentativas. Aguarde um momento e tente novamente.';
    }

    // Default fallback
    return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
};
