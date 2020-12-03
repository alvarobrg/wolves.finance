/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * This file is derived from Uniswap, available under the GNU General Public
 * License 3.0. https://uniswap.org/
 *
 * SPDX-License-Identifier: Apache-2.0 AND GPL-3.0-or-later
 * See the file LICENSES/README.md for more information.
 */

pragma solidity ^0.7.4;

interface Uni {
  function swapExactTokensForTokens(
    uint256,
    uint256,
    address[] calldata,
    address,
    uint256
  ) external;
}
