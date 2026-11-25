import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('starts with an empty state and no accessibility violations', async () => {
    const { container } = render(<App />);
    expect(screen.getByText(/No results yet/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows results, a time-share headline and no violations after loading the sample', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Load sample data' }));
    expect(screen.getByText(/of total query time is spent in queries that look analytical/)).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(5);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows an alert for invalid input', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('textbox', { name: /pg_stat_statements export/ }), 'not json or csv');
    await user.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/CSV needs a header row/);
  });

  it('filters to offload candidates', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Load sample data' }));
    await user.selectOptions(screen.getByLabelText('Show'), 'offload');
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    rows.forEach((r) => expect(r).toHaveTextContent('Offload candidate'));
  });
});
