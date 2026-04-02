import { useState, useEffect } from 'react';

interface AnimatedNumberProps {
  target: number;
  suffix?: string;
  duration?: number;
  useChineseUnit?: boolean;
}

export default function AnimatedNumber({ target, suffix = '', duration = 2000, useChineseUnit = false }: AnimatedNumberProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const value = Math.floor(easeProgress * target);
      
      setCurrent(value);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [target, duration]);

  const formatChinese = (num: number): string => {
    if (num >= 10000) {
      return (num / 10000).toFixed(0) + '万';
    }
    return num.toLocaleString();
  };

  const displayValue = useChineseUnit ? formatChinese(current) : current.toLocaleString();

  return <>{displayValue}{suffix}</>;
}
