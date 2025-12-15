import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User as UserIcon, ChatCircle, ShieldCheck, SignOut, X, Plus, Pencil, Trash, Play, Stop, Phone, IdentificationCard, Camera, House, Users, ClockCounterClockwise, Brain } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { toast } from 'sonner';
import { useConfirm } from '../contexts/ConfirmContext';

const SUPABASE_URL = 'https://sntyndufbxfzasnqvayc.supabase.co';

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

type DailyLog = {
    dia: string;
    nome_aluno: string;
    tipo_frequencia: string;
    entrada: string;
    saida: string;
    tempo_na_escola_formatado: string;
    url_foto_aluno?: string;
};

// Helper Icon
const CheckCircle = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const TeacherDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { confirm } = useConfirm();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [escolaId, setEscolaId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'dados' | 'students' | 'messages' | 'cameras' | 'busca-segura' | 'profile'>('dados');
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
    const cameraInterval = useRef<any>(null);

    // Busca Segura State
    const [buscaSeguraRequests, setBuscaSeguraRequests] = useState<BuscaSeguraRequest[]>([]);

    // Logs State
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [dadosView, setDadosView] = useState<'logs' | 'ia' | 'busca'>('logs');

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
            else if (activeTab === 'cameras') {
                fetchCameras();
                cameraInterval.current = setInterval(refreshCameraStreams, 30000); // Auto-refresh streams
            }
            else if (activeTab === 'dados') {
                if (dadosView === 'logs') fetchLogs();
                else if (dadosView === 'busca') fetchBuscaSegura();
            }
        }

        // Cleanup interval on tab change or unmount
        if (activeTab !== 'cameras') {
            if (cameraInterval.current) clearInterval(cameraInterval.current);
            destroyAllCameras();
            setCameras([]); // Force clean state when leaving tab
        }

        return () => {
            if (cameraInterval.current) clearInterval(cameraInterval.current);
            destroyAllCameras();
        };
    }, [activeTab, escolaId, dadosView]);

    const destroyAllCameras = () => {
        Object.values(cameraRefs.current).forEach(({ hls }) => {
            if (hls) {
                hls.destroy();
            }
        });
        cameraRefs.current = {};
    };

    const getMediaUrl = (mediaUrl?: string) => {
        if (!mediaUrl) return '';
        if (mediaUrl.startsWith('http')) return mediaUrl;
        return `${SUPABASE_URL}/storage/v1/object/public/mensagens-media/${mediaUrl}`;
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '--:--';
        if (dateString.includes('T')) return dateString.split('T')[1].substring(0, 5);
        if (dateString.includes(':')) return dateString.substring(0, 5);
        return dateString;
    };

    const fetchLogs = async () => {
        if (!escolaId) return;

        // Fetch student names to filter logs
        const { data: schoolStudents } = await supabase.from('alunos').select('nome').eq('escola_id', escolaId);
        const studentNames = schoolStudents?.map(s => s.nome) || [];

        if (studentNames.length > 0) {
            const { data } = await supabase
                .from('frequencia_diaria')
                .select('*')
                .in('nome_aluno', studentNames)
                .order('dia', { ascending: false })
                .limit(50);
            setLogs(data || []);
        } else {
            setLogs([]);
        }
    };

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
            toast.error('Você não está associado a nenhuma escola. Entre em contato com o administrador.');
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
            .eq('escola_id', escolaId);

        setCameras(camerasData || []);
        setCamerasLoading(false);
    };

    const refreshCameraStreams = () => {
        // Only refresh HLS streams without destroying DOM
        Object.entries(cameraRefs.current).forEach(([cameraId, { hls, video }]) => {
            if (hls && video) {
                const camera = cameras.find(c => c.id === cameraId);
                if (camera) {
                    hls.destroy();
                    initializeCamera(cameraId, camera.url_m3u8, video);
                }
            }
        });
    };

    const initializeCamera = (cameraId: string, url: string, videoElement: HTMLVideoElement) => {
        if (!videoElement) return;

        // Set loading state for this camera
        setCameraLoadingStates(prev => ({ ...prev, [cameraId]: true }));

        // Auto-hide loading after 30s as fallback
        const loadingTimeout = setTimeout(() => {
            setCameraLoadingStates(prev => ({ ...prev, [cameraId]: false }));
        }, 30000);

        // Use proxy if running on HTTPS and trying to access HTTP camera
        let src = url;
        if (window.location.protocol === 'https:' && src.includes('http://78.46.228.35')) {
            if (src.includes(':8001')) {
                src = src.replace('http://78.46.228.35:8001', '/camera-proxy-8001');
            } else if (src.includes(':8002')) {
                src = src.replace('http://78.46.228.35:8002', '/camera-proxy-8002');
            }
        }

        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
            });

            cameraRefs.current[cameraId] = { video: videoElement, hls };

            hls.loadSource(src);
            hls.attachMedia(videoElement);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                clearTimeout(loadingTimeout);
                setCameraLoadingStates(prev => ({ ...prev, [cameraId]: false }));
                videoElement.play().catch(e => console.error("Error playing:", e));
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                    clearTimeout(loadingTimeout);
                    setCameraLoadingStates(prev => ({ ...prev, [cameraId]: false }));
                }
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = src;
            videoElement.addEventListener('loadedmetadata', () => {
                clearTimeout(loadingTimeout);
                setCameraLoadingStates(prev => ({ ...prev, [cameraId]: false }));
                videoElement.play().catch(e => console.error("Error playing:", e));
            });
            cameraRefs.current[cameraId] = { video: videoElement, hls: null };
        }
    };
    const fetchBuscaSegura = async () => {
        if (!escolaId) return;

        // Primeiro buscar os IDs dos alunos da escola
        const { data: alunosData } = await supabase
            .from('alunos')
            .select('id')
            .eq('escola_id', escolaId);

        if (!alunosData || alunosData.length === 0) {
            setBuscaSeguraRequests([]);
            return;
        }

        const alunoIds = alunosData.map(a => a.id);

        // Buscar solicitações de busca segura para esses alunos
        const { data } = await supabase
            .from('busca_segura')
            .select('*')
            .in('aluno_id', alunoIds)
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
        if (await confirm({ title: 'Excluir Aluno', message: 'Tem certeza que deseja excluir este aluno?', type: 'danger' })) {
            await supabase.from('alunos').delete().eq('id', id);
            toast.success('Aluno excluído com sucesso');
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
            toast.error('Erro ao acessar a câmera.');
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
        toast.success('Perfil atualizado!');
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
            <div className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white p-4 md:p-6 shadow-lg sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center justify-between w-full md:w-auto">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">Olá, {currentUser?.nome?.split(' ')[0]}!</h1>
                            <p className="text-blue-100 text-xs md:text-sm">Painel do Professor</p>
                        </div>
                        <button onClick={handleLogout} className="md:hidden p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                            <SignOut size={20} />
                        </button>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-2 bg-white/10 p-1 rounded-xl backdrop-blur-sm">
                        <button onClick={() => setActiveTab('students')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'students' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'}`}>
                            Alunos
                        </button>
                        <button onClick={() => setActiveTab('messages')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'messages' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'}`}>
                            Mensagens
                        </button>
                        <button onClick={() => setActiveTab('cameras')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'cameras' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'}`}>
                            Câmeras
                        </button>
                        <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'}`}>
                            Perfil
                        </button>
                    </div>

                    <button onClick={handleLogout} className="hidden md:flex px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors items-center gap-2">
                        <SignOut size={20} />
                        <span className="font-medium">Sair</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

                {/* Dados Tab (Dados/Logs/IA/Busca) */}
                {activeTab === 'dados' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Internal Sub-Menu */}
                        <div className="flex gap-4 overflow-x-auto pb-4 px-2 -mx-4 md:mx-0 md:px-0 scrollbar-hide">
                            <button onClick={() => setDadosView('logs')} className={`flex flex-col items-center gap-2 min-w-[30%] md:min-w-[120px] p-4 rounded-2xl shadow-sm transition-all shrink-0 ${dadosView === 'logs' ? 'bg-blue-50 border-2 border-blue-200' : 'bg-white hover:shadow-md'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dadosView === 'logs' ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-500'}`}>
                                    <ClockCounterClockwise size={24} weight="bold" />
                                </div>
                                <span className={`text-sm font-medium ${dadosView === 'logs' ? 'text-blue-700' : 'text-gray-700'}`}>Logs</span>
                            </button>
                            <button onClick={() => setDadosView('ia')} className={`flex flex-col items-center gap-2 min-w-[30%] md:min-w-[120px] p-4 rounded-2xl shadow-sm transition-all shrink-0 ${dadosView === 'ia' ? 'bg-purple-50 border-2 border-purple-200' : 'bg-white hover:shadow-md'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dadosView === 'ia' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-500'}`}>
                                    <Brain size={24} weight="bold" />
                                </div>
                                <span className={`text-sm font-medium ${dadosView === 'ia' ? 'text-purple-700' : 'text-gray-700'}`}>Perguntas e IA</span>
                            </button>
                            <button onClick={() => setDadosView('busca')} className={`flex flex-col items-center gap-2 min-w-[30%] md:min-w-[120px] p-4 rounded-2xl shadow-sm transition-all shrink-0 ${dadosView === 'busca' ? 'bg-orange-50 border-2 border-orange-200' : 'bg-white hover:shadow-md'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dadosView === 'busca' ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                                    <ShieldCheck size={24} weight="bold" />
                                </div>
                                <span className={`text-sm font-medium ${dadosView === 'busca' ? 'text-orange-700' : 'text-gray-700'}`}>Busca Segura</span>
                            </button>
                        </div>

                        {/* Content Area */}

                        {/* View: Logs */}
                        {dadosView === 'logs' && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 px-2">
                                    <ClockCounterClockwise size={24} className="text-blue-600" />
                                    Logs da Escola
                                </h2>
                                {logs && logs.length > 0 ? (
                                    <div className="space-y-3">
                                        {logs.map((log, index) => (
                                            <div key={`${log.dia}-${index}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                                <div className="flex items-start gap-3">
                                                    {log.url_foto_aluno ? (
                                                        <img src={log.url_foto_aluno} alt="" className="w-14 h-14 rounded-full object-cover border border-gray-100" />
                                                    ) : (
                                                        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                            <UserIcon size={24} weight="fill" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-gray-900 capitalize">
                                                                    {new Date(log.dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                                                                </p>
                                                                <p className="text-sm text-gray-600 font-medium">{log.nome_aluno}</p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-2 grid grid-cols-2 gap-3">
                                                            <div className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                                                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Entrada</p>
                                                                <p className="text-green-900 font-mono text-base font-bold">
                                                                    {log.entrada ? formatTime(log.entrada) : '--:--'}
                                                                </p>
                                                            </div>
                                                            <div className="bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                                                <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Saída</p>
                                                                <p className="text-red-900 font-mono text-base font-bold">
                                                                    {log.saida && log.saida !== log.entrada ? formatTime(log.saida) : '--:--'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-dashed border-gray-200">
                                        <ClockCounterClockwise size={48} className="mx-auto text-gray-300 mb-2" />
                                        <p className="text-gray-500">Nenhum registro de frequência encontrado hoje.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* View: IA */}
                        {dadosView === 'ia' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                                    <Brain size={40} weight="duotone" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Perguntas e IA</h2>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">Em breve você terá acesso a uma Inteligência Artificial exclusiva para auxiliar nas atividades escolares e dúvidas do dia a dia.</p>
                                <button className="px-6 py-2 bg-gray-100 text-gray-400 rounded-full font-medium cursor-not-allowed">Funcionalidade em desenvolvimento</button>
                            </div>
                        )}

                        {/* View: Busca Segura */}
                        {dadosView === 'busca' && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 px-2">
                                    <ShieldCheck size={24} className="text-orange-600" />
                                    Solicitações de Busca
                                </h2>
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

                    </motion.div>
                )}

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
                                                <img src={getMediaUrl(msg.media_url)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <video src={getMediaUrl(msg.media_url)} controls className="w-full h-full object-contain" />
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
                    <button onClick={() => setActiveTab('dados')} className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${activeTab === 'dados' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <House size={activeTab === 'dados' ? 28 : 24} weight={activeTab === 'dados' ? 'fill' : 'regular'} />
                        <span className={`text-[10px] font-medium ${activeTab === 'dados' ? 'font-bold' : ''}`}>Início</span>
                    </button>
                    <button onClick={() => setActiveTab('students')} className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${activeTab === 'students' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <Users size={activeTab === 'students' ? 28 : 24} weight={activeTab === 'students' ? 'fill' : 'regular'} />
                        <span className={`text-[10px] font-medium ${activeTab === 'students' ? 'font-bold' : ''}`}>Alunos</span>
                    </button>
                    <button onClick={() => setActiveTab('messages')} className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${activeTab === 'messages' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <ChatCircle size={activeTab === 'messages' ? 28 : 24} weight={activeTab === 'messages' ? 'fill' : 'regular'} />
                        <span className={`text-[10px] font-medium ${activeTab === 'messages' ? 'font-bold' : ''}`}>Msgs</span>
                    </button>
                    <button onClick={() => setActiveTab('cameras')} className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${activeTab === 'cameras' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <Camera size={activeTab === 'cameras' ? 28 : 24} weight={activeTab === 'cameras' ? 'fill' : 'regular'} />
                        <span className={`text-[10px] font-medium ${activeTab === 'cameras' ? 'font-bold' : ''}`}>Câmeras</span>
                    </button>
                    <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <UserIcon size={activeTab === 'profile' ? 28 : 24} weight={activeTab === 'profile' ? 'fill' : 'regular'} />
                        <span className={`text-[10px] font-medium ${activeTab === 'profile' ? 'font-bold' : ''}`}>Perfil</span>
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

export default TeacherDashboard;
