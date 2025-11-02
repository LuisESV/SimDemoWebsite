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
  const isSoundOnRef = useRef(false); // Ref for draw function to access current state
  const recordedFrequencyData = useRef([]); // Store real frequency snapshots for fake playback
  const recordingComplete = useRef(false); // Track if we've recorded enough data
  const [isSoundOn, setIsSoundOn] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const initAudioVisualization = async () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || !isMounted) return;
        
        // Prevent duplicate initialization
        if (audioContextRef.current) return;

        console.log('🎬 Initializing audio visualization from VIDEO element');

        // Wait for video to be ready
        const handleCanPlay = () => {
          if (!isMounted) return;

          console.log('🎬 Video ready for audio analysis');
          
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

          // Connect to VIDEO audio (not MP3) since video has been playing from start
          const source = audioContext.createMediaElementSource(video);
          source.connect(analyser);
          analyser.connect(audioContext.destination);

          analyserRef.current = analyser;
          console.log('🎵 Audio analyzer connected to VIDEO element');
          
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          const canvasCtx = canvas.getContext('2d');
          canvas.width = canvas.offsetWidth * window.devicePixelRatio;
          canvas.height = canvas.offsetHeight * window.devicePixelRatio;
          canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
          
          let frameCount = 0;
          const RECORDING_FRAMES = 1800; // Record ~30 seconds at 60fps

          const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            // Check if we can use real audio data or need to use fake data
            // Video is always playing, but we need audio context to be running
            const canUseRealAudio = audioContext.state === 'running';

            if (canUseRealAudio) {
              // Use REAL audio frequency data from video
              analyser.getByteFrequencyData(dataArray);

              // Record frequency data for future "fake" playback (first 30 seconds)
              if (!recordingComplete.current && frameCount < RECORDING_FRAMES) {
                // Store a copy of current frequency data
                recordedFrequencyData.current.push(new Uint8Array(dataArray));

                if (frameCount === RECORDING_FRAMES - 1) {
                  recordingComplete.current = true;
                  console.log(`📼 Recorded ${RECORDING_FRAMES} frames of real audio data for playback`);
                }
              }
            } else {
              // Use RECORDED real audio data if available, otherwise use synthetic
              if (recordedFrequencyData.current.length > 0) {
                // Loop through recorded real data
                const recordedIndex = frameCount % recordedFrequencyData.current.length;
                const recordedFrame = recordedFrequencyData.current[recordedIndex];

                // Copy recorded data to current dataArray
                for (let i = 0; i < bufferLength; i++) {
                  dataArray[i] = recordedFrame[i];
                }
              } else {
                // Fallback: Generate synthetic data (only used before any recording exists)
                const time = Date.now() / 1000;
                for (let i = 0; i < bufferLength; i++) {
                  const wave1 = Math.sin(time * 2 + i * 0.1) * 40;
                  const wave2 = Math.sin(time * 3.5 + i * 0.05) * 30;
                  const wave3 = Math.sin(time * 1.2 + i * 0.15) * 25;
                  const noise = Math.random() * 15;
                  dataArray[i] = Math.max(0, Math.min(255, 70 + wave1 + wave2 + wave3 + noise));
                }
              }
            }

            // Log every 60 frames (roughly once per second) for debugging
            if (frameCount % 60 === 0) {
              const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
              const max = Math.max(...dataArray);

              let dataSource = 'synthetic';
              if (canUseRealAudio) {
                dataSource = 'real-time';
              } else if (recordedFrequencyData.current.length > 0) {
                dataSource = 'recorded';
              }

              console.log(`Frame ${frameCount}:`, {
                avgFreq: avg.toFixed(2),
                maxFreq: max,
                soundOn: isSoundOnRef.current,
                dataSource,
                recordedFrames: recordedFrequencyData.current.length,
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
        
        video.addEventListener('canplay', handleCanPlay, { once: true });
        
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
      // Resume audio context if it's suspended (required for real audio visualization)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🎵 Audio context resumed - switching to real video audio data');
      }

      // Unmute video to hear the sound
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

  const handleExportRecordedData = () => {
    if (recordedFrequencyData.current.length === 0) {
      alert('No recorded data yet! Please click "Turn Sound On" and wait 30 seconds.');
      return;
    }

    // Convert Uint8Array frames to regular arrays for JSON serialization
    const exportData = recordedFrequencyData.current.map(frame => Array.from(frame));

    // Create downloadable JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recorded-frequency-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`📥 Downloaded ${recordedFrequencyData.current.length} frames of frequency data`);
    alert(`Downloaded ${recordedFrequencyData.current.length} frames! Save this file to frontend/src/data/`);
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

          {/* Temporary button for recording data - remove after recording */}
          {recordingComplete.current && (
            <button
              onClick={handleExportRecordedData}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: '12px 24px',
                background: '#00ff88',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                zIndex: 1000
              }}
            >
              📥 Download Recorded Data
            </button>
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