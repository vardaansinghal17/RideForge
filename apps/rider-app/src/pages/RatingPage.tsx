import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/axios';
import { useRideStore } from '../stores/rideStore';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';

const POSITIVE_TAGS = ['Clean car', 'Polite driver', 'Safe driving', 'Great route', 'Comfortable', 'Punctual'];
const NEGATIVE_TAGS = ['Dirty car', 'Rude behaviour', 'Dangerous driving', 'Bad route', 'Noisy', 'Delayed'];

export default function RatingPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { reset } = useRideStore();

  const stateRating = location.state?.rating as number | undefined;

  const [rating, setRating] = useState<number>(stateRating || 5);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const ratingMutation = useMutation({
    mutationFn: async () => {
      let finalComment = '';
      if (selectedTags.length > 0) {
        finalComment += selectedTags.join(', ');
      }
      if (commentText.trim()) {
        finalComment += finalComment ? ` · ${commentText.trim()}` : commentText.trim();
      }

      const res = await api.post('/ratings', {
        rideId,
        rating,
        comment: finalComment || null,
      });
      return res.data;
    },
    onSuccess: () => {
      setIsSubmitted(true);
      setTimeout(() => {
        reset();
        sessionStorage.removeItem('lastRideId');
        navigate('/');
      }, 1500);
    },
  });

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const currentTags = rating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS;

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    setSelectedTags([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rideId) return;
    ratingMutation.mutate();
  };

  const handleSkip = () => {
    reset();
    sessionStorage.removeItem('lastRideId');
    navigate('/');
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 1:
        return 'POOR';
      case 2:
        return 'FAIR';
      case 3:
        return 'GOOD';
      case 4:
        return 'VERY GOOD';
      case 5:
        return 'EXCELLENT';
      default:
        return 'GOOD';
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-[var(--rx-bg)] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden"
      style={{
        background: 'radial-gradient(circle at center, #FFFFFF 0%, #F1F5F9 100%)',
      }}
    >
      {/* Visual backgrounds glows */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[#FF5A1F]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {isSubmitted ? (
          // Success Screen
          <motion.div
            key="success"
            className="w-full max-w-[420px] text-center flex flex-col items-center justify-center p-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="w-16 h-16 rounded-full bg-[var(--rx-green-dim)] border border-[var(--rx-green)]/20 flex items-center justify-center mb-6 shadow-[0_0_24px_rgba(16,185,129,0.15)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="var(--rx-green)"
                className="w-8 h-8"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--rx-text)] mb-2">Feedback Submitted</h2>
            <p className="text-sm text-[var(--rx-text-3)] font-medium">Thank you for helping us improve!</p>
          </motion.div>
        ) : (
          // Form Screen
          <motion.div
            key="form"
            className="w-full max-w-[420px] fade-up"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-8 text-center flex flex-col gap-6" strong>
              {/* Header */}
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[var(--rx-text)]">
                  Rate your ride
                </h1>
                <p className="text-xs text-[var(--rx-text-3)] font-medium mt-1.5">
                  Your feedback helps maintain high standards.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-left">
                {/* Star Input */}
                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = hoveredStar !== null ? star <= hoveredStar : star <= rating;
                      return (
                        <motion.button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(null)}
                          onClick={() => handleRatingChange(star)}
                          className="p-1 focus:outline-none cursor-pointer"
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.12 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill={isFilled ? '#F59E0B' : 'none'}
                            stroke={isFilled ? '#F59E0B' : 'var(--rx-text-4)'}
                            strokeWidth={1.5}
                            className="w-10 h-10 transition-colors duration-150"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.48 3.499c.195-.39.771-.39.966 0l1.758 3.513a.925.925 0 00.7.502l3.87.564c.435.063.608.595.294.908l-2.8 2.73a.925.925 0 00-.265.815l.66 3.856c.074.433-.383.765-.769.56l-3.461-1.819a.925.925 0 00-.866 0l-3.462 1.82c-.386.204-.843-.128-.769-.56l.66-3.856a.925.925 0 00-.265-.815L2.83 9.486c-.313-.313-.14-.845.294-.908l3.87-.564a.925.925 0 00.7-.502l1.758-3.513z"
                            />
                          </svg>
                        </motion.button>
                      );
                    })}
                  </div>

                  <span className="text-[11px] font-extrabold text-[#E54E18] tracking-widest uppercase">
                    {getRatingLabel(rating)}
                  </span>
                </div>

                {/* Tags Section */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[var(--rx-text-3)] uppercase tracking-wider select-none">
                    Select tags
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {currentTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`text-xs font-semibold px-3.5 py-2 rounded-full cursor-pointer transition-all duration-150 select-none ${
                            isSelected
                              ? 'bg-[#FFF8F6] border border-[#FF5A1F] text-[#FF5A1F] shadow-sm'
                              : 'bg-black/5 hover:bg-black/10 text-[var(--rx-text-2)] border border-transparent'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment Textarea */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="comment"
                    className="text-[11px] font-bold text-[var(--rx-text-3)] uppercase tracking-wider select-none"
                  >
                    Add comment (optional)
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Tell us more about your experience..."
                    className="w-full bg-white/80 border border-black/5 rounded-xl px-4 py-3.5 text-[13px] text-[var(--rx-text)] placeholder-[var(--rx-text-3)] outline-none focus:border-black/20 focus:bg-white focus:shadow-sm resize-none transition-all duration-200"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3.5 mt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    loading={ratingMutation.isPending}
                  >
                    Submit feedback
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="text-[13px] text-[var(--rx-text-3)] hover:text-[var(--rx-text-2)] font-medium underline underline-offset-2 bg-transparent border-none cursor-pointer transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
