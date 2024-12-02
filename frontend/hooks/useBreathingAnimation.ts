import { useState, useEffect, useRef } from 'react';

interface UseBreathingAnimationProps {
  breathingTime: number[];
  isAnimating: boolean;
  countdownStart?: number;
}

interface BreathingAnimationState {
  guideMessage: string;
  circleScale: number;
  transitionDuration: number;
}

export const useBreathingAnimation = ({
  breathingTime,
  isAnimating,
  countdownStart = 4, // Default to 4 seconds
}: UseBreathingAnimationProps): BreathingAnimationState => {
  const phases = ['Breath In', 'Hold In', 'Breath Out', 'Hold Out'];
  const [guideMessage, setGuideMessage] = useState<string>('Ready...😃');
  const [circleScale, setCircleScale] = useState<number>(0.5);
  const [transitionDuration, setTransitionDuration] = useState<number>(0);
  const phaseIndexRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isAnimating) {
      return;
    }

    let phaseTimeout: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;
    let countdownSeconds = countdownStart;

    const startCountdown = () => {
      countdownInterval = setInterval(() => {
        countdownSeconds -= 1;
        if (countdownSeconds > 0) {
          setGuideMessage(`Ready...😃 ${countdownSeconds}`);
        } else {
          clearInterval(countdownInterval);
          startBreathing();
        }
      }, 1000);
    };

    const startBreathing = () => {
      const runPhase = () => {
        if (!isMountedRef.current) return;

        const currentPhase = phaseIndexRef.current % phases.length;
        setGuideMessage(phases[currentPhase]);
        setTransitionDuration(breathingTime[currentPhase]);
        setCircleScale(currentPhase < 2 ? 1 : 0.5);

        phaseTimeout = setTimeout(() => {
          phaseIndexRef.current += 1;
          runPhase();
        }, breathingTime[currentPhase] * 1000);
      };

      runPhase();
    };

    startCountdown();

    return () => {
      isMountedRef.current = false;
      clearTimeout(phaseTimeout);
      clearInterval(countdownInterval);
    };
  }, [breathingTime, isAnimating, countdownStart]);

  return {
    guideMessage,
    circleScale,
    transitionDuration,
  };
};
