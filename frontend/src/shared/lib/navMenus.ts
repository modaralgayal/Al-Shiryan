/** External-link menus shown as dropdowns in the header (and as lists on their pages). */
export interface NavLink {
  label: string;
  href: string;
}

const site = (domain: string): NavLink => ({ label: domain, href: `https://${domain.toLowerCase()}` });

export const NAV_MENUS: Record<'journals' | 'authorities', NavLink[]> = {
  journals: [
    'Nejm.org',
    'academic.oup.com',
    'Science.org',
    'Bmj.com',
    'Nature.com',
    'Tandfonline.com',
    'Sciencedirect.com',
  ].map(site),
  authorities: [
    'Moh.gov.iq',
    'Iqnsg.com',
    'Mohesr.gov.iq',
    'Ima.org.iq',
    'Daman.moh.gov.iq',
    'Iraqipharm.com',
    'Iraqiboard.edu.iq',
  ].map(site),
};
