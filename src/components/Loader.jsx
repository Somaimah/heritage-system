import React from "react";

const Loader = ({ size = "md", inline = false }) => {
  // Dot dimension metrics
  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-4 h-4",
  };

  const containerStyle = inline
    ? "flex items-center justify-center gap-1"
    : "min-h-screen bg-[#FEF9C3] flex flex-col items-center justify-center gap-5 font-sans antialiased";

  // Safe CSS injection string to prevent bundler parsing deadlocks
  const waveAnimationCSS = `
    @keyframes aestheticWave {
      0%, 100% { transform: translateY(0); opacity: 0.4; }
      50% { transform: translateY(-8px); opacity: 1; background-color: #E09F26; }
    }
  `;

  return (
    <div className={containerStyle}>
      {/* Embedded Style Tag to supply the smooth organic motion curve */}
      <style dangerouslySetInnerHTML={{ __html: waveAnimationCSS }} />

      <div className="flex items-center gap-1.5 h-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`${dotSizes[size]} bg-[#4A0C16] rounded-full opacity-80`}
            style={{
              animation: "aestheticWave 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      
      {!inline && (
        <span className="text-[10px] font-bold tracking-[0.2em] text-[#4A0C16] uppercase animate-pulse opacity-90 mt-1">
          Securing Archival Ledger
        </span>
      )}
    </div>
  );
};

export default Loader;