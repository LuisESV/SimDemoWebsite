import { useEffect, useRef, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const MEDIA_URL = `${BACKEND_URL}/media`;

const Home = () => {
  const audioCanvasRef = useRef(null);
  const videoCanvasRef = useRef(null);
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const videoAnimationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  // Video canvas animation
  useEffect(() => {
    const canvas = videoCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    let time = 0;

    const drawVideoEffect = () => {
      videoAnimationRef.current = requestAnimationFrame(drawVideoEffect);
      time += 0.01;

      // Create flowing gradient background
      const gradient = ctx.createLinearGradient(
        width * Math.sin(time * 0.5),
        0,
        width * Math.cos(time * 0.5),
        height
      );
      gradient.addColorStop(0, `hsl(${280 + Math.sin(time) * 30}, 70%, 20%)`);
      gradient.addColorStop(0.5, `hsl(${320 + Math.cos(time * 0.7) * 40}, 60%, 15%)`);
      gradient.addColorStop(1, `hsl(${200 + Math.sin(time * 0.3) * 50}, 50%, 10%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw flowing particles
      for (let i = 0; i < 80; i++) {
        const x = ((i * 123.456 + time * 20) % width);
        const y = (Math.sin(time * 0.5 + i * 0.1) * 0.5 + 0.5) * height;
        const size = Math.sin(time + i) * 3 + 4;
        const hue = (time * 50 + i * 5) % 360;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        particleGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
        particleGradient.addColorStop(1, `hsla(${hue + 60}, 100%, 50%, 0)`);
        ctx.fillStyle = particleGradient;
        ctx.fill();
      }

      // Draw flowing waves
      ctx.strokeStyle = `hsla(${(time * 30) % 360}, 100%, 60%, 0.3)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < width; x += 5) {
        const y = height / 2 + Math.sin((x + time * 50) * 0.02) * 100;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawVideoEffect();

    return () => {
      if (videoAnimationRef.current) {
        cancelAnimationFrame(videoAnimationRef.current);
      }
    };
  }, []);

  // Audio visualization
  useEffect(() => {
    const initAudio = async () => {
      try {
        const audio = audioRef.current;
        const canvas = audioCanvasRef.current;
        
        if (!audio || !canvas) return;
        
        // Prevent duplicate initialization
        if (audioContextRef.current) return;

        audio.crossOrigin = "anonymous";
        audio.src = `${MEDIA_URL}/sample_audio.mp3`;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        
        const source = audioContext.createMediaElementSource(audio);
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
            
            const hue = (i / bufferLength) * 360;
            const barGradient = canvasCtx.createLinearGradient(0, height - barHeight, 0, height);
            barGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
            barGradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 60%, 0.7)`);
            barGradient.addColorStop(1, `hsla(${hue + 120}, 100%, 50%, 0.5)`);
            
            canvasCtx.fillStyle = barGradient;
            canvasCtx.shadowBlur = 20;
            canvasCtx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
            canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 2;
          }
          
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
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleInteraction = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(e => console.log('Audio play error:', e));
    }
  };

  return (
    <div className="landing-container" onClick={handleInteraction} data-testid="landing-container">
      <div className="split-screen" data-testid="split-screen">
        {/* Left Side - Video Visual */}
        <div className="video-section" data-testid="video-section">
          <canvas ref={videoCanvasRef} className="video-canvas" data-testid="video-canvas"></canvas>
          <div className="video-overlay" data-testid="video-overlay">
            <h1 className="video-title" data-testid="video-title">Visual Experience</h1>
          </div>
        </div>
        
        {/* Right Side - Audio Wave */}
        <div className="audio-section" data-testid="audio-section">
          <canvas ref={audioCanvasRef} className="audio-canvas" data-testid="audio-canvas"></canvas>
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