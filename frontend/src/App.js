import { useEffect, useRef, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const MEDIA_URL = `${BACKEND_URL}/media`;

const Home = () => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const isSoundOnRef = useRef(false); // Ref for draw function to access current state
  const [isSoundOn, setIsSoundOn] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const initAudioVisualization = async () => {
      try {
        const audio = audioRef.current;
        const canvas = canvasRef.current;
        
        if (!audio || !canvas || !isMounted) return;
        
        // Prevent duplicate initialization
        if (audioContextRef.current) return;

        // Set up audio source - MUTED initially but playing
        const API = `${BACKEND_URL}/api`;
        audio.src = `${API}/audio`;
        audio.loop = true;
        audio.muted = true; // Muted but still playing for visualization
        audio.volume = 1.0;

        // Wait for audio to be ready
        const handleCanPlay = () => {
          if (!isMounted) return;

          console.log('Audio can play - attempting to start...');

          // Start playing immediately (muted) - try autoplay
          audio.play()
            .then(() => {
              console.log('✅ Audio playing (muted) for visualization');
            })
            .catch(e => {
              console.log('⚠️ Autoplay prevented, will play on first interaction', e);
              // If autoplay fails, play on first user interaction
              const playOnInteraction = () => {
                audio.play().then(() => {
                  console.log('✅ Audio started after user interaction');
                });
                document.removeEventListener('click', playOnInteraction);
              };
              document.addEventListener('click', playOnInteraction);
            });
          
          // Create audio context and analyzer
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          audioContextRef.current = audioContext;
          console.log('🎵 Audio context created, state:', audioContext.state);

          // Resume audio context if suspended
          if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
              console.log('🎵 Audio context resumed');
            });
          }

          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 512;

          const source = audioContext.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(audioContext.destination);

          analyserRef.current = analyser;
          console.log('🎵 Audio analyzer connected and ready');
          
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          const canvasCtx = canvas.getContext('2d');
          canvas.width = canvas.offsetWidth * window.devicePixelRatio;
          canvas.height = canvas.offsetHeight * window.devicePixelRatio;
          canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
          
          let frameCount = 0;
          const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            // Check if we can use real audio data or need to use fake data
            const canUseRealAudio = audioContext.state === 'running' && !audio.paused;

            if (canUseRealAudio) {
              // Use REAL audio frequency data
              analyser.getByteFrequencyData(dataArray);
            } else {
              // Generate FAKE/simulated audio data for smooth animation
              // Use sine waves with some randomness for natural-looking movement
              const time = Date.now() / 1000; // time in seconds
              for (let i = 0; i < bufferLength; i++) {
                // Combine multiple sine waves for more natural variation
                const wave1 = Math.sin(time * 2 + i * 0.1) * 40;
                const wave2 = Math.sin(time * 3.5 + i * 0.05) * 30;
                const wave3 = Math.sin(time * 1.2 + i * 0.15) * 25;
                const noise = Math.random() * 15;

                // Base level + waves + noise (range: ~50-140)
                dataArray[i] = Math.max(0, Math.min(255, 70 + wave1 + wave2 + wave3 + noise));
              }
            }

            // Log every 60 frames (roughly once per second) for debugging
            if (frameCount % 60 === 0) {
              const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
              const max = Math.max(...dataArray);
              console.log(`Frame ${frameCount}:`, {
                avgFreq: avg.toFixed(2),
                maxFreq: max,
                soundOn: isSoundOnRef.current,
                usingRealAudio: canUseRealAudio,
                contextState: audioContext.state
              });
            }
            frameCount++;
            
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;
            
            // Clear with gradient background
            const gradient = canvasCtx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#0a0a0a');
            gradient.addColorStop(1, '#1a1a2e');
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(0, 0, width, height);
            
            // Scale factor: smaller when muted, larger when sound is on
            // Use ref instead of state to avoid closure issues
            const scaleFactor = isSoundOnRef.current ? 0.7 : 0.3;
            
            // Draw audio waves
            const barWidth = (width / bufferLength) * 2.5;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
              const barHeight = (dataArray[i] / 255) * (height * scaleFactor);
              
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
            const pulseRadius = (avgFrequency / 255) * 120 * scaleFactor + 40;
            
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
        };
        
        audio.addEventListener('canplay', handleCanPlay, { once: true });
        
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };

    initAudioVisualization();

    return () => {
      isMounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleTurnSoundOn = async () => {
    try {
      // NOTE: audioRef (MP3) stays muted - it's only used for visualization
      // We only unmute the video to hear the actual sound

      // Resume audio context if it's suspended (required for waves to work)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🎵 Audio context resumed on user interaction');
      }

      // Start MP3 audio if not already playing (muted, for visualization only)
      if (audioRef.current) {
        console.log('🎵 MP3 audio state:', {
          paused: audioRef.current.paused,
          muted: audioRef.current.muted,
          currentTime: audioRef.current.currentTime,
          duration: audioRef.current.duration,
          src: audioRef.current.src
        });

        if (audioRef.current.paused) {
          await audioRef.current.play();
          console.log('🎵 MP3 audio started (muted) for visualization');
        } else {
          console.log('🎵 MP3 audio already playing');
        }
      }

      // Unmute and play video (this is the only audible sound)
      if (videoRef.current) {
        videoRef.current.muted = false;
        await videoRef.current.play();
        console.log('🔊 Video audio unmuted');
      }

      // Update both state (for UI) and ref (for draw function to grow waves)
      isSoundOnRef.current = true;
      setIsSoundOn(true);
    } catch (error) {
      console.error('Error turning sound on:', error);
    }
  };

  return (
    <div className="landing-container" data-testid="landing-container">
      <div className="top-bottom-layout" data-testid="top-bottom-layout">
        {/* Top Section - Video */}
        <div className="video-section" data-testid="video-section">
          <video
            ref={videoRef}
            className="video-player"
            src={`${BACKEND_URL}/api/video`}
            autoPlay
            loop
            muted
            playsInline
            data-testid="video-player"
          >
            Your browser does not support the video tag.
          </video>
          
          {/* Turn Sound On Button */}
          {!isSoundOn && (
            <button 
              className="sound-button" 
              onClick={handleTurnSoundOn}
              data-testid="sound-button"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
              Turn Sound On
            </button>
          )}
        </div>
        
        {/* Bottom Section - Audio Waves */}
        <div className="audio-section" data-testid="audio-section">
          <canvas ref={canvasRef} className="audio-canvas" data-testid="audio-canvas"></canvas>
          <div className="audio-overlay" data-testid="audio-overlay">
            <h1 className="audio-title" data-testid="audio-title">Sound Waves</h1>
          </div>
          <audio ref={audioRef} data-testid="audio-element"></audio>
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