import { PortalPage } from '../../../shared/components/PortalPage';
import { LinkList } from '../../../shared/components/LinkList';
import { NAV_MENUS } from '../../../shared/lib/navMenus';

export default function Authorities() {
  return (
    <PortalPage titleKey="authorities">
      <LinkList links={NAV_MENUS.authorities} />
    </PortalPage>
  );
}
