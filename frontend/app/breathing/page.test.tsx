import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { installRafMock } from '@/test/utils/raf';
import { breathingTechniques } from '@/data/breathing-techniques';
import Breathing from './page';

beforeEach(() => {
  installRafMock();
});

const card = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

describe('Breathing page', () => {
  it('shows one card per technique, each titled with a level-2 heading', () => {
    render(<Breathing />);
    for (const { name } of breathingTechniques) {
      expect(within(card(name)).getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
  });

  it('colors cards with theme tokens, not fixed hex backgrounds', () => {
    render(<Breathing />);
    for (const { name } of breathingTechniques) {
      expect(card(name).style.backgroundColor).toBe('');
    }
  });

  it('shows what each technique is for instead of its timings', () => {
    render(<Breathing />);
    for (const { name, purpose } of breathingTechniques) {
      expect(within(card(name)).getByText(purpose)).toBeInTheDocument();
    }
    expect(screen.queryByText(/\d+ · \d+/)).not.toBeInTheDocument();
  });

  it('keeps the references collapsed until asked for, to save space', async () => {
    render(<Breathing />);
    await userEvent.click(card('Respiração 4-7-8'));
    const toggle = screen.getByRole('button', { name: 'Referências (2)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(screen.getByRole('dialog')).queryByRole('link')).not.toBeInTheDocument();
  });

  it('lists the references as links that open in a new tab', async () => {
    render(<Breathing />);
    await userEvent.click(card('Respiração 4-7-8'));
    const dialog = screen.getByRole('dialog');
    const technique = breathingTechniques.find((t) => t.name === 'Respiração 4-7-8')!;
    await userEvent.click(within(dialog).getByRole('button', { name: /Referências/ }));
    for (const ref of technique.references) {
      const link = within(dialog).getByRole('link', { name: ref.citation });
      expect(link).toHaveAttribute('href', ref.url);
      expect(link).toHaveAttribute('target', '_blank');
    }
  });

  it('shows the safety note, with the breath-hold caution only for techniques that hold', async () => {
    render(<Breathing />);
    await userEvent.click(card('Respiração de Caixa'));
    expect(screen.getByText(/pare e volte a respirar normalmente/)).toBeInTheDocument();
    expect(screen.getByText(/antes de prender a respiração/)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(card('Respiração Sama Vritti Pranayama'));
    expect(screen.getByText(/pare e volte a respirar normalmente/)).toBeInTheDocument();
    expect(screen.queryByText(/antes de prender a respiração/)).not.toBeInTheDocument();
  });

  it('opens the technique details when a card is clicked', async () => {
    render(<Breathing />);
    await userEvent.click(card('Respiração 4-7-8'));
    expect(screen.getByRole('dialog', { name: 'Respiração 4-7-8' })).toBeInTheDocument();
  });

  it('treats the technique illustration as decorative', async () => {
    render(<Breathing />);
    await userEvent.click(card('Respiração 4-7-8'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('img')).not.toBeInTheDocument();
    expect(dialog.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('starts the exercise in a dialog named after the technique', async () => {
    render(<Breathing />);
    await userEvent.click(card('Respiração de Caixa'));
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar' }));
    expect(screen.getByRole('dialog', { name: 'Respiração de Caixa' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Prepare-se');
  });
});
