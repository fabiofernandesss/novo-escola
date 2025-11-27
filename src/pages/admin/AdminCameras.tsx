import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Pencil, Trash, Plus, X, MagnifyingGlass, VideoCamera, Eye } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';

type Camera = {
    id: string;
    nome: string;
    escola_id?: string;
    url_m3u8: string;
    senha?: string;
    criado_em: string;
    escolas?: { nome: string };
};

type School = { id: string; nome: string; };

const AdminCameras: React.FC = () => {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [filteredCameras, setFilteredCameras] = useState<Camera[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
    const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
    const [formData, setFormData] = useState<Partial<Camera>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [cameras, searchTerm]);

    // HLS Player Logic
    useEffect(() => {
        if (isPlayerOpen && selectedCamera?.url_m3u8 && videoRef.current) {
            const video = videoRef.current;
            let src = selectedCamera.url_m3u8;

            // Use proxy if running on Vercel (HTTPS) and trying to access HTTP camera
            if (window.location.protocol === 'https:' && src.startsWith('http://78.46.228.35:8002')) {
                src = src.replace('http://78.46.228.35:8002', '/camera-proxy');
            }

            if (Hls.isSupported()) {
                if (hlsRef.current) {
                    hlsRef.current.destroy();
                }
                const hls = new Hls();
                hlsRef.current = hls;
                hls.loadSource(src);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(e => console.error("Error playing video:", e));
                });
                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error("HLS error:", event, data);
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.log("fatal network error encountered, try to recover");
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log("fatal media error encountered, try to recover");
                                hls.recoverMediaError();
                                break;
                            default:
                                hls.destroy();
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                video.src = src;
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(e => console.error("Error playing video:", e));
                });
            }
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [isPlayerOpen, selectedCamera]);

    const fetchData = async () => {
        setLoading(true);
        const { data: camerasData, error: camerasError } = await supabase
            .from('cameras')
            .select('*, escolas(nome)')
            .order('nome', { ascending: true });

        if (camerasError) console.error('Error fetching cameras:', camerasError);
        else setCameras(camerasData || []);

        const { data: schoolsData } = await supabase
            .from('escolas')
            .select('id, nome')
            .order('nome');
        setSchools(schoolsData || []);

        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...cameras];

        if (searchTerm) {
            filtered = filtered.filter(
                (cam) =>
                    cam.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cam.escolas?.nome.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredCameras(filtered);
        setCurrentPage(1);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCameras.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCameras.length / itemsPerPage);

    const handleEdit = (cam: Camera) => {
        setEditingCamera(cam);
        setFormData({
            nome: cam.nome,
            escola_id: cam.escola_id,
            url_m3u8: cam.url_m3u8,
            senha: cam.senha
        });
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingCamera(null);
        setFormData({
            nome: '',
            escola_id: schools[0]?.id || '',
            url_m3u8: '',
            senha: ''
        });
        setIsModalOpen(true);
    };

    const handleView = (cam: Camera) => {
        setSelectedCamera(cam);
        setIsPlayerOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta câmera?')) {
            const { error } = await supabase.from('cameras').delete().eq('id', id);

            if (error) alert('Erro ao excluir câmera');
            else fetchData();
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Only send fields that actually exist in the database
        const dataToSave = {
            nome: formData.nome,
            escola_id: formData.escola_id,
            url_m3u8: formData.url_m3u8,
            senha: formData.senha
        };

        if (editingCamera) {
            const { error } = await supabase
                .from('cameras')
                .update(dataToSave)
                .eq('id', editingCamera.id);

            if (error) {
                alert('Erro ao atualizar câmera: ' + error.message);
            } else {
                setIsModalOpen(false);
                fetchData();
            }
        } else {
            const { error } = await supabase.from('cameras').insert([dataToSave]);

            if (error) {
                alert('Erro ao criar câmera: ' + error.message);
            } else {
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Gerenciar Câmeras</h1>
                    <p className="text-gray-600">
                        {filteredCameras.length} câmera{filteredCameras.length !== 1 ? 's' : ''} encontrada{filteredCameras.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={handleNew}
                    className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-semibold"
                >
                    <Plus size={20} weight="bold" />
                    Nova Câmera
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou escola..."
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
                                <th className="p-4 font-semibold text-gray-700">URL Stream</th>
                                <th className="p-4 font-semibold text-gray-700 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--brand-blue))]"></div>
                                            Carregando...
                                        </div>
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        Nenhuma câmera encontrada
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((cam, index) => (
                                    <motion.tr
                                        key={cam.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="p-4 font-medium text-gray-900">{cam.nome}</td>
                                        <td className="p-4 text-gray-600">{cam.escolas?.nome || '-'}</td>
                                        <td className="p-4 text-gray-600 font-mono text-xs truncate max-w-[250px]">{cam.url_m3u8 || '-'}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleView(cam)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Visualizar"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(cam)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cam.id)}
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
                                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredCameras.length)} de{' '}
                                {filteredCameras.length} resultados
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

            {/* Edit/Create Modal */}
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
                                <h3 className="text-xl font-bold">{editingCamera ? 'Editar Câmera' : 'Nova Câmera'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={28} weight="bold" /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Câmera *</label>
                                    <input type="text" required value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>

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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">URL Stream (HLS/m3u8) *</label>
                                    <input type="text" required value={formData.url_m3u8 || ''} onChange={(e) => setFormData({ ...formData, url_m3u8: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" placeholder="http://78.46.228.35:8001/index.m3u8" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Senha (Opcional)</label>
                                    <input type="text" value={formData.senha || ''} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancelar</button>
                                    <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl hover:shadow-lg font-semibold">{editingCamera ? 'Salvar' : 'Criar'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Player Modal */}
            <AnimatePresence>
                {isPlayerOpen && selectedCamera && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-black rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-800"
                        >
                            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 text-white">
                                <div className="flex items-center gap-3">
                                    <VideoCamera size={24} className="text-[hsl(var(--brand-blue))]" />
                                    <div>
                                        <h3 className="text-lg font-bold">{selectedCamera.nome}</h3>
                                        <p className="text-xs text-gray-400">{selectedCamera.url_m3u8}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsPlayerOpen(false)} className="hover:bg-gray-800 p-2 rounded-lg transition-colors"><X size={24} /></button>
                            </div>
                            <div className="aspect-video bg-black flex items-center justify-center relative">
                                {selectedCamera.url_m3u8 ? (
                                    <video
                                        ref={videoRef}
                                        className="w-full h-full object-contain"
                                        controls
                                        autoPlay
                                        muted
                                    />
                                ) : (
                                    <div className="text-gray-500 flex flex-col items-center gap-2">
                                        <VideoCamera size={48} />
                                        <p>URL da câmera não configurada</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminCameras;
