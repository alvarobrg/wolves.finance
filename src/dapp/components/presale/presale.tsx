/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import React, { Component, ReactNode } from 'react';

import { CONNECTION_CHANGED } from '../../stores/constants';
import { ConnectResult, StoreClasses } from '../../stores/store';

interface CSTATE {
  connected: boolean;
  ethRaised: number;
}

class Presale extends Component<unknown, CSTATE> {
  emitter = StoreClasses.emitter;
  static readonly defaultEthValue = '0 ETH';
  ethValue = Presale.defaultEthValue;

  constructor(props: unknown) {
    super(props);
    this.state = { connected: false, ethRaised: 0 };

    this.handleOnBlur = this.handleOnBlur.bind(this);
    this.handleOnFocus = this.handleOnFocus.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
  }

  componentDidMount(): void {
    this.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  componentWillUnmount(): void {
    this.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    this.setState({ connected: params.address !== '' });
  }

  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
  }

  handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    event.target.value = event.target.value
      .replace(/[^0-9,.]/gi, '')
      .replace('.', ',');
  }

  handleOnFocus(event: React.FocusEvent<HTMLInputElement>): void {
    if (event.target.value.indexOf('ETH') >= 0)
      this.ethValue = event.target.value = '';
  }

  handleOnBlur(event: React.FocusEvent<HTMLInputElement>): void {
    if (event.target.value.trim() === '')
      this.ethValue = event.target.value = Presale.defaultEthValue;
  }

  _renderStatus(ethRaised: number): ReactNode {
    return <div />;
  }

  render(): ReactNode {
    return (
      <form className="dp-pre-form" onSubmit={this.handleSubmit}>
        <input
          type="text"
          defaultValue={Presale.defaultEthValue}
          name="eth_amount"
          className="dp-pre-input"
          onChange={this.handleOnChange}
          onFocus={this.handleOnFocus}
          onBlur={this.handleOnBlur}
        />
        <input className="dp-pre-btn" type="submit" value="SEND" />
        {this._renderStatus(this.state.ethRaised)}
      </form>
    );
  }
}

export default Presale;
