import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash, Plus, X, MagnifyingGlass } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

type School = {
    id: string;
    nome: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    telefone?: string;
    email?: string;
    diretor?: string;
    capacidade_alunos?: number;
    criado_em: string;
    atualizado_em: string;
};

const AdminSchools: React.FC = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [formData, setFormData] = useState<Partial<School>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchSchools();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [schools, searchTerm]);

    const fetchSchools = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('escolas')
            .select('*')
            .order('nome', { ascending: true });

        if (error) console.error('Error fetching schools:', error);
        else setSchools(data || []);
        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...schools];

        if (searchTerm) {
            filtered = filtered.filter(
                (school) =>
                    school.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    school.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    school.diretor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    school.cnpj?.includes(searchTerm)
            );
        }

        setFilteredSchools(filtered);
        setCurrentPage(1);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredSchools.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);

    const handleEdit = (school: School) => {
        setEditingSchool(school);
        setFormData(school);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingSchool(null);
        setFormData({
            nome: '',
            cnpj: '',
            endereco: '',
            cidade: '',
            estado: '',
            cep: '',
            telefone: '',
            email: '',
            diretor: '',
            capacidade_alunos: 0,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta escola?')) {
            const { error } = await supabase.from('escolas').delete().eq('id', id);

            if (error) alert('Erro ao excluir escola');
            else fetchSchools();
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingSchool) {
            const { error } = await supabase
                .from('escolas')
                .update(formData)
                .eq('id', editingSchool.id);

            if (error) {
                alert('Erro ao atualizar escola: ' + error.message);
            } else {
                setIsModalOpen(false);
                fetchSchools();
            }
        } else {
            const { error } = await supabase.from('escolas').insert([formData]);

            if (error) {
                alert('Erro ao criar escola: ' + error.message);
            } else {
                setIsModalOpen(false);
                fetchSchools();
            }
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Gerenciar Escolas</h1>
                    <p className="text-gray-600">
                        {filteredSchools.length} escola{filteredSchools.length !== 1 ? 's' : ''} encontrada{filteredSchools.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={handleNew}
                    className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-semibold"
                >
                    <Plus size={20} weight="bold" />
                    Nova Escola
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, cidade, diretor ou CNPJ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="p-4 font-semibold text-gray-700">Nome</th>
                                <th className="p-4 font-semibold text-gray-700">CNPJ</th>
                                <th className="p-4 font-semibold text-gray-700">Cidade/Estado</th>
                                <th className="p-4 font-semibold text-gray-700">Diretor</th>
                                <th className="p-4 font-semibold text-gray-700">Telefone</th>
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
                                        Nenhuma escola encontrada
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((school, index) => (
                                    <motion.tr
                                        key={school.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="p-4 font-medium text-gray-900">{school.nome}</td>
                                        <td className="p-4 text-gray-600">{school.cnpj || '-'}</td>
                                        <td className="p-4 text-gray-600">
                                            {school.cidade && school.estado ? `${school.cidade}/${school.estado}` : '-'}
                                        </td>
                                        <td className="p-4 text-gray-600">{school.diretor || '-'}</td>
                                        <td className="p-4 text-gray-600">{school.telefone || '-'}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleEdit(school)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(school.id)}
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
                                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredSchools.length)} de{' '}
                                {filteredSchools.length} resultados
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
                                        <button onClick={() => setCurrentPage(1)} className={`px-3 py-1 border rounded-lg ${currentPage === 1 ? 'bg-[hsl(var(--brand-blue))] text-white' : ''}`}>1</button>
                                        {currentPage > 3 && <span className="px-2">...</span>}
                                        {[...Array(totalPages)].map((_, i) => {
                                            const page = i + 1;
                                            if (page !== 1 && page !== totalPages && Math.abs(currentPage - page) <= 1) {
                                                return <button key={i} onClick={() => setCurrentPage(page)} className={`px-3 py-1 border rounded-lg ${currentPage === page ? 'bg-[hsl(var(--brand-blue))] text-white' : ''}`}>{page}</button>;
                                            }
                                            return null;
                                        })}
                                        {currentPage < totalPages - 2 && <span className="px-2">...</span>}
                                        <button onClick={() => setCurrentPage(totalPages)} className={`px-3 py-1 border rounded-lg ${currentPage === totalPages ? 'bg-[hsl(var(--brand-blue))] text-white' : ''}`}>{totalPages}</button>
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
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white">
                                <h3 className="text-xl font-bold">
                                    {editingSchool ? 'Editar Escola' : 'Nova Escola'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                                    <X size={28} weight="bold" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Escola *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nome || ''}
                                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
                                        <input
                                            type="text"
                                            value={formData.cnpj || ''}
                                            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                            placeholder="00.000.000/0000-00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Capacidade de Alunos</label>
                                        <input
                                            type="number"
                                            value={formData.capacidade_alunos || ''}
                                            onChange={(e) => setFormData({ ...formData, capacidade_alunos: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                                    <input
                                        type="text"
                                        value={formData.endereco || ''}
                                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                                        <input
                                            type="text"
                                            value={formData.cidade || ''}
                                            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                                        <input
                                            type="text"
                                            value={formData.estado || ''}
                                            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                            maxLength={2}
                                            placeholder="SP"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                                        <input
                                            type="text"
                                            value={formData.cep || ''}
                                            onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                            placeholder="00000-000"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                                        <input
                                            type="text"
                                            value={formData.telefone || ''}
                                            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email || ''}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Diretor</label>
                                    <input
                                        type="text"
                                        value={formData.diretor || ''}
                                        onChange={(e) => setFormData({ ...formData, diretor: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                    />
                                </div>

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
                                        className="px-6 py-2.5 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                                    >
                                        {editingSchool ? 'Salvar Alterações' : 'Criar Escola'}
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

export default AdminSchools;
