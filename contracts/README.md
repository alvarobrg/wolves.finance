Steps to setup the WOWS environment.

**\*\*** Main **\*\***

1.) deploy token.sol
-> parameter: gnosis marketing_wallet / gnosis team_wallet

2.) deploy controller.sol
-> parameter: rewardHandler (right now its token.sol)

3.) call token.sol::grantRole(token.sol.REWARD_ROLE(), controller)
-> This is to allow controller to call into token.sol to distribute rewards

4.) deploy UniV2StakeFarm.sol
-> parameter:
\_name: "WETH/WOWS LP Farm,
\_stakingToken: token.sol::uniV2Pair(),
\_controller: address controller.sol,
\_route: address of UniV2 WETH/USDT pool, can be 0 for test

5.) call controller:: registerFarm
-> parameter:

- farmAddress UniV2StakeFarm address
- rewardCap (15.000 \*1e18)
- rewardPerDuration (5000 *2 / 52 *1e18) we have 2 week duration!
- rewardProvided 0
- rewardfee 2\*1e16 (0.02)

  6.) deploy booster.sol

  7.) call token.sol setBooster
  -> parameter: address of booster.sol

**\*\*** Presale **\*\***

1.) deploy Crowdsale.sol
-> parameter:

- rate: 60
- wallet: gnosis marketing wallet
- farm: address of UniV2StakeFarm.sol
- token: token.sol address
- cap: 100\*1e18
- invest_min: 2\*1e17 (0.2 ETH)
- wallet_cap: 3\*1e18 (3 ETH)
- lpEth: 4412
- lptoken: 240000
- openingTime: presale start / for test maybe now + 1 Minute
- closingTime: presale end / for test maybe now + 2 Minutes

  2.) call token.sol::grantRole(token.sol.MINTER_ROLE(), Crowdsale.sol)

**\*\*** Finally **\*\***

For deployment the token.sol contract has initially admin rights for the deployer
and also for the multisig marketing wallet.
We should remove the admin role for the deployer once all contracts are up and running:

1.) token.sol::revokeRole(token.sol.DEFAULT_ADMIN_ROLE, address(this));
