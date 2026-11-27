import { PortalPage } from '../../../shared/components/PortalPage';
import { LinkList } from '../../../shared/components/LinkList';
import { NAV_MENUS } from '../../../shared/lib/navMenus';

export default function Journals() {
  return (
    <PortalPage titleKey="journals">
      <LinkList links={NAV_MENUS.journals} />
    </PortalPage>
  );
}
