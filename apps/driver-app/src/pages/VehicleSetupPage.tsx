import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function VehicleSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<'SEDAN' | 'SUV' | 'AUTO'>('SEDAN');
  const [color, setColor] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch driver profile to see if vehicle is already set up
  const { data: driverProfile, isLoading } = useQuery({
    queryKey: ['driverProfile'],
    queryFn: async () => {
      const res = await api.get('/drivers/me');
      return res.data.data;
    },
  });

  const hasVehicle = !!driverProfile?.make;

  useEffect(() => {
    if (driverProfile) {
      setMake(driverProfile.make || '');
      setModel(driverProfile.model || '');
      setPlateNumber(driverProfile.plate_number || '');
      setVehicleType(driverProfile.vehicle_type || 'SEDAN');
      setColor(driverProfile.color || '');
      setYear(driverProfile.year || new Date().getFullYear());
    }
  }, [driverProfile]);

  const saveVehicleMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (hasVehicle) {
        return api.patch('/drivers/vehicle', payload);
      } else {
        return api.post('/drivers/vehicle', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverProfile'] });
      navigate('/profile');
    },
    onError: (err: any) => {
      setValidationError(err.response?.data?.message || 'Failed to save vehicle details');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!make.trim() || !model.trim() || !plateNumber.trim() || !color.trim()) {
      setValidationError('All fields are required');
      return;
    }

    // Clean plate number: remove spaces and hyphens
    const cleanPlate = plateNumber.replace(/[\s-]/g, '').toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(cleanPlate)) {
      setValidationError('Invalid plate number format (e.g. KA01AB1234)');
      return;
    }

    const numericYear = Number(year);
    const currentYear = new Date().getFullYear();
    if (isNaN(numericYear) || numericYear < 1990 || numericYear > currentYear + 1) {
      setValidationError(`Invalid manufacturing year (1990 - ${currentYear + 1})`);
      return;
    }

    saveVehicleMutation.mutate({
      make: make.trim(),
      model: model.trim(),
      plateNumber: cleanPlate,
      vehicleType,
      color: color.trim(),
      year: numericYear,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-[var(--rx-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6 animate-fade-in text-left">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">
          {hasVehicle ? 'Vehicle Configuration' : 'Register Vehicle'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {hasVehicle ? 'Modify your registered taxi credentials' : 'Register your car details to go online'}
        </p>
      </div>

      <GlassCard className="p-8">
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="make"
              type="text"
              label="Make (e.g. Maruti Suzuki)"
              placeholder="Suzuki"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              disabled={saveVehicleMutation.isPending}
            />

            <Input
              id="model"
              type="text"
              label="Model (e.g. Dzire)"
              placeholder="Dzire"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={saveVehicleMutation.isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="plateNumber"
              type="text"
              label="License Plate Number"
              placeholder="KA01AB1234"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              disabled={saveVehicleMutation.isPending}
            />

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as any)}
                disabled={saveVehicleMutation.isPending}
                className="w-full h-11 bg-white border border-slate-200 text-slate-800 rounded-xl px-4 text-sm focus:outline-none focus:border-[#FF5A1F]/50 transition-colors"
              >
                <option value="SEDAN">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="AUTO">Auto Rickshaw</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="color"
              type="text"
              label="Color"
              placeholder="White"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={saveVehicleMutation.isPending}
            />

            <Input
              id="year"
              type="number"
              label="Manufacturing Year"
              placeholder="2023"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={saveVehicleMutation.isPending}
            />
          </div>

          {validationError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <span className="text-xs text-red-600 font-medium leading-relaxed">
                {validationError}
              </span>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => navigate('/profile')}
              disabled={saveVehicleMutation.isPending}
              className="h-11 border border-slate-200 bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={saveVehicleMutation.isPending}
              className="h-11 rounded-xl"
            >
              Save Details
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
