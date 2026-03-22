import { useEffect, useState } from 'react';

export default function SuccessAnimation({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100);
    const completeTimer = setTimeout(onComplete, 2500);
    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-12 animate-slide-up">
      <div className={`relative ${show ? 'scale-100 opacity-100' : 'scale-50 opacity-0'} transition-all duration-700`}>
        {/* Outer ring */}
        <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-gold/30 animate-ping" />
        
        {/* Inner circle */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-glow-lg">
          <svg 
            className={`w-16 h-16 text-night ${show ? 'animate-bounce' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={3} 
              d="M5 13l4 4L19 7"
              className={`${show ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 delay-500`}
            />
          </svg>
        </div>

        {/* Confetti particles */}
        {show && (
          <>
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#f59e0b', '#fbbf24', '#d97706', '#fef3c7'][i % 4],
                  left: '50%',
                  top: '50%',
                  animation: `confetti-${i} 1s ease-out forwards`,
                }}
              />
            ))}
          </>
        )}
      </div>

      <h2 className={`mt-8 text-2xl font-bold text-white ${show ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 delay-300`}>
        下载完成！
      </h2>
      <p className={`mt-2 text-gray-400 ${show ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 delay-500`}>
        正在准备您的文件...
      </p>

      <style>{`
        @keyframes confetti-0 { to { transform: translate(-60px, -80px) rotate(720deg); opacity: 0; } }
        @keyframes confetti-1 { to { transform: translate(60px, -80px) rotate(-720deg); opacity: 0; } }
        @keyframes confetti-2 { to { transform: translate(-80px, -40px) rotate(540deg); opacity: 0; } }
        @keyframes confetti-3 { to { transform: translate(80px, -40px) rotate(-540deg); opacity: 0; } }
        @keyframes confetti-4 { to { transform: translate(-60px, 80px) rotate(720deg); opacity: 0; } }
        @keyframes confetti-5 { to { transform: translate(60px, 80px) rotate(-720deg); opacity: 0; } }
        @keyframes confetti-6 { to { transform: translate(-40px, -90px) rotate(450deg); opacity: 0; } }
        @keyframes confetti-7 { to { transform: translate(40px, -90px) rotate(-450deg); opacity: 0; } }
        @keyframes confetti-8 { to { transform: translate(-90px, 0px) rotate(630deg); opacity: 0; } }
        @keyframes confetti-9 { to { transform: translate(90px, 0px) rotate(-630deg); opacity: 0; } }
        @keyframes confetti-10 { to { transform: translate(-50px, -70px) rotate(810deg); opacity: 0; } }
        @keyframes confetti-11 { to { transform: translate(50px, -70px) rotate(-810deg); opacity: 0; } }
      `}</style>
    </div>
  );
}
