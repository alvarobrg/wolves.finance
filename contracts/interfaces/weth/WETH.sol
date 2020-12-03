/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * This file is derived from Canonical WETH, available under the GNU General Public
 * License 3.0. https://github.com/gnosis/canonical-weth
 *
 * SPDX-License-Identifier: Apache-2.0 AND GPL-3.0-or-later
 * See the file LICENSES/README.md for more information.
 */

pragma solidity ^0.7.4;

interface WETH {
  function deposit() external payable;

  function withdraw(uint256 wad) external;

  event Deposit(address indexed dst, uint256 wad);
  event Withdrawal(address indexed src, uint256 wad);
}
