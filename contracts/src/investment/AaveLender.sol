pragma solidity 0.6.5;

import '../../interfaces/aave/AaveLP.sol';
import '../../interfaces/aave/AaveLPAddressProvider.sol';
import '../../interfaces/aave/AaveToken.sol';

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
}

contract AaveLender {
  using SafeMath for uint256;
  /*//mainnnet
  address constant lendingPoolAddressProvider = 0x24a42fD28C976A61Df5D00D0599C34c4f90748c8;
  address constant usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
  address constant dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address constant usdt = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
  */
  // Kovan
  address constant lendingPoolAddressProvider =
    0x506B0B2CF20FAA8f38a4E2B524EE43e1f4458Cc5;
  address constant usdc = 0xe22da380ee6B445bb8273C81944ADEB6E8450422;
  address constant dai = 0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD;
  address constant usdt = 0x13512979ADE267AB5100878E2e0f485B568328a4;

  function getId() external pure returns (bytes32) {
    return keccak256(abi.encodePacked('AaveLender'));
  }

  function approve(address token) external {
    IERC20(token).approve(
      AaveLPAddressProvider(lendingPoolAddressProvider).getLendingPoolCore(),
      uint256(-1)
    );
  }

  function invest(address token, uint256 assetAmount)
    external
    returns (uint256)
  {
    address lendingPool =
      AaveLPAddressProvider(lendingPoolAddressProvider).getLendingPool();
    require(lendingPool != address(0));
    // aave pegs token 1:1
    AaveLP(lendingPool).deposit(token, assetAmount, 0);
    return assetAmount;
  }

  function redeem(address token, uint256 poolAmount)
    external
    returns (uint256)
  {
    address aToken = _getPoolToken(token);
    require(aToken != address(0));
    // redeem tokens to this contract
    AaveToken(aToken).redeem(poolAmount);
    return poolAmount;
  }

  function balanceOf(address token, address _owner)
    external
    view
    returns (uint256)
  {
    return IERC20(_getPoolToken(token)).balanceOf(_owner);
  }

  // return the amount of the underlying asset
  function getAssetAmount(address token, address _owner)
    external
    view
    returns (uint256)
  {
    return IERC20(_getPoolToken(token)).balanceOf(_owner);
  }

  function getApr(address token) external view returns (uint256) {
    (, , , , uint256 liquidityRate, , , , , , , , ) =
      AaveLP(AaveLPAddressProvider(lendingPoolAddressProvider).getLendingPool())
        .getReserveData(token);
    return liquidityRate.div(1e9);
  }

  function refresh(address token) external {}

  function _getPoolToken(address token) private view returns (address) {
    (, , , , , , , , , , , address aToken, ) =
      AaveLP(AaveLPAddressProvider(lendingPoolAddressProvider).getLendingPool())
        .getReserveData(token);
    return aToken;
  }
}
