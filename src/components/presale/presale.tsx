/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './presale.css';

import React, { Component, ReactNode } from 'react';

import DappHeader from '../../dapp/components/header/header';
import DappForm from '../../dapp/components/presale/presale';

class PresaleForm extends DappForm {
  _renderStatus(): ReactNode {
    return (
      <div>
        <div className="presale-text presale-smaller">
          Or send ETH to our pre-sale contract:
          <br /> <b>{this._getPresaleContractAddress()}</b>
        </div>
        <div className="progress-form">
          <div
            className="progress-label"
            style={{ textAlign: 'right', paddingRight: '6px' }}
          >
            {this.state.ethRaised.toFixed(2)} ETH
          </div>
          <div className="progress-outer">
            <div
              className="progress-inner"
              style={{ width: (this.state.ethRaised * 100) / 150 + '%' }}
            />
          </div>
          <div
            className="progress-label"
            style={{ textAlign: 'left', paddingLeft: '6px' }}
          >
            150 ETH
          </div>
        </div>
      </div>
    );
  }
}

class Presale extends Component {
  render(): ReactNode {
    return (
      <div className="presale-main presale-column">
        <div className="helper-conn-btn" />
        <div className="presale-Info">
          <span className="ticker-text">PRE-SALE IS LIVE NOW</span>
          <div className="time-ticker" />
        </div>
        <DappHeader />
        <div className="presale-text-container presale-column">
          <div className="presale-text presale-small">
            3000 WOLF tokens on pre-sale -<br />
            <b>
              Round 1 - 1 ETH = 20 WOLF (~$30 / WOLF)
              <br />
              Market price to be set at ~$40 / WOLF
              <br />
              Pre-sale cap per wallet: 3 ETH / 60 WOLF
            </b>
          </div>
          <div className="presale-text presale-small">
            ETH from pre-sale is stored in our multi-sig wallet.
            <br />
            After pre-sale we set up the UNI-V2 LP pool.
            <br />
            See tokenomics for more information
          </div>
        </div>
        <PresaleForm />
      </div>
    );
  }
}

export default Presale;
