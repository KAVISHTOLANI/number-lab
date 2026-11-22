import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { parse } from './lib/bases';

describe('Number Lab workflow', () => {
  it('keeps bits and bases in sync on Explore', async () => {
    window.location.hash = '/explore';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'All off' }));
    await user.click(screen.getByRole('button', { name: /Bit 3 \(value 8\)/ }));
    await user.click(screen.getByRole('button', { name: /Bit 1 \(value 2\)/ }));
    expect(screen.getByLabelText('decimal')).toHaveValue('10');
    expect(screen.getByLabelText('hexadecimal')).toHaveValue('A');
    fireEvent.change(screen.getByLabelText('binary'), { target: { value: '1021' } });
    expect(screen.getByText(/“2” isn’t a binary digit/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('hexadecimal'), { target: { value: '1FF' } });
    expect(screen.getByText(/needs more than 8 bits/)).toBeInTheDocument();
  });

  it('answers a practice question with hints and feedback', async () => {
    localStorage.setItem('number-lab:attempts', '[]');
    window.location.hash = '/practice';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Hint \(3 left\)/ }));
    expect(screen.getByText(/Divide by 2 repeatedly/)).toBeInTheDocument();
    const prompt = screen.getByTestId('prompt').textContent!;
    const value = parse(prompt, 10).value!;
    await user.type(screen.getByLabelText(/Your answer/), '2');
    expect(screen.getByText(/isn’t a binary digit/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Your answer/));
    await user.type(screen.getByLabelText(/Your answer/), value.toString(2));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('number-lab:attempts')!)[0]).toMatchObject({ correct: true, hintsUsed: 1 });
  });

  it('shows the mastery grid with demo data and an empty state', async () => {
    window.location.hash = '/progress';
    render(<App />);
    expect(screen.getAllByText('★ Mastered').length).toBeGreaterThan(0);
    window.confirm = () => true;
    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
    expect(screen.getByText('No practice yet')).toBeInTheDocument();
  });
});
