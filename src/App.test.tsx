/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import { render, screen } from '@testing-library/react';

import App from './App';

test('renders title', () => {
  render(<App />);
  const titleElement = screen.getByText('THE WOLVES & THE BOIS');
  expect(titleElement).toBeInTheDocument();
});
