import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../shared/lib/i18n';
import { LanguageToggle } from '../shared/components/LanguageToggle';

describe('LanguageToggle (i18n + RTL)', () => {
  it('switches English -> Arabic', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageToggle />
      </I18nextProvider>,
    );
    expect(i18n.language).toBe('en');
    fireEvent.click(screen.getByRole('button'));
    expect(i18n.language).toBe('ar');
    // Arabic layout direction flips to RTL.
    expect(i18n.dir()).toBe('rtl');
  });
});
