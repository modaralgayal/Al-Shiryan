import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface PatientOption {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
}

/** Typeahead bound to GET /api/patients?q= — doctor picks a patient by name or MRN. */
export function PatientAutocomplete({
  onSelect,
  placeholder,
}: {
  onSelect: (p: PatientOption) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['patients', 'search', q],
    enabled: q.trim().length > 0,
    queryFn: () => api.get<{ patients: PatientOption[] }>(`/api/patients?q=${encodeURIComponent(q)}`),
  });
  const patients = data?.patients ?? [];
  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder={placeholder ?? 'Search patient by name or ID…'}
        className="w-full rounded border px-3 py-2"
      />
      {open && patients.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow">
          {patients.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                onClick={() => {
                  onSelect(p);
                  setQ(p.name);
                  setOpen(false);
                }}
              >
                <span className="font-medium">{p.name}</span>{' '}
                <span className="text-slate-500">({p.patientId})</span>
                <span className="ml-2 text-xs text-slate-400">
                  {p.age} · {p.gender}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
