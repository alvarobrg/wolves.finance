/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * This file is derived from yearn.finance, available under the GNU Affero
 * General Public License 3.0. https://yearn.finance/
 *
 * SPDX-License-Identifier: Apache-2.0 AND AGPL-3.0-or-later
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol';

interface yVaultInterface is IERC20 {
  function token() external view returns (IERC20);

  function balance() external view returns (uint256);

  function deposit(uint256 _amount) external;

  function withdraw(uint256 _shares) external;

  function getPricePerFullShare() external view returns (uint256);
}
