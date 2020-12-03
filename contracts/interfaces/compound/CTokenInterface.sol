/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * This file is derived from Compound, available under the BSD 3-Clause
 * license. https://compound.finance/
 *
 * SPDX-License-Identifier: Apache-2.0 AND BSD-3-Clause
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol';

interface CTokenInterface is IERC20 {
  function decimals() external view returns (uint8);

  function totalSupply() external view override returns (uint256);

  function underlying() external view returns (address);

  function balanceOfUnderlying(address owner) external returns (uint256);

  function supplyRatePerBlock() external returns (uint256);

  function exchangeRateCurrent() external returns (uint256);

  function mint(uint256 mintAmount) external returns (uint256);

  function balanceOf(address user) external view override returns (uint256);

  function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
}
