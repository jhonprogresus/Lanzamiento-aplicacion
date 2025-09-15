import React, { useState, useRef, useEffect, useCallback } from 'react';
import { transcribeAudio, isApiKeyConfigured } from './services/geminiService.js';

const RecordingStatus = {
  IDLE: 'idle',
  RECORDING: 'recording',
  STOPPED: 'stopped',
};

const HISTORY_STORAGE_KEY = 'transcriptionHistory';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const MicIcon = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3ZM17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
    </svg>
);

const StopIcon = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6V6Z" />
    </svg>
);

const DownloadIcon = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 15.586 6.707 10.293l1.414-1.414L12 12.758l3.879-3.879 1.414 1.414L12 15.586ZM12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
    </svg>
);

const LoaderIcon = ({ className }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export default function App() {
    const [recordingStatus, setRecordingStatus] = useState(RecordingStatus.IDLE);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [transcription, setTranscription] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState(null);
    const [timer, setTimer] = useState(0);
    const [history, setHistory] = useState([]);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Failed to load history from localStorage", error);
            localStorage.removeItem(HISTORY_STORAGE_KEY);
        }
    }, []);

    const startTimer = () => {
        timerIntervalRef.current = window.setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    };
    
    useEffect(() => {
        return () => {
           stopTimer(); // Cleanup timer on unmount
        };
    }, []);

    const handleStartRecording = async () => {
        setError(null);
        setTranscription('');
        setAudioBlob(null);
        setAudioUrl(null);
        if (recordingStatus === RecordingStatus.RECORDING) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setRecordingStatus(RecordingStatus.RECORDING);
            setTimer(0);
            startTimer();

            audioChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);
                setRecordingStatus(RecordingStatus.STOPPED);
                stream.getTracks().forEach(track => track.stop()); // Release microphone
            };
            
            mediaRecorder.start();

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Se necesita permiso del micrófono para grabar. Por favor, habilita el acceso en la configuración de tu navegador.");
            setRecordingStatus(RecordingStatus.IDLE);
        }
    };
    
    const handleStopRecording = () => {
        if (mediaRecorderRef.current && recordingStatus === RecordingStatus.RECORDING) {
            mediaRecorderRef.current.stop();
            stopTimer();
        }
    };
    
    const handleTranscribe = useCallback(async () => {
        if (!audioBlob) return;
        setIsTranscribing(true);
        setError(null);
        setTranscription('');

        try {
            const result = await transcribeAudio(audioBlob);
            setTranscription(result);
            
            // Only add to history on successful transcription
            if (!result.startsWith("Error:")) {
                const newHistoryItem = { timestamp: Date.now(), transcription: result };
                const updatedHistory = [newHistoryItem, ...history];
                setHistory(updatedHistory);
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
            }

        } catch (err) {
            console.error(err);
            setError('Hubo un error al transcribir el audio.');
        } finally {
            setIsTranscribing(false);
        }
    }, [audioBlob, history]);

    const handleExport = () => {
        if (!transcription) return;
        const blob = new Blob([transcription], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcripcion.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const resetState = () => {
        setRecordingStatus(RecordingStatus.IDLE);
        setAudioBlob(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
        setTranscription('');
        setIsTranscribing(false);
        setError(null);
        setTimer(0);
    };

    const handleSelectHistory = (selectedItem) => {
        setRecordingStatus(RecordingStatus.STOPPED);
        setAudioBlob(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
        setTranscription(selectedItem.transcription);
        setIsTranscribing(false);
        setError(null);
        setTimer(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClearHistory = () => {
        setHistory([]);
        localStorage.removeItem(HISTORY_STORAGE_KEY);
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gray-900 text-gray-100">
            <div className="w-full max-w-md mx-auto bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-6">
                {!isApiKeyConfigured && (
                    <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg text-center">
                        <p className="font-bold">Atención: Configuración Requerida</p>
                        <p className="text-sm">La API Key de Google AI no está configurada. La transcripción no funcionará hasta que se añada la clave en el archivo `services/config.js`.</p>
                    </div>
                )}
                <header className="text-center">
                    <h1 className="text-2xl font-bold text-cyan-400">Uso exclusivo para la Psicóloga Emperatriz Arias</h1>
                    <p className="text-gray-400 mt-2">Graba, transcribe y exporta tu voz</p>
                </header>

                <div className="flex flex-col items-center justify-center h-48 bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-700">
                    {recordingStatus === RecordingStatus.IDLE && (
                        <button onClick={handleStartRecording} className="group flex flex-col items-center justify-center p-4 rounded-full bg-cyan-500 hover:bg-cyan-400 transition-all duration-300 transform hover:scale-105 shadow-lg">
                            <MicIcon className="h-16 w-16 text-white"/>
                            <span className="mt-2 text-lg font-semibold">Grabar</span>
                        </button>
                    )}

                    {recordingStatus === RecordingStatus.RECORDING && (
                        <div className="flex flex-col items-center space-y-4">
                             <button onClick={handleStopRecording} className="group flex items-center justify-center p-4 rounded-full bg-red-600 hover:bg-red-500 transition-all duration-300 animate-pulse">
                                <StopIcon className="h-16 w-16 text-white"/>
                            </button>
                            <div className="text-2xl font-mono bg-gray-700 px-3 py-1 rounded-md">{formatTime(timer)}</div>
                        </div>
                    )}

                    {recordingStatus === RecordingStatus.STOPPED && (
                        <div className="flex flex-col items-center space-y-4 p-4">
                            <h3 className="text-lg font-semibold text-gray-300">Grabación Finalizada</h3>
                            {audioUrl && <audio controls src={audioUrl} className="w-full max-w-xs" />}
                        </div>
                    )}
                </div>
                
                {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">{error}</div>}

                <div className="space-y-4">
                    {recordingStatus === RecordingStatus.STOPPED && !isTranscribing && !transcription && (
                         <div className="grid grid-cols-2 gap-4">
                             <button onClick={handleTranscribe} disabled={isTranscribing || !audioBlob} className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                                Transcribir Audio
                            </button>
                             <button onClick={resetState} className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors">
                                Grabar de Nuevo
                            </button>
                         </div>
                    )}
                    
                    {isTranscribing && (
                        <div className="flex items-center justify-center space-x-3 bg-gray-700 p-4 rounded-lg">
                            <LoaderIcon className="h-6 w-6"/>
                            <span className="text-lg font-medium">Transcribiendo...</span>
                        </div>
                    )}

                    {transcription && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-cyan-400">Transcripción:</h3>
                            <textarea
                                readOnly
                                value={transcription}
                                className="w-full h-48 p-4 bg-gray-900/70 rounded-lg border border-gray-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
                                placeholder="La transcripción aparecerá aquí..."
                            />
                             <div className="grid grid-cols-2 gap-4">
                                <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-colors">
                                    <DownloadIcon className="h-5 w-5"/>
                                    Exportar .txt
                                </button>
                                <button onClick={resetState} className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors">
                                    Nuevo Audio
                                </button>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {history.length > 0 && (
                <div className="w-full max-w-md mx-auto bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-4 mt-8">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-cyan-400">Historial</h2>
                        <button
                            onClick={handleClearHistory}
                            className="px-3 py-1 text-sm bg-red-900/70 text-red-300 rounded-md hover:bg-red-800/70 transition-colors"
                            aria-label="Limpiar historial de transcripciones"
                        >
                            Limpiar
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                        {history.map((item) => (
                            <button
                                key={item.timestamp}
                                onClick={() => handleSelectHistory(item)}
                                className="w-full text-left p-3 bg-gray-900/60 rounded-lg cursor-pointer hover:bg-gray-900 transition-colors border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                <p className="text-xs font-mono text-cyan-300 mb-1">
                                    {new Date(item.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })}
                                </p>
                                <p className="text-gray-300 text-sm truncate">
                                    {item.transcription}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}