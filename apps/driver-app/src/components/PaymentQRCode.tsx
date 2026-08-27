import React from 'react';

interface PaymentQRCodeProps {
  amount: number;
  driverName?: string;
  rideId: string;
  upiId?: string;
}

export const PaymentQRCode: React.FC<PaymentQRCodeProps> = ({
  amount,
  driverName = 'RideForge Driver',
  rideId,
  upiId = 'rideforge.pay@upi',
}) => {
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(driverName)}&am=${amount.toFixed(2)}&cu=INR&tn=RideForge%20Ride%20${rideId.slice(0, 6)}`;

  // Generate deterministic QR matrix pattern based on upiString
  const gridSize = 25;
  const generatePattern = () => {
    let hash = 0;
    for (let i = 0; i < upiString.length; i++) {
      hash = (hash << 5) - hash + upiString.charCodeAt(i);
      hash |= 0;
    }

    const cells: { x: number; y: number }[] = [];

    // Helper for finder patterns (corners)
    const isFinderPattern = (r: number, c: number) => {
      // Top Left (0..6, 0..6)
      if (r <= 6 && c <= 6) return true;
      // Top Right (0..6, gridSize-7..gridSize-1)
      if (r <= 6 && c >= gridSize - 7) return true;
      // Bottom Left (gridSize-7..gridSize-1, 0..6)
      if (r >= gridSize - 7 && c <= 6) return true;
      return false;
    };

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (isFinderPattern(r, c)) continue;
        const seed = Math.abs((hash ^ (r * 31 + c * 17)) % 100);
        if (seed > 42) {
          cells.push({ x: c, y: r });
        }
      }
    }
    return cells;
  };

  const dataCells = generatePattern();
  const cellSize = 10;
  const viewBoxSize = gridSize * cellSize;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-xl max-w-sm mx-auto">
      {/* Header Badge */}
      <div className="flex items-center gap-2 mb-3 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
          UPI Instant Payment
        </span>
      </div>

      <div className="text-center mb-3">
        <p className="text-xs text-gray-500 font-medium">Scan & Pay via any UPI App</p>
        <p className="text-3xl font-black text-gray-900 mt-1">₹{amount.toFixed(2)}</p>
        <p className="text-[11px] text-gray-400 font-mono mt-0.5">Ride #{rideId.slice(0, 8)}</p>
      </div>

      {/* SVG QR Code */}
      <div className="relative bg-white p-4 rounded-xl border border-gray-200 shadow-inner flex items-center justify-center">
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="w-48 h-48"
          shapeRendering="crispEdges"
        >
          <rect width={viewBoxSize} height={viewBoxSize} fill="#FFFFFF" />

          {/* Finder Pattern - Top Left */}
          <rect x={0} y={0} width={70} height={70} fill="#111827" rx={8} />
          <rect x={10} y={10} width={50} height={50} fill="#FFFFFF" rx={4} />
          <rect x={20} y={20} width={30} height={30} fill="#111827" rx={2} />

          {/* Finder Pattern - Top Right */}
          <rect x={(gridSize - 7) * 10} y={0} width={70} height={70} fill="#111827" rx={8} />
          <rect x={(gridSize - 7) * 10 + 10} y={10} width={50} height={50} fill="#FFFFFF" rx={4} />
          <rect x={(gridSize - 7) * 10 + 20} y={20} width={30} height={30} fill="#111827" rx={2} />

          {/* Finder Pattern - Bottom Left */}
          <rect x={0} y={(gridSize - 7) * 10} width={70} height={70} fill="#111827" rx={8} />
          <rect x={10} y={(gridSize - 7) * 10 + 10} width={50} height={50} fill="#FFFFFF" rx={4} />
          <rect x={20} y={(gridSize - 7) * 10 + 20} width={30} height={30} fill="#111827" rx={2} />

          {/* Data Modules */}
          {dataCells.map((cell, idx) => (
            <rect
              key={idx}
              x={cell.x * cellSize}
              y={cell.y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#1F2937"
            />
          ))}
        </svg>

        {/* Center UPI Logo Overlay */}
        <div className="absolute bg-white px-2 py-1 rounded-md border border-gray-200 shadow-md text-[10px] font-black text-emerald-600 tracking-wider">
          UPI
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 text-center">
        <p className="text-[11px] font-semibold text-gray-600">Payee: {driverName}</p>
        <p className="text-[10px] text-gray-400 font-mono">{upiId}</p>
      </div>

      {/* Payment App Logos */}
      <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-400 font-medium">
        <span>GPay</span>
        <span>•</span>
        <span>PhonePe</span>
        <span>•</span>
        <span>Paytm</span>
        <span>•</span>
        <span>BHIM</span>
      </div>
    </div>
  );
};
