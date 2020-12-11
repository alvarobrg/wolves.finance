/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import '../../interfaces/dydx/dYdX.sol';

interface IERC20 {
  function totalSupply() external view returns (uint256);

  function balanceOf(address account) external view returns (uint256);

  function transfer(address recipient, uint256 amount) external returns (bool);

  function allowance(address owner, address spender)
    external
    view
    returns (uint256);

  function approve(address spender, uint256 amount) external returns (bool);

  function transferFrom(
    address sender,
    address recipient,
    uint256 amount
  ) external returns (bool);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

library SafeMath {
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a, 'SafeMath: Sub failed');
    uint256 c = a - b;
    return c;
  }

  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b > 0, 'SafeMath: div failed');
    uint256 c = a / b;
    return c;
  }

  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }

    uint256 c = a * b;
    require(c / a == b, 'SafeMath: multiplication overflow');

    return c;
  }
}

contract DyDxLender {
  using SafeMath for uint256;
  /*//mainnnet
  address constant dydx = 0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e;
  address constant usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
  address constant dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address constant sai = address(0);
  */
  // kovan
  address constant dydx = 0x4EC3570cADaAEE08Ae384779B0f3A45EF85289DE;
  address constant usdc = 0xe22da380ee6B445bb8273C81944ADEB6E8450422;
  address constant dai = 0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD;
  address constant sai = 0xC4375B7De8af5a38a93548eb8453a498222C4fF2;

  function getId() external pure returns (bytes32) {
    return keccak256(abi.encodePacked('DyDxLender'));
  }

  function approve(address token) external {
    IERC20(token).approve(dydx, uint256(-1));
  }

  function invest(address token, uint256 assetAmount)
    external
    returns (uint256)
  {
    uint256 dToken = _token2dToken(token);
    require(dToken != uint256(-1));

    // mint dToken
    Info[] memory infos = new Info[](1);
    infos[0] = Info(address(this), 0);

    AssetAmount memory amt =
      AssetAmount(
        true,
        AssetDenomination.Wei,
        AssetReference.Delta,
        assetAmount
      );
    ActionArgs memory act;
    act.actionType = ActionType.Deposit;
    act.accountId = 0;
    act.amount = amt;
    act.primaryMarketId = dToken;
    act.otherAddress = address(this);

    ActionArgs[] memory args = new ActionArgs[](1);
    args[0] = act;

    dYdX(dydx).operate(infos, args);
    return assetAmount;
  }

  function redeem(address token, uint256 poolAmount)
    external
    returns (uint256)
  {
    uint256 dToken = _token2dToken(token);
    require(dToken != uint256(-1));

    // redeem tokens to this contract
    Info[] memory infos = new Info[](1);
    infos[0] = Info(address(this), 0);

    AssetAmount memory amt =
      AssetAmount(
        false,
        AssetDenomination.Wei,
        AssetReference.Delta,
        poolAmount
      );
    ActionArgs memory act;
    act.actionType = ActionType.Withdraw;
    act.accountId = 0;
    act.amount = amt;
    act.primaryMarketId = dToken;
    act.otherAddress = address(this);

    ActionArgs[] memory args = new ActionArgs[](1);
    args[0] = act;

    dYdX(dydx).operate(infos, args);
    return poolAmount;
  }

  function balanceOf(address token, address _owner)
    external
    view
    returns (uint256)
  {
    Wei memory bal =
      dYdX(dydx).getAccountWei(Info(_owner, 0), _token2dToken(token));
    return bal.value;
  }

  // return the amount of the underlying asset
  function getAssetAmount(address token, address _owner)
    external
    view
    returns (uint256)
  {
    Wei memory bal =
      dYdX(dydx).getAccountWei(Info(_owner, 0), _token2dToken(token));
    return bal.value;
  }

  function getApr(address token) external view returns (uint256) {
    uint256 dToken = _token2dToken(token);
    uint256 rate = dYdX(dydx).getMarketInterestRate(dToken).value;
    uint256 aprBorrow = rate * 31622400;
    Set memory set = dYdX(dydx).getMarketTotalPar(dToken);
    uint256 usage = (set.borrow * 1e18) / set.supply;
    return
      (((aprBorrow * usage) / 1e18) * dYdX(dydx).getEarningsRate().value) /
      1e18;
  }

  function refresh(address token) external {}

  function _token2dToken(address asset) internal pure returns (uint256) {
    if (asset == sai) return 1;
    if (asset == usdc) return 2;
    if (asset == dai) return 3;
    return uint256(-1);
  }
}
