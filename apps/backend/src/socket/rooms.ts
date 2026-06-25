export const rooms = {
  driverPersonal: (driverUserId: string) => `driver:${driverUserId}`,
  ridePersonal:   (rideId: string)       => `ride:${rideId}`,
  riderPersonal:  (riderUserId: string)  => `rider:${riderUserId}`,
};