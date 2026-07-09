console.log("🚀 Test socket started");

import { io } from "socket.io-client";

// Replace these with fresh access tokens obtained from /api/auth/login
const RIDER_TOKEN ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYmFlNWFjOS1iYzAzLTRhOWUtYjMwZC04YTFjN2JjMGM1YzciLCJyb2xlIjoiUklERVIiLCJpYXQiOjE3ODM1ODM3MjgsImV4cCI6MTc4MzU4NDYyOH0.SYp9bCewOdKhtG1t0jNuFH0tp31FgrN1dnM-Pd56nHg";

const DRIVER_TOKEN ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NTI4Y2FhMC02MjQ3LTQxYjYtOWYzZC02Zjc4NmIwYjU3ZDMiLCJyb2xlIjoiRFJJVkVSIiwiaWF0IjoxNzgzNTgzNjA5LCJleHAiOjE3ODM1ODQ1MDl9.BZINsskzQPi8kKrcjwLbo-y3qFVvXpNnbVlFrV37h9c";

const rider = io("http://localhost:4000", {
  auth: {
    token: RIDER_TOKEN,
  },
  transports: ["websocket"],
});

const driver = io("http://localhost:4000", {
  auth: {
    token: DRIVER_TOKEN,
  },
  transports: ["websocket"],
});

/* ===========================
        DRIVER EVENTS
=========================== */

driver.on("connect", () => {
  console.log("✅ Driver connected");
});

driver.on("connect_error", (err) => {
  console.log("❌ Driver connection error:", err.message);
});

driver.on("disconnect", (reason) => {
  console.log("❌ Driver disconnected:", reason);
});

driver.on("ride:incoming", (ride: any) => {
  console.log("📢 Driver received ride offer");
  console.log(ride);

  setTimeout(() => {
    console.log("✅ Driver accepting ride...");
    driver.emit("ride:accept", {
      rideId: ride.id,
    });
  }, 1000);
});

driver.on("ride:already_taken", () => {
  console.log("❌ Ride already taken by another driver");
});

driver.on("error", (err) => {
  console.log("❌ Driver socket error:", err);
});

/* ===========================
        RIDER EVENTS
=========================== */

rider.on("connect", () => {
  console.log("✅ Rider connected");

  setTimeout(() => {
    console.log("🚖 Rider requesting ride...");

    rider.emit("ride:request", {
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      pickupAddress: "Connaught Place",

      dropLat: 28.6129,
      dropLng: 77.2295,
      dropAddress: "India Gate",

      distanceKm: 2.3,
      durationMin: 8,
    });
  }, 1000);
});

rider.on("connect_error", (err) => {
  console.log("❌ Rider connection error:", err.message);
});

rider.on("disconnect", (reason) => {
  console.log("❌ Rider disconnected:", reason);
});

rider.on("ride:created", (ride: any) => {
  console.log("🎉 Ride created");
  console.log(ride);
});

rider.on("ride:accepted", (payload: any) => {
  console.log("🎉 Ride accepted");
  console.log(payload);
});

rider.on("ride:no_driver", () => {
  console.log("❌ No nearby drivers");
});

rider.on("ride:status_update", (payload: any) => {
  console.log("📍 Ride status updated");
  console.log(payload);
});

rider.on("driver:moved", (payload: any) => {
  console.log("🚗 Driver moved");
  console.log(payload);
});

rider.on("ride:cancelled", () => {
  console.log("❌ Ride cancelled");
});

rider.on("error", (err) => {
  console.log("❌ Rider socket error:", err);
});

/* ===========================
      KEEP PROCESS ALIVE
=========================== */

setInterval(() => {}, 1000);