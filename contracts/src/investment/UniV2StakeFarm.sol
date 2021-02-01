/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

import './interfaces/IController.sol';
import './interfaces/IFarm.sol';
import '../../interfaces/uniswap/IUniswapV2Pair.sol';

contract UniV2StakeFarm is IFarm, Ownable, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  /* ========== STATE VARIABLES ========== */

  IUniswapV2Pair public stakingToken;
  uint256 public override periodFinish = 0;
  uint256 public rewardRate = 0;
  uint256 public rewardsDuration = 7 days;
  uint256 public lastUpdateTime;
  uint256 public rewardPerTokenStored;
  uint256 private availableRewards;

  mapping(address => uint256) public userRewardPerTokenPaid;
  mapping(address => uint256) public rewards;
  // TODO: remove next 2 lines after dapp launch (special reward condition)
  mapping(address => uint256) private firstStakeTime;
  uint256 constant ethLimit = 2e17;

  uint256 private _totalSupply;
  mapping(address => uint256) private _balances;

  // Unique name of this farm instance, used in controller
  string private _farmName;
  // Uniswap route to get price for token 0 in pair
  IUniswapV2Pair public immutable route;
  // The address of the controller
  IController public controller;

  /* ========== CONSTRUCTOR ========== */

  constructor(
    string memory _name,
    address _stakingToken,
    address _controller,
    address _route
  ) {
    _farmName = _name;
    stakingToken = IUniswapV2Pair(_stakingToken);
    route = IUniswapV2Pair(_route);
    controller = IController(_controller);
  }

  /* ========== VIEWS ========== */

  function farmName() external view override returns (string memory) {
    return _farmName;
  }

  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view returns (uint256) {
    return _balances[account];
  }

  function lastTimeRewardApplicable() public view returns (uint256) {
    return block.timestamp < periodFinish ? block.timestamp : periodFinish;
  }

  function rewardPerToken() public view returns (uint256) {
    if (_totalSupply == 0) {
      return rewardPerTokenStored;
    }
    return
      rewardPerTokenStored.add(
        lastTimeRewardApplicable()
          .sub(lastUpdateTime)
          .mul(rewardRate)
          .mul(1e18)
          .div(_totalSupply)
      );
  }

  function earned(address account) public view returns (uint256) {
    return
      _balances[account]
        .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
        .div(1e18)
        .add(rewards[account]);
  }

  function getRewardForDuration() external view returns (uint256) {
    return rewardRate.mul(rewardsDuration);
  }

  function getUIData(address _user) external view returns (uint256[7] memory) {
    (uint112 reserve0, uint112 reserve1, ) = stakingToken.getReserves();
    (uint112 reserve0R, uint112 reserve1R, ) = route.getReserves();

    uint256[7] memory result =
      [
        (uint256(reserve0).mul(_balances[_user])).div(
          stakingToken.totalSupply()
        ),
        (uint256(reserve1).mul(_balances[_user])).div(
          stakingToken.totalSupply()
        ),
        (uint256(reserve0R).mul(1e18)).div(reserve1R),
        (_balances[_user].mul(1e18)).div(_totalSupply),
        rewardsDuration,
        rewardRate.mul(rewardsDuration),
        earned(_user)
      ];
    return result;
  }

  /* ========== MUTATIVE FUNCTIONS ========== */

  function stake(uint256 amount)
    external
    nonReentrant
    updateReward(msg.sender)
  {
    require(amount > 0, 'Cannot stake 0');

    /*(uint256 fee) = */
    controller.onDeposit(amount);

    _totalSupply = _totalSupply.add(amount);
    _balances[msg.sender] = _balances[msg.sender].add(amount);
    IERC20(address(stakingToken)).safeTransferFrom(
      msg.sender,
      address(this),
      amount
    );

    // TODO: remove after launch
    if (
      firstStakeTime[msg.sender] == 0 &&
      _ethAmount(_balances[msg.sender]) >= ethLimit
    ) firstStakeTime[msg.sender] = block.timestamp;

    emit Staked(msg.sender, amount);
  }

  function withdraw(uint256 amount)
    public
    nonReentrant
    updateReward(msg.sender)
  {
    require(amount > 0, 'Cannot withdraw 0');

    /*(uint256 fee) = */
    controller.onWithdraw(amount);

    _totalSupply = _totalSupply.sub(amount);
    _balances[msg.sender] = _balances[msg.sender].sub(amount);
    IERC20(address(stakingToken)).safeTransfer(msg.sender, amount);

    // TODO: remove after launch
    if (
      firstStakeTime[msg.sender] > 0 &&
      _ethAmount(_balances[msg.sender]) < ethLimit
    ) firstStakeTime[msg.sender] = 0;

    emit Unstaked(msg.sender, amount);
  }

  function getReward() public nonReentrant updateReward(msg.sender) {
    uint256 reward = rewards[msg.sender];
    if (reward > 0) {
      rewards[msg.sender] = 0;
      availableRewards = availableRewards.sub(reward);
      controller.payOutRewards(msg.sender, reward);
      emit RewardPaid(msg.sender, reward);
    }
  }

  function exit() external {
    withdraw(_balances[msg.sender]);
    getReward();
  }

  function refresh() external override updateReward(msg.sender) {}

  /* ========== RESTRICTED FUNCTIONS ========== */

  function setController(address newController)
    external
    override
    onlyController
  {
    controller = IController(newController);
    emit ControllerChanged(newController);
  }

  function notifyRewardAmount(uint256 reward)
    external
    override
    onlyController
    updateReward(address(0))
  {
    if (block.timestamp >= periodFinish) {
      rewardRate = reward.div(rewardsDuration);
    } else {
      uint256 remaining = periodFinish.sub(block.timestamp);
      uint256 leftover = remaining.mul(rewardRate);
      rewardRate = reward.add(leftover).div(rewardsDuration);
    }
    availableRewards = availableRewards.add(reward);

    // Ensure the provided reward amount is not more than the balance in the contract.
    // This keeps the reward rate in the right range, preventing overflows due to
    // very high values of rewardRate in the earned and rewardsPerToken functions;
    // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
    require(
      rewardRate <= availableRewards.div(rewardsDuration),
      'Provided reward too high'
    );

    lastUpdateTime = block.timestamp;
    periodFinish = block.timestamp.add(rewardsDuration);
    emit RewardAdded(reward);
  }

  // we don't have any rebalancing here
  function rebalance() external override onlyController {}

  // Added to support recovering LP Rewards from other systems to be distributed to holders
  function recoverERC20(address tokenAddress, uint256 tokenAmount)
    external
    onlyOwner
  {
    // Cannot recover the staking token or the rewards token
    require(
      tokenAddress != address(stakingToken),
      'pool tokens not recoverable'
    );
    IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    emit Recovered(tokenAddress, tokenAmount);
  }

  function setRewardsDuration(uint256 _rewardsDuration)
    external
    override
    onlyOwner
  {
    require(
      periodFinish == 0 || block.timestamp > periodFinish,
      'reward period not finished'
    );
    rewardsDuration = _rewardsDuration;
    emit RewardsDurationUpdated(rewardsDuration);
  }

  /* ========== PRIVATE ========== */

  function _ethAmount(uint256 amountToken) private view returns (uint256) {
    (uint112 reserve0, , ) = stakingToken.getReserves();
    return (uint256(reserve0).mul(amountToken)).div(stakingToken.totalSupply());
  }

  /* ========== MODIFIERS ========== */

  modifier onlyController {
    require(_msgSender() == address(controller), 'not controller');
    _;
  }

  modifier updateReward(address account) {
    rewardPerTokenStored = rewardPerToken();
    lastUpdateTime = lastTimeRewardApplicable();
    if (account != address(0)) {
      rewards[account] = earned(account);
      userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }
    _;
  }

  /* ========== EVENTS ========== */

  event RewardAdded(uint256 reward);
  event Staked(address indexed user, uint256 amount);
  event Unstaked(address indexed user, uint256 amount);
  event RewardPaid(address indexed user, uint256 reward);
  event RewardsDurationUpdated(uint256 newDuration);
  event Recovered(address token, uint256 amount);
  event ControllerChanged(address newController);
}
