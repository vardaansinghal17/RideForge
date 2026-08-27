import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDriverRideStore } from '../stores/driverRideStore';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';

const RIDER_TAGS = [
  'Polite passenger',
  'Punctual at pickup',
  'Friendly & respectful',
  'Followed safety rules',
  'Quiet & pleasant',
  'Great communication',
];

export default function RateRiderPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rideId) return;

    setIsSubmitting(true);
    setError(null);

    let finalComment = selectedTags.join(', ');
    if (comment.trim()) {
      finalComment = finalComment ? `${finalComment} · ${comment.trim()}` : comment.trim();
    }

    try {
      await api.post(`/rides/${rideId}/rate`, {
        rating,
        comment: finalComment || undefined,
      });

      setIsDone(true);
      setTimeout(() => {
        useDriverRideStore.setState({ activeRide: null });
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit rating. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    useDriverRideStore.setState({ activeRide: null });
    navigate('/');
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 1: return 'POOR RIDER';
      case 2: return 'FAIR RIDER';
      case 3: return 'GOOD RIDER';
      case 4: return 'VERY GOOD RIDER';
      case 5: return 'EXCELLENT RIDER';
      default: return 'EXCELLENT RIDER';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-slate-900 text-white">
      {/* Background Visual Glows */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-[#FF5A1F]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {isDone ? (
        <div className="w-full max-w-[420px] p-8 text-center bg-slate-800/90 border border-slate-700/60 rounded-3xl shadow-2xl backdrop-blur-xl animate-fade-in space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white">Rating Submitted!</h2>
          <p className="text-xs text-slate-400 font-medium">Thank you for rating your rider and keeping RideForge safe.</p>
        </div>
      ) : (
        <GlassCard className="w-full max-w-[420px] p-8 text-center bg-slate-800/90 border border-slate-700/60 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
          <div>
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.195-.39.771-.39.966 0l1.758 3.513a.925.925 0 00.7.502l3.87.564c.435.063.608.595.294.908l-2.8 2.73a.925.925 0 00-.265.815l.66 3.856c.074.433-.383.765-.769.56l-3.461-1.819a.925.925 0 00-.866 0l-3.462 1.82c-.386.204-.843-.128-.769-.56l.66-3.856a.925.925 0 00-.265-.815L2.83 9.486c-.313-.313-.14-.845.294-.908l3.87-.564a.925.925 0 00.7-.502l1.758-3.513z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white">Rate the Rider</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">How was your passenger during the trip?</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star selector */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= (hoverRating ?? rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      className="p-1 focus:outline-none transition-transform hover:scale-115 active:scale-90"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={active ? '#F59E0B' : 'none'}
                        stroke={active ? '#F59E0B' : '#475569'}
                        strokeWidth={1.5}
                        className="w-10 h-10 transition-colors duration-150"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499c.195-.39.771-.39.966 0l1.758 3.513a.925.925 0 00.7.502l3.87.564c.435.063.608.595.294.908l-2.8 2.73a.925.925 0 00-.265.815l.66 3.856c.074.433-.383.765-.769.56l-3.461-1.819a.925.925 0 00-.866 0l-3.462 1.82c-.386.204-.843-.128-.769-.56l.66-3.856a.925.925 0 00-.265-.815L2.83 9.486c-.313-.313-.14-.845.294-.908l3.87-.564a.925.925 0 00.7-.502l1.758-3.513z"
                        />
                      </svg>
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-black text-amber-400 tracking-widest uppercase">
                {getRatingLabel(hoverRating ?? rating)}
              </span>
            </div>

            {/* Rider tags */}
            <div className="text-left space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Passenger Highlights
              </span>
              <div className="flex flex-wrap gap-2">
                {RIDER_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-150 border ${
                        isSelected
                          ? 'bg-[#FF5A1F]/20 border-[#FF5A1F] text-[#FF5A1F] shadow-sm'
                          : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment box */}
            <div className="text-left">
              <label htmlFor="comment" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Note for rider (optional)
              </label>
              <textarea
                id="comment"
                rows={2}
                placeholder="Polite, on time at pickup spot..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-900/60 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#FF5A1F] transition-colors resize-none placeholder-slate-500"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-left">
                <span className="text-xs text-red-400 font-semibold">{error}</span>
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={handleSkip}
                disabled={isSubmitting}
                className="h-11 border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Skip
              </Button>
              <Button type="submit" variant="primary" fullWidth loading={isSubmitting} className="h-11 rounded-xl">
                Submit Rating
              </Button>
            </div>
          </form>
        </GlassCard>
      )}
    </div>
  );
}

