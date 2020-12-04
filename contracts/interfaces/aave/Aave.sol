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

pragma solidity ^0.7.4;

interface Aave {
  function borrow(
    address _reserve,
    uint256 _amount,
    uint256 _interestRateModel,
    uint16 _referralCode
  ) external;

  function setUserUseReserveAsCollateral(
    address _reserve,
    bool _useAsCollateral
  ) external;

  function repay(
    address _reserve,
    uint256 _amount,
    address payable _onBehalfOf
  ) external payable;

  function getUserAccountData(address _user)
    external
    view
    returns (
      uint256 totalLiquidityETH,
      uint256 totalCollateralETH,
      uint256 totalBorrowsETH,
      uint256 totalFeesETH,
      uint256 availableBorrowsETH,
      uint256 currentLiquidationThreshold,
      uint256 ltv,
      uint256 healthFactor
    );

  function getUserReserveData(address _reserve, address _user)
    external
    view
    returns (
      uint256 currentATokenBalance,
      uint256 currentBorrowBalance,
      uint256 principalBorrowBalance,
      uint256 borrowRateMode,
      uint256 borrowRate,
      uint256 liquidityRate,
      uint256 originationFee,
      uint256 variableBorrowIndex,
      uint256 lastUpdateTimestamp,
      bool usageAsCollateralEnabled
    );
}
