import { useBreathingAnimation } from '../hooks/useBreathingAnimation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BreathingAnimationProps {
  onClose: () => void;
  breathingTime: number[];
}

const BreathingAnimation: React.FC<BreathingAnimationProps> = ({ onClose, breathingTime }) => {
  const { guideMessage, circleScale, transitionDuration } = useBreathingAnimation({
    breathingTime,
    isAnimating: true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <div className="relative flex flex-col items-center">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 cursor-pointer text-white focus:outline-none"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="size-6" aria-hidden="true" />
        </Button>
        <h2 className="mb-6 text-2xl font-bold text-white" aria-live="assertive" aria-atomic="true">
          {guideMessage}
        </h2>
        <div className="size-64 content-center justify-items-center rounded-full bg-white/10">
          <div
            className="bg-blue-medium size-64 rounded-full"
            style={{
              transform: `scale(${circleScale})`,
              transition: `transform ${transitionDuration}s ease-in-out`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default BreathingAnimation;
