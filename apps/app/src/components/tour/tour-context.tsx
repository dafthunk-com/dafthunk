import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { updateProfile, useProfile } from "@/services/profile-service";

import { TourSpotlight } from "./tour-spotlight";
import { TourStepPopover } from "./tour-step";
import type { TourStep } from "./tour-steps";
import { TOUR_STEPS } from "./tour-steps";

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TourStep | null;
  next: () => void;
  prev: () => void;
  skip: () => void;
  start: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}

interface TourProviderProps {
  children: ReactNode;
}

/**
 * The tour is opt-in, and deliberately.
 *
 * It used to auto-start for anyone with no workflows, which meant the first
 * thing a new account saw was five steps naming the sidebar: Organization,
 * Workflows, Resources, Settings, Documentation. That is a map handed to
 * someone with nowhere to go — nobody signs up to find Settings. Where the
 * chrome lives is worth learning once you have something to keep in it, so it
 * waits behind the "Take a Tour" button until then.
 */
export function TourProvider({ children }: TourProviderProps) {
  const { mutateProfile } = useProfile();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const totalSteps = TOUR_STEPS.length;
  const currentStepData = TOUR_STEPS[currentStep] ?? null;

  const completeTour = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(0);
    try {
      await updateProfile({ tourCompleted: true });
      mutateProfile();
    } catch (error) {
      console.error("Failed to mark tour as completed:", error);
    }
  }, [mutateProfile]);

  const next = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep, totalSteps, completeTour]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const value = useMemo(
    () => ({
      isActive,
      currentStep,
      totalSteps,
      currentStepData,
      next,
      prev,
      skip,
      start,
    }),
    [
      isActive,
      currentStep,
      totalSteps,
      currentStepData,
      next,
      prev,
      skip,
      start,
    ]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {isActive && currentStepData && (
        <TourSpotlight
          targetSelector={currentStepData.targetSelector}
          padding={currentStepData.spotlightPadding}
        >
          <TourStepPopover
            step={currentStepData}
            stepNumber={currentStep + 1}
            totalSteps={totalSteps}
            onNext={next}
            onPrev={prev}
            onSkip={skip}
            isFirst={currentStep === 0}
            isLast={currentStep === totalSteps - 1}
          />
        </TourSpotlight>
      )}
    </TourContext.Provider>
  );
}
