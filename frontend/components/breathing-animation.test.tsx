import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from '@/test/utils/media';
import { installRafMock } from '@/test/utils/raf';
import BreathingAnimation from './breathing-animation';

let raf: ReturnType<typeof installRafMock>;

beforeEach(() => {
  raf = installRafMock();
});

function renderOverlay(onClose = vi.fn()) {
  render(
    <BreathingAnimation title="Respiração de Caixa" breathingTime={[1, 1, 1, 1]} onClose={onClose} />,
  );
  raf.frame(0);
  return onClose;
}

const shapeOpacity = () =>
  Number(document.querySelector<SVGPathElement>('svg[viewBox="0 0 400 400"] path')!.style.opacity);

describe('BreathingAnimation', () => {
  describe('with reduced motion', () => {
    beforeEach(() => {
      mockMatchMedia((q) => q === '(prefers-reduced-motion: reduce)');
    });

    it('stays dim during Espere, continuing from the end of Expire', () => {
      renderOverlay();
      raf.run(4000); // prep
      raf.run(3000); // Inspire, Segure, Expire
      raf.run(500); // halfway through Espere
      expect(shapeOpacity()).toBe(0.25);
    });

    it('stays bright during Segure, continuing from the end of Inspire', () => {
      renderOverlay();
      raf.run(4000);
      raf.run(1500);
      expect(shapeOpacity()).toBe(0.7);
    });
  });

  describe('as a dialog', () => {
    it('is a dialog named after the technique', () => {
      renderOverlay();
      expect(screen.getByRole('dialog', { name: 'Respiração de Caixa' })).toBeInTheDocument();
    });

    it('hides the page behind it from assistive technology', () => {
      render(<button>Página</button>);
      renderOverlay();
      expect(screen.queryByRole('button', { name: 'Página' })).not.toBeInTheDocument();
    });

    it('locks page scrolling while open', () => {
      renderOverlay();
      expect(document.body).toHaveAttribute('data-scroll-locked');
    });

    it('moves focus inside the overlay when it opens', () => {
      renderOverlay();
      expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    });

    it('closes on Escape', async () => {
      const onClose = renderOverlay();
      await userEvent.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes from the close button', async () => {
      const onClose = renderOverlay();
      await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the screen awake while open', () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn() });
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    renderOverlay();
    expect(request).toHaveBeenCalledWith('screen');
    Reflect.deleteProperty(navigator, 'wakeLock');
  });
});
