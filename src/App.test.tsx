/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import { render, screen } from '@testing-library/react';

import { Presale } from './components/presale';

test('renders presale WOLF', () => {
  render(<Presale />);
  const titleElement = screen.getByText('SEND');
  expect(titleElement).toBeInTheDocument();
});
