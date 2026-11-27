import type { NavLink } from '../lib/navMenus';

/** Plain list of external links (page fallback for the header dropdowns, e.g. on touch devices). */
export function LinkList({ links }: { links: NavLink[] }) {
  return (
    <ul className="max-w-md divide-y rounded-xl border bg-white">
      {links.map((l) => (
        <li key={l.href}>
          <a href={l.href} target="_blank" rel="noopener noreferrer" dir="ltr" className="block px-4 py-3 text-blue-700 hover:bg-slate-50">
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
