import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash, Plus, X, MagnifyingGlass } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

type Student = {
    id: string;
    nome: string;
    data_nascimento?: string;
    cpf?: string;
    rg?: string;
    nome_mae?: string;
    nome_pai?: string;
    telefone_responsavel?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    responsavel_id?: string;
    turma_id?: string;
    matricula?: string;
    foto_url?: string;
    criado_em: string;
};

const AdminStudents: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState<Partial<Student>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [students, searchTerm]);

    const fetchStudents = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('alunos').select('*').order('nome', { ascending: true });
        if (error) console.error('Error:', error);
        else setStudents(data || []);
        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...students];
        if (searchTerm) {
            filtered = filtered.filter((s) =>
                s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.cpf?.includes(searchTerm)
            );
        }
        setFilteredStudents(filtered);
        setCurrentPage(1);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
        setFormData(student);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingStudent(null);
        setFormData({
            nome: '',
            matricula: '',
            cpf: '',
            rg: '',
            data_nascimento: '',
            nome_mae: '',
            nome_pai: '',
            telefone_responsavel: '',
            endereco: '',
            cidade: '',
            estado: '',
            cep: '',
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este aluno?')) {
            const { error } = await supabase.from('alunos').delete().eq('id', id);
            if (error) alert('Erro ao excluir');
            else fetchStudents();
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingStudent) {
            const { error } = await supabase.from('alunos').update(formData).eq('id', editingStudent.id);
            if (error) alert('Erro: ' + error.message);
            else { setIsModalOpen(false); fetchStudents(); }
        } else {
            const { error } = await supabase.from('alunos').insert([formData]);
            if (error) alert('Erro: ' + error.message);
            else { setIsModalOpen(false); fetchStudents(); }
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gerenciar Alunos</h1>
                    <p className="text-gray-600">{filteredStudents.length} aluno{filteredStudents.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={handleNew} className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg font-semibold">
                    <Plus size={20} weight="bold" />Novo Aluno
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" placeholder="Buscar por nome, matrícula ou CPF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-700 text-left">Nome</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">Matrícula</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">CPF</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">Data Nascimento</th>
                            <th className="p-4 font-semibold text-gray-700 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center"><div className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--brand-blue))]"></div>Carregando...</div></td></tr>
                        ) : currentItems.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum aluno encontrado</td></tr>
                        ) : (
                            currentItems.map((student, i) => (
                                <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white font-bold">
                                                {student.nome.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-900">{student.nome}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{student.matricula || '-'}</td>
                                    <td className="p-4 text-gray-600">{student.cpf || '-'}</td>
                                    <td className="p-4 text-gray-600">{formatDate(student.data_nascimento)}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleEdit(student)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={18} /></button>
                                            <button onClick={() => handleDelete(student.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash size={18} /></button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="border-t px-4 py-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredStudents.length)} de {filteredStudents.length}</p>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-lg hover:bg-white disabled:opacity-50">Anterior</button>
                                {totalPages <= 7 ? [...Array(totalPages)].map((_, i) => (
                                    <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1 border rounded-lg ${currentPage === i + 1 ? 'bg-[hsl(var(--brand-blue))] text-white' : ''}`}>{i + 1}</button>
                                )) : (
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
                                <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-lg hover:bg-white disabled:opacity-50">Próxima</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white">
                                <h3 className="text-xl font-bold">{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={28} weight="bold" /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                                        <input type="text" required value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Matrícula</label>
                                        <input type="text" value={formData.matricula || ''} onChange={(e) => setFormData({ ...formData, matricula: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento</label>
                                        <input type="date" value={formData.data_nascimento || ''} onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                                        <input type="text" value={formData.cpf || ''} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" placeholder="000.000.000-00" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">RG</label>
                                        <input type="text" value={formData.rg || ''} onChange={(e) => setFormData({ ...formData, rg: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Mãe</label>
                                        <input type="text" value={formData.nome_mae || ''} onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Pai</label>
                                        <input type="text" value={formData.nome_pai || ''} onChange={(e) => setFormData({ ...formData, nome_pai: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone Responsável</label>
                                    <input type="text" value={formData.telefone_responsavel || ''} onChange={(e) => setFormData({ ...formData, telefone_responsavel: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                                    <input type="text" value={formData.endereco || ''} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                                        <input type="text" value={formData.cidade || ''} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                                        <input type="text" value={formData.estado || ''} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" maxLength={2} placeholder="SP" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                                        <input type="text" value={formData.cep || ''} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" placeholder="00000-000" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">URL da Foto</label>
                                    <input type="text" value={formData.foto_url || ''} onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" placeholder="https://..." />
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancelar</button>
                                    <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl hover:shadow-lg font-semibold">{editingStudent ? 'Salvar' : 'Criar'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminStudents;
