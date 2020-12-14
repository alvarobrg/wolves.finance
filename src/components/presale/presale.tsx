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
  _renderStatus(ethRaised: number): ReactNode {
    ethRaised = 50.0;
    return (
      <div className="progress-form">
        <div
          className="progress-label"
          style={{ textAlign: 'right', paddingRight: '6px' }}
        >
          {ethRaised.toFixed(2)} ETH
        </div>
        <div className="progress-outer">
          <div
            className="progress-inner"
            style={{ width: (ethRaised * 100) / 150 + '%' }}
          />
        </div>
        <div
          className="progress-label"
          style={{ textAlign: 'left', paddingLeft: '6px' }}
        >
          150 ETH
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
          <div className="presale-text">
            3000 WOLF tokens on sale -<br />
            <b>
              Round 1 - Presale price = 150 ETH cap = $10
              <br />
              Market price to be set at $15
            </b>
          </div>
          <div className="presale-text">
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
