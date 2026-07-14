import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDriverRideStore } from '../stores/driverRideStore';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';

export default function RateRiderPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rideId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post(`/rides/${rideId}/rate`, {
        rating,
        comment: comment.trim() || undefined,
      });

      // Clear the active ride in store since it's fully complete & rated now
      useDriverRideStore.setState({ activeRide: null });

      // Navigate home
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Clear ride and head home
    useDriverRideStore.setState({ activeRide: null });
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-slate-50">
      {/* Background Visual Glows */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-[#FF5A1F]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <GlassCard className="w-full max-w-[420px] fade-up p-8 text-center bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-100 relative z-10" strong>
        <div className="mb-6">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800">Ride Completed!</h2>
          <p className="text-sm text-slate-500 mt-1.5">How was your trip with the passenger?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star selector */}
          <div className="flex items-center justify-center space-x-2.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-transform active:scale-95 text-3xl select-none"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
              >
                <span
                  className={
                    star <= (hoverRating ?? rating)
                      ? 'text-amber-400 fill-current animate-pulse'
                      : 'text-slate-200'
                  }
                >
                  ★
                </span>
              </button>
            ))}
          </div>

          {/* Feedback comment input */}
          <div className="text-left">
            <label htmlFor="comment" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Comment Feedback (Optional)
            </label>
            <textarea
              id="comment"
              rows={3}
              placeholder="Polite passenger, prompt arrival..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5A1F]/50 transition-colors resize-none placeholder-slate-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-left">
              <span className="text-xs text-red-600 font-medium leading-relaxed font-semibold">
                {error}
              </span>
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={handleSkip}
              disabled={isSubmitting}
              className="h-11 border border-slate-200 bg-white"
            >
              Skip
            </Button>
            <Button type="submit" variant="primary" fullWidth loading={isSubmitting} className="h-11 rounded-xl">
              Submit
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
