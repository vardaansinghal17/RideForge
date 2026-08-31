import { haversineDistance } from './haversine';

const dist = haversineDistance(28.6315, 77.2167, 28.6129, 77.2295);
console.log(`CP to India Gate: ${dist} km`);

const dist2 = haversineDistance(19.0760, 72.8777, 28.6139, 77.2090);
console.log(`Mumbai to Delhi: ${dist2} km`);

const dist3 = haversineDistance(28.6139, 77.2090, 28.6139, 77.2090);
console.log(`Same point: ${dist3} km`);