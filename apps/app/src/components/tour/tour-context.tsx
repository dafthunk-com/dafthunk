import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useProfile } from "@/services/profile-service";
import { updateProfile } from "@/services/profile-service";
import { useWorkflows } from "@/services/workflow-service";

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

export function TourProvider({ children }: TourProviderProps) {
  const { profile, mutateProfile } = useProfile();
  const { workflows, isWorkflowsLoading } = useWorkflows();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  const totalSteps = TOUR_STEPS.length;
  const currentStepData = TOUR_STEPS[currentStep] ?? null;

  // Auto-start tour for new users with no workflows
  useEffect(() => {
    if (
      !hasAutoStarted &&
      profile &&
      !profile.tourCompleted &&
      !isWorkflowsLoading &&
      workflows.length === 0
    ) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        setIsActive(true);
        setHasAutoStarted(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [profile, workflows, isWorkflowsLoading, hasAutoStarted]);

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
