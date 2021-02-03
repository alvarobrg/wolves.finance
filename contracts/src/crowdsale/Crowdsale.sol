/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/GSN/Context.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

import '../../interfaces/uniswap/IUniswapV2Router02.sol';
import '../investment/interfaces/IStakeFarm.sol';

interface IERC20WolfMintable is IERC20 {
  function mint(address account, uint256 amount) external returns (bool);

  function enableUniV2Pair(bool enable) external;
}

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale,
 * allowing investors to purchase tokens with ether. This contract implements
 * such functionality in its most fundamental form and can be extended to provide additional
 * functionality and/or custom behavior.
 * The external interface represents the basic interface for purchasing tokens, and conforms
 * the base architecture for crowdsales. It is *not* intended to be modified / overridden.
 * The internal interface conforms the extensible and modifiable surface of crowdsales. Override
 * the methods to add functionality. Consider using 'super' where appropriate to concatenate
 * behavior.
 */
contract Crowdsale is Context, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20WolfMintable;

  // The token being sold
  IERC20WolfMintable private _token;

  // Address where funds are collected
  address payable private _wallet;

  // How many token units a buyer gets per wei.
  // The rate is the conversion between wei and the smallest and indivisible token unit.
  // So, if you are using a rate of 1 with a ERC20Detailed token with 3 decimals called TOK
  // 1 wei will give you 1 unit, or 0.001 TOK.
  uint256 private _rate;

  // Amount of wei raised
  uint256 private _weiRaised;

  uint256 private _cap;
  uint256 private _investMin;
  uint256 private _walletCap;

  uint256 private _openingTime;
  uint256 private _closingTime;

  // per wallet investment (in wei)
  mapping(address => uint256) private _walletInvest;

  /**
   * Event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokensPurchased(
    address indexed purchaser,
    address indexed beneficiary,
    uint256 value,
    uint256 amount
  );

  /**
   * Event for add liquidity logging
   * @param beneficiary who got the tokens
   * @param amountToken how many token were added
   * @param amountETH how many ETH were added
   * @param liquidity how many pool tokens were created
   */
  event LiquidityAdded(
    address indexed beneficiary,
    uint256 amountToken,
    uint256 amountETH,
    uint256 liquidity
  );

  /**
   * Event for stake liquidity logging
   * @param beneficiary who got the tokens
   * @param liquidity how many pool tokens were created
   */
  event Staked(address indexed beneficiary, uint256 liquidity);

  // Uniswap Router for providing liquidity
  IUniswapV2Router02 private constant _uniV2Router =
    IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
  IERC20 private _uniV2Pair;

  IStakeFarm private _stakeFarm;

  // rate of tokens to insert into the UNISwapv2 liquidity pool
  // Because they will be devided, expanding by multiples of 10
  // is fine to express decimal values
  uint256 private _tokenForLp;
  uint256 private _ethForLp;

  /**
   * @dev Reverts if not in crowdsale time range.
   */
  modifier onlyWhileOpen {
    require(isOpen(), 'not open');
    _;
  }

  /**
   * @param rate Number of token units a buyer gets per wei
   * @dev The rate is the conversion between wei and the smallest and indivisible
   * token unit. So, if you are using a rate of 1 with a ERC20Detailed token
   * with 3 decimals called TOK, 1 wei will give you 1 unit, or 0.001 TOK.
   * @param wallet Address where collected funds will be forwarded to
   * @param stakeFarm address of our UniV2 WETH/WOWS stake farm
   * @param token Address of the token being sold
   * @param pair Address of the WETH/WOWS pair
   * @param cap Max amount of wei to be contributed
   * @param investMin minimum investment in wei
   * @param walletCap Max amount of wei to be contributed per wallet
   * @param lpEth numerator of liquidity pair
   * @param lpToken denominator of liquidity pair
   * @param openingTime Crowdsale opening time
   * @param closingTime Crowdsale closing time
   */
  constructor(
    uint256 rate,
    address payable wallet,
    IStakeFarm stakeFarm,
    IERC20WolfMintable token,
    IERC20 pair,
    uint256 cap,
    uint256 investMin,
    uint256 walletCap,
    uint256 lpEth,
    uint256 lpToken,
    uint256 openingTime,
    uint256 closingTime
  ) {
    require(rate > 0, 'rate is 0');
    require(wallet != address(0), 'wallet is the zero address');
    require(address(token) != address(0), 'token is the zero address');
    require(cap > 0, 'cap is 0');
    require(lpEth > 0, 'lpEth is 0');
    require(lpToken > 0, 'lpToken is 0');

    // solhint-disable-next-line not-rely-on-time
    require(
      openingTime >= block.timestamp,
      'opening time is before current time'
    );
    // solhint-disable-next-line max-line-length
    require(closingTime > openingTime, 'opening time > closing time');

    _rate = rate;
    _wallet = wallet;
    _stakeFarm = stakeFarm;
    _token = token;
    _uniV2Pair = pair;
    _cap = cap;
    _investMin = investMin;
    _walletCap = walletCap;
    _ethForLp = lpEth;
    _tokenForLp = lpToken;
    _openingTime = openingTime;
    _closingTime = closingTime;
  }

  /**
   * @dev fallback function ***DO NOT OVERRIDE***
   * Note that other contracts will transfer funds with a base gas stipend
   * of 2300, which is not enough to call buyTokens. Consider calling
   * buyTokens directly when purchasing tokens from a contract.
   */
  receive() external payable {
    buyTokens(_msgSender());
  }

  /**
   * @return the token being sold.
   */
  function token() public view returns (IERC20) {
    return _token;
  }

  /**
   * @return the address where funds are collected.
   */
  function wallet() public view returns (address payable) {
    return _wallet;
  }

  /**
   * @return the number of token units a buyer gets per wei.
   */
  function rate() public view returns (uint256) {
    return _rate;
  }

  /**
   * @return the amount of wei raised.
   */
  function weiRaised() public view returns (uint256) {
    return _weiRaised;
  }

  /**
   * @return the cap of the crowdsale.
   */
  function cap() public view returns (uint256) {
    return _cap;
  }

  /**
   * @return the minimal investment of the crowdsale.
   */
  function minInvest() public view returns (uint256) {
    return _investMin;
  }

  /**
   * @return the cap per wallet of the crowdsale.
   */
  function walletCap() public view returns (uint256) {
    return _walletCap;
  }

  /**
   * @dev Checks whether the cap has been reached.
   * @return Whether the cap was reached
   */
  function capReached() public view returns (bool) {
    return weiRaised() >= _cap;
  }

  /**
   * @return the crowdsale opening time.
   */
  function openingTime() public view returns (uint256) {
    return _openingTime;
  }

  /**
   * @return the crowdsale closing time.
   */
  function closingTime() public view returns (uint256) {
    return _closingTime;
  }

  /**
   * @return true if the crowdsale is open, false otherwise.
   */
  function isOpen() public view returns (bool) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp >= _openingTime && block.timestamp <= _closingTime;
  }

  /**
   * @dev Checks whether the period in which the crowdsale is open has already elapsed.
   * @return Whether crowdsale period has elapsed
   */
  function hasClosed() public view returns (bool) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp > _closingTime;
  }

  /**
   * @dev Provide a collection of UI relevant values to reduce # of queries
   * @return ethRaised : amount eth raised (wei)
   *         timeOpen: time presale opens (unix timestamp seconds)
   *         timeClose: time presale closes (unix timestamp seconds)
   *         timeNow: current time (unix timestamp seconds)
   *         userEthAmount: amount of ETH in users wallet (wei)
   *         userEthInvest: amount of ETH users has already spend (wei)
   *         userTokenAmount: amount of token hold by user (token::decimals)
   */
  function getStates(address beneficiary)
    public
    view
    returns (
      uint256 ethRaised,
      uint256 timeOpen,
      uint256 timeClose,
      uint256 timeNow,
      uint256 userEthAmount,
      uint256 userEthInvested,
      uint256 userTokenAmount
    )
  {
    uint256 ethAmount = beneficiary == address(0) ? 0 : beneficiary.balance;
    uint256 tokenAmount =
      beneficiary == address(0) ? 0 : _token.balanceOf(beneficiary);
    uint256 ethInvest = _walletInvest[beneficiary];

    return (
      _weiRaised,
      _openingTime,
      _closingTime,
      block.timestamp,
      ethAmount,
      ethInvest,
      tokenAmount
    );
  }

  /**
   * @dev low level token purchase ***DO NOT OVERRIDE***
   * This function has a non-reentrancy guard, so it shouldn't be called by
   * another `nonReentrant` function.
   * @param beneficiary Recipient of the token purchase
   */
  function buyTokens(address beneficiary) public payable nonReentrant {
    uint256 weiAmount = msg.value;
    _preValidatePurchase(beneficiary, weiAmount);

    // calculate token amount to be created
    uint256 tokens = _getTokenAmount(weiAmount);

    // update state
    _weiRaised = _weiRaised.add(weiAmount);
    _walletInvest[beneficiary] = _walletInvest[beneficiary].add(weiAmount);

    _processPurchase(beneficiary, tokens);
    emit TokensPurchased(_msgSender(), beneficiary, weiAmount, tokens);

    _forwardFunds(weiAmount);
  }

  /**
   * @dev low level token purchase and liquidity staking ***DO NOT OVERRIDE***
   * This function has a non-reentrancy guard, so it shouldn't be called by
   * another `nonReentrant` function.
   * @param beneficiary Recipient of the token purchase
   */
  function buyTokensAddLiquidity(address payable beneficiary)
    public
    payable
    nonReentrant
  {
    uint256 weiAmount = msg.value;
    // The ETH amount we buy WOWS token for
    uint256 buyAmount =
      weiAmount.mul(_tokenForLp).div(_rate.mul(_ethForLp).add(_tokenForLp));
    // The ETH amount we for liquidity (ETH + WOLF)
    uint256 investAmount = weiAmount.sub(buyAmount);

    _preValidatePurchase(beneficiary, buyAmount);

    // calculate token amount to be created
    uint256 tokens = _getTokenAmount(buyAmount);

    // verify that the ratio is in 0.1% limit
    uint256 tokensReverse = investAmount.mul(_tokenForLp).div(_ethForLp);
    require(
      tokens < tokensReverse || tokens.sub(tokensReverse) < tokens.div(1000),
      'ratio wrong'
    );
    require(
      tokens > tokensReverse || tokensReverse.sub(tokens) < tokens.div(1000),
      'ratio wrong'
    );

    // update state
    _weiRaised = _weiRaised.add(buyAmount);
    _walletInvest[beneficiary] = _walletInvest[beneficiary].add(buyAmount);

    _processLiquidity(beneficiary, investAmount, tokens);

    _forwardFunds(buyAmount);
  }

  /**
   * @dev low level token liquidity staking ***DO NOT OVERRIDE***
   * This function has a non-reentrancy guard, so it shouldn't be called by
   * another `nonReentrant` function.
   * approve must be called before to let us transfer msgsenders tokens
   * @param beneficiary Recipient of the token purchase
   */
  function addLiquidity(address payable beneficiary)
    public
    payable
    nonReentrant
    onlyWhileOpen
  {
    uint256 weiAmount = msg.value;
    require(beneficiary != address(0), 'beneficiary is the zero address');
    require(weiAmount != 0, 'weiAmount is 0');

    // calculate number of tokens
    uint256 tokenAmount = weiAmount.mul(_tokenForLp).div(_ethForLp);
    require(_token.balanceOf(msg.sender) >= tokenAmount, 'insufficient token');

    // get the tokens from msg.sender
    _token.safeTransferFrom(msg.sender, address(this), tokenAmount);

    // Step 1: add liquidity
    uint256 lpToken =
      _addLiquidity(address(this), beneficiary, weiAmount, tokenAmount);

    // Step 2: we now own the liquidity tokens, stake them
    _uniV2Pair.approve(address(_stakeFarm), lpToken);
    _stakeFarm.stake(lpToken);

    // Step 3: transfer the stake to the user
    _stakeFarm.transfer(beneficiary, lpToken);

    emit Staked(beneficiary, lpToken);
  }

  /**
   * @dev finalize presale / create liquidity pool
   */
  function finalizePresale() external {
    require(hasClosed(), 'not closed');

    uint256 ethBalance = address(this).balance;
    require(ethBalance > 0, 'no eth balance');

    // Calculate how many token we add into liquidity pool
    uint256 tokenToLp = (ethBalance.mul(_tokenForLp)).div(_ethForLp);

    // Mint token we spend
    require(_token.mint(address(this), tokenToLp), 'minting failed');

    _addLiquidity(_wallet, _wallet, ethBalance, tokenToLp);

    // There should be no more WOWS if everything worked fine
    // But let us make sure that we don't left corpse
    uint256 tokenCorpse = _token.balanceOf(address(this));
    if (tokenCorpse > 0) _token.transfer(_wallet, tokenToLp);

    // finally whitelist uniV2 LP pool on token contract
    _token.enableUniV2Pair(true);
  }

  function testSetTimes() public {
    _openingTime = block.timestamp + 10;
    _closingTime = block.timestamp + 3600;
    _token.enableUniV2Pair(false);
  }

  /**
   * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met.
   * Use `super` in contracts that inherit from Crowdsale to extend their validations.
   * Example from CappedCrowdsale.sol's _preValidatePurchase method:
   *     super._preValidatePurchase(beneficiary, weiAmount);
   *     require(weiRaised().add(weiAmount) <= cap);
   * @param beneficiary Address performing the token purchase
   * @param weiAmount Value in wei involved in the purchase
   */
  function _preValidatePurchase(address beneficiary, uint256 weiAmount)
    internal
    view
    onlyWhileOpen
  {
    require(beneficiary != address(0), 'beneficiary is the zero address');
    require(weiAmount != 0, 'weiAmount is 0');
    require(weiRaised().add(weiAmount) <= _cap, 'cap exceeded');
    require(weiAmount >= _investMin, 'invest too small');
    require(
      _walletInvest[beneficiary].add(weiAmount) <= _walletCap,
      'wallet-cap exceeded'
    );

    // silence state mutability warning without generating bytecode - see
    // https://github.com/ethereum/solidity/issues/2691
    this;
  }

  /**
   * @dev Executed when a purchase has been validated and is ready to be executed. Doesn't necessarily emit/send
   * tokens.
   * @param _beneficiary Address receiving the tokens
   * @param _tokenAmount Number of tokens to be purchased
   */
  function _processPurchase(address _beneficiary, uint256 _tokenAmount)
    internal
  {
    require(_token.mint(address(this), _tokenAmount), 'minting failed');
    _token.transfer(_beneficiary, _tokenAmount);
  }

  /**
   * @dev Executed when a purchase has been validated and is ready to be executed.
   * This function adds liquidity and stakes the liquidity in our initial farm
   * @param beneficiary Address receiving the tokens
   * @param ethAmount Amount of ETH provided
   * @param tokenAmount Number of tokens to be purchased
   */
  function _processLiquidity(
    address payable beneficiary,
    uint256 ethAmount,
    uint256 tokenAmount
  ) internal {
    require(_token.mint(address(this), tokenAmount), 'minting failed');

    // Step 1: add liquidity
    uint256 lpToken =
      _addLiquidity(address(this), beneficiary, ethAmount, tokenAmount);

    // Step 2: we now own the liquidity tokens, stake them
    // allow stakeFarm to own our tokens
    _uniV2Pair.approve(address(_stakeFarm), lpToken);
    _stakeFarm.stake(lpToken);

    // Step 3: transfer the stake to the user
    _stakeFarm.transfer(beneficiary, lpToken);

    emit Staked(beneficiary, lpToken);
  }

  /**
   * @dev Override to extend the way in which ether is converted to tokens.
   * @param weiAmount Value in wei to be converted into tokens
   * @return Number of tokens that can be purchased with the specified _weiAmount
   */
  function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
    return weiAmount.mul(_rate);
  }

  /**
   * @dev Determines how ETH is stored/forwarded on purchases.
   */
  function _forwardFunds(uint256 weiAmount) internal {
    _wallet.transfer(weiAmount.div(2));
  }

  function _addLiquidity(
    address tokenOwner,
    address payable remainingReceiver,
    uint256 ethBalance,
    uint256 tokenBalance
  ) internal returns (uint256) {
    // Add Liquidity, receiver of pool tokens is _wallet
    _token.approve(address(_uniV2Router), tokenBalance);
    (uint256 amountToken, uint256 amountETH, uint256 liquidity) =
      _uniV2Router.addLiquidityETH{ value: ethBalance }(
        address(_token),
        tokenBalance,
        tokenBalance.mul(90).div(100),
        ethBalance.mul(90).div(100),
        tokenOwner,
        block.timestamp + 86400
      );
    emit LiquidityAdded(tokenOwner, amountToken, amountETH, liquidity);

    // send remaining ETH to the team wallet
    if (amountETH < ethBalance)
      remainingReceiver.transfer(ethBalance.sub(amountETH));
    // send remaining WOWS token to team wallet
    if (amountToken < tokenBalance)
      _token.transfer(remainingReceiver, tokenBalance.sub(amountToken));

    return liquidity;
  }
}
