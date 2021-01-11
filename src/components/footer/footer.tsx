/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './footer.css';

import React, { Component, ReactNode } from 'react';

import Social from './social';

class Footer extends Component<unknown> {
  render(): ReactNode {
    return (
      <div className="footer-main">
        <p className="footer-notes tk-vincente-bold">
          AS A USER OF THE WOLVES PLATFORM & WOLF TOKEN YOU BY DEFAULT ARE IN
          AGREEMENT THAT YOU DO SO AT YOUR OWN RISK.
          <br />
          ALL LIABILITY RESIDES WITH THE USER. RISK ONLY WHAT YOU ARE WILLING TO
          LOSE.
          <br />
          COPYRIGHT ALL RIGHTS RESERVED WOLVES OF WALL STREET 2021
        </p>
        <Social />
      </div>
    );
  }
}

export { Footer };
