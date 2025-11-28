import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, ClockCounterClockwise, ChatCircle, House, SignOut, X, CaretLeft, CaretRight, Play } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';

type Student = {
    id: string;
    nome: string;
    foto_url?: string;
    escola_id?: string;
    turma_id?: string;
    serie_id?: string;
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
    const videoRef = useRef<HTMLVideoElement>(null);
    const cameraRefs = useRef<{ [key: string]: { video: HTMLVideoElement | null; hls: Hls | null } }>({});

    useEffect(() => {
        fetchUserAndStudents();
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            fetchStudentData();
        }
    }, [selectedStudent]);

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

            // Filter video messages for stories
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

    const formatDate = (dateString: string) => {
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
            <div className="bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] text-white p-6 rounded-b-3xl shadow-lg">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-bold">Olá, {currentUser?.nome?.split(' ')[0]}!</h1>
                            <p className="text-blue-100 text-sm">Acompanhe seus filhos</p>
                        </div>
                        <button onClick={handleLogout} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <SignOut size={24} weight="bold" />
                        </button>
                    </div>

                    {students.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
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

                    {/* Instagram-style Stories */}
                    {activeTab === 'home' && videoMessages.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 pt-4 -mx-2 px-2">
                            {videoMessages.map((msg, idx) => (
                                <button
                                    key={msg.id}
                                    onClick={() => openStory(idx)}
                                    className="flex-shrink-0 flex flex-col items-center gap-2"
                                >
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 p-0.5">
                                        <div className="w-full h-full rounded-full bg-white p-0.5">
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white font-bold">
                                                <Play size={24} weight="fill" />
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-white truncate max-w-[64px]">{msg.escola?.nome || 'Escola'}</span>
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
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center gap-4 mb-4">
                                {selectedStudent.foto_url ? (
                                    <img src={selectedStudent.foto_url} alt={selectedStudent.nome} className="w-20 h-20 rounded-full object-cover" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-green))] flex items-center justify-center text-white text-2xl font-bold">
                                        {selectedStudent.nome.charAt(0)}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-gray-900">{selectedStudent.nome}</h2>
                                    <p className="text-gray-600">{selectedStudent.escola?.nome || 'Escola não informada'}</p>
                                    <p className="text-sm text-gray-500">{selectedStudent.turma?.nome || ''} - {selectedStudent.serie?.nome || ''}</p>
                                </div>
                            </div>
                        </div>

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
                                            controls
                                            playsInline
                                            muted
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
                                                <video src={message.media_url} controls className="w-full h-48 object-cover rounded-xl mb-3" />
                                            ) : (
                                                <img src={message.media_url} alt="" className="w-full h-48 object-cover rounded-xl mb-3" />
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
                                        src={videoMessages[storyModal.index].media_url}
                                        controls
                                        autoPlay
                                        className="max-h-full max-w-full"
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

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden">
                <div className="flex justify-around items-center p-2">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'home' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <House size={24} weight={activeTab === 'home' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Início</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('cameras')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'cameras' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <Camera size={24} weight={activeTab === 'cameras' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Câmeras</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'activity' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <ClockCounterClockwise size={24} weight={activeTab === 'activity' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Atividades</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'messages' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600'
                            }`}
                    >
                        <ChatCircle size={24} weight={activeTab === 'messages' ? 'fill' : 'regular'} />
                        <span className="text-xs font-medium">Mensagens</span>
                    </button>
                </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block fixed top-20 left-4 bg-white rounded-2xl shadow-lg p-4">
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'home' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <House size={24} weight={activeTab === 'home' ? 'fill' : 'regular'} />
                        <span className="font-medium">Início</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('cameras')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'cameras' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Camera size={24} weight={activeTab === 'cameras' ? 'fill' : 'regular'} />
                        <span className="font-medium">Câmeras</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'activity' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <ClockCounterClockwise size={24} weight={activeTab === 'activity' ? 'fill' : 'regular'} />
                        <span className="font-medium">Atividades</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'messages' ? 'text-[hsl(var(--brand-blue))] bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <ChatCircle size={24} weight={activeTab === 'messages' ? 'fill' : 'regular'} />
                        <span className="font-medium">Mensagens</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResponsibleDashboard;
