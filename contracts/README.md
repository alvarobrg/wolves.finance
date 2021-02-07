Steps to setup the WOWS environment.

\*\*\*\*\*\* Main \*\*\*\*\*\*

1.) deploy AddressFactory\
-> parameter:\

> \- \_owner (the only address which can add addresses, most likely the deployer)

2.) AddressFactory:: setRegistryEntry for UniswapV2Router02, MarketingWallet, TeamWallet

3.) deploy token.sol\
-> parameter:\

> \- deployer address\
> \- IAddressFactory address\ <- must contain "UniswapV2Router02", "MarketingWallet" and "TeamWallet" keys\

4.) deploy controller.sol\
-> parameter:\

> \- IAddressFactory address\
> \- rewardHandler (right now its token.sol)\
> \- previousController: 0 address / only for later updates\

5.) call token.sol::grantRole(token.sol.REWARD_ROLE(), controller)\
-> This is to allow controller to call into token.sol to distribute rewards

6.) deploy UniV2StakeFarm.sol\
-> parameter:\

> \- owner address\
> \- name: "WETH/WOWS LP Farm\
> \- stakingToken: token.sol::uniV2Pair()\
> \- rewardToken: token.sol\
> \- controller: address controller.sol\
> \- route: address of UniV2 WETH/USDT pool, can be 0 for test

7.) call controller:: registerFarm\
-> parameter:\

> \- farmAddress UniV2StakeFarm address\
> \- rewardCap (15.000 \*1e18)\
> \- rewardPerDuration (5000 *2 / 52 *1e18) we have 2 week duration!\
> \- rewardProvided 0\
> \- rewardfee 2\*1e4 (0.02)

8.) AddressFactory:: setRegistryEntry for WethWowsStakeFarm (see 6.)

9.) deploy booster.sol\
-> parameter:\

> \- \_owner address\

10.) call token.sol setBooster\
-> parameter:\

> \- address of booster.sol

\*\*\*\*\*\* Presale \*\*\*\*\*\*

1.) deploy Crowdsale.sol\
-> parameter:\

> \- addressRegistry\
> \- rate: 80\
> \- token: token.sol address\
> \- cap: 75\*1e18\
> \- invest_min: 2\*1e17 (0.2 ETH)\
> \- wallet_cap: 3\*1e18 (3 ETH)\
> \- lpEth: 3750\
> \- lptoken: 240000\
> \- openingTime: presale start / for test maybe now + 1 Minute\
> \- closingTime: presale end / for test maybe now + 2 Minutes

2.) call token.sol::grantRole(token.sol.MINTER_ROLE(), Crowdsale.sol)

\*\*\*\*\*\* Finally \*\*\*\*\*\*

For deployment the token.sol contract has initially admin rights for the deployer
and also for the multisig marketing wallet.
We should remove the admin role for the deployer once all contracts are up and running:

1.) token.sol::revokeRole(token.sol.DEFAULT_ADMIN_ROLE, address(this));
