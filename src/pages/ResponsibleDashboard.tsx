import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, ClockCounterClockwise, ChatCircle, House, SignOut, X, CaretLeft, CaretRight, Play, User as UserIcon, PencilSimple } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';

const SUPABASE_URL = 'https://sntyndufbxfzasnqvayc.supabase.co';

type Student = {
    id: string;
    nome: string;
    foto_url?: string;
    escola_id?: string;
    turma_id?: string;
    serie_id?: string;
    matricula?: string;
    data_nascimento?: string;
    sexo?: string;
    whatsapp?: string;
    cidade?: string;
    estado?: string;
    bairro?: string;
    nome_responsavel_1?: string;
    telefone_responsavel_1?: string;
    responsavel_2?: string;
    telefone_responsavel_2?: string;
    escola?: { nome: string };
    turma?: { nome: string };
    serie?: { nome: string };
};

type Log = {
    id: number;
    nome_aluno: string;
    data_do_log: string;
    event: number;
    url_foto_aluno?: string;
    time: number;
};

type Message = {
    id: string;
    titulo: string;
    descricao: string;
    media_url?: string;
    media_bucket?: string;
    published_at: string;
    created_at: string;
    tipo?: string;
    escola?: { nome: string };
    created_by?: string;
};

type CameraType = {
    id: string;
    nome: string;
    url_m3u8: string;
    escola_id?: string;
};

const ResponsibleDashboard: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [logs, setLogs] = useState<Log[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [videoMessages, setVideoMessages] = useState<Message[]>([]);
    const [cameras, setCameras] = useState<CameraType[]>([]);
    const [activeTab, setActiveTab] = useState<'home' | 'cameras' | 'activity' | 'messages'>('home');
    const [loading, setLoading] = useState(true);
    const [storyModal, setStoryModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
    const [showStudentProfile, setShowStudentProfile] = useState(false);
    const [showUserProfile, setShowUserProfile] = useState(false);
    const [editingName, setEditingName] = useState('');
    const cameraRefs = useRef<{ [key: string]: { video: HTMLVideoElement | null; hls: Hls | null } }>({});

    useEffect(() => {
        fetchUserAndStudents();
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            fetchStudentData();
        }
    }, [selectedStudent]);

    const getMediaUrl = (mediaUrl?: string, bucket?: string) => {
        if (!mediaUrl) return '';
        if (mediaUrl.startsWith('http')) return mediaUrl;
        return `${SUPABASE_URL}/storage/v1/object/public/${bucket || 'mensagens-media'}/${mediaUrl}`;
    };

    const fetchUserAndStudents = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_uid', user.id)
            .single();

        setCurrentUser(userData);
        setEditingName(userData?.nome || '');

        if (userData?.whatsapp) {
            const cleanPhone = userData.whatsapp.replace(/\D/g, '');

            const { data: studentsData } = await supabase
                .from('alunos')
                .select('*, escola:escolas(nome), turma:turmas(nome), serie:series(nome)');

            const matchedStudents = studentsData?.filter(student => {
                const phone1 = student.telefone_responsavel_1?.replace(/\D/g, '') || '';
                const phone2 = student.telefone_responsavel_2?.replace(/\D/g, '') || '';
                return phone1 === cleanPhone || phone2 === cleanPhone;
            }) || [];

            setStudents(matchedStudents);
            if (matchedStudents.length > 0) {
                setSelectedStudent(matchedStudents[0]);
            }
        }
        setLoading(false);
    };

    const fetchStudentData = async () => {
        if (!selectedStudent) return;

        const { data: logsData } = await supabase
            .from('logs')
            .select('*')
            .eq('nome_aluno', selectedStudent.nome)
            .order('data_do_log', { ascending: false })
            .limit(20);
        setLogs(logsData || []);

        if (selectedStudent.escola_id) {
            const { data: messagesData } = await supabase
                .from('mensagens')
                .select('*, escola:escolas(nome)')
                .eq('escola_id', selectedStudent.escola_id)
                .order('published_at', { ascending: false })
                .limit(20);
            setMessages(messagesData || []);

            const videos = messagesData?.filter(m => m.tipo?.includes('video')) || [];
            setVideoMessages(videos);

            const { data: camerasData } = await supabase
                .from('cameras')
                .select('*')
                .eq('escola_id', selectedStudent.escola_id);
            setCameras(camerasData || []);
        }
    };

    const playCamera = (cameraId: string, url: string, videoElement: HTMLVideoElement) => {
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
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            cameraRefs.current[cameraId] = { video: videoElement, hls };
            hls.loadSource(src);
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoElement.play().catch(e => console.error("Error playing:", e));
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = src;
            videoElement.addEventListener('loadedmetadata', () => {
                videoElement.play();
            });
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    const handleTabChange = (tab: 'home' | 'cameras' | 'activity' | 'messages') => {
        setActiveTab(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !currentUser) return;

        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        setLoading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('perfil-fotos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('perfil-fotos')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('usuarios')
                .update({ foto_perfil: publicUrl })
                .eq('id', currentUser.id);

            if (updateError) throw updateError;

            setCurrentUser({ ...currentUser, foto_perfil: publicUrl });
            alert('Foto de perfil atualizada!');
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Erro ao atualizar foto de perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!currentUser) return;

        const { error } = await supabase
            .from('usuarios')
            .update({ nome: editingName })
            .eq('id', currentUser.id);

        if (!error) {
            setCurrentUser({ ...currentUser, nome: editingName });
            alert('Perfil atualizado com sucesso!');
        } else {
            alert('Erro ao atualizar perfil.');
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const getEventLabel = (event: number) => {
        switch (event) {
            case 0: return 'Entrada';
            case 1: return 'Saída';
            default: return 'Evento';
        }
    };

    const getTodayLogs = () => {
        const today = new Date().toDateString();
        return logs.filter(log => new Date(log.data_do_log).toDateString() === today);
    };

    const openStory = (index: number) => {
        setStoryModal({ open: true, index });
    };

    const nextStory = () => {
        if (storyModal.index < videoMessages.length - 1) {
            setStoryModal({ ...storyModal, index: storyModal.index + 1 });
        }
    };

    const prevStory = () => {
        if (storyModal.index > 0) {
            setStoryModal({ ...storyModal, index: storyModal.index - 1 });
        }
    };

    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return '';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `${age} anos`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--brand-blue))]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 pb-20 md:pb-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white p-6 shadow-lg">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">Olá, {currentUser?.nome?.split(' ')[0]}!</h1>
                            <p className="text-blue-100 text-sm">Acompanhe seus filhos</p>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-4">
                            <button
                                onClick={() => handleTabChange('home')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${activeTab === 'home' ? 'bg-white text-[hsl(var(--brand-blue))]' : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <House size={20} weight={activeTab === 'home' ? 'fill' : 'regular'} />
                                <span className="font-medium">Início</span>
                            </button>
                            <button
                                onClick={() => handleTabChange('cameras')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${activeTab === 'cameras' ? 'bg-white text-[hsl(var(--brand-blue))]' : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <Camera size={20} weight={activeTab === 'cameras' ? 'fill' : 'regular'} />
                                <span className="font-medium">Câmeras</span>
                            </button>
                            <button
                                onClick={() => handleTabChange('activity')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${activeTab === 'activity' ? 'bg-white text-[hsl(var(--brand-blue))]' : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <ClockCounterClockwise size={20} weight={activeTab === 'activity' ? 'fill' : 'regular'} />
                                <span className="font-medium">Atividades</span>
                            </button>
                            <button
                                onClick={() => handleTabChange('messages')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${activeTab === 'messages' ? 'bg-white text-[hsl(var(--brand-blue))]' : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <ChatCircle size={20} weight={activeTab === 'messages' ? 'fill' : 'regular'} />
                                <span className="font-medium">Mensagens</span>
                            </button>

                            <button
                                onClick={() => setShowUserProfile(true)}
                                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors font-bold text-lg overflow-hidden"
                            >
                                {currentUser?.foto_perfil ? (
                                    <img src={currentUser.foto_perfil} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    currentUser?.nome?.charAt(0)
                                )}
                            </button>
                        </div>

                        {/* Mobile Profile Trigger */}
                        <button
                            onClick={() => setShowUserProfile(true)}
                            className="md:hidden w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors font-bold text-lg overflow-hidden"
                        >
                            {currentUser?.foto_perfil ? (
                                <img src={currentUser.foto_perfil} alt="" className="w-full h-full object-cover" />
                            ) : (
                                currentUser?.nome?.charAt(0)
                            )}
                        </button>
                    </div>

                    {students.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 pt-4 -mx-2 px-2">
                            {students.map((student) => (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition-all ${selectedStudent?.id === student.id
                                        ? 'bg-white text-[hsl(var(--brand-blue))]'
                                        : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                >
                                    {student.nome.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto p-4">
                {activeTab === 'home' && selectedStudent && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Instagram-style Stories */}
                        {videoMessages.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-lg p-4">
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {videoMessages.map((msg, idx) => (
                                        <button
                                            key={msg.id}
                                            onClick={() => openStory(idx)}
                                            className="flex-shrink-0 flex flex-col items-center gap-2"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 p-0.5">
                                                <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden relative">
                                                    {msg.media_url ? (
                                                        <video
                                                            src={getMediaUrl(msg.media_url, msg.media_bucket)}
                                                            className="w-full h-full object-cover rounded-full"
                                                            muted
                                                            playsInline
                                                            preload="metadata"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                            <Play size={20} weight="fill" className="text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-700 truncate max-w-[64px]">{msg.escola?.nome || 'Escola'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Student Card */}
                        <div
                            onClick={() => setShowStudentProfile(true)}
                            className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer active:scale-98 transition-transform relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <UserIcon size={120} weight="fill" />
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                {selectedStudent.foto_url ? (
                                    <img src={selectedStudent.foto_url} alt={selectedStudent.nome} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-sm">
                                        {selectedStudent.nome.charAt(0)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-xl font-bold text-gray-900 truncate">{selectedStudent.nome}</h2>
                                    <p className="text-gray-600 text-sm truncate">{selectedStudent.escola?.nome || 'Escola não informada'}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium truncate">
                                            {selectedStudent.turma?.nome || 'Turma -'}
                                        </span>
                                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-md font-medium truncate">
                                            {selectedStudent.serie?.nome || 'Série -'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded-full text-gray-400">
                                    <CaretRight size={24} weight="bold" />
                                </div>
                            </div>
                        </div>

                        {/* Today's Activity */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Atividade de Hoje</h3>
                            {getTodayLogs().length > 0 ? (
                                <div className="space-y-3">
                                    {getTodayLogs().map((log) => (
                                        <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                            {log.url_foto_aluno && (
                                                <img src={log.url_foto_aluno} alt="" className="w-12 h-12 rounded-full object-cover" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{getEventLabel(log.event)}</p>
                                                <p className="text-sm text-gray-600">{formatTime(log.data_do_log)}</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${log.event === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {getEventLabel(log.event)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">Nenhuma atividade registrada hoje</p>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl shadow-lg p-4 text-center">
                                <p className="text-3xl font-bold text-[hsl(var(--brand-blue))]">{logs.length}</p>
                                <p className="text-sm text-gray-600">Registros</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-lg p-4 text-center">
                                <p className="text-3xl font-bold text-[hsl(var(--brand-green))]">{messages.length}</p>
                                <p className="text-sm text-gray-600">Mensagens</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'cameras' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 px-2">Câmeras da Escola</h2>
                        {cameras.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {cameras.map((camera) => (
                                    <div key={camera.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                        <div className="p-3 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white">
                                            <h3 className="font-bold text-sm">{camera.nome}</h3>
                                        </div>
                                        <video
                                            ref={(el) => {
                                                if (el && !cameraRefs.current[camera.id]) {
                                                    playCamera(camera.id, camera.url_m3u8, el);
                                                }
                                            }}
                                            className="w-full aspect-video bg-black"
                                            playsInline
                                            muted
                                            autoPlay
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                                <Camera size={48} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">Nenhuma câmera disponível</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'activity' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 px-2">Histórico de Atividades</h2>
                        {logs.length > 0 ? (
                            <div className="space-y-3">
                                {logs.map((log) => (
                                    <div key={log.id} className="bg-white rounded-2xl shadow-lg p-4">
                                        <div className="flex items-start gap-3">
                                            {log.url_foto_aluno && (
                                                <img src={log.url_foto_aluno} alt="" className="w-16 h-16 rounded-full object-cover" />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${log.event === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {getEventLabel(log.event)}
                                                    </span>
                                                </div>
                                                <p className="font-medium text-gray-900">{log.nome_aluno}</p>
                                                <p className="text-sm text-gray-600">{formatDate(log.data_do_log)} às {formatTime(log.data_do_log)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                                <ClockCounterClockwise size={48} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">Nenhuma atividade registrada</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'messages' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 px-2">Mensagens da Escola</h2>
                        {messages.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {messages.map((message) => (
                                    <div key={message.id} className="bg-white rounded-2xl shadow-lg p-4">
                                        {message.media_url && (
                                            message.tipo?.includes('video') ? (
                                                <video
                                                    src={getMediaUrl(message.media_url, message.media_bucket)}
                                                    controls
                                                    className="w-full h-48 object-cover rounded-xl mb-3"
                                                    playsInline
                                                />
                                            ) : (
                                                <img
                                                    src={getMediaUrl(message.media_url, message.media_bucket)}
                                                    alt=""
                                                    className="w-full h-48 object-cover rounded-xl mb-3"
                                                />
                                            )
                                        )}
                                        <h3 className="font-bold text-gray-900 mb-2">{message.titulo}</h3>
                                        <p className="text-gray-600 text-sm mb-2">{message.descricao}</p>
                                        <p className="text-xs text-gray-500">{formatDate(message.published_at || message.created_at)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                                <ChatCircle size={48} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">Nenhuma mensagem disponível</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Student Profile Modal */}
            <AnimatePresence>
                {showStudentProfile && selectedStudent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowStudentProfile(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white flex justify-between items-center">
                                <h3 className="text-xl font-bold">Ficha do Aluno</h3>
                                <button onClick={() => setShowStudentProfile(false)}>
                                    <X size={28} weight="bold" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-4">
                                    {selectedStudent.foto_url ? (
                                        <img src={selectedStudent.foto_url} alt={selectedStudent.nome} className="w-24 h-24 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white text-3xl font-bold">
                                            {selectedStudent.nome.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-2xl font-bold text-gray-900">{selectedStudent.nome}</h4>
                                        <p className="text-gray-600">{selectedStudent.matricula || 'Matrícula não informada'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Data de Nascimento</p>
                                        <p className="font-medium text-gray-900">{formatDate(selectedStudent.data_nascimento || '')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Idade</p>
                                        <p className="font-medium text-gray-900">{calculateAge(selectedStudent.data_nascimento)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Sexo</p>
                                        <p className="font-medium text-gray-900">{selectedStudent.sexo || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">WhatsApp</p>
                                        <p className="font-medium text-gray-900">{selectedStudent.whatsapp || '-'}</p>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h5 className="font-bold text-gray-900 mb-3">Informações Escolares</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Escola</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.escola?.nome || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Turma</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.turma?.nome || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-gray-500 mb-1">Série</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.serie?.nome || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h5 className="font-bold text-gray-900 mb-3">Endereço</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Cidade</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.cidade || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Estado</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.estado || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-gray-500 mb-1">Bairro</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.bairro || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h5 className="font-bold text-gray-900 mb-3">Responsáveis</h5>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Responsável 1</p>
                                            <p className="font-medium text-gray-900">{selectedStudent.nome_responsavel_1 || '-'}</p>
                                            <p className="text-sm text-gray-600">{selectedStudent.telefone_responsavel_1 || '-'}</p>
                                        </div>
                                        {selectedStudent.responsavel_2 && (
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1">Responsável 2</p>
                                                <p className="font-medium text-gray-900">{selectedStudent.responsavel_2}</p>
                                                <p className="text-sm text-gray-600">{selectedStudent.telefone_responsavel_2 || '-'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* User Profile Modal */}
            <AnimatePresence>
                {showUserProfile && currentUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowUserProfile(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white flex justify-between items-center">
                                <h3 className="text-xl font-bold">Meu Perfil</h3>
                                <button onClick={() => setShowUserProfile(false)}>
                                    <X size={28} weight="bold" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex justify-center">
                                    <div className="relative">
                                        {currentUser.foto_perfil ? (
                                            <img
                                                src={currentUser.foto_perfil}
                                                alt="Perfil"
                                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                                                {currentUser.nome?.charAt(0)}
                                            </div>
                                        )}
                                        <label
                                            htmlFor="photo-upload"
                                            className="absolute bottom-0 right-0 bg-white text-[hsl(var(--brand-blue))] p-2 rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition-colors"
                                        >
                                            <Camera size={20} weight="fill" />
                                            <input
                                                id="photo-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[hsl(var(--brand-blue))] focus:border-transparent"
                                            />
                                            <PencilSimple size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                                        <input
                                            type="text"
                                            value={currentUser.whatsapp || ''}
                                            disabled
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email / Login</label>
                                        <input
                                            type="text"
                                            value={currentUser.login || ''}
                                            disabled
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <button
                                        onClick={handleUpdateProfile}
                                        className="w-full py-3 bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow"
                                    >
                                        Salvar Alterações
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <SignOut size={20} weight="bold" />
                                        Sair da Conta
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Story Modal */}
            <AnimatePresence>
                {storyModal.open && videoMessages[storyModal.index] && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
                    >
                        <button
                            onClick={() => setStoryModal({ open: false, index: 0 })}
                            className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white"
                        >
                            <X size={24} weight="bold" />
                        </button>

                        {storyModal.index > 0 && (
                            <button
                                onClick={prevStory}
                                className="absolute left-4 z-10 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white"
                            >
                                <CaretLeft size={32} weight="bold" />
                            </button>
                        )}

                        {storyModal.index < videoMessages.length - 1 && (
                            <button
                                onClick={nextStory}
                                className="absolute right-4 z-10 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white"
                            >
                                <CaretRight size={32} weight="bold" />
                            </button>
                        )}

                        <div className="max-w-lg w-full h-full flex flex-col">
                            <div className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white font-bold">
                                    {videoMessages[storyModal.index].escola?.nome?.charAt(0) || 'E'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-bold">{videoMessages[storyModal.index].escola?.nome || 'Escola'}</p>
                                    <p className="text-white/70 text-sm">{formatDate(videoMessages[storyModal.index].published_at || videoMessages[storyModal.index].created_at)}</p>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center">
                                {videoMessages[storyModal.index].media_url && (
                                    <video
                                        key={videoMessages[storyModal.index].id}
                                        src={getMediaUrl(videoMessages[storyModal.index].media_url, videoMessages[storyModal.index].media_bucket)}
                                        controls
                                        autoPlay
                                        className="max-h-full max-w-full"
                                        playsInline
                                    />
                                )}
                            </div>

                            <div className="p-4">
                                <h3 className="text-white font-bold text-lg mb-2">{videoMessages[storyModal.index].titulo}</h3>
                                <p className="text-white/90 text-sm">{videoMessages[storyModal.index].descricao}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Navigation (Mobile Only) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden">
                <div className="flex justify-around items-center p-2">
                    <button
                        onClick={() => handleTabChange('home')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'home' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <House size={24} weight={activeTab === 'home' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Início</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('cameras')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'cameras' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <Camera size={24} weight={activeTab === 'cameras' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Câmeras</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('activity')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'activity' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <ClockCounterClockwise size={24} weight={activeTab === 'activity' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Atividades</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('messages')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'messages' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <ChatCircle size={24} weight={activeTab === 'messages' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Mensagens</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResponsibleDashboard;
