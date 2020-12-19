/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

pragma solidity >=0.7.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20Capped.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import 'contracts/interfaces/uniswap/IUniswapV2Router02.sol';
import 'contracts/interfaces/uniswap/IUniswapV2Factory.sol';

contract WolfToken is ERC20Capped, AccessControl {
  bytes32 public constant MINTER_ROLE = 'minter_role';

  IUniswapV2Factory private constant _uniswapV2Factory =
    IUniswapV2Factory(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f);
  IUniswapV2Router02 private constant _uniswapV2Router =
    IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
  bool public _uniV2Allowed = false;
  address public immutable _uniV2Pair;

  //We inherited the ERC20Capped.sol
  constructor(address _teamWallet)
    // 60.000 tokens maximal supply
    ERC20Capped(60000 * 1e18)
    ERC20('Wolf Token', 'WOLF')
  {
    /* mint 9875 into teams wallet
       1.) 500 tokens * 15 month = 7500 team rewards
       2.) 1375 token for development costs (audits / bug-bounty ...)
       3.) 1000 token for marketing (influencer / design ...)
    */
    _mint(_teamWallet, 9875 * 1e18);
    // Multi-sig teamwallet has initial admin rights, eg for adding minters
    _setupRole(DEFAULT_ADMIN_ROLE, _teamWallet);
    // Create the UniV2 liquidity pool
    address weth = _uniswapV2Router.WETH();
    _uniV2Pair = _uniswapV2Factory.createPair(address(this), weth);
  }

  // mint is only allowed by addresses with minter role
  function mint(address account, uint256 amount) external returns (bool) {
    require(hasRole(MINTER_ROLE, msg.sender));
    _mint(account, amount);
    return true;
  }

  // Allow UNIV2Router access for everyone
  function allowUniswap(bool allow) external {
    require(hasRole(MINTER_ROLE, msg.sender));
    _uniV2Allowed = allow;
  }

  // prevent transfer to uniswapv2 during pre-sale
  function _transfer(
    address sender,
    address recipient,
    uint256 amount
  ) internal override {
    require(
      _uniV2Allowed || recipient != _uniV2Pair || hasRole(MINTER_ROLE, sender),
      'forbidden'
    );
    super._transfer(sender, recipient, amount);
  }
}
