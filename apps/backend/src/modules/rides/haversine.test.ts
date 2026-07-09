import { haversineDistance } from './haversine';

// Connaught Place, Delhi to India Gate, Delhi
// Real distance: ~2.3 km
const dist = haversineDistance(28.6315, 77.2167, 28.6129, 77.2295);
console.log(`CP to India Gate: ${dist} km`);  // should be ~2.3

// Mumbai to Delhi
// Real distance: ~1,150 km
const dist2 = haversineDistance(19.0760, 72.8777, 28.6139, 77.2090);
console.log(`Mumbai to Delhi: ${dist2} km`);  // should be ~1150

// Same point — should be 0
const dist3 = haversineDistance(28.6139, 77.2090, 28.6139, 77.2090);
console.log(`Same point: ${dist3} km`);  // should be 0