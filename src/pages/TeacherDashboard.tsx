import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, User as UserIcon, ChatCircle, ShieldCheck, SignOut, X, Plus, Pencil, Trash, Upload, Play, Stop } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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
};

type Message = {
    id: string;
    titulo: string;
    descricao: string;
    media_url?: string;
    tipo?: string;
    published_at: string;
};

type BuscaSeguraRequest = {
    id: string;
    nome_buscador: string;
    doc_buscador: string;
    foto_buscador_url: string;
    status: 'pendente' | 'aprovada' | 'rejeitada' | 'realizada';
    criado_em: string;
    aluno?: { nome: string };
};

const TeacherDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [escolaId, setEscolaId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'students' | 'messages' | 'busca-segura' | 'profile'>('students');
    const [loading, setLoading] = useState(true);

    // Students State
    const [students, setStudents] = useState<Student[]>([]);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [studentFormData, setStudentFormData] = useState<Partial<Student>>({});

    // Messages State
    const [messages, setMessages] = useState<Message[]>([]);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageFormData, setMessageFormData] = useState({ titulo: '', descricao: '', media: null as File | null });

    // Busca Segura State
    const [buscaSeguraRequests, setBuscaSeguraRequests] = useState<BuscaSeguraRequest[]>([]);

    // Profile State
    const [editingName, setEditingName] = useState('');
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const recordingInterval = useRef<any>(null);

    useEffect(() => {
        fetchUserAndSchool();
    }, []);

    useEffect(() => {
        if (escolaId) {
            if (activeTab === 'students') fetchStudents();
            else if (activeTab === 'messages') fetchMessages();
            else if (activeTab === 'busca-segura') fetchBuscaSegura();
        }
    }, [activeTab, escolaId]);

    const fetchUserAndSchool = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/auth');
            return;
        }

        const { data: userData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_uid', user.id)
            .single();

        if (!userData || userData.tipo_usuario !== 'professor') {
            navigate('/');
            return;
        }

        setCurrentUser(userData);
        setEditingName(userData.nome || '');

        // Buscar escola_id na tabela permissoes
        const { data: permissao } = await supabase
            .from('permissoes')
            .select('referencia_id')
            .eq('usuario_id', userData.id)
            .eq('tipo', 'escola')
            .eq('ativo', true)
            .single();

        if (permissao?.referencia_id) {
            setEscolaId(permissao.referencia_id);
        } else {
            alert('Você não está associado a nenhuma escola. Entre em contato com o administrador.');
        }

        setLoading(false);
    };

    const fetchStudents = async () => {
        if (!escolaId) return;
        const { data } = await supabase
            .from('alunos')
            .select('*')
            .eq('escola_id', escolaId)
            .order('nome', { ascending: true });
        setStudents(data || []);
    };

    const fetchMessages = async () => {
        if (!escolaId) return;
        const { data } = await supabase
            .from('mensagens')
            .select('*')
            .eq('escola_id', escolaId)
            .order('published_at', { ascending: false })
            .limit(20);
        setMessages(data || []);
    };

    const fetchBuscaSegura = async () => {
        if (!escolaId) return;
        const { data } = await supabase
            .from('busca_segura')
            .select('*, aluno:alunos(nome)')
            .eq('escola_id', escolaId)
            .order('criado_em', { ascending: false });
        setBuscaSeguraRequests(data || []);
    };

    const handleStudentSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = { ...studentFormData, escola_id: escolaId };
        if (editingStudent) {
            await supabase.from('alunos').update(dataToSave).eq('id', editingStudent.id);
        } else {
            await supabase.from('alunos').insert([dataToSave]);
        }
        setIsStudentModalOpen(false);
        fetchStudents();
    };

    const handleStudentDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este aluno?')) {
            await supabase.from('alunos').delete().eq('id', id);
            fetchStudents();
        }
    };

    const handleMessageSave = async (e: React.FormEvent) => {
        e.preventDefault();
        let mediaUrl = '';
        let tipo = 'texto';

        if (messageFormData.media) {
            const file = messageFormData.media;
            const fileExt = file.name.split('.').pop();
            const filePath = `mensagens/${Date.now()}.${fileExt}`;
            await supabase.storage.from('mensagens-media').upload(filePath, file);
            const { data: { publicUrl } } = supabase.storage.from('mensagens-media').getPublicUrl(filePath);
            mediaUrl = publicUrl;
            tipo = file.type.startsWith('image') ? 'imagem' : file.type.startsWith('video') ? 'video' : 'texto';
        }

        if (videoBlob) {
            const filePath = `mensagens/${Date.now()}.mp4`;
            await supabase.storage.from('mensagens-media').upload(filePath, videoBlob);
            const { data: { publicUrl } } = supabase.storage.from('mensagens-media').getPublicUrl(filePath);
            mediaUrl = publicUrl;
            tipo = 'video';
        }

        await supabase.from('mensagens').insert([{
            titulo: messageFormData.titulo,
            descricao: messageFormData.descricao,
            media_url: mediaUrl,
            tipo,
            escola_id: escolaId,
            created_by: currentUser.id,
            published_at: new Date().toISOString()
        }]);

        setIsMessageModalOpen(false);
        setMessageFormData({ titulo: '', descricao: '', media: null });
        setVideoBlob(null);
        fetchMessages();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true;
                await videoRef.current.play();
            }

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/mp4' });
                setVideoBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(1000);
            setIsRecording(true);
            setRecordingTime(0);

            if (recordingInterval.current) clearInterval(recordingInterval.current);
            recordingInterval.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            alert('Erro ao acessar a câmera.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingInterval.current) clearInterval(recordingInterval.current);
        }
    };

    const handleProfileUpdate = async () => {
        if (!currentUser) return;
        await supabase.from('usuarios').update({ nome: editingName }).eq('id', currentUser.id);
        setCurrentUser({ ...currentUser, nome: editingName });
        alert('Perfil atualizado!');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--brand-blue))]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white p-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Olá, {currentUser?.nome?.split(' ')[0]}!</h1>
                        <p className="text-blue-100 text-sm">Painel do Professor</p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
                        <SignOut size={20} />
                        <span className="font-medium">Sair</span>
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex gap-4 px-6">
                    <button onClick={() => setActiveTab('students')} className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'students' ? 'border-[hsl(var(--brand-blue))] text-[hsl(var(--brand-blue))]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                        <UserIcon size={20} className="inline mr-2" />Alunos
                    </button>
                    <button onClick={() => setActiveTab('messages')} className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'messages' ? 'border-[hsl(var(--brand-blue))] text-[hsl(var(--brand-blue))]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                        <ChatCircle size={20} className="inline mr-2" />Mensagens
                    </button>
                    <button onClick={() => setActiveTab('busca-segura')} className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'busca-segura' ? 'border-[hsl(var(--brand-blue))] text-[hsl(var(--brand-blue))]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                        <ShieldCheck size={20} className="inline mr-2" />Busca Segura
                    </button>
                    <button onClick={() => setActiveTab('profile')} className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'profile' ? 'border-[hsl(var(--brand-blue))] text-[hsl(var(--brand-blue))]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                        <UserIcon size={20} className="inline mr-2" />Perfil
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto p-6">
                {activeTab === 'students' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Gerenciar Alunos</h2>
                            <button onClick={() => { setEditingStudent(null); setStudentFormData({}); setIsStudentModalOpen(true); }} className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg font-semibold">
                                <Plus size={20} weight="bold" />Novo Aluno
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-700 text-left">Nome</th>
                                        <th className="p-4 font-semibold text-gray-700 text-left">Matrícula</th>
                                        <th className="p-4 font-semibold text-gray-700 text-left">Responsável</th>
                                        <th className="p-4 font-semibold text-gray-700 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {students.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum aluno encontrado</td></tr>
                                    ) : (
                                        students.map((student) => (
                                            <tr key={student.id} className="hover:bg-gray-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        {student.foto_url ? (
                                                            <img src={student.foto_url} alt={student.nome} className="w-10 h-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white font-bold">
                                                                {student.nome.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span className="font-medium text-gray-900">{student.nome}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-600">{student.matricula || '-'}</td>
                                                <td className="p-4 text-gray-600">{student.nome_responsavel_1 || '-'}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => { setEditingStudent(student); setStudentFormData(student); setIsStudentModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={18} /></button>
                                                        <button onClick={() => handleStudentDelete(student.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash size={18} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Mensagens</h2>
                            <button onClick={() => setIsMessageModalOpen(true)} className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg font-semibold">
                                <Plus size={20} weight="bold" />Nova Mensagem
                            </button>
                        </div>

                        <div className="space-y-4">
                            {messages.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Nenhuma mensagem encontrada</div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className="bg-white rounded-xl shadow-sm border p-4">
                                        <h3 className="font-bold text-gray-900">{msg.titulo}</h3>
                                        <p className="text-gray-600 text-sm mt-1">{msg.descricao}</p>
                                        {msg.media_url && (
                                            <div className="mt-2">
                                                {msg.tipo?.includes('image') && <img src={msg.media_url} alt="" className="rounded-lg max-h-64" />}
                                                {msg.tipo?.includes('video') && <video src={msg.media_url} controls className="rounded-lg max-h-64" />}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">{new Date(msg.published_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'busca-segura' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Busca Segura</h2>
                        <div className="space-y-4">
                            {buscaSeguraRequests.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">Nenhuma solicitação encontrada</div>
                            ) : (
                                buscaSeguraRequests.map((req) => (
                                    <div key={req.id} className="bg-white rounded-xl shadow-sm border p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{req.nome_buscador}</h3>
                                                <p className="text-sm text-gray-600">Documento: {req.doc_buscador}</p>
                                                <p className="text-sm text-gray-600">Aluno: {req.aluno?.nome || '-'}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${req.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' : req.status === 'aprovada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">{new Date(req.criado_em).toLocaleString('pt-BR')}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Perfil</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                            </div>
                            <button onClick={handleProfileUpdate} className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg">
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Student Modal */}
            <AnimatePresence>
                {isStudentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900">{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h2>
                                <button onClick={() => setIsStudentModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleStudentSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                    <input type="text" required value={studentFormData.nome || ''} onChange={(e) => setStudentFormData({ ...studentFormData, nome: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula</label>
                                    <input type="text" value={studentFormData.matricula || ''} onChange={(e) => setStudentFormData({ ...studentFormData, matricula: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                                    <input type="text" value={studentFormData.nome_responsavel_1 || ''} onChange={(e) => setStudentFormData({ ...studentFormData, nome_responsavel_1: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone Responsável</label>
                                    <input type="text" value={studentFormData.telefone_responsavel_1 || ''} onChange={(e) => setStudentFormData({ ...studentFormData, telefone_responsavel_1: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsStudentModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                                    <button type="submit" className="flex-1 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg">Salvar</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Message Modal */}
            <AnimatePresence>
                {isMessageModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900">Nova Mensagem</h2>
                                <button onClick={() => setIsMessageModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleMessageSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                                    <input type="text" required value={messageFormData.titulo} onChange={(e) => setMessageFormData({ ...messageFormData, titulo: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                                    <textarea required value={messageFormData.descricao} onChange={(e) => setMessageFormData({ ...messageFormData, descricao: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[hsl(var(--brand-blue))] outline-none" rows={4} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mídia (Foto/Vídeo)</label>
                                    <input type="file" accept="image/*,video/*" onChange={(e) => setMessageFormData({ ...messageFormData, media: e.target.files?.[0] || null })} className="w-full px-4 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ou Gravar Vídeo</label>
                                    <div className="space-y-2">
                                        {!isRecording && !videoBlob && (
                                            <button type="button" onClick={startRecording} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                                <Play size={20} />Iniciar Gravação
                                            </button>
                                        )}
                                        {isRecording && (
                                            <button type="button" onClick={stopRecording} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                                                <Stop size={20} />Parar ({recordingTime}s)
                                            </button>
                                        )}
                                        <video ref={videoRef} className="w-full rounded-lg" />
                                        {videoBlob && <p className="text-sm text-green-600">Vídeo gravado com sucesso!</p>}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsMessageModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                                    <button type="submit" className="flex-1 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg">Enviar</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherDashboard;
