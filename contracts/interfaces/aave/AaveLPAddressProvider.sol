/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * This file is derived from Aave, available under the GNU Affero General
 * Public License 3.0. https://aave.com/
 *
 * SPDX-License-Identifier: Apache-2.0 AND AGPL-3.0-or-later
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

interface AaveLPAddressProvider {
  function getLendingPool() external view returns (address);

  function getLendingPoolCore() external view returns (address);
}
