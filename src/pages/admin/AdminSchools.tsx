import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash, Plus, X, MagnifyingGlass } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

type School = {
    id: string;
    nome: string;
    cidade?: string;
    estado?: string;
    criado_em: string;
};

const AdminSchools: React.FC = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [formData, setFormData] = useState<Partial<School>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSchools();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [schools, searchTerm]);

    const fetchSchools = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('escolas').select('*').order('nome', { ascending: true });
        if (error) console.error('Error:', error);
        else setSchools(data || []);
        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...schools];
        if (searchTerm) {
            filtered = filtered.filter((s) =>
                s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredSchools(filtered);
    };

    const handleEdit = (school: School) => {
        setEditingSchool(school);
        setFormData(school);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingSchool(null);
        setFormData({});
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
            const { error } = await supabase.from('escolas').update(formData).eq('id', editingSchool.id);
            if (error) alert('Erro: ' + error.message);
            else { setIsModalOpen(false); fetchSchools(); }
        } else {
            const { error } = await supabase.from('escolas').insert([formData]);
            if (error) alert('Erro: ' + error.message);
            else { setIsModalOpen(false); fetchSchools(); }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gerenciar Escolas</h1>
                    <p className="text-gray-600">{filteredSchools.length} escola{filteredSchools.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={handleNew} className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg font-semibold">
                    <Plus size={20} weight="bold" />Nova Escola
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" placeholder="Buscar por nome ou cidade..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-700 text-left">Nome</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">Cidade</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">Estado</th>
                            <th className="p-4 font-semibold text-gray-700 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center"><div className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--brand-blue))]"></div>Carregando...</div></td></tr>
                        ) : filteredSchools.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhuma escola encontrada</td></tr>
                        ) : (
                            filteredSchools.map((school, i) => (
                                <motion.tr key={school.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-900">{school.nome}</td>
                                    <td className="p-4 text-gray-600">{school.cidade || '-'}</td>
                                    <td className="p-4 text-gray-600">{school.estado || '-'}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleEdit(school)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={18} /></button>
                                            <button onClick={() => handleDelete(school.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash size={18} /></button>
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
                                <h3 className="text-xl font-bold">{editingSchool ? 'Editar Escola' : 'Nova Escola'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={28} weight="bold" /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                                    <input type="text" required value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                                    <input type="text" value={formData.cidade || ''} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                                    <input type="text" value={formData.estado || ''} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" maxLength={2} placeholder="UF" />
                                </div>
                                <div className="pt-4 flex justify-end gap-3 border-t">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancelar</button>
                                    <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl hover:shadow-lg font-semibold">{editingSchool ? 'Salvar' : 'Criar'}</button>
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
