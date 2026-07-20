import { useState, useEffect } from 'react';
import { ChevronRight, X, CheckCircle } from 'lucide-react';

export function OnboardingFlow({ steps, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(
    () => JSON.parse(localStorage.getItem('onboarding-completed') || '[]')
  );
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    localStorage.setItem('onboarding-completed', JSON.stringify(completed));
  }, [completed]);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setCompleted(prev => [...new Set([...prev, ...steps.map(s => s.id)])]);
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    setIsVisible(false);
  };

  if (!isVisible || !step) return null;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-spotlight">
        {step.target && (
          <div
            className="onboarding-highlight"
            style={step.target}
          />
        )}
      </div>

      <div className="onboarding-panel" style={step.panelPosition}>
        <div className="onboarding-header">
          <h3>{step.title}</h3>
          <button
            className="onboarding-close"
            onClick={handleSkip}
            aria-label="Close onboarding"
          >
            <X size={20} />
          </button>
        </div>

        <p className="onboarding-description">{step.description}</p>

        {step.image && (
          <img src={step.image} alt={step.title} className="onboarding-image" />
        )}

        <div className="onboarding-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{currentStep + 1} of {steps.length}</span>
        </div>

        <div className="onboarding-actions">
          <button
            className="btn-secondary"
            onClick={handleSkip}
          >
            Skip tour
          </button>
          <button
            className="btn-primary"
            onClick={handleNext}
          >
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [completed, setCompleted] = useState(
    () => JSON.parse(localStorage.getItem('onboarding-completed') || '[]')
  );

  const isCompleted = (stepId) => completed.includes(stepId);
  const markCompleted = (stepId) => {
    const newCompleted = [...new Set([...completed, stepId])];
    setCompleted(newCompleted);
    localStorage.setItem('onboarding-completed', JSON.stringify(newCompleted));
  };

  return { completed, isCompleted, markCompleted };
}
