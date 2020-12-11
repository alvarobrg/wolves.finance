/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import React from 'react';

import { CONNECTION_CHANGED } from '../../stores/constants';
import { ConnectResult, StoreClasses } from '../../stores/store';

interface CSTATE {
  address: string;
  networkName: string;
}

const store = StoreClasses.store;
const emitter = StoreClasses.emitter;

class Header extends React.Component<unknown, CSTATE> {
  constructor(props: unknown) {
    super(props);
    this.state = { address: '', networkName: '' };

    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount(): void {
    emitter.on(CONNECTION_CHANGED, this.onConnectionChanged.bind(this));
  }

  componentWillUnmount(): void {
    emitter.off(CONNECTION_CHANGED, this.onConnectionChanged.bind(this));
  }

  onConnectionChanged(params: ConnectResult): void {
    this.setState(params);
  }

  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    if (store.isConnected()) {
      store.disconnect();
    } else {
      store.connect();
    }
    event.preventDefault();
  }

  render(): JSX.Element {
    const { address, networkName } = this.state;
    const shortAddress =
      address !== ''
        ? address.substring(0, 6) +
          '...' +
          address.substring(address.length - 4, address.length) +
          '(' +
          networkName +
          ')'
        : 'Connect';

    return (
      <form onSubmit={this.handleSubmit}>
        <label>wolfpack.finance</label>
        <input type="submit" value={shortAddress} />
      </form>
    );
  }
}

export default Header;
