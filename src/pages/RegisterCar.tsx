import { useState } from 'react';

type DriverOption = { id: string; name: string };

const mockDrivers: DriverOption[] = [
  { id: 'd1', name: 'John Doe' },
  { id: 'd2', name: 'Jane Doe' },
];

const RegisterCar = () => {
  const [carName, setCarName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');

  const [assignDriver, setAssignDriver] = useState(false);
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');

  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const [newDriverFirstName, setNewDriverFirstName] = useState('');
  const [newDriverLastName, setNewDriverLastName] = useState('');

  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!carName.trim() || !plateNumber.trim()) {
      setError('Car name and plate number are required.');
      return;
    }

    let driver: any = null;
    if (assignDriver) {
      if (assignMode === 'existing') {
        if (!selectedDriver) {
          setError('Please select an existing driver.');
          return;
        }
        driver = { type: 'existing', driverId: selectedDriver };
      } else {
        if (!newDriverFirstName.trim() || !newDriverLastName.trim()) {
          setError('New driver first and last name are required.');
          return;
        }
        driver = { type: 'new', firstName: newDriverFirstName, lastName: newDriverLastName };
      }
    }

    const payload = { carName, plateNumber, driver };
    console.log('Create car payload:', payload);
    alert('Car created (mock). Check console for payload.');

    setCarName('');
    setPlateNumber('');
    setAssignDriver(false);
    setAssignMode('existing');
    setSelectedDriver(null);
    setNewDriverFirstName('');
    setNewDriverLastName('');
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Register Car</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-600">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700">Car Name</label>
          <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={carName} onChange={e => setCarName(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Plate Number</label>
          <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} required />
        </div>

        <div className="pt-2">
          <label className="inline-flex items-center">
            <input type="checkbox" checked={assignDriver} onChange={e => setAssignDriver(e.target.checked)} className="mr-2" />
            <span>Assign Driver (optional)</span>
          </label>
        </div>

        {assignDriver && (
          <div className="p-4 border rounded-md">
            <div className="space-x-4 mb-3">
              <label className="inline-flex items-center">
                <input type="radio" name="assignMode" value="existing" checked={assignMode === 'existing'} onChange={() => setAssignMode('existing')} className="mr-2" />
                <span>Assign to existing driver</span>
              </label>
              <label className="inline-flex items-center ml-4">
                <input type="radio" name="assignMode" value="new" checked={assignMode === 'new'} onChange={() => setAssignMode('new')} className="mr-2" />
                <span>Create new driver</span>
              </label>
            </div>

            {assignMode === 'existing' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Driver</label>
                <select value={selectedDriver ?? ''} onChange={e => setSelectedDriver(e.target.value || null)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  <option value="">-- Select driver --</option>
                  {mockDrivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Driver First Name</label>
                  <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={newDriverFirstName} onChange={e => setNewDriverFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Driver Last Name</label>
                  <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={newDriverLastName} onChange={e => setNewDriverLastName(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Create Car</button>
        </div>
      </form>
    </div>
  );
};

export default RegisterCar;
