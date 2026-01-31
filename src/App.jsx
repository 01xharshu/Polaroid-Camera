import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Image as ImageIcon, Trash2, Download, X, SkipForward, ArrowLeft, ArrowRight, CameraOff, RefreshCw } from 'lucide-react';

/**
 * IP-1 Polaroid Camera - V7.0
 * - AUDIO REMOVED: All sound effects and background music have been stripped.
 * - STRUCTURE: Maintained integrated mechanical slit within the faceplate.
 * - SKIP LOGIC: "Skip" automatically moves the photo to the Side Stack.
 * - NAVIGATION: Minimalist bottom triggers with no container.
 * - SHORTCUTS: Enter (Capture), G (Gallery).
 */

const App = () => {
  const [view, setView] = useState('camera'); 
  const [photos, setPhotos] = useState([]);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [ejectingPhoto, setEjectingPhoto] = useState(null);
  const [developingPhoto, setDevelopingPhoto] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const [filmCount, setFilmCount] = useState(10);
  const [cameraStatus, setCameraStatus] = useState('idle'); 
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const commonShadow = "shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15),0_4px_10px_-4px_rgba(0,0,0,0.1)]";

  const startCamera = async () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setCameraStatus('loading');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1200 }, height: { ideal: 1200 }, facingMode: 'user' } 
      });
      streamRef.current = mediaStream;
      setCameraStatus('success');
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      setCameraStatus('error');
    }
  };

  useEffect(() => {
    if (view === 'camera') startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, [view]);

  const handleCapture = useCallback(() => {
    if (cameraStatus !== 'success' || !streamRef.current || ejectingPhoto || developingPhoto) return;
    if (filmCount <= 0) {
      setStorageError(true);
      setTimeout(() => setStorageError(false), 3000);
      return;
    }

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      setIsFlashActive(true);
      setTimeout(() => setIsFlashActive(false), 150);

      const imgSize = 1000;
      const padding = 60;
      const bottomArea = 180;
      canvas.width = imgSize + (padding * 2);
      canvas.height = imgSize + padding + bottomArea;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const videoSize = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - videoSize) / 2;
      const startY = (video.videoHeight - videoSize) / 2;
      
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, startX, startY, videoSize, videoSize, padding, padding, imgSize, imgSize);
      ctx.restore();

      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(padding, padding, imgSize, imgSize);

      const now = new Date();
      const dateString = `${now.getDate()} ${now.toLocaleDateString('en-GB', { month: 'short' })} ${now.getFullYear()}`;
      ctx.fillStyle = '#444444'; 
      ctx.font = 'italic 48px "Courier New", Courier, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(dateString, canvas.width - padding - 15, canvas.height - (bottomArea / 2.5));

      const photoData = canvas.toDataURL('image/jpeg', 0.95);
      const newPhoto = { id: Date.now(), url: photoData, date: dateString, developed: false };

      setEjectingPhoto(newPhoto);
      setFilmCount(prev => prev - 1);
      
      setTimeout(() => {
        setDevelopingPhoto(newPhoto);
        setEjectingPhoto(null);
      }, 1500); 
    }
  }, [cameraStatus, filmCount, ejectingPhoto, developingPhoto]);

  const handleProcessPhoto = (autoDownload = false) => {
    if (!developingPhoto) return;
    const photoToSave = { ...developingPhoto, developed: true };
    setPhotos(prev => [photoToSave, ...prev]);
    if (autoDownload) {
      const link = document.createElement('a');
      link.href = photoToSave.url;
      link.download = `polaroid-${photoToSave.id}.jpg`;
      link.click();
    }
    setDevelopingPhoto(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (e.key === 'Enter') {
        if (view === 'camera' && !developingPhoto && !ejectingPhoto) {
          e.preventDefault();
          handleCapture();
        }
      }
      if (key === 'g' && !developingPhoto) setView('gallery');
      if (e.key === 'Escape') {
        if (developingPhoto) handleProcessPhoto(false); 
        else if (view !== 'camera') setView('camera');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, handleCapture, developingPhoto, ejectingPhoto]);

  const PolaroidCard = ({ photo, size = "md", onClick, isEjecting = false, isDeveloping = false }) => (
    <div 
      onClick={onClick}
      className={`bg-white transition-all ${!isEjecting ? 'hover:scale-105' : ''} cursor-pointer ${
        size === "lg" ? "w-64 sm:w-80" : 
        size === "stack" ? "w-16 sm:w-44" : 
        size === "eject" ? "w-48 sm:w-[260px]" : "w-40 sm:w-48"
      } relative overflow-hidden flex flex-col items-center border border-black/5 ${commonShadow}`}
      style={{ aspectRatio: '1 / 1.25' }}
    >
      <div className="w-full h-full relative">
        <img 
          src={photo.url} 
          alt="Polaroid" 
          className={`w-full h-full object-contain transition-all duration-[10s] ${
            isDeveloping ? 'brightness-100 grayscale-0 blur-0 animate-develop' : 
            isEjecting ? 'brightness-0' : 'brightness-100 grayscale-0 blur-0'
          }`}
        />
      </div>
    </div>
  );

  const SideStack = ({ mobileTop = false }) => (
    <div 
      className={`group cursor-pointer transition-all duration-300 ${
        mobileTop 
          ? "fixed top-12 right-48 z-50 md:hidden scale-[0.55] origin-top-right" 
          : "relative w-40 sm:w-48 h-56 sm:h-64 hidden md:block"
      }`} 
      onClick={() => setView('gallery')}
    >
      {photos.length > 0 ? (
        <div className="relative">
          {photos.slice(0, 3).reverse().map((p, i) => (
            <div 
              key={p.id}
              className="absolute left-0 top-0 transition-all duration-500"
              style={{ 
                transform: `rotate(${i * 6 - 3}deg) translate(${i * 6}px, ${i * -3}px)`,
                zIndex: i
              }}
            >
                <PolaroidCard photo={p} size="stack" />
            </div>
          ))}
        </div>
      ) : (
        <div className={`border-2 border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center text-black/10 ${
          mobileTop ? "w-16 h-20" : "w-36 sm:w-44 h-48 sm:h-56"
        }`}>
          <ImageIcon size={mobileTop ? 16 : 32} />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EBEBEB] flex flex-col items-center justify-start font-sans overflow-x-hidden select-none">
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes eject {
          0% { transform: translate(-50%, -100%); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translate(-50%, -15%); opacity: 1; }
        }
        @keyframes develop {
          0% { filter: brightness(0) contrast(0.5) sepia(1) grayscale(1) blur(12px); opacity: 0.3; }
          100% { filter: brightness(1) contrast(1) sepia(0) grayscale(0) blur(0); opacity: 1; }
        }
        @keyframes flash {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0.9) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-eject { animation: eject 1.5s forwards cubic-bezier(0.3, 0.45, 0.35, 1); will-change: transform; }
        .animate-develop { animation: develop 10s forwards linear; }
        .animate-flash { animation: flash 0.15s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-popIn { animation: popIn 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
        
        .lens-gloss {
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%);
        }
      `}} />

      {isFlashActive && <div className="fixed inset-0 bg-white z-[110] animate-flash pointer-events-none"></div>}

      {storageError && (
        <div className={`fixed top-8 sm:top-12 z-[100] flex items-center gap-3 bg-black/90 text-white px-6 py-4 rounded-xl ${commonShadow} animate-bounce`}>
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold">!</div>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Storage full</span>
        </div>
      )}

      {view === 'camera' && !developingPhoto && <SideStack mobileTop={true} />}

      <div className="relative w-full max-w-6xl flex-grow flex flex-col items-center px-4 pt-10 sm:pt-20">
        
        {view === 'camera' && (
          <div className="relative flex flex-col items-center w-full flex-grow">
            
            <div className="relative flex flex-col md:flex-row items-center gap-12 md:gap-20 w-full justify-center">
                <div className="relative w-[300px] sm:w-[420px] h-[340px] sm:h-[480px] overflow-visible" style={{ isolation: 'isolate' }}>
                  
                  {ejectingPhoto && (
                    <div className="absolute top-full left-[50%] -translate-x-[50%] z-10 animate-eject">
                      <PolaroidCard photo={ejectingPhoto} size="eject" isEjecting={true} />
                    </div>
                  )}

                  <div className={`absolute inset-0 bg-[#D8D8D8] rounded-[32px] sm:rounded-[40px] z-20 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] border border-black/5 p-6 sm:p-10 flex flex-col items-center overflow-hidden`}>
                    
                    <div className="w-full flex justify-between items-start mb-6 sm:mb-12">
                      <h1 className="text-xl sm:text-4xl font-black text-gray-400/60 tracking-tighter italic leading-none uppercase">IP-1</h1>
                      
                      <div className={`w-16 h-16 sm:w-24 sm:h-24 bg-black rounded-lg shadow-inner overflow-hidden border-2 border-[#C8C8C8] relative ${commonShadow}`}>
                         <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-700 ${cameraStatus === 'success' ? 'opacity-100' : 'opacity-0'}`} 
                         />
                         <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
                      </div>
                    </div>

                    <div className="absolute top-14 sm:top-28 left-6 sm:left-10 flex items-center gap-1.5 sm:gap-2.5 bg-black/95 px-2 sm:px-3.5 py-1 sm:py-2 rounded-full shadow-inner border border-white/5">
                      <div className="flex gap-0.5">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className={`w-0.5 h-2 sm:h-3 rounded-full ${i < filmCount ? 'bg-white' : 'bg-white/10'}`}></div>
                        ))}
                      </div>
                      <span className="text-white text-[9px] sm:text-[12px] font-mono font-bold leading-none">{filmCount}</span>
                    </div>

                    <div 
                        onClick={handleCapture}
                        className={`w-36 h-36 sm:w-56 sm:h-56 rounded-full bg-[#1A1A1A] relative flex items-center justify-center group cursor-pointer active:scale-95 transition-all duration-300 border-[8px] sm:border-[12px] border-[#C8C8C8] ${commonShadow}`}
                    >
                        <div className="absolute inset-2 sm:inset-4 rounded-full border border-white/5 bg-gradient-to-b from-[#222] to-[#111] shadow-inner"></div>
                        <div className="absolute inset-6 sm:inset-10 rounded-full border-2 border-black bg-gradient-to-br from-[#101525] via-[#050505] to-[#1a1020] overflow-hidden">
                            <div className="absolute inset-0 lens-gloss"></div>
                            <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-indigo-500/5 blur-xl"></div>
                            <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                                <div className="w-[80%] h-[80%] rounded-full border border-white"></div>
                                <div className="absolute w-[60%] h-[60%] rounded-full border border-white"></div>
                            </div>
                        </div>
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black shadow-[inset_0_2px_5px_rgba(255,255,255,0.2)] z-10 border border-white/5"></div>
                    </div>

                    <div className="w-full grid grid-cols-12 gap-x-1 sm:gap-x-2 gap-y-1.5 sm:gap-y-2.5 px-4 sm:px-6 opacity-20 mt-6 sm:mt-10 mb-4">
                      {[...Array(36)].map((_, i) => (
                        <div key={i} className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-black rounded-full"></div>
                      ))}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 h-10 sm:h-14 bg-[#050505] rounded-2xl shadow-[inset_0_4px_24px_rgba(0,0,0,1)] border border-white/5 flex items-center justify-center">
                        <div className="w-[90%] h-0.5 bg-white/5 rounded-full blur-sm"></div>
                    </div>
                  </div>
                </div>

                <SideStack />
            </div>

            {developingPhoto && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
                    <div className="flex flex-col items-center p-6 w-full max-w-sm animate-popIn">
                        <div className="mb-10 scale-100 sm:scale-110">
                            <PolaroidCard photo={developingPhoto} size="eject" isDeveloping={true} />
                        </div>
                        <div className="flex flex-col gap-4 w-full px-6">
                            <button 
                                onClick={() => handleProcessPhoto(true)}
                                className={`w-full flex items-center justify-center gap-3 px-8 py-5 bg-white text-black rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all ${commonShadow}`}
                            >
                                <Download size={18} strokeWidth={3} /> Save & Download
                            </button>
                            <button 
                                onClick={() => handleProcessPhoto(false)}
                                className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white/10 text-white rounded-full font-black uppercase tracking-widest text-xs backdrop-blur hover:bg-white/20 transition-all"
                            >
                                <SkipForward size={18} /> Skip
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-auto w-full flex flex-col items-center space-y-10 pb-6">
              <div className="flex items-center gap-12 sm:gap-24 text-[10px] sm:text-sm uppercase tracking-[0.4em] font-black text-gray-500/60">
                <button onClick={handleCapture} className={`flex flex-col items-center gap-3 transition-all ${cameraStatus === 'success' ? 'hover:text-black active:scale-90' : 'opacity-20'}`} disabled={cameraStatus !== 'success'}>
                  <span className={`w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-xl sm:text-2xl font-mono ${commonShadow} rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10`}>↵</span>
                  <span className="text-[8px] sm:text-[9px] tracking-[0.2em] font-bold">Capture</span>
                </button>
                <button onClick={() => setView('gallery')} className="flex flex-col items-center gap-3 hover:text-black active:scale-90 transition-all">
                  <span className={`w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-xl sm:text-2xl font-mono ${commonShadow} rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10`}>G</span>
                  <span className="text-[8px] sm:text-[9px] tracking-[0.2em] font-bold">Gallery</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {view === 'gallery' && (
          <div className="w-full h-full flex flex-col p-4 sm:p-12 overflow-y-auto animate-popIn">
            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mb-12 gap-4">
              <div className="flex items-baseline gap-4 sm:gap-6">
                <h2 className="text-3xl sm:text-7xl font-black text-black tracking-tighter uppercase italic leading-none">Gallery</h2>
                <span className="text-gray-400 font-mono text-sm sm:text-2xl">/{photos.length}</span>
              </div>
              <button onClick={() => setView('camera')} className={`p-3 sm:p-5 bg-black text-white rounded-full ${commonShadow} hover:scale-110 active:scale-90 transition-all`}><X size={20} className="sm:w-8 sm:h-8" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-12 place-items-center mb-20">
              {photos.map((photo, index) => (
                <PolaroidCard key={photo.id} photo={photo} onClick={() => { setSelectedPhotoIndex(index); setView('photo-detail'); }} />
              ))}
            </div>
          </div>
        )}

        {view === 'photo-detail' && selectedPhotoIndex !== null && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[150] flex flex-col items-center justify-center p-4 sm:p-8 animate-popIn">
            <button onClick={() => setView('gallery')} className="absolute top-6 right-6 sm:top-10 sm:right-10 p-2 sm:p-4 text-white/40 hover:text-white transition-colors"><X size={32} className="sm:w-10 sm:h-10" /></button>
            <div className="flex items-center gap-2 sm:gap-12 w-full justify-center">
              <button onClick={() => setSelectedPhotoIndex(prev => Math.max(0, prev - 1))} className="p-2 sm:p-4 text-white/20 hover:text-white disabled:opacity-0 transition-all" disabled={selectedPhotoIndex === 0}><ArrowLeft size={32} className="sm:w-16 sm:h-16" /></button>
              <div className="scale-[0.7] sm:scale-100">
                <PolaroidCard photo={photos[selectedPhotoIndex]} size="lg" />
              </div>
              <button onClick={() => setSelectedPhotoIndex(prev => Math.min(photos.length - 1, prev + 1))} className="p-2 sm:p-4 text-white/20 hover:text-white disabled:opacity-0 transition-all" disabled={selectedPhotoIndex === photos.length - 1}><ArrowRight size={32} className="sm:w-16 sm:h-16" /></button>
            </div>
            <div className="mt-8 sm:mt-16 flex flex-col sm:flex-row gap-3 sm:gap-8 w-full sm:w-auto px-10">
              <button onClick={() => {
                const link = document.createElement('a');
                link.href = photos[selectedPhotoIndex].url;
                link.download = `polaroid-${photos[selectedPhotoIndex].id}.jpg`;
                link.click();
              }} className={`w-full sm:w-auto px-10 py-4 bg-white text-black rounded-full font-black uppercase text-[11px] tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 ${commonShadow}`}><Download size={18} /> Download</button>
              <button onClick={() => {
                const id = photos[selectedPhotoIndex].id;
                setPhotos(prev => prev.filter(p => p.id !== id));
                setView('gallery');
              }} className={`w-full sm:w-auto px-10 py-4 bg-red-600 text-white rounded-full font-black uppercase text-[11px] tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 ${commonShadow}`}><Trash2 size={18} /> Delete</button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;