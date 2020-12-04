import WalletConnectProvider from '@walletconnect/web3-provider';
import async from 'async';
import { ethers } from 'ethers';
import Emitter from 'events';
import Dispatcher from 'flux';
import Web3Modal from 'web3modal';

//import config from '../config/config';
import {
  CONNECTION_CHANGED,
  ERC20_TOKEN_CONTRACT,
  ERROR,
  ETH_PRESALE,
  POOL_HASH,
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
  address: string;
  networkName: string;
};

type cbf = async.AsyncResultCallback<unknown, Error>;

class Store {
  web3Modal: Web3Modal;
  ethersProvider: ethers.providers.Web3Provider | null = null;
  eventProvider: ethers.providers.InfuraWebSocketProvider | null = null;
  networkName = 'mainnet';
  chainId = 1;
  address = '';
  assets = {};

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
          this.getTokenContractData(_payload.content);
          break;
        case ETH_PRESALE:
          this.doPresale(_payload.content);
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
        this.disconnect();
      }
      const web3Provider = await this.web3Modal.connect();
      await this.subscribeProvider(web3Provider);

      this.ethersProvider = new ethers.providers.Web3Provider(web3Provider);
      const accounts = await this.ethersProvider.listAccounts();
      this.address = accounts[0];
      const network = await this.ethersProvider.getNetwork();
      this.chainId = network.chainId;
      this.networkName = network.name;
      this.eventProvider = ethers.providers.InfuraProvider.getWebSocketProvider(
        this.networkName,
        process.env.REACT_APP_INFURA_ID
      );
      this._emitNetworkChange();
    } catch (e) {
      console.log(e);
      await this.disconnect();
    }
  };

  autoconnect = async () => {
    if (this.web3Modal.cachedProvider) {
      await this.connect();
    }
  };

  subscribeProvider = async (provider: ethers.providers.Provider) => {
    if (!provider.on) {
      return;
    }

    provider.on('close', () => {
      this.disconnect();
    });

    provider.on('disconnect', () => {
      this.disconnect();
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
          this.chainId = network.chainId;
          this.networkName = network.name;
          this._emitNetworkChange();
        }
      }
    });
  };

  disconnect = async () => {
    if (this.ethersProvider) {
      localStorage.removeItem('walletconnect');
      this.ethersProvider.removeAllListeners();
      this.ethersProvider = null;
    }
    this.web3Modal.clearCachedProvider();
    this.address = '';
    this._emitNetworkChange();
  };

  isConnected = () => {
    return this.ethersProvider !== null;
  };

  setupEvents() {
    return true;
  }

  _emitNetworkChange() {
    const result: ConnectResult = {
      address: this.address,
      networkName: this.networkName,
    };
    emitter.emit(CONNECTION_CHANGED, result);
  }

  /******************** Contracts *********************/

  setupContracts = async () => {
    return true;
  };

  getTokenContractData(payloadContent: PayloadContent) {
    async.parallel(
      [
        (callbackInner) => {
          this._getTokenAmount(payloadContent, callbackInner);
        },
      ],
      (err, data: unknown) => {
        if (err) {
          console.log(err);
          emitter.emit(ERROR, { error: err.toString() });
        } else {
          const asset: TokenContractResult = { tokenAmount: 0 };
          const numberArray = data as Array<number>;
          asset.tokenAmount = numberArray[0];
          emitter.emit(ERC20_TOKEN_CONTRACT, asset);
        }
      }
    );
  }

  // Buy tokens for {amount} ETH
  doPresale(payloadContent: PayloadContent) {
    try {
      const { amount } = payloadContent;
      const investAmount = this.toWei(amount);

      /*const tx = await asset.contract.functions[asset.invest](investAmount);
      emitter.emit(POOL_HASH, tx.hash);

      await tx.wait();
      emitter.emit(POOL_INVEST, { id: asset.id, txHash: tx.hash });*/
    } catch (e) {
      emitter.emit(ERROR, e.message);
    }
  }

  _getTokenAmount(payloadContent: PayloadContent, callback: cbf) {
    try {
      const result = 0;
      //const result = await this.tokenContract.balanceOf(this.address);
      callback(null, this.fromWei(result));
    } catch (e) {
      console.log(e);
      return callback(e);
    }
  }

  fromWei(n: number, decimals = 18) {
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
