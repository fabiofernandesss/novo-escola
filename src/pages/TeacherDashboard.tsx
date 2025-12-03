import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User as UserIcon, ChatCircle, ShieldCheck, SignOut, X, Plus, Pencil, Trash, Play, Stop, Phone, IdentificationCard, Camera } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';

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
    aluno_id?: string;
};

type CameraType = {
    id: string;
    nome: string;
    url_m3u8: string;
    escola_id?: string;
};

const TeacherDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [escolaId, setEscolaId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'students' | 'messages' | 'cameras' | 'busca-segura' | 'profile'>('students');
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

    // Cameras State
    const [cameras, setCameras] = useState<CameraType[]>([]);
    const [camerasLoading, setCamerasLoading] = useState(false);
    const [cameraLoadingStates, setCameraLoadingStates] = useState<{ [key: string]: boolean }>({});
    const cameraRefs = useRef<{ [key: string]: { video: HTMLVideoElement | null; hls: Hls | null } }>({});

    // Busca Segura State
    const [buscaSeguraRequests, setBuscaSeguraRequests] = useState<BuscaSeguraRequest[]>([]);

    // Profile State
    const [editingName, setEditingName] = useState('');

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
            else if (activeTab === 'cameras') fetchCameras();
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

    const fetchCameras = async () => {
        if (!escolaId) return;

        setCamerasLoading(true);

        // Cleanup existing HLS instances
        Object.values(cameraRefs.current).forEach(({ hls }) => {
            if (hls) {
                hls.destroy();
            }
        });
        cameraRefs.current = {};

        const { data: camerasData } = await supabase
            .from('cameras')
            .select('*')
            .eq('escola_id', escolaId)
            .eq('ativo', true);

        setCameras(camerasData || []);
        setCamerasLoading(false);

        // Initialize loading states
        const initialLoadingStates: { [key: string]: boolean } = {};
        (camerasData || []).forEach(cam => {
            initialLoadingStates[cam.id] = true;
        });
        setCameraLoadingStates(initialLoadingStates);
    };

    const fetchBuscaSegura = async () => {
        if (!escolaId) return;
        const { data } = await supabase
            .from('busca_segura')
            .select('*')
            .eq('escola_id', escolaId)
            .order('criado_em', { ascending: false });
        setBuscaSeguraRequests(data || []);
    };

    const initializeCamera = (cameraId: string, url: string, videoElement: HTMLVideoElement) => {
        if (!videoElement) return;

        cameraRefs.current[cameraId] = { video: videoElement, hls: null };

        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
            });

            hls.loadSource(url);
            hls.attachMedia(videoElement);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoElement.play().catch(() => { });
                setTimeout(() => {
                    setCameraLoadingStates(prev => ({ ...prev, [cameraId]: false }));
                }, 10000);
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                    setCameraLoadingStates(prev => ({ ...prev, [cameraId]: false }));
                }
            });

            cameraRefs.current[cameraId].hls = hls;
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = url;
            videoElement.addEventListener('loadedmetadata', () => {
                videoElement.play().catch(() => { });
                setTimeout(() => {
                    setCameraLoadingStates(prev => ({ ...prev, [cameraId]: false }));
                }, 10000);
            });
        }
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header with Gradient (Mobile & Desktop) */}
            <div className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white p-4 md:p-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold">Olá, {currentUser?.nome?.split(' ')[0]}!</h1>
                        <p className="text-blue-100 text-xs md:text-sm">Painel do Professor</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-full md:rounded-xl transition-colors flex items-center gap-2">
                        <SignOut size={20} />
                        <span className="hidden md:inline font-medium">Sair</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

                {/* Students Tab */}
                {activeTab === 'students' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Alunos ({students.length})</h2>
                            <button onClick={() => { setEditingStudent(null); setStudentFormData({}); setIsStudentModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all">
                                <Plus size={20} weight="bold" />
                                <span className="hidden md:inline">Novo Aluno</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {students.map((student) => (
                                <div key={student.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-4">
                                    {student.foto_url ? (
                                        <img src={student.foto_url} alt={student.nome} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl border-2 border-white shadow-sm">
                                            {student.nome.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate">{student.nome}</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <IdentificationCard size={14} />
                                            Matrícula: {student.matricula || '-'}
                                        </p>
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <UserIcon size={14} />
                                            Resp: {student.nome_responsavel_1?.split(' ')[0] || '-'}
                                        </p>
                                        {student.telefone_responsavel_1 && (
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <Phone size={14} />
                                                {student.telefone_responsavel_1}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => { setEditingStudent(student); setStudentFormData(student); setIsStudentModalOpen(true); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                                            <Pencil size={18} />
                                        </button>
                                        <button onClick={() => handleStudentDelete(student.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {students.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed">
                                    Nenhum aluno cadastrado.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Messages Tab */}
                {activeTab === 'messages' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Mensagens</h2>
                            <button onClick={() => setIsMessageModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all">
                                <Plus size={20} weight="bold" />
                                <span className="hidden md:inline">Nova Mensagem</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                                    {msg.media_url && (
                                        <div className="aspect-video bg-black relative">
                                            {msg.tipo?.includes('image') ? (
                                                <img src={msg.media_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <video src={msg.media_url} controls className="w-full h-full object-contain" />
                                            )}
                                        </div>
                                    )}
                                    <div className="p-4 flex-1 flex flex-col">
                                        <h3 className="font-bold text-gray-900 mb-1">{msg.titulo}</h3>
                                        <p className="text-sm text-gray-600 line-clamp-3 mb-3 flex-1">{msg.descricao}</p>
                                        <p className="text-xs text-gray-400 mt-auto pt-2 border-t">
                                            {new Date(msg.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed">
                                    Nenhuma mensagem enviada.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Cameras Tab */}
                {activeTab === 'cameras' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">Câmeras da Escola</h2>

                        {camerasLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {cameras.map((camera) => (
                                    <div key={camera.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="relative aspect-video bg-black">
                                            {cameraLoadingStates[camera.id] && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                                                </div>
                                            )}
                                            <video
                                                ref={(el) => {
                                                    if (el && !cameraRefs.current[camera.id]) {
                                                        initializeCamera(camera.id, camera.url_m3u8, el);
                                                    }
                                                }}
                                                className="w-full h-full object-cover"
                                                playsInline
                                                muted
                                                autoPlay
                                            />
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                <Camera size={20} className="text-blue-500" />
                                                {camera.nome}
                                            </h3>
                                        </div>
                                    </div>
                                ))}
                                {cameras.length === 0 && (
                                    <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed">
                                        Nenhuma câmera disponível.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Busca Segura Tab */}
                {activeTab === 'busca-segura' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">Solicitações de Busca</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {buscaSeguraRequests.map((req) => (
                                <div key={req.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider ${req.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                                        req.status === 'aprovada' ? 'bg-green-100 text-green-700' :
                                            req.status === 'rejeitada' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {req.status}
                                    </div>
                                    <div className="flex items-center gap-4 mb-3">
                                        <img src={req.foto_buscador_url} alt={req.nome_buscador} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100" />
                                        <div>
                                            <h3 className="font-bold text-gray-900">{req.nome_buscador}</h3>
                                            <p className="text-xs text-gray-500">Doc: {req.doc_buscador}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 text-right">
                                        {new Date(req.criado_em).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            ))}
                            {buscaSeguraRequests.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed">
                                    Nenhuma solicitação encontrada.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Editar Perfil</h2>
                        <div className="space-y-4">
                            <div className="flex justify-center mb-6">
                                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold">
                                    {currentUser?.nome?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" />
                            </div>
                            <button onClick={handleProfileUpdate} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation Bar (Mobile Only) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg md:hidden z-30">
                <div className="flex justify-around items-center py-2">
                    <button onClick={() => setActiveTab('students')} className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${activeTab === 'students' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <UserIcon size={24} weight={activeTab === 'students' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Alunos</span>
                    </button>
                    <button onClick={() => setActiveTab('messages')} className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${activeTab === 'messages' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <ChatCircle size={24} weight={activeTab === 'messages' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Mensagens</span>
                    </button>
                    <button onClick={() => setActiveTab('cameras')} className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${activeTab === 'cameras' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <Camera size={24} weight={activeTab === 'cameras' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Câmeras</span>
                    </button>
                    <button onClick={() => setActiveTab('busca-segura')} className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${activeTab === 'busca-segura' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <ShieldCheck size={24} weight={activeTab === 'busca-segura' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Busca</span>
                    </button>
                    <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <UserIcon size={24} weight={activeTab === 'profile' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Perfil</span>
                    </button>
                </div>
            </div>

            {/* Student Modal */}
            <AnimatePresence>
                {isStudentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 500 }}
                            className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                                <h2 className="text-lg font-bold text-gray-900">{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h2>
                                <button onClick={() => setIsStudentModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleStudentSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Aluno *</label>
                                    <input type="text" required value={studentFormData.nome || ''} onChange={(e) => setStudentFormData({ ...studentFormData, nome: e.target.value })} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" placeholder="Ex: João Silva" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula</label>
                                    <input type="text" value={studentFormData.matricula || ''} onChange={(e) => setStudentFormData({ ...studentFormData, matricula: e.target.value })} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" placeholder="Ex: 2023001" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Responsável</label>
                                    <input type="text" value={studentFormData.nome_responsavel_1 || ''} onChange={(e) => setStudentFormData({ ...studentFormData, nome_responsavel_1: e.target.value })} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" placeholder="Ex: Maria Silva" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone Responsável</label>
                                    <input type="tel" value={studentFormData.telefone_responsavel_1 || ''} onChange={(e) => setStudentFormData({ ...studentFormData, telefone_responsavel_1: e.target.value })} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" placeholder="(00) 00000-0000" />
                                </div>
                                <div className="pt-4">
                                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">Salvar Aluno</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Message Modal */}
            <AnimatePresence>
                {isMessageModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 500 }}
                            className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                                <h2 className="text-lg font-bold text-gray-900">Nova Mensagem</h2>
                                <button onClick={() => setIsMessageModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleMessageSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                                    <input type="text" required value={messageFormData.titulo} onChange={(e) => setMessageFormData({ ...messageFormData, titulo: e.target.value })} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" placeholder="Ex: Reunião de Pais" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                                    <textarea required value={messageFormData.descricao} onChange={(e) => setMessageFormData({ ...messageFormData, descricao: e.target.value })} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" rows={4} placeholder="Digite o conteúdo da mensagem..." />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors relative">
                                        <input type="file" accept="image/*,video/*" onChange={(e) => setMessageFormData({ ...messageFormData, media: e.target.files?.[0] || null })} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center gap-2 text-gray-500">
                                            <Plus size={24} />
                                            <span className="text-xs font-medium">Upload Mídia</span>
                                        </div>
                                    </div>

                                    <button type="button" onClick={startRecording} className="border-2 border-dashed border-red-200 bg-red-50 rounded-xl p-4 text-center hover:bg-red-100 transition-colors flex flex-col items-center gap-2 text-red-500">
                                        <Play size={24} />
                                        <span className="text-xs font-medium">Gravar Vídeo</span>
                                    </button>
                                </div>

                                {messageFormData.media && (
                                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                                        <CheckCircle size={16} />
                                        Arquivo selecionado: {messageFormData.media.name}
                                    </div>
                                )}

                                {isRecording && (
                                    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
                                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                                        <div className="absolute bottom-10 flex flex-col items-center gap-4">
                                            <div className="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-mono animate-pulse">
                                                {recordingTime}s
                                            </div>
                                            <button type="button" onClick={stopRecording} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-red-600 shadow-lg hover:scale-110 transition-transform">
                                                <Stop size={32} weight="fill" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {videoBlob && (
                                    <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
                                        <span className="flex items-center gap-2 font-medium"><Play size={16} /> Vídeo gravado!</span>
                                        <button type="button" onClick={() => setVideoBlob(null)} className="text-red-500 hover:text-red-700"><Trash size={18} /></button>
                                    </div>
                                )}

                                <div className="pt-4">
                                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">Enviar Mensagem</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper Icon
const CheckCircle = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

export default TeacherDashboard;
