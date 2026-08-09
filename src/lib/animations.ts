/**
 * Framer Motion Animation Utilities
 * Reusable animation variants untuk konsistensi across app
 */

import { Variants, Transition } from "framer-motion";

// ============================================
// TRANSITIONS
// ============================================

export const spring: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 35,
};

export const smoothSpring: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

export const snappySpring: Transition = {
  type: "spring",
  stiffness: 700,
  damping: 40,
  mass: 0.5,
};

export const easeOut: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.15,
};

export const easeInOut: Transition = {
  type: "tween",
  ease: [0.4, 0, 0.2, 1],
  duration: 0.2,
};

// ============================================
// ANIMATION VARIANTS
// ============================================

// Fade animations
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeOut },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: smoothSpring },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: smoothSpring },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// Slide animations
export const slideUp: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: snappySpring },
  exit: { y: "100%", transition: { ...easeInOut, duration: 0.3 } },
};

export const slideDown: Variants = {
  hidden: { y: "-100%" },
  visible: { y: 0, transition: snappySpring },
  exit: { y: "-100%", transition: easeInOut },
};

export const slideLeft: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: smoothSpring },
  exit: { x: "-100%", transition: easeInOut },
};

export const slideRight: Variants = {
  hidden: { x: "-100%" },
  visible: { x: 0, transition: smoothSpring },
  exit: { x: "100%", transition: easeInOut },
};

// Scale animations
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: smoothSpring },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export const scaleInCenter: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: snappySpring },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

// List animations dengan stagger
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.01,
      staggerDirection: -1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.1 },
  },
};

// Sheet/Modal animations
export const sheetOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const sheetContent: Variants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: {
      type: "spring",
      stiffness: 600,
      damping: 40,
      mass: 0.6,
    },
  },
  exit: {
    y: "100%",
    transition: {
      type: "tween",
      ease: [0.4, 0, 1, 1],
      duration: 0.2,
    },
  },
};

// Micro-interactions
export const hoverScale = {
  scale: 1.02,
  transition: { type: "spring", stiffness: 500, damping: 25 },
};

export const tapScale = {
  scale: 0.98,
  transition: { type: "spring", stiffness: 600, damping: 30 },
};

export const hoverLift = {
  y: -2,
  transition: smoothSpring,
};

// ============================================
// PRESET COMBINATIONS
// ============================================

// Modal/Dialog preset
export const modalPreset = {
  overlay: sheetOverlay,
  content: {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: snappySpring,
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      y: 10,
      transition: { duration: 0.2 },
    },
  },
} as const;

// Toast notification preset
export const toastPreset: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: snappySpring,
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: 0.2 },
  },
};

// Card hover preset
export const cardHoverPreset = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: smoothSpring,
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: { duration: 0.1 },
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get conditional animation - returns null if reduced motion
 */
export function getAnimation<T>(animation: T): T | undefined {
  return prefersReducedMotion() ? undefined : animation;
}

/**
 * Create stagger container dengan custom timing
 */
export function createStaggerContainer(
  staggerDelay: number = 0.05,
  delayChildren: number = 0.05
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };
}
