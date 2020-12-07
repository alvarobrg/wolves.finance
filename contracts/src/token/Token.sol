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

contract WolfToken is ERC20Capped, AccessControl {
  bytes32 public constant MINTER_ROLE = 'minter_role';

  //We inherited the ERC20Capped.sol
  constructor(address _teamWallet)
    // 60.000 tokens maximal supply
    ERC20Capped(60000 * 1e18)
    ERC20('Wolf Token', 'WOW')
  {
    /* mint 11000 into teams wallet
       1.) 500 tokens * 15 month = 7500 team rewards
       2.) 1125 token for building up Uniswap v2 ETH / Token pool
       3.) 1375 token for development costs (audits / bug-bounty ...)
       4.) 1000 token for marketing (influencer / design ...)
    */
    _mint(_teamWallet, 11000 * 1e18);
    // Multi-sig teamwallet has initial admin rights, eg for adding minters
    _setupRole(DEFAULT_ADMIN_ROLE, _teamWallet);
  }

  // mint is only allowed by addresses with minter role
  function mint(address account, uint256 amount) external returns (bool) {
    require(hasRole(MINTER_ROLE, msg.sender));
    _mint(account, amount);
    return true;
  }
}
