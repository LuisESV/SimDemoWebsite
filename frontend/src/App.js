import { useEffect, useRef, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const MEDIA_URL = `${BACKEND_URL}/media`;

const Home = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const initAudioVisualization = async () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (!video || !canvas) return;
        
        // Prevent duplicate initialization
        if (audioContextRef.current) return;

        // Wait for video to load
        video.addEventListener('loadedmetadata', () => {
          console.log('Video loaded');
        });

        video.addEventListener('canplay', () => {
          // Create audio context and analyzer
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          audioContextRef.current = audioContext;
          
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 512;
          
          const source = audioContext.createMediaElementSource(video);
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
              const barHeight = (dataArray[i] / 255) * (height * 0.7);
              
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
            const pulseRadius = (avgFrequency / 255) * 120 + 40;
            
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
          
          draw();
        }, { once: true });
        
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };

    initAudioVisualization();

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
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => console.log('Video play error:', e));
    }
  };

  return (
    <div className="landing-container" onClick={handleInteraction} data-testid="landing-container">
      <div className="top-bottom-layout" data-testid="top-bottom-layout">
        {/* Top Section - Video */}
        <div className="video-section" data-testid="video-section">
          <video
            ref={videoRef}
            className="video-player"
            src={`${MEDIA_URL}/user_video.mov`}
            loop
            muted={false}
            playsInline
            data-testid="video-player"
          >
            Your browser does not support the video tag.
          </video>
          {!isPlaying && (
            <div className="play-overlay" data-testid="play-overlay">
              <div className="play-button" data-testid="play-button">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="38" stroke="white" strokeWidth="3" opacity="0.8"/>
                  <path d="M32 25L55 40L32 55V25Z" fill="white" opacity="0.9"/>
                </svg>
                <p>Click to Play</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom Section - Audio Waves */}
        <div className="audio-section" data-testid="audio-section">
          <canvas ref={canvasRef} className="audio-canvas" data-testid="audio-canvas"></canvas>
          <div className="audio-overlay" data-testid="audio-overlay">
            <h1 className="audio-title" data-testid="audio-title">Sound Waves</h1>
          </div>
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