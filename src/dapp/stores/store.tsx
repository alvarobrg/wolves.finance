/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import WalletConnectProvider from '@walletconnect/web3-provider';
import CrowdsaleAbi from 'abi/contracts/src/crowdsale/Crowdsale.sol/Crowdsale.json';
import async from 'async';
import { ethers } from 'ethers';
import Emitter from 'events';
import Dispatcher from 'flux';
import Web3Modal from 'web3modal';

import { addresses } from '../config/adresses';
import {
  CONNECTION_CHANGED,
  ERC20_TOKEN_CONTRACT,
  PRESALE_BUY,
  PRESALE_STATE,
  TX_HASH,
} from './constants';

const emitter = new Emitter.EventEmitter();
const dispatcher = new Dispatcher.Dispatcher();

type PayloadContent = {
  amount: number;
  filter: Array<string> | undefined;
};

type Payload = {
  type: string;
  content: PayloadContent;
};

export type TokenContractResult = {
  tokenAmount: number | undefined;
};

export type ConnectResult = {
  type: 'event' | 'prod';
  address: string;
  networkName: string;
};

export type PresaleResult = {
  error: string | undefined;
  state: {
    ethRaised: number;
    hasClosed: boolean;
    isOpen: boolean;
    timeToNextEvent: number;
    ethUser: number;
    tokenUser: number;
  };
};

export type StatusResult = {
  error: string | undefined;
};

type cbf = async.AsyncResultCallback<unknown, Error>;

class Store {
  web3Modal: Web3Modal;
  ethersProvider: ethers.providers.Web3Provider | null = null;
  eventProvider: ethers.providers.InfuraWebSocketProvider | null = null;
  presaleContract: ethers.Contract | null = null;
  presaleContractRO: ethers.Contract | null = null;
  networkName = 'rinkeby';
  chainId = 0;
  address = '';
  assets = {};

  static nullAddress = '0x00000000000000000000000000000000';

  constructor() {
    this.web3Modal = new Web3Modal({
      network: this.networkName,
      cacheProvider: true,
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            infuraId: process.env.REACT_APP_INFURA_ID,
          },
        },
      },
    });

    dispatcher.register((payload) => {
      const _payload = payload as Payload;
      switch (_payload.type) {
        case ERC20_TOKEN_CONTRACT:
          this._getTokenContractData(_payload.content);
          break;
        case PRESALE_BUY:
          this._doPresale(_payload.content);
          break;
        case PRESALE_STATE:
          this._getPresaleState(_payload.content);
          break;
        default: {
          return;
        }
      }
    });
  }

  getAssets = () => {
    return this.assets;
  };

  /*********************** NETWORK ******************/

  connect = async () => {
    try {
      if (this.ethersProvider !== null) {
        this.disconnect(false);
      }
      const web3Provider = await this.web3Modal.connect();
      await this.subscribeProvider(web3Provider);

      this.ethersProvider = new ethers.providers.Web3Provider(web3Provider);
      const accounts = await this.ethersProvider.listAccounts();
      this.address = accounts[0];
      const network = await this.ethersProvider.getNetwork();
      this.chainId = network.chainId;
      this.networkName = network.name;
      this._launchEventProvider();
      if (await this._setupContracts()) this._emitNetworkChange();
    } catch (e) {
      console.log(e);
      await this.disconnect(true);
    }
  };

  autoconnect = async (defaultNetwork: string | null) => {
    if (defaultNetwork) this.networkName = defaultNetwork;

    this._launchEventProvider();
    if (this.web3Modal.cachedProvider) {
      await this.connect();
    }
  };

  subscribeProvider = async (provider: ethers.providers.Provider) => {
    if (!provider.on) {
      return;
    }

    provider.on('close', () => {
      this.disconnect(true);
    });

    provider.on('disconnect', () => {
      this.disconnect(true);
    });

    provider.on('accountsChanged', async (accounts: string[]) => {
      if (accounts[0] !== this.address) {
        this.address = accounts[0];
        this._emitNetworkChange();
      }
    });

    provider.on('chainChanged', async (chainId: number) => {
      if (chainId !== this.chainId) {
        await this.connect();
      }
    });

    provider.on('networkChanged', async (networkId: number) => {
      if (this.ethersProvider !== null) {
        const network = await this.ethersProvider.getNetwork();
        if (network.chainId !== this.chainId) {
          await this.connect();
          this._emitNetworkChange();
        }
      }
    });
  };

  disconnect = async (clearCache: boolean) => {
    if (this.ethersProvider) {
      localStorage.removeItem('walletconnect');
      this.ethersProvider.removeAllListeners();
      this.ethersProvider = null;
    }
    this.address = '';
    if (clearCache) {
      this.web3Modal.clearCachedProvider();
      this._emitNetworkChange();
    }
  };

  isConnected = () => {
    return this.ethersProvider !== null;
  };

  isEventConnected = () => {
    return this.eventProvider !== null;
  };

  _setupEvents(): boolean {
    return true;
  }

  _emitNetworkChange() {
    emitter.emit(CONNECTION_CHANGED, {
      type: 'prod',
      address: this.address,
      networkName: this.networkName,
    } as ConnectResult);
  }

  _launchEventProvider = async () => {
    try {
      if (
        !this.eventProvider ||
        (await this.eventProvider?.getNetwork()).chainId !== this.chainId
      ) {
        this.eventProvider = ethers.providers.InfuraProvider.getWebSocketProvider(
          this.networkName,
          process.env.REACT_APP_INFURA_ID
        );
        if (!this.chainId)
          this.chainId = (await this.eventProvider.getNetwork()).chainId;
        this._setupContracts();
        console.log('EventProvider launched on network: ', this.networkName);
        emitter.emit(CONNECTION_CHANGED, {
          type: 'event',
          address: '',
          networkName: this.networkName,
        } as ConnectResult);
      }
    } catch (e) {
      console.log(e);
      if (this.eventProvider) {
        this.eventProvider = null;
      }
    }
  };

  /******************** Contracts *********************/

  _setupContracts(): boolean {
    let chainAddresses: { token: string; presale: string };

    switch (this.chainId) {
      case 1:
        chainAddresses = addresses[1];
        break;
      case 4:
        chainAddresses = addresses[4];
        break;
      default:
        return false;
    }

    if (this.eventProvider)
      this.presaleContractRO = new ethers.Contract(
        chainAddresses.presale,
        CrowdsaleAbi,
        this.eventProvider
      );

    if (this.ethersProvider) {
      const signer = this.ethersProvider?.getSigner();
      this.presaleContract = new ethers.Contract(
        chainAddresses.presale,
        CrowdsaleAbi,
        signer
      );
    }
    return true;
  }

  _getPresaleState = async (payloadContent: PayloadContent) => {
    try {
      const states:
        | {
            ethRaised: ethers.BigNumber;
            timeOpen: ethers.BigNumber;
            timeClose: ethers.BigNumber;
            timeNow: ethers.BigNumber;
            userEthAmount: ethers.BigNumber;
            userEthInvested: ethers.BigNumber;
            userTokenAmount: ethers.BigNumber;
            userTokenLocked: ethers.BigNumber;
          }
        | undefined = await this.presaleContractRO?.getStates(
        this.address === '' ? Store.nullAddress : this.address
      );

      if (states) {
        const hasClosed = states.timeNow.gt(states.timeClose);
        const isOpen = !hasClosed && states.timeNow.gte(states.timeOpen);
        emitter.emit(PRESALE_STATE, {
          state: {
            ethRaised: this.fromWei(states.ethRaised),
            hasClosed: hasClosed,
            isOpen: isOpen,
            timeToNextEvent: hasClosed
              ? 0
              : isOpen
              ? states.timeClose.sub(states.timeNow)
              : states.timeOpen.sub(states.timeNow),
            ethUser: this.fromWei(states.userEthAmount),
            tokenUser: this.fromWei(states.userTokenAmount),
          },
        });
      }
    } catch (e) {
      emitter.emit(PRESALE_STATE, { error: e.message });
    }
  };

  _getPresaleContractAddress() {
    return this.presaleContractRO?.address;
  }

  _getTokenContractData = async (payloadContent: PayloadContent) => {
    async.parallel(
      [
        (callbackInner) => {
          this._getTokenAmount(payloadContent, callbackInner);
        },
      ],
      (err, data: unknown) => {
        if (err) {
          console.log(err);
          emitter.emit(ERC20_TOKEN_CONTRACT, { error: err.toString() });
        } else {
          const asset: TokenContractResult = { tokenAmount: 0 };
          const numberArray = data as Array<number>;
          asset.tokenAmount = numberArray[0];
          emitter.emit(ERC20_TOKEN_CONTRACT, asset);
        }
      }
    );
  };

  // Buy tokens for {amount} ETH
  _doPresale = async (payloadContent: PayloadContent) => {
    try {
      const { amount } = payloadContent;
      const investAmount = { value: this.toWei(amount) };

      const tx:
        | ethers.ContractTransaction
        | undefined = await this.presaleContract?.buyTokens(
        this.address,
        investAmount
      );
      emitter.emit(TX_HASH, tx?.hash);

      await tx?.wait();
      emitter.emit(PRESALE_BUY, {});
    } catch (e) {
      emitter.emit(PRESALE_BUY, { error: e.message });
    }
  };

  _getTokenAmount = async (payloadContent: PayloadContent, callback: cbf) => {
    try {
      const result = ethers.BigNumber.from(0);
      //const result = await this.tokenContract.balanceOf(this.address);
      callback(null, this.fromWei(result));
    } catch (e) {
      console.log(e);
      return callback(e);
    }
  };

  fromWei(n: ethers.BigNumber, decimals = 18) {
    return parseFloat(ethers.utils.formatUnits(n, decimals));
  }

  toWei(n: number, decimals = 18) {
    const parsed = typeof n === 'number' ? n.toFixed(decimals) : n;
    return ethers.utils.parseUnits(parsed, decimals);
  }
}

const StoreClasses = {
  store: new Store(),
  emitter: emitter,
  dispatcher: dispatcher,
};

export { StoreClasses };
