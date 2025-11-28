import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash, Plus, X, MagnifyingGlass } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

type Student = {
    id: string;
    nome: string;
    matricula?: string;
    data_nascimento?: string;
    sexo?: string;
    whatsapp?: string;
    foto_url?: string;
    escola_id?: string;
    turma_id?: string;
    serie_id?: string;
    cidade?: string;
    estado?: string;
    bairro?: string;
    nome_responsavel_1?: string;
    telefone_responsavel_1?: string;
    responsavel_2?: string;
    telefone_responsavel_2?: string;
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
                s.matricula?.toLowerCase().includes(searchTerm.toLowerCase())
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
        setFormData({});
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este aluno?')) {
            const { error } = await supabase.from('alunos').delete().eq('id', id);
            if (error) alert('Erro ao excluir aluno');
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
                    <input type="text" placeholder="Buscar por nome ou matrícula..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-700 text-left">Nome</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">Matrícula</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">Data Nascimento</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">Responsável</th>
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
                                            {student.foto_url ? (
                                                <img src={student.foto_url} alt={student.nome} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white font-bold">
                                                    {student.nome.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="font-medium text-gray-900">{student.nome}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600">{student.matricula || '-'}</td>
                                    <td className="p-4 text-gray-600">{formatDate(student.data_nascimento)}</td>
                                    <td className="p-4 text-gray-600">{student.nome_responsavel_1 || '-'}</td>
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredStudents.length)} de {filteredStudents.length} resultados
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50">Anterior</button>
                                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                    const page = i + 1;
                                    return (
                                        <button key={i} onClick={() => setCurrentPage(page)} className={`px-3 py-1 border rounded-lg transition-colors ${currentPage === page ? 'bg-[hsl(var(--brand-blue))] text-white' : 'border-gray-200 hover:bg-white'}`}>{page}</button>
                                    );
                                })}
                                <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50">Próxima</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white sticky top-0 z-10">
                                <h3 className="text-xl font-bold">{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={28} weight="bold" /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                                        <input type="text" required value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Matrícula</label>
                                        <input type="text" value={formData.matricula || ''} onChange={(e) => setFormData({ ...formData, matricula: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Data Nascimento</label>
                                        <input type="date" value={formData.data_nascimento || ''} onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                                        <select value={formData.sexo || ''} onChange={(e) => setFormData({ ...formData, sexo: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none">
                                            <option value="">Selecione...</option>
                                            <option value="M">Masculino</option>
                                            <option value="F">Feminino</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                                        <input type="text" value={formData.whatsapp || ''} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Responsável 1</label>
                                        <input type="text" value={formData.nome_responsavel_1 || ''} onChange={(e) => setFormData({ ...formData, nome_responsavel_1: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefone Responsável 1</label>
                                        <input type="text" value={formData.telefone_responsavel_1 || ''} onChange={(e) => setFormData({ ...formData, telefone_responsavel_1: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Responsável 2</label>
                                        <input type="text" value={formData.responsavel_2 || ''} onChange={(e) => setFormData({ ...formData, responsavel_2: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefone Responsável 2</label>
                                        <input type="text" value={formData.telefone_responsavel_2 || ''} onChange={(e) => setFormData({ ...formData, telefone_responsavel_2: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                                        <input type="text" value={formData.bairro || ''} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                                        <input type="text" value={formData.cidade || ''} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                                        <input type="text" value={formData.estado || ''} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" maxLength={2} placeholder="UF" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">URL da Foto</label>
                                        <input type="url" value={formData.foto_url || ''} onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" placeholder="https://..." />
                                    </div>
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
