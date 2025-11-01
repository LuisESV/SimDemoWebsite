import { useEffect, useRef, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  useEffect(() => {
    const initAudio = async () => {
      try {
        const audio = audioRef.current;
        const canvas = canvasRef.current;
        
        if (!audio || !canvas) return;
        
        // Prevent duplicate initialization
        if (audioContextRef.current) return;

        // Wait for audio to be ready
        audio.crossOrigin = "anonymous";
        audio.src = `${API}/audio`;
        
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        
        const source = audioContext.createMediaElementSource(audio);
        sourceNodeRef.current = source;
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        analyserRef.current = analyser;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const canvasCtx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        const draw = () => {
          animationRef.current = requestAnimationFrame(draw);
          
          analyser.getByteFrequencyData(dataArray);
          
          const width = canvas.offsetWidth;
          const height = canvas.offsetHeight;
          
          // Clear with gradient background
          const gradient = canvasCtx.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, '#0a0a0a');
          gradient.addColorStop(1, '#1a1a2e');
          canvasCtx.fillStyle = gradient;
          canvasCtx.fillRect(0, 0, width, height);
          
          // Draw audio waves
          const barWidth = (width / bufferLength) * 2.5;
          let x = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * (height * 0.8);
            
            // Create gradient for bars
            const barGradient = canvasCtx.createLinearGradient(0, height - barHeight, 0, height);
            
            // Artistic color scheme - vibrant purples, pinks, cyans
            const hue = (i / bufferLength) * 360;
            barGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
            barGradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 60%, 0.7)`);
            barGradient.addColorStop(1, `hsla(${hue + 120}, 100%, 50%, 0.5)`);
            
            canvasCtx.fillStyle = barGradient;
            
            // Add glow effect
            canvasCtx.shadowBlur = 20;
            canvasCtx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
            
            canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 2;
          }
          
          // Reset shadow
          canvasCtx.shadowBlur = 0;
          
          // Draw center circle pulse
          const avgFrequency = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
          const pulseRadius = (avgFrequency / 255) * 150 + 50;
          
          const circleGradient = canvasCtx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, pulseRadius
          );
          circleGradient.addColorStop(0, 'rgba(255, 100, 200, 0.3)');
          circleGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.2)');
          circleGradient.addColorStop(1, 'rgba(150, 100, 255, 0)');
          
          canvasCtx.fillStyle = circleGradient;
          canvasCtx.beginPath();
          canvasCtx.arc(width / 2, height / 2, pulseRadius, 0, 2 * Math.PI);
          canvasCtx.fill();
        };
        
        audio.addEventListener('loadeddata', () => {
          setIsAudioLoaded(true);
          audio.play().catch(e => console.log('Audio autoplay prevented:', e));
        });
        
        draw();
        
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };

    initAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleInteraction = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    }
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play();
    }
  };

  return (
    <div className="landing-container" onClick={handleInteraction} data-testid="landing-container">
      <div className="split-screen" data-testid="split-screen">
        {/* Left Side - Video */}
        <div className="video-section" data-testid="video-section">
          <video
            ref={videoRef}
            className="video-player"
            autoPlay
            loop
            muted
            playsInline
            data-testid="video-player"
          >
            <source src={`${API}/video`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="video-overlay" data-testid="video-overlay">
            <h1 className="video-title" data-testid="video-title">Visual Experience</h1>
          </div>
        </div>
        
        {/* Right Side - Audio Wave */}
        <div className="audio-section" data-testid="audio-section">
          <canvas ref={canvasRef} className="audio-canvas" data-testid="audio-canvas"></canvas>
          <div className="audio-overlay" data-testid="audio-overlay">
            <h1 className="audio-title" data-testid="audio-title">Sound Waves</h1>
            {!isAudioLoaded && (
              <p className="audio-hint" data-testid="audio-hint">Click anywhere to start</p>
            )}
          </div>
          <audio ref={audioRef} loop data-testid="audio-element"></audio>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />}>
            <Route index element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;