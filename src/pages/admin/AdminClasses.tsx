import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash, Plus, X, MagnifyingGlass } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';

type Class = {
    id: string;
    nome: string;
    escola_id?: string;
    serie_id?: string;
    turno?: string;
    professor_responsavel_id?: string;
    criado_em: string;
    escolas?: { nome: string };
    series?: { nome: string };
};

type School = { id: string; nome: string; };
type Grade = { id: string; nome: string; };

const AdminClasses: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [formData, setFormData] = useState<Partial<Class>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [classes, searchTerm]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch Classes with relations
        const { data: classesData, error: classesError } = await supabase
            .from('turmas')
            .select('*, escolas(nome), series(nome)')
            .order('nome', { ascending: true });

        if (classesError) console.error('Error fetching classes:', classesError);
        else setClasses(classesData || []);

        // Fetch Schools for dropdown
        const { data: schoolsData } = await supabase
            .from('escolas')
            .select('id, nome')
            .order('nome');
        setSchools(schoolsData || []);

        // Fetch Grades for dropdown
        const { data: gradesData } = await supabase
            .from('series')
            .select('id, nome')
            .order('nome');
        setGrades(gradesData || []);

        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...classes];

        if (searchTerm) {
            filtered = filtered.filter(
                (cls) =>
                    cls.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cls.turno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cls.escolas?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cls.series?.nome.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredClasses(filtered);
        setCurrentPage(1);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredClasses.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);

    const handleEdit = (cls: Class) => {
        setEditingClass(cls);
        setFormData({
            ...cls,
            escola_id: cls.escola_id,
            serie_id: cls.serie_id
        });
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingClass(null);
        setFormData({
            nome: '',
            turno: 'Manhã',
            escola_id: schools[0]?.id || '',
            serie_id: grades[0]?.id || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (await confirm({ title: 'Excluir Turma', message: 'Tem certeza que deseja excluir esta turma?', type: 'danger' })) {
            const { error } = await supabase.from('turmas').delete().eq('id', id);

            if (error) toast.error('Erro ao excluir turma');
            else {
                toast.success('Turma excluída com sucesso');
                fetchData();
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Remove relational objects before saving
        const dataToSave = { ...formData };
        delete (dataToSave as any).escolas;
        delete (dataToSave as any).series;

        if (editingClass) {
            const { error } = await supabase
                .from('turmas')
                .update(dataToSave)
                .eq('id', editingClass.id);

            if (error) {
                toast.error('Erro ao atualizar turma: ' + error.message);
            } else {
                toast.success('Turma atualizada com sucesso');
                setIsModalOpen(false);
                fetchData();
            }
        } else {
            const { error } = await supabase.from('turmas').insert([dataToSave]);

            if (error) {
                toast.error('Erro ao criar turma: ' + error.message);
            } else {
                toast.success('Turma criada com sucesso');
                setIsModalOpen(false);
                fetchData();
            }
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Gerenciar Turmas</h1>
                    <p className="text-gray-600">
                        {filteredClasses.length} turma{filteredClasses.length !== 1 ? 's' : ''} encontrada{filteredClasses.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={handleNew}
                    className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-semibold"
                >
                    <Plus size={20} weight="bold" />
                    Nova Turma
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, turno, escola ou série..."
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
                                <th className="p-4 font-semibold text-gray-700">Escola</th>
                                <th className="p-4 font-semibold text-gray-700">Série</th>
                                <th className="p-4 font-semibold text-gray-700">Turno</th>
                                <th className="p-4 font-semibold text-gray-700 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--brand-blue))]"></div>
                                            Carregando...
                                        </div>
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        Nenhuma turma encontrada
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((cls, index) => (
                                    <motion.tr
                                        key={cls.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="p-4 font-medium text-gray-900">{cls.nome}</td>
                                        <td className="p-4 text-gray-600">{cls.escolas?.nome || '-'}</td>
                                        <td className="p-4 text-gray-600">{cls.series?.nome || '-'}</td>
                                        <td className="p-4 text-gray-600">{cls.turno || '-'}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleEdit(cls)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cls.id)}
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
                                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredClasses.length)} de{' '}
                                {filteredClasses.length} resultados
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                                >
                                    Anterior
                                </button>
                                {totalPages <= 7 ? (
                                    [...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`px-3 py-1 border rounded-lg transition-colors ${currentPage === i + 1
                                                ? 'bg-[hsl(var(--brand-blue))] text-white'
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
                                    className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white">
                                <h3 className="text-xl font-bold">{editingClass ? 'Editar Turma' : 'Nova Turma'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={28} weight="bold" /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Turma *</label>
                                    <input type="text" required value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Escola</label>
                                        <select
                                            value={formData.escola_id || ''}
                                            onChange={(e) => setFormData({ ...formData, escola_id: e.target.value })}
                                            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                        >
                                            <option value="">Selecione uma escola</option>
                                            {schools.map(school => (
                                                <option key={school.id} value={school.id}>{school.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Série</label>
                                        <select
                                            value={formData.serie_id || ''}
                                            onChange={(e) => setFormData({ ...formData, serie_id: e.target.value })}
                                            className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none"
                                        >
                                            <option value="">Selecione uma série</option>
                                            {grades.map(grade => (
                                                <option key={grade.id} value={grade.id}>{grade.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Turno</label>
                                    <select value={formData.turno || 'Manhã'} onChange={(e) => setFormData({ ...formData, turno: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none">
                                        <option value="Manhã">Manhã</option>
                                        <option value="Tarde">Tarde</option>
                                        <option value="Noite">Noite</option>
                                        <option value="Integral">Integral</option>
                                    </select>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancelar</button>
                                    <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl hover:shadow-lg font-semibold">{editingClass ? 'Salvar' : 'Criar'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminClasses;
