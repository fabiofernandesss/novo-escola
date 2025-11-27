import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash, Plus, X, MagnifyingGlass, Funnel } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

type User = {
    id: string;
    auth_uid: string | null;
    nome: string;
    email: string | null;
    whatsapp: string | null;
    foto_url: string | null;
    foto_perfil: string | null;
    dall_e: string | null;
    tipo_usuario: string;
    cidade: string | null;
    estado: string | null;
    status: string;
    status_liberacao: string;
    criado_em: string;
    atualizado_em: string;
};

type Estado = {
    id: number;
    sigla: string;
    nome: string;
};

type Cidade = {
    id: number;
    nome: string;
};

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({});
    const [password, setPassword] = useState('');
    const [creatingAuth, setCreatingAuth] = useState(false);

    // States/Cities API
    const [estados, setEstados] = useState<Estado[]>([]);
    const [cidades, setCidades] = useState<Cidade[]>([]);
    const [loadingCidades, setLoadingCidades] = useState(false);

    // Filters and Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterTipo, setFilterTipo] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchEstados();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [users, searchTerm, filterStatus, filterTipo]);

    const fetchEstados = async () => {
        try {
            const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
            const data = await response.json();
            setEstados(data);
        } catch (error) {
            console.error('Erro ao carregar estados:', error);
        }
    };

    const fetchCidades = async (estadoSigla: string) => {
        setLoadingCidades(true);
        try {
            const response = await fetch(
                `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoSigla}/municipios?orderBy=nome`
            );
            const data = await response.json();
            setCidades(data);
        } catch (error) {
            console.error('Erro ao carregar cidades:', error);
        } finally {
            setLoadingCidades(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('soft_delete', false)
            .order('criado_em', { ascending: false });

        if (error) console.error('Error fetching users:', error);
        else setUsers(data || []);
        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...users];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(
                (user) =>
                    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.whatsapp?.includes(searchTerm)
            );
        }

        // Status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter((user) => user.status === filterStatus);
        }

        // Tipo filter
        if (filterTipo !== 'all') {
            filtered = filtered.filter((user) => user.tipo_usuario === filterTipo);
        }

        setFilteredUsers(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData(user);
        setPassword('');

        // Load cities for the user's state
        if (user.estado) {
            fetchCidades(user.estado);
        }

        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingUser(null);
        setFormData({
            nome: '',
            email: '',
            whatsapp: '',
            tipo_usuario: 'responsavel',
            status: 'ativo',
            status_liberacao: 'NaoLiberado',
            cidade: '',
            estado: '',
        });
        setPassword('');
        setCidades([]);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
            const { error } = await supabase
                .from('usuarios')
                .update({ soft_delete: true })
                .eq('id', id);

            if (error) alert('Erro ao excluir usuário');
            else fetchUsers();
        }
    };

    const handleEstadoChange = (sigla: string) => {
        setFormData({ ...formData, estado: sigla, cidade: '' });
        if (sigla) {
            fetchCidades(sigla);
        } else {
            setCidades([]);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingUser) {
            // UPDATE existing user
            const { error } = await supabase
                .from('usuarios')
                .update({
                    nome: formData.nome,
                    email: formData.email,
                    whatsapp: formData.whatsapp,
                    tipo_usuario: formData.tipo_usuario,
                    status: formData.status,
                    status_liberacao: formData.status_liberacao,
                    cidade: formData.cidade,
                    estado: formData.estado,
                    foto_url: formData.foto_url,
                    foto_perfil: formData.foto_perfil,
                    dall_e: formData.dall_e,
                })
                .eq('id', editingUser.id);

            if (error) {
                alert('Erro ao atualizar usuário: ' + error.message);
            } else {
                setIsModalOpen(false);
                fetchUsers();
            }
        } else {
            // CREATE new user
            if (!formData.email || !password) {
                alert('Email e senha são obrigatórios para criar um novo usuário');
                return;
            }

            setCreatingAuth(true);

            try {
                // 1. Create user in Supabase Auth
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: password,
                });

                if (authError) {
                    alert('Erro ao criar usuário no Auth: ' + authError.message);
                    setCreatingAuth(false);
                    return;
                }

                if (authData.user) {
                    // 2. Create user in usuarios table
                    const { error: dbError } = await supabase
                        .from('usuarios')
                        .insert([
                            {
                                auth_uid: authData.user.id,
                                nome: formData.nome,
                                email: formData.email,
                                whatsapp: formData.whatsapp,
                                tipo_usuario: formData.tipo_usuario || 'responsavel',
                                status: formData.status || 'ativo',
                                status_liberacao: formData.status_liberacao || 'NaoLiberado',
                                cidade: formData.cidade,
                                estado: formData.estado,
                                foto_url: formData.foto_url,
                                foto_perfil: formData.foto_perfil,
                                dall_e: formData.dall_e,
                            },
                        ]);

                    if (dbError) {
                        alert('Erro ao criar perfil do usuário: ' + dbError.message);
                    } else {
                        setIsModalOpen(false);
                        fetchUsers();
                    }
                }
            } catch (err: any) {
                alert('Erro: ' + err.message);
            } finally {
                setCreatingAuth(false);
            }
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Gerenciar Usuários</h1>
                    <p className="text-gray-600">
                        {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={handleNew}
                    className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-semibold"
                >
                    <Plus size={20} weight="bold" />
                    Novo Usuário
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, email ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                        />
                    </div>

                    {/* Filter Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <Funnel size={20} />
                        Filtros
                    </button>
                </div>

                {/* Filter Options */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))]"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="ativo">Ativo</option>
                                        <option value="inativo">Inativo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Usuário</label>
                                    <select
                                        value={filterTipo}
                                        onChange={(e) => setFilterTipo(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))]"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="admin">Admin</option>
                                        <option value="prefeito">Prefeito</option>
                                        <option value="secretario">Secretário</option>
                                        <option value="diretor">Diretor</option>
                                        <option value="professor">Professor</option>
                                        <option value="responsavel">Responsável</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="p-4 font-semibold text-gray-700">Nome</th>
                                <th className="p-4 font-semibold text-gray-700">Email</th>
                                <th className="p-4 font-semibold text-gray-700">Tipo</th>
                                <th className="p-4 font-semibold text-gray-700">Status</th>
                                <th className="p-4 font-semibold text-gray-700">Liberação</th>
                                <th className="p-4 font-semibold text-gray-700 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--brand-blue))]"></div>
                                            Carregando...
                                        </div>
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        Nenhum usuário encontrado
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((user, index) => (
                                    <motion.tr
                                        key={user.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white font-bold">
                                                    {user.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900">{user.nome}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600">{user.email}</td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                                {user.tipo_usuario}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'ativo' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                    }`}
                                            >
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${user.status_liberacao === 'Liberado'
                                                    ? 'bg-green-50 text-green-700'
                                                    : user.status_liberacao === 'NaoLiberado'
                                                        ? 'bg-yellow-50 text-yellow-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {user.status_liberacao}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredUsers.length)} de{' '}
                                {filteredUsers.length} resultados
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>

                                {totalPages <= 7 ? (
                                    [...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`px-3 py-1 border rounded-lg transition-colors ${currentPage === i + 1
                                                ? 'bg-[hsl(var(--brand-blue))] text-white border-[hsl(var(--brand-blue))]'
                                                : 'border-gray-200 hover:bg-white'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))
                                ) : (
                                    <>
                                        {/* First Page */}
                                        <button
                                            onClick={() => setCurrentPage(1)}
                                            className={`px-3 py-1 border rounded-lg transition-colors ${currentPage === 1
                                                ? 'bg-[hsl(var(--brand-blue))] text-white border-[hsl(var(--brand-blue))]'
                                                : 'border-gray-200 hover:bg-white'
                                                }`}
                                        >
                                            1
                                        </button>

                                        {currentPage > 3 && <span className="px-2">...</span>}

                                        {/* Middle Pages */}
                                        {[...Array(totalPages)].map((_, i) => {
                                            const page = i + 1;
                                            if (page !== 1 && page !== totalPages && Math.abs(currentPage - page) <= 1) {
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-3 py-1 border rounded-lg transition-colors ${currentPage === page
                                                            ? 'bg-[hsl(var(--brand-blue))] text-white border-[hsl(var(--brand-blue))]'
                                                            : 'border-gray-200 hover:bg-white'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })}

                                        {currentPage < totalPages - 2 && <span className="px-2">...</span>}

                                        {/* Last Page */}
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            className={`px-3 py-1 border rounded-lg transition-colors ${currentPage === totalPages
                                                ? 'bg-[hsl(var(--brand-blue))] text-white border-[hsl(var(--brand-blue))]'
                                                : 'border-gray-200 hover:bg-white'
                                                }`}
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit/Create Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white">
                                <h3 className="text-xl font-bold">
                                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                                    <X size={28} weight="bold" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto">
                                {/* Personal Info */}
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg border-b pb-2">
                                        👤 Informações Pessoais
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.nome || ''}
                                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email {!editingUser && '*'}
                                            </label>
                                            <input
                                                type="email"
                                                required={!editingUser}
                                                disabled={!!editingUser}
                                                value={formData.email || ''}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none disabled:bg-gray-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                                            <input
                                                type="text"
                                                value={formData.whatsapp || ''}
                                                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                                placeholder="(11) 99999-9999"
                                            />
                                        </div>
                                        {!editingUser && (
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Senha *</label>
                                                <input
                                                    type="password"
                                                    required
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                                    placeholder="Mínimo 6 caracteres"
                                                    minLength={6}
                                                />
                                                <p className="text-xs text-gray-500 mt-2">
                                                    💡 Esta senha será usada para criar a conta no sistema de autenticação
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg border-b pb-2">
                                        📍 Localização
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                                            <select
                                                value={formData.estado || ''}
                                                onChange={(e) => handleEstadoChange(e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                            >
                                                <option value="">Selecione um estado</option>
                                                {estados.map((estado) => (
                                                    <option key={estado.id} value={estado.sigla}>
                                                        {estado.nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                                            <select
                                                value={formData.cidade || ''}
                                                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                                disabled={!formData.estado || loadingCidades}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none disabled:bg-gray-50"
                                            >
                                                <option value="">
                                                    {loadingCidades ? 'Carregando cidades...' : 'Selecione uma cidade'}
                                                </option>
                                                {cidades.map((cidade) => (
                                                    <option key={cidade.id} value={cidade.nome}>
                                                        {cidade.nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* User Type and Status */}
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg border-b pb-2">
                                        ⚙️ Tipo e Status
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Usuário</label>
                                            <select
                                                value={formData.tipo_usuario || 'responsavel'}
                                                onChange={(e) => setFormData({ ...formData, tipo_usuario: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="prefeito">Prefeito</option>
                                                <option value="secretario">Secretário</option>
                                                <option value="diretor">Diretor</option>
                                                <option value="professor">Professor</option>
                                                <option value="responsavel">Responsável</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                            <select
                                                value={formData.status || 'ativo'}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                            >
                                                <option value="ativo">Ativo</option>
                                                <option value="inativo">Inativo</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Liberação</label>
                                            <select
                                                value={formData.status_liberacao || 'NaoLiberado'}
                                                onChange={(e) => setFormData({ ...formData, status_liberacao: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                            >
                                                <option value="Liberado">Liberado</option>
                                                <option value="NaoLiberado">Não Liberado</option>
                                                <option value="Desativado">Desativado</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Photos/Images */}
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg border-b pb-2">
                                        🖼️ Imagens (URLs)
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Foto de Perfil</label>
                                            <input
                                                type="text"
                                                value={formData.foto_perfil || ''}
                                                onChange={(e) => setFormData({ ...formData, foto_perfil: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Foto URL</label>
                                            <input
                                                type="text"
                                                value={formData.foto_url || ''}
                                                onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">DALL-E URL</label>
                                            <input
                                                type="text"
                                                value={formData.dall_e || ''}
                                                onChange={(e) => setFormData({ ...formData, dall_e: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {editingUser && (
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
                                        <p className="text-xs text-gray-700 space-y-1">
                                            <strong>ID:</strong> {editingUser.id}
                                            <br />
                                            <strong>Auth UID:</strong> {editingUser.auth_uid || 'N/A'}
                                            <br />
                                            <strong>Atualizado em:</strong> {formatDate(editingUser.atualizado_em)}
                                        </p>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end gap-3 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creatingAuth}
                                        className="px-6 py-2.5 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 font-semibold"
                                    >
                                        {creatingAuth ? 'Criando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminUsers;
