/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity 0.6.5;

library SafeMath {
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, 'SafeMath: addition overflow');

    return c;
  }

  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    return sub(a, b, 'SafeMath: subtraction overflow');
  }

  function sub(
    uint256 a,
    uint256 b,
    string memory errorMessage
  ) internal pure returns (uint256) {
    require(b <= a, errorMessage);
    uint256 c = a - b;

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

  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    return div(a, b, 'SafeMath: division by zero');
  }

  function div(
    uint256 a,
    uint256 b,
    string memory errorMessage
  ) internal pure returns (uint256) {
    // Solidity only automatically asserts when dividing by 0
    require(b > 0, errorMessage);
    uint256 c = a / b;

    return c;
  }

  function mod(uint256 a, uint256 b) internal pure returns (uint256) {
    return mod(a, b, 'SafeMath: modulo by zero');
  }

  function mod(
    uint256 a,
    uint256 b,
    string memory errorMessage
  ) internal pure returns (uint256) {
    require(b != 0, errorMessage);
    return a % b;
  }
}

contract Context {
  constructor() internal {}

  // solhint-disable-previous-line no-empty-blocks

  function _msgSender() internal view returns (address payable) {
    return msg.sender;
  }

  function _msgData() internal view returns (bytes memory) {
    // silence state mutability warning without generating bytecode - see
    // https://github.com/ethereum/solidity/issues/2691
    this;

    return msg.data;
  }
}

contract Ownable is Context {
  address payable private _owner;

  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );

  constructor() internal {
    _owner = _msgSender();
    emit OwnershipTransferred(address(0), _owner);
  }

  function owner() public view returns (address payable) {
    return _owner;
  }

  modifier onlyOwner() {
    require(isOwner(), 'Ownable: caller is not the owner');
    _;
  }

  function isOwner() public view returns (bool) {
    return _msgSender() == _owner;
  }

  function renounceOwnership() public onlyOwner {
    emit OwnershipTransferred(_owner, address(0));
    _owner = address(0);
  }

  function transferOwnership(address payable newOwner) public onlyOwner {
    _transferOwnership(newOwner);
  }

  function _transferOwnership(address payable newOwner) internal {
    require(newOwner != address(0), 'Ownable: new owner is the zero address');
    emit OwnershipTransferred(_owner, newOwner);
    _owner = newOwner;
  }
}

interface IFarm {
  function name() external view returns (string memory);

  function requestMarketingFee() external;

  function rebalance() external;
}

contract Controller is Ownable {
  using SafeMath for uint256;

  uint256 constant oneDayInBlocksMillion = 6500e6;
  uint256 constant tokenToRewardPerDayPerMillion = 100;
  uint256 public lockedToken = 0;

  struct Farm {
    address farm;
    uint256 lockedToken;
  }
  Farm[] farms;

  // TODO: handle preconditions (%tokens restriction)
  function onDeposit(uint256 amount) external {}

  // TODO: resolve withdraw actions
  function onWithdraw(uint256 amount) external {}

  function calculateTokensEarned(
    uint256 amount,
    uint256, /*share*/
    uint256 depositStartBlock
  ) external view returns (uint256) {
    require(_findFarm(msg.sender) < farms.length, 'Farm not registered');
    uint256 blocksPassed = block.number.sub(depositStartBlock);
    return
      amount.mul(tokenToRewardPerDayPerMillion).mul(blocksPassed).div(
        oneDayInBlocksMillion
      );
  }

  function lockEarnedTokens(uint256 tokenCount) external {
    uint256 farmId = _findFarm(msg.sender);
    require(farmId < farms.length, 'Farm not registered');
    Farm storage farm = farms[farmId];
    farm.lockedToken = farm.lockedToken.add(tokenCount);
  }

  function registerFarm(address farm) external onlyOwner {
    bytes32 farmName = keccak256(abi.encodePacked(IFarm(farm).name()));
    for (uint256 i = 0; i < farms.length; i++) {
      if (farms[i].farm == farm) return;
      if (
        keccak256(abi.encodePacked(IFarm(farms[i].farm).name())) == farmName
      ) {
        lockedToken -= farms[i].lockedToken;
        farms[i].farm = farm;
        return;
      }
    }
    farms.push(Farm(farm, 0));
  }

  function unregisterFarm(address farm) external onlyOwner {
    uint256 newLength = 0;
    for (uint256 i = 0; i < farms.length; i++) {
      if (farms[i].farm != farm) {
        if (newLength < i) farms[newLength] = farms[i];
        ++newLength;
      } else lockedToken -= farms[i].lockedToken;
    }
    if (newLength < farms.length) farms.pop();
  }

  function collectFees() external onlyOwner {
    for (uint256 i = 0; i < farms.length; i++)
      IFarm(farms[i].farm).requestMarketingFee();
  }

  function rebalance() external onlyOwner {
    for (uint256 i = 0; i < farms.length; i++) IFarm(farms[i].farm).rebalance();
  }

  function _findFarm(address _farm) private view returns (uint256) {
    for (uint256 i = 0; i < farms.length; i++)
      if (farms[i].farm == _farm) return i;
    return farms.length;
  }
}
