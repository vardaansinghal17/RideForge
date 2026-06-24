interface PendingRequest {
  rideId: string;
  pickupLat: number;
  pickupLng: number;
  candidateQueue: string[];   // user IDs of drivers to try, in order
  currentIndex: number;
  timeoutHandle: NodeJS.Timeout | null;
  offeredTo: Set<string>;     // driver user IDs already offered this ride
}

class RideRequestTracker {
  private requests = new Map<string, PendingRequest>();

  add(rideId: string, data: Omit<PendingRequest, 'currentIndex' | 'timeoutHandle' | 'offeredTo'>) {
    this.requests.set(rideId, {
      ...data,
      currentIndex: 0,
      timeoutHandle: null,
      offeredTo: new Set(),
    });
  }

  get(rideId: string): PendingRequest | undefined {
    return this.requests.get(rideId);
  }

  setTimeoutHandle(rideId: string, handle: NodeJS.Timeout) {
    const req = this.requests.get(rideId);
    if (req) req.timeoutHandle = handle;
  }

  clearTimeout(rideId: string) {
    const req = this.requests.get(rideId);
    if (req?.timeoutHandle) {
      clearTimeout(req.timeoutHandle);
      req.timeoutHandle = null;
    }
  }

  // Move to next candidate driver in queue
  advance(rideId: string): string | null {
    const req = this.requests.get(rideId);
    if (!req) return null;

    req.currentIndex++;
    if (req.currentIndex >= req.candidateQueue.length) return null;

    return req.candidateQueue[req.currentIndex];
  }

  markOffered(rideId: string, driverUserId: string) {
    const req = this.requests.get(rideId);
    req?.offeredTo.add(driverUserId);
  }

  getCurrentDriverUserId(rideId: string): string | null {
    const req = this.requests.get(rideId);
    if (!req) return null;
    return req.candidateQueue[req.currentIndex] ?? null;
  }

  remove(rideId: string) {
    this.clearTimeout(rideId);
    this.requests.delete(rideId);
  }

  isTracked(rideId: string): boolean {
    return this.requests.has(rideId);
  }
}

export const rideRequestTracker = new RideRequestTracker();