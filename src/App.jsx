import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Image as ImageIcon, Music, Trash2, Download, X, SkipForward, ArrowLeft, ArrowRight, CameraOff, RefreshCw } from 'lucide-react';

const App = () => {
  const [view, setView] = useState('camera'); // 'camera', 'gallery', 'photo-detail'
  const [stream, setStream] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [ejectingPhoto, setEjectingPhoto] = useState(null);
  const [developingPhoto, setDevelopingPhoto] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [filmCount, setFilmCount] = useState(10);
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio('https://cdn.pixabay.com/audio/2022/03/24/audio_77ce988452.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (musicOn) {
        audioRef.current.play().catch(() => console.log("User interaction needed for audio"));
      } else {
        audioRef.current.pause();
      }
    }
  }, [musicOn]);

  const startCamera = async () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setCameraStatus('loading');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1200 }, height: { ideal: 1200 }, facingMode: 'user' } 
      });
      setStream(mediaStream);
      setCameraStatus('success');
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      setCameraStatus('error');
    }
  };

  useEffect(() => {
    if (view === 'camera') startCamera();
    else if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraStatus('idle');
    }
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [view]);

  const handleCapture = useCallback(() => {
    if (cameraStatus !== 'success' || !stream || ejectingPhoto || developingPhoto) return;
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
      }, 2500); 
    }
  }, [cameraStatus, stream, filmCount, ejectingPhoto, developingPhoto]);

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

  const handleDownloadOnly = (photo) => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `polaroid-${photo.id}.jpg`;
    link.click();
  };

  const handleDelete = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    setView('gallery');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.code === 'Enter' || e.key.toLowerCase() === 'c') {
        if (view === 'camera') { e.preventDefault(); handleCapture(); }
      }
      if (e.key.toLowerCase() === 'g') setView('gallery');
      if (e.key.toLowerCase() === 'm') setMusicOn(prev => !prev);
      if (e.key === 'Escape') setView('camera');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, handleCapture]);

  const PolaroidCard = ({ photo, size = "md", onClick, style, isEjecting = false, isDeveloping = false }) => (
    <div 
      onClick={onClick}
      className={`bg-white shadow-xl transition-all ${!isEjecting ? 'hover:scale-105' : ''} cursor-pointer ${
        size === "lg" ? "w-64 sm:w-80" : 
        size === "stack" ? "w-16 sm:w-44" : 
        size === "eject" ? "w-48 sm:w-[260px]" : "w-40 sm:w-48"
      } relative overflow-hidden flex flex-col items-center border border-black/5`}
      style={{
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.2), 0 4px 8px -4px rgba(0, 0, 0, 0.1)',
        aspectRatio: '1 / 1.25',
        ...style
      }}
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
          ? "fixed top-12 right-40 z-50 md:hidden scale-[0.6] origin-top-right" 
          : "relative w-40 sm:w-48 h-56 sm:h-64 hidden md:block"
      }`} 
      onClick={() => setView('gallery')}
    >
      {photos.length > 0 ? (
        <div className="relative">
          {photos.slice(0, mobileTop ? 3 : 5).reverse().map((p, i) => (
            <div 
              key={p.id}
              className="absolute left-0 top-0 transition-all duration-500"
              style={{ 
                transform: `rotate(${i * 6 - 3}deg) translate(${i * (mobileTop ? 3 : 6)}px, ${i * (mobileTop ? -2 : -3)}px)`,
                zIndex: i,
                opacity: 1 - (i * (mobileTop ? 0.25 : 0.15))
              }}
            >
                <PolaroidCard photo={p} size="stack" />
            </div>
          ))}
        </div>
      ) : (
        <div className={`border-2 border-dashed border-black/10 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-black/10 transition-colors group-hover:border-black/20 group-hover:text-black/20 ${
          mobileTop ? "w-16 h-20" : "w-36 sm:w-44 h-48 sm:h-56"
        }`}>
          <ImageIcon size={mobileTop ? 16 : 32} className="mb-2" />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EBEBEB] flex flex-col items-center justify-center font-sans overflow-x-hidden select-none">
      
      {isFlashActive && <div className="fixed inset-0 bg-white z-[100] opacity-80 animate-flash pointer-events-none"></div>}

      {storageError && (
        <div className="fixed top-8 sm:top-12 z-[100] flex items-center gap-3 bg-black/90 text-white px-6 py-4 rounded-xl shadow-2xl animate-bounce">
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold">!</div>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Storage full</span>
        </div>
      )}

      {/* Responsive Stack - Top Right with high Negative X shift */}
      {view === 'camera' && <SideStack mobileTop={true} />}

      <div className="relative w-full max-w-6xl min-h-screen flex flex-col items-center justify-start sm:justify-center pt-8 sm:py-20 px-4 overflow-y-auto">
        
        {view === 'camera' && (
          <div className="relative flex flex-col items-center w-full">
            
            {/* Camera Block Wrapper - Higher on mobile */}
            <div className="relative flex flex-col md:flex-row items-center gap-12 md:gap-20 w-full justify-center sm:mt-0 mt-[-60px]">
                {/* THE CAMERA BLOCK - MECHANICAL SANDWICH */}
                <div className="w-[300px] sm:w-[420px] h-[340px] sm:h-[480px] relative overflow-visible">
                  
                  {/* LAYER 1: THE PHOTO (Z-10) - Hidden inside the body */}
                  {ejectingPhoto && (
                    <div className="absolute top-0 left-[50%] -translate-x-[50%] z-10 animate-eject">
                      <PolaroidCard photo={ejectingPhoto} size="eject" isEjecting={true} />
                    </div>
                  )}

                  {/* LAYER 2: THE MAIN FACE PLATE (Z-20) */}
                  <div className="absolute top-0 left-0 right-0 h-[320px] sm:h-[440px] bg-[#D8D8D8] rounded-t-[32px] sm:rounded-t-[40px] z-20 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] border-x border-t border-black/5 p-6 sm:p-10 flex flex-col items-center">
                    
                    <div className="w-full flex justify-between items-start mb-6 sm:mb-12">
                      <h1 className="text-xl sm:text-4xl font-black text-gray-400/60 tracking-tighter italic leading-none uppercase">IP-1</h1>
                      <div className="w-5 h-5 sm:w-8 sm:h-8 bg-[#FF6B00] rounded-md shadow-lg flex items-center justify-center text-white text-[10px] sm:text-[14px] font-black border-t border-white/20">S</div>
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
                      className="w-36 h-36 sm:w-56 sm:h-56 rounded-full border-[10px] sm:border-[14px] border-[#C8C8C8] shadow-[inset_0_4px_16px_rgba(0,0,0,0.5),0_12px_24px_-8px_rgba(0,0,0,0.3)] overflow-hidden relative mb-6 sm:mb-12 bg-black group cursor-pointer active:scale-95 transition-all duration-300"
                    >
                      <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-700 ${cameraStatus === 'success' ? 'opacity-100' : 'opacity-0'}`} />
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20"></div>
                        <div className="absolute inset-4 border border-white/5 rounded-full"></div>
                      </div>
                    </div>

                    <div className="w-full grid grid-cols-12 gap-x-1 sm:gap-x-2 gap-y-1.5 sm:gap-y-2.5 px-4 sm:px-6 opacity-20 mb-4 sm:mb-6">
                      {[...Array(36)].map((_, i) => (
                        <div key={i} className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-black rounded-full"></div>
                      ))}
                    </div>

                    {/* THE SLIT - Fat and integrated into the bottom */}
                    <div className="absolute bottom-0 left-2 right-2 h-7 sm:h-9 bg-[#050505] rounded-t-2xl shadow-[inset_0_4px_16px_rgba(0,0,0,1)] border-b border-white/10"></div>
                  </div>

                  {/* LAYER 3: THE BOTTOM LIP (Z-40) - Covers the exit */}
                  <div className="absolute bottom-0 left-0 right-0 h-6 sm:h-10 bg-[#D8D8D8] rounded-b-[24px] sm:rounded-b-[40px] z-40 border-x border-b border-black/10"></div>
                </div>

                {/* Desktop Stack */}
                <SideStack />
            </div>

            {/* INTERACTION AREA - Positioned for the new slide-down distance */}
            <div className={`relative w-full transition-all duration-500 flex flex-col items-center overflow-visible px-4 ${developingPhoto ? 'h-[350px] sm:h-[550px]' : 'h-0'}`}>
                {developingPhoto && (
                    <div className="flex flex-col items-center animate-dockIn pt-[40px] sm:pt-[100px] w-full">
                        <div className="mb-6 scale-[0.75] sm:scale-100 origin-top">
                            <PolaroidCard photo={developingPhoto} size="eject" isDeveloping={true} />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto items-center">
                            <button 
                                onClick={() => handleProcessPhoto(true)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-black rounded-full font-black uppercase tracking-wider text-[10px] sm:text-[11px] shadow-2xl hover:scale-105 active:scale-95 transition-all border border-black/5"
                            >
                                <Download size={14} strokeWidth={3} /> Save & Download
                            </button>
                            <button 
                                onClick={() => handleProcessPhoto(false)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-black/5 text-black rounded-full font-black uppercase tracking-wider text-[10px] sm:text-[11px] shadow-md hover:bg-black/10 transition-all"
                            >
                                <SkipForward size={14} /> Skip
                            </button>
                        </div>
                    </div>
                )}
            </div>

          </div>
        )}

        {/* Gallery View */}
        {view === 'gallery' && (
          <div className="w-full h-full flex flex-col p-4 sm:p-12 overflow-y-auto animate-popIn">
            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mb-8 sm:mb-20 gap-4">
              <div className="flex items-baseline gap-4 sm:gap-6">
                <h2 className="text-3xl sm:text-7xl font-black text-black tracking-tighter uppercase italic leading-none">Gallery</h2>
                <span className="text-gray-400 font-mono text-sm sm:text-2xl">/{photos.length}</span>
              </div>
              <button onClick={() => setView('camera')} className="p-3 sm:p-5 bg-black text-white rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all"><X size={20} className="sm:w-8 sm:h-8" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-12 place-items-center pb-32">
              {photos.map((photo, index) => (
                <PolaroidCard key={photo.id} photo={photo} onClick={() => { setSelectedPhotoIndex(index); setView('photo-detail'); }} />
              ))}
            </div>
          </div>
        )}

        {/* Detail View */}
        {view === 'photo-detail' && selectedPhotoIndex !== null && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-4 sm:p-8 animate-popIn">
            <button onClick={() => setView('gallery')} className="absolute top-6 right-6 sm:top-10 sm:right-10 p-2 sm:p-4 text-white/40 hover:text-white transition-colors"><X size={32} className="sm:w-10 sm:h-10" /></button>
            <div className="flex items-center gap-2 sm:gap-12 w-full justify-center">
              <button onClick={() => setSelectedPhotoIndex(prev => Math.max(0, prev - 1))} className="p-2 sm:p-4 text-white/20 hover:text-white disabled:opacity-0 transition-all" disabled={selectedPhotoIndex === 0}><ArrowLeft size={32} className="sm:w-16 sm:h-16" /></button>
              <div className="shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] scale-[0.7] sm:scale-100">
                <PolaroidCard photo={photos[selectedPhotoIndex]} size="lg" />
              </div>
              <button onClick={() => setSelectedPhotoIndex(prev => Math.min(photos.length - 1, prev + 1))} className="p-2 sm:p-4 text-white/20 hover:text-white disabled:opacity-0 transition-all" disabled={selectedPhotoIndex === photos.length - 1}><ArrowRight size={32} className="sm:w-16 sm:h-16" /></button>
            </div>
            <div className="mt-8 sm:mt-16 flex flex-col sm:flex-row gap-3 sm:gap-8 w-full sm:w-auto px-10">
              <button onClick={() => handleDownloadOnly(photos[selectedPhotoIndex])} className="w-full sm:w-auto px-10 py-4 bg-white text-black rounded-full font-black uppercase text-[11px] tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"><Download size={18} /> Download</button>
              <button onClick={() => handleDelete(photos[selectedPhotoIndex].id)} className="w-full sm:w-auto px-10 py-4 bg-red-600 text-white rounded-full font-black uppercase text-[11px] tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"><Trash2 size={18} /> Delete</button>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-16 sm:bottom-28 z-50 flex items-center gap-8 sm:gap-20 text-[10px] sm:text-sm uppercase tracking-[0.3em] font-black text-gray-500/80 bg-[#EBEBEB]/90 backdrop-blur-sm px-10 py-4 rounded-full border border-black/5 shadow-2xl md:bg-transparent md:border-none md:shadow-none md:backdrop-blur-none">
        <button onClick={handleCapture} className={`flex flex-col items-center gap-2 sm:gap-4 transition-all ${cameraStatus === 'success' ? 'hover:text-black active:scale-90' : 'opacity-20'}`} disabled={cameraStatus !== 'success'}>
          <span className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg sm:rounded-xl text-sm sm:text-lg font-mono">↵</span>
          <span className="hidden sm:inline text-[9px] tracking-widest">Capture</span>
        </button>
        <button onClick={() => setView('gallery')} className="flex flex-col items-center gap-2 sm:gap-4 hover:text-black active:scale-90 transition-all">
          <span className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg sm:rounded-xl text-sm sm:text-lg font-mono">G</span>
          <span className="hidden sm:inline text-[9px] tracking-widest">Gallery</span>
        </button>
        <button onClick={() => setMusicOn(!musicOn)} className={`flex flex-col items-center gap-2 sm:gap-4 transition-all ${musicOn ? 'text-orange-600' : 'hover:text-black'}`}>
          <span className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg sm:rounded-xl text-sm sm:text-lg font-mono">M</span>
          <span className="hidden sm:inline text-[9px] tracking-widest">Music</span>
        </button>
      </div>

      <div className="fixed bottom-4 z-50 text-[10px] text-black/30 tracking-[0.2em] font-bold uppercase">
        Made with ❤️ by <a href="https://x.com/heyaharshu" target="_blank" rel="noopener noreferrer" className="underline hover:text-black transition-colors decoration-black/20 hover:decoration-black">Harsh</a>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes eject {
          0% { transform: translate(-50%, -65%); opacity: 0; }
          2% { opacity: 1; }
          100% { transform: translate(-50%, 85%); opacity: 1; }
        }
        @keyframes dockIn {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes develop {
          0% { filter: brightness(0) contrast(0.5) sepia(1) grayscale(1) blur(12px); opacity: 0.3; }
          100% { filter: brightness(1) contrast(1) sepia(0) grayscale(0) blur(0); opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0.95) translateY(10px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes flash {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-eject { animation: eject 2.5s forwards cubic-bezier(0.3, 0.45, 0.35, 1); }
        .animate-dockIn { animation: dockIn 0.3s ease-out forwards; }
        .animate-develop { animation: develop 10s forwards linear; }
        .animate-popIn { animation: popIn 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
        .animate-flash { animation: flash 0.1s ease-out forwards; }
      `}} />
    </div>
  );
};

export default App;