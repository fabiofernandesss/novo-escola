import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, CheckCircle, UserPlus, Clock, TrendUp } from 'phosphor-react';
import { motion } from 'framer-motion';

type Stats = {
    totalUsers: number;
    activeUsers: number;
    pendingApproval: number;
    admins: number;
    professors: number;
    responsaveis: number;
};

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats>({
        totalUsers: 0,
        activeUsers: 0,
        pendingApproval: 0,
        admins: 0,
        professors: 0,
        responsaveis: 0,
    });
    const [loading, setLoading] = useState(true);
    const [recentUsers, setRecentUsers] = useState<any[]>([]);

    useEffect(() => {
        fetchStats();
        fetchRecentUsers();
    }, []);

    const fetchStats = async () => {
        const { data: users } = await supabase
            .from('usuarios')
            .select('tipo_usuario, status, status_liberacao')
            .eq('soft_delete', false);

        if (users) {
            setStats({
                totalUsers: users.length,
                activeUsers: users.filter((u) => u.status === 'ativo').length,
                pendingApproval: users.filter((u) => u.status_liberacao === 'NaoLiberado').length,
                admins: users.filter((u) => u.tipo_usuario === 'admin').length,
                professors: users.filter((u) => u.tipo_usuario === 'professor').length,
                responsaveis: users.filter((u) => u.tipo_usuario === 'responsavel').length,
            });
        }
        setLoading(false);
    };

    const fetchRecentUsers = async () => {
        const { data } = await supabase
            .from('usuarios')
            .select('nome, email, tipo_usuario, criado_em, status_liberacao')
            .eq('soft_delete', false)
            .order('criado_em', { ascending: false })
            .limit(5);

        if (data) setRecentUsers(data);
    };

    const StatCard = ({ title, value, icon: Icon, color, gradient }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${gradient}`}>
                    <Icon size={24} weight="bold" className={color} />
                </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${gradient}`} />
        </motion.div>
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--brand-blue))]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
                <p className="text-gray-600">Visão geral do sistema Escola Log</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    title="Total de Usuários"
                    value={stats.totalUsers}
                    icon={Users}
                    color="text-blue-600"
                    gradient="bg-gradient-to-br from-blue-50 to-blue-100"
                />
                <StatCard
                    title="Usuários Ativos"
                    value={stats.activeUsers}
                    icon={CheckCircle}
                    color="text-green-600"
                    gradient="bg-gradient-to-br from-green-50 to-green-100"
                />
                <StatCard
                    title="Aguardando Aprovação"
                    value={stats.pendingApproval}
                    icon={Clock}
                    color="text-yellow-600"
                    gradient="bg-gradient-to-br from-yellow-50 to-yellow-100"
                />
            </div>

            {/* User Type Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] rounded-2xl p-6 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Administradores</h3>
                        <CheckCircle size={28} weight="bold" />
                    </div>
                    <p className="text-4xl font-bold">{stats.admins}</p>
                    <p className="text-blue-100 text-sm mt-2">Acesso total ao sistema</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Professores</h3>
                        <Users size={28} weight="bold" />
                    </div>
                    <p className="text-4xl font-bold">{stats.professors}</p>
                    <p className="text-purple-100 text-sm mt-2">Gestão de turmas e alunos</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Responsáveis</h3>
                        <UserPlus size={28} weight="bold" />
                    </div>
                    <p className="text-4xl font-bold">{stats.responsaveis}</p>
                    <p className="text-orange-100 text-sm mt-2">Acompanhamento de alunos</p>
                </motion.div>
            </div>

            {/* Recent Users */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Usuários Recentes</h2>
                        <TrendUp size={24} className="text-[hsl(var(--brand-blue))]" weight="bold" />
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {recentUsers.map((user, index) => (
                        <div
                            key={index}
                            className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white font-bold">
                                    {user.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{user.nome}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                    {user.tipo_usuario}
                                </span>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${user.status_liberacao === 'Liberado'
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-yellow-50 text-yellow-700'
                                        }`}
                                >
                                    {user.status_liberacao}
                                </span>
                                <p className="text-sm text-gray-500 w-24 text-right">{formatDate(user.criado_em)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.a
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    href="/admin/usuarios"
                    className="group relative overflow-hidden bg-gradient-to-br from-[hsl(var(--brand-blue))] to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all"
                >
                    <div className="relative z-10">
                        <Users size={32} weight="bold" className="mb-3" />
                        <h3 className="text-xl font-bold mb-2">Gerenciar Usuários</h3>
                        <p className="text-blue-100">Adicionar, editar ou remover usuários do sistema</p>
                    </div>
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                </motion.a>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer"
                >
                    <div className="relative z-10">
                        <TrendUp size={32} weight="bold" className="mb-3" />
                        <h3 className="text-xl font-bold mb-2">Relatórios</h3>
                        <p className="text-purple-100">Visualizar métricas e relatórios detalhados</p>
                        <span className="inline-block mt-2 text-xs bg-white/20 px-3 py-1 rounded-full">Em breve</span>
                    </div>
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                </motion.div>
            </div>
        </div>
    );
};

export default AdminDashboard;
