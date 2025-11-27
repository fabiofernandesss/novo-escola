import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash, Plus, X, MagnifyingGlass } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

type Grade = {
    id: string;
    nome: string;
    nivel: string;
    criado_em: string;
};

const AdminGrades: React.FC = () => {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [filteredGrades, setFilteredGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
    const [formData, setFormData] = useState<Partial<Grade>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchGrades();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [grades, searchTerm]);

    const fetchGrades = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('series')
            .select('*')
            .order('nome', { ascending: true });

        if (error) console.error('Error fetching grades:', error);
        else setGrades(data || []);
        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...grades];
        if (searchTerm) {
            filtered = filtered.filter((grade) =>
                grade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                grade.nivel?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredGrades(filtered);
    };

    const handleEdit = (grade: Grade) => {
        setEditingGrade(grade);
        setFormData(grade);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingGrade(null);
        setFormData({ nome: '', nivel: '' });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta série?')) {
            const { error } = await supabase.from('series').delete().eq('id', id);
            if (error) alert('Erro ao excluir série');
            else fetchGrades();
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Only send valid fields
        const dataToSave = {
            nome: formData.nome,
            nivel: formData.nivel
        };

        if (editingGrade) {
            const { error } = await supabase.from('series').update(dataToSave).eq('id', editingGrade.id);
            if (error) alert('Erro: ' + error.message);
            else { setIsModalOpen(false); fetchGrades(); }
        } else {
            const { error } = await supabase.from('series').insert([dataToSave]);
            if (error) alert('Erro: ' + error.message);
            else { setIsModalOpen(false); fetchGrades(); }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gerenciar Séries</h1>
                    <p className="text-gray-600">{filteredGrades.length} série{filteredGrades.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={handleNew} className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg font-semibold">
                    <Plus size={20} weight="bold" />Nova Série
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" placeholder="Buscar por nome ou nível..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-700 text-left">Nome</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">Nível</th>
                            <th className="p-4 font-semibold text-gray-700 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={3} className="p-8 text-center"><div className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--brand-blue))]"></div>Carregando...</div></td></tr>
                        ) : filteredGrades.length === 0 ? (
                            <tr><td colSpan={3} className="p-8 text-center text-gray-500">Nenhuma série encontrada</td></tr>
                        ) : (
                            filteredGrades.map((grade, i) => (
                                <motion.tr key={grade.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-900">{grade.nome}</td>
                                    <td className="p-4 text-gray-600">{grade.nivel || '-'}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleEdit(grade)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={18} /></button>
                                            <button onClick={() => handleDelete(grade.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash size={18} /></button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white">
                                <h3 className="text-xl font-bold">{editingGrade ? 'Editar Série' : 'Nova Série'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={28} weight="bold" /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                                    <input type="text" required value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nível</label>
                                    <select value={formData.nivel || ''} onChange={(e) => setFormData({ ...formData, nivel: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none">
                                        <option value="">Selecione...</option>
                                        <option value="Fundamental I">Fundamental I</option>
                                        <option value="Fundamental II">Fundamental II</option>
                                        <option value="Ensino Médio">Ensino Médio</option>
                                        <option value="Infantil">Infantil</option>
                                    </select>
                                </div>
                                <div className="pt-4 flex justify-end gap-3 border-t">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancelar</button>
                                    <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl hover:shadow-lg font-semibold">{editingGrade ? 'Salvar' : 'Criar'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminGrades;
