import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash, Plus, X, MagnifyingGlass } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';

type Device = {
    id: number;
    nome: string;
    ip?: string;
    status?: string;
    login?: string;
    senha?: string;
    device_id?: string;
    monitor?: string;
    escola_id?: string;
    created_at: string;
};

const AdminDevices: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [formData, setFormData] = useState<Partial<Device>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDevices();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [devices, searchTerm]);

    const fetchDevices = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('dispositivos').select('*').order('nome', { ascending: true });
        if (error) console.error('Error:', error);
        else setDevices(data || []);
        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...devices];
        if (searchTerm) {
            filtered = filtered.filter((d) =>
                d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.ip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.device_id?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredDevices(filtered);
    };

    const handleEdit = (device: Device) => {
        setEditingDevice(device);
        setFormData(device);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingDevice(null);
        setFormData({ nome: '', status: 'Ativo' });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este dispositivo?')) {
            const { error } = await supabase.from('dispositivos').delete().eq('id', id);
            if (error) alert('Erro ao excluir');
            else fetchDevices();
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDevice) {
            const { error } = await supabase.from('dispositivos').update(formData).eq('id', editingDevice.id);
            if (error) alert('Erro: ' + error.message);
            else { setIsModalOpen(false); fetchDevices(); }
        } else {
            const { error } = await supabase.from('dispositivos').insert([formData]);
            if (error) alert('Erro: ' + error.message);
            else { setIsModalOpen(false); fetchDevices(); }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gerenciar Dispositivos</h1>
                    <p className="text-gray-600">{filteredDevices.length} dispositivo{filteredDevices.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={handleNew} className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg font-semibold">
                    <Plus size={20} weight="bold" />Novo Dispositivo
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" placeholder="Buscar por nome, IP ou Device ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-700 text-left">Nome</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">IP</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">Device ID</th>
                            <th className="p-4 font-semibold text-gray-700 text-left">Status</th>
                            <th className="p-4 font-semibold text-gray-700 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center"><div className="flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--brand-blue))]"></div>Carregando...</div></td></tr>
                        ) : filteredDevices.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum dispositivo encontrado</td></tr>
                        ) : (
                            filteredDevices.map((device, i) => (
                                <motion.tr key={device.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-900">{device.nome}</td>
                                    <td className="p-4 text-gray-600">{device.ip || '-'}</td>
                                    <td className="p-4 text-gray-600">{device.device_id || '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${device.status === 'Ativo' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {device.status || '-'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => handleEdit(device)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={18} /></button>
                                            <button onClick={() => handleDelete(device.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash size={18} /></button>
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
                                <h3 className="text-xl font-bold">{editingDevice ? 'Editar Dispositivo' : 'Novo Dispositivo'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={28} weight="bold" /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                                    <input type="text" required value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">IP</label>
                                        <input type="text" value={formData.ip || ''} onChange={(e) => setFormData({ ...formData, ip: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" placeholder="192.168.1.1" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Device ID</label>
                                        <input type="text" value={formData.device_id || ''} onChange={(e) => setFormData({ ...formData, device_id: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Login</label>
                                        <input type="text" value={formData.login || ''} onChange={(e) => setFormData({ ...formData, login: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                                        <input type="password" value={formData.senha || ''} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Monitor</label>
                                        <input type="text" value={formData.monitor || ''} onChange={(e) => setFormData({ ...formData, monitor: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                        <select value={formData.status || 'Ativo'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none">
                                            <option value="Ativo">Ativo</option>
                                            <option value="Inativo">Inativo</option>
                                            <option value="Manutenção">Manutenção</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-3 border-t">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancelar</button>
                                    <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl hover:shadow-lg font-semibold">{editingDevice ? 'Salvar' : 'Criar'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDevices;
