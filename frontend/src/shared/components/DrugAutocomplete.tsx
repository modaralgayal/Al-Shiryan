import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Drug } from '@aorta-iq/shared';

/** Typeahead bound to GET /api/drugs?q=. Doctor can only pick from the seeded list. */
export function DrugAutocomplete({
  onSelect,
  placeholder,
}: {
  onSelect: (d: Drug) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['drugs', q],
    enabled: q.trim().length > 0,
    queryFn: () => api.get<{ drugs: Drug[] }>(`/api/drugs?q=${encodeURIComponent(q)}`),
  });
  const drugs = data?.drugs ?? [];
  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder={placeholder ?? 'Search drug…'}
        className="w-full rounded border px-3 py-2"
        data-testid="drug-search"
      />
      {open && drugs.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded border bg-white shadow">
          {drugs.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                onClick={() => {
                  onSelect(d);
                  setQ(d.name);
                  setOpen(false);
                }}
              >
                {d.name} <span className="text-slate-500">({d.form} {d.strength})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
