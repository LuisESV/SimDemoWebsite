import { useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Home = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    let time = 0;

    // Create simulated frequency data
    const barCount = 128;
    const frequencyData = new Array(barCount).fill(0);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      time += 0.05;

      // Clear with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0a0a0a');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Update simulated frequency data with smooth animation
      for (let i = 0; i < barCount; i++) {
        const targetValue = 
          Math.sin(time * 0.5 + i * 0.1) * 0.3 +
          Math.sin(time * 0.8 + i * 0.05) * 0.3 +
          Math.sin(time * 1.2 + i * 0.02) * 0.2 +
          0.2;
        frequencyData[i] = Math.max(0, Math.min(1, targetValue));
      }

      // Draw audio bars
      const barWidth = (width / barCount) * 2.5;
      let x = 0;

      for (let i = 0; i < barCount; i++) {
        const barHeight = frequencyData[i] * height * 0.7;

        const hue = (i / barCount) * 360;
        const barGradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        barGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
        barGradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 60%, 0.7)`);
        barGradient.addColorStop(1, `hsla(${hue + 120}, 100%, 50%, 0.5)`);

        ctx.fillStyle = barGradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 2;
      }

      ctx.shadowBlur = 0;

      // Draw center circle pulse
      const avgFrequency = frequencyData.reduce((a, b) => a + b, 0) / barCount;
      const pulseRadius = avgFrequency * 120 + 40;

      const circleGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, pulseRadius
      );
      circleGradient.addColorStop(0, 'rgba(255, 100, 200, 0.3)');
      circleGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.2)');
      circleGradient.addColorStop(1, 'rgba(150, 100, 255, 0)');

      ctx.fillStyle = circleGradient;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, pulseRadius, 0, 2 * Math.PI);
      ctx.fill();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="landing-container" data-testid="landing-container">
      <div className="top-bottom-layout" data-testid="top-bottom-layout">
        {/* Top Section - YouTube Video */}
        <div className="video-section" data-testid="video-section">
          <iframe
            className="youtube-player"
            src="https://www.youtube.com/embed/r0JGfg7feU4?autoplay=1&mute=0&loop=1&playlist=r0JGfg7feU4&controls=1&modestbranding=1&rel=0"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            data-testid="youtube-player"
          ></iframe>
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