import React, { useCallback, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Label } from "@/components/global/Label";
import {
  AlertTriangle,
  Eye,
  List,
  MessageSquare,
  Send,
  Star,
  Target,
  User,
  X,
} from "lucide-react";
import {
  errorReporting,
  type UserFeedback,
} from "@/lib/storagerange/errorReporting";

interface ErrorFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorId: string;
  errorMessage: string;
  className?: string;
}

export const ErrorFeedbackModal: React.FC<ErrorFeedbackModalProps> = ({
  isOpen,
  onClose,
  errorId,
  errorMessage,
  className = "",
}) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [description, setDescription] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState<string[]>([""]);
  const [contactInfo, setContactInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRatingChange = useCallback((newRating: 1 | 2 | 3 | 4 | 5) => {
    setRating(newRating);
  }, []);

  const addStep = useCallback(() => {
    setStepsToReproduce((prev) => [...prev, ""]);
  }, []);

  const removeStep = useCallback((index: number) => {
    setStepsToReproduce((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateStep = useCallback((index: number, value: string) => {
    setStepsToReproduce((prev) =>
      prev.map((step, i) => (i === index ? value : step)),
    );
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isSubmitting || submitted) return;

      setIsSubmitting(true);

      try {
        const feedback: UserFeedback = {
          timestamp: Date.now(),
          rating,
          description: description.trim(),
          expectedBehavior: expectedBehavior.trim(),
          actualBehavior: actualBehavior.trim(),
          stepsToReproduce: stepsToReproduce.filter((step) => step.trim()),
          contactInfo: contactInfo.trim() || undefined,
        };

        errorReporting.addUserFeedback(errorId, feedback);

        setSubmitted(true);

        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (error) {
        console.error("Failed to submit feedback:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      submitted,
      rating,
      description,
      expectedBehavior,
      actualBehavior,
      stepsToReproduce,
      contactInfo,
      errorId,
      onClose,
    ],
  );

  React.useEffect(() => {
    if (isOpen && !submitted) {
      setRating(3);
      setDescription("");
      setExpectedBehavior("");
      setActualBehavior("");
      setStepsToReproduce([""]);
      setContactInfo("");
      setIsSubmitting(false);
    }
  }, [isOpen, submitted]);

  React.useEffect(() => {
    if (!isOpen) {
      setSubmitted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card
        className={`
        bg-[rgba(25,28,40,0.95)] border-[rgba(0,191,255,0.3)] 
        w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4
        ${className}
      `}
      >
        <div className="flex items-center justify-between p-6 border-b border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-[#00bfff]" />
            <h2 className="text-lg font-semibold text-[#00bfff]">
              Error Feedback
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            aria-label="Close feedback modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-green-400 mb-2">
              Thank You!
            </h3>
            <p className="text-[#8b9dc3] mb-4">
              Your feedback has been submitted successfully. This will help us
              improve the application.
            </p>
            <p className="text-sm text-[#8b9dc3]">
              This modal will close automatically...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-400 mb-1">
                    Error Details
                  </h3>
                  <p className="text-sm text-[#8b9dc3] mb-2">
                    Error ID:{" "}
                    <code className="bg-[rgba(0,0,0,0.3)] px-1 rounded">
                      {errorId}
                    </code>
                  </p>
                  <p className="text-sm text-[#8b9dc3]">{errorMessage}</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-[#00bfff] mb-3 block">
                How would you rate this error experience?
              </Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      handleRatingChange(value as 1 | 2 | 3 | 4 | 5)
                    }
                    className={`
                      p-2 rounded-lg transition-colors
                      ${
                        rating >= value
                          ? "text-yellow-400 bg-yellow-400/20"
                          : "text-[#8b9dc3] hover:text-yellow-400 hover:bg-yellow-400/10"
                      }
                    `}
                    aria-label={`Rate ${value} out of 5 stars`}
                  >
                    <Star
                      className="h-6 w-6"
                      fill={rating >= value ? "currentColor" : "none"}
                    />
                  </button>
                ))}
                <span className="ml-3 text-sm text-[#8b9dc3]">
                  {rating === 1 && "Very Poor"}
                  {rating === 2 && "Poor"}
                  {rating === 3 && "Average"}
                  {rating === 4 && "Good"}
                  {rating === 5 && "Excellent"}
                </span>
              </div>
            </div>

            <div>
              <Label
                htmlFor="description"
                className="text-[#00bfff] mb-2 block"
              >
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Describe what happened
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue you encountered..."
                className="w-full h-24 p-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] rounded-lg text-[#8b9dc3] placeholder-[#8b9dc3]/50 resize-none focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expected" className="text-[#00bfff] mb-2 block">
                  <Target className="h-4 w-4 inline mr-2" />
                  What did you expect to happen?
                </Label>
                <textarea
                  id="expected"
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  placeholder="Describe the expected behavior..."
                  className="w-full h-20 p-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] rounded-lg text-[#8b9dc3] placeholder-[#8b9dc3]/50 resize-none focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:border-transparent"
                />
              </div>

              <div>
                <Label htmlFor="actual" className="text-[#00bfff] mb-2 block">
                  <Eye className="h-4 w-4 inline mr-2" />
                  What actually happened?
                </Label>
                <textarea
                  id="actual"
                  value={actualBehavior}
                  onChange={(e) => setActualBehavior(e.target.value)}
                  placeholder="Describe what actually occurred..."
                  className="w-full h-20 p-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] rounded-lg text-[#8b9dc3] placeholder-[#8b9dc3]/50 resize-none focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <Label className="text-[#00bfff] mb-2 block">
                <List className="h-4 w-4 inline mr-2" />
                Steps to reproduce (optional)
              </Label>
              <div className="space-y-2">
                {stepsToReproduce.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-[#8b9dc3] w-6">
                      {index + 1}.
                    </span>
                    <Input
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                      placeholder={`Step ${index + 1}`}
                      className="flex-1 bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                    />
                    {stepsToReproduce.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeStep(index)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                  className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                >
                  Add Step
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="contact" className="text-[#00bfff] mb-2 block">
                <User className="h-4 w-4 inline mr-2" />
                Contact information (optional)
              </Label>
              <Input
                id="contact"
                type="email"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="your.email@example.com"
                className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
              />
              <p className="text-xs text-[#8b9dc3] mt-1">
                We'll only use this to follow up on your feedback if needed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(0,191,255,0.2)]">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="bg-[#00bfff] text-white hover:bg-[#0099cc] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
