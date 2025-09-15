import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface AnimatedTransactionHashProps {
  className?: string;
  initialHash?: string;
  animationSpeed?: number;
}

// Generate a random hex character (0-9, a-f)
const getRandomHexChar = (): string => {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  return chars[Math.floor(Math.random() * chars.length)];
};

// Generate a random glitch character
const getGlitchChar = (): string => {
  const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  return chars[Math.floor(Math.random() * chars.length)];
};

// Key terms to display during lock-in phases
const KEY_TERMS = [
  "ANALYZING...",
  "SECURE",
  "ARGUSCHAIN",
  "PROCESSING...",
  "TRACING",
  "VERIFIED",
  "BLOCKCHAIN",
];

// Animation phases
type AnimationPhase =
  | "scrambling"
  | "locking"
  | "locked"
  | "dissolving"
  | "paused";

export const AnimatedTransactionHash: React.FC<
  AnimatedTransactionHashProps
> = ({ className, initialHash, animationSpeed = 150 }) => {
  const [displayText, setDisplayText] = useState(
    "0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385"
  );
  const [phase, setPhase] = useState<AnimationPhase>("paused");
  const [currentTerm, setCurrentTerm] = useState("");
  const [isGlowing, setIsGlowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [glitchPositions, setGlitchPositions] = useState<Set<number>>(
    new Set()
  );

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Clear all timers
  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
  };

  // Generate scrambled text with occasional glitch characters
  const generateScrambledText = (length: number = 66): string => {
    let text = "0x";
    const newGlitchPositions = new Set<number>();

    for (let i = 2; i < length; i++) {
      // 5% chance for glitch character during scrambling
      if (Math.random() < 0.05 && phase === "scrambling") {
        text += getGlitchChar();
        newGlitchPositions.add(i);
      } else {
        text += getRandomHexChar();
      }
    }

    setGlitchPositions(newGlitchPositions);
    return text;
  };

  // Animate text transformation to key term
  const animateToTerm = (term: string) => {
    const targetText = `0x${term.padEnd(64, getRandomHexChar())}`;
    let currentStep = 0;
    const totalSteps = 20;

    const transformInterval = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(transformInterval);
        return;
      }

      setDisplayText((prev) => {
        const chars = prev.split("");
        const termStart = 2; // After "0x"
        const termEnd = termStart + term.length;

        // Gradually reveal the term
        for (let i = termStart; i < termEnd; i++) {
          if (currentStep > (i - termStart) * 2) {
            chars[i] = term[i - termStart];
          }
        }

        // Continue scrambling the rest
        for (let i = termEnd; i < chars.length; i++) {
          if (Math.random() < 0.3) {
            chars[i] = getRandomHexChar();
          }
        }

        return chars.join("");
      });

      currentStep++;

      if (currentStep >= totalSteps) {
        clearInterval(transformInterval);
        setPhase("locked");
        setIsGlowing(true);

        // Hold the locked state
        phaseTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setPhase("dissolving");
            setIsGlowing(false);
          }
        }, 2000);
      }
    }, 50);
  };

  // Animate dissolution back to scramble
  const animateDissolve = () => {
    let currentStep = 0;
    const totalSteps = 15;

    const dissolveInterval = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(dissolveInterval);
        return;
      }

      setDisplayText((prev) => {
        const chars = prev.split("");

        // Gradually scramble from the term back to random
        for (let i = 2; i < chars.length; i++) {
          if (Math.random() < 0.4) {
            chars[i] = getRandomHexChar();
          }
        }

        return chars.join("");
      });

      currentStep++;

      if (currentStep >= totalSteps) {
        clearInterval(dissolveInterval);
        setPhase("paused");

        // Wait before next cycle
        phaseTimeoutRef.current = setTimeout(
          () => {
            if (mountedRef.current) {
              startNextCycle();
            }
          },
          3000 + Math.random() * 2000
        ); // 3-5 second pause
      }
    }, 100);
  };

  // Start the next animation cycle
  const startNextCycle = () => {
    const term = KEY_TERMS[Math.floor(Math.random() * KEY_TERMS.length)];
    setCurrentTerm(term);
    setPhase("scrambling");

    // Scramble for 2-4 seconds
    const scrambleDuration = 2000 + Math.random() * 2000;

    intervalRef.current = setInterval(
      () => {
        if (!mountedRef.current) return;
        setDisplayText(generateScrambledText());
      },
      isHovered ? animationSpeed / 2 : animationSpeed
    );

    phaseTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        clearInterval(intervalRef.current!);
        setPhase("locking");
        animateToTerm(term);
      }
    }, scrambleDuration);
  };

  // Handle mouse hover
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (phase === "scrambling" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        setDisplayText(generateScrambledText());
      }, animationSpeed / 2); // Double speed on hover
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (phase === "scrambling" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        setDisplayText(generateScrambledText());
      }, animationSpeed);
    }
  };

  // Initialize animation
  useEffect(() => {
    mountedRef.current = true;

    // Start first cycle after initial delay
    phaseTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        startNextCycle();
      }
    }, 1000);

    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, []);

  // Handle phase changes
  useEffect(() => {
    if (phase === "dissolving") {
      animateDissolve();
    }
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, []);

  return (
    <span
      className={cn(
        "font-mono text-accent-primary transition-all duration-300 cursor-pointer select-none",
        isGlowing && "drop-shadow-[0_0_8px_rgba(0,191,255,0.6)]",
        isHovered && "scale-105",
        className
      )}
      aria-label="Animated blockchain hash"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {displayText.split("").map((char, index) => (
        <span
          key={index}
          className={cn(
            "transition-colors duration-200",
            glitchPositions.has(index) && "text-red-400 animate-pulse"
          )}
        >
          {char}
        </span>
      ))}
    </span>
  );
};
