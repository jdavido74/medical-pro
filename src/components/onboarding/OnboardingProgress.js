/**
 * OnboardingProgress - Progress indicator for onboarding wizard
 *
 * Shows the current step and completion status for all steps
 */

import React from 'react';
import { Check } from 'lucide-react';

const OnboardingProgress = ({ steps, currentStep, stepsStatus, t }) => {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isComplete = stepsStatus[step.id];
        const isCurrent = index === currentStep;
        const isPast = index < currentStep;

        return (
          <React.Fragment key={step.id}>
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm
                  transition-all duration-200
                  ${isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : isPast
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium
                  ${isCurrent ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-500'}
                `}
              >
                {t(step.titleKey)}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-4">
                <div
                  className={`
                    h-1 rounded-full transition-colors duration-200
                    ${isPast || isComplete ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default OnboardingProgress;
