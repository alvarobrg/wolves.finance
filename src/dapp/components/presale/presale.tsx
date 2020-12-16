/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import React, { Component, ReactNode } from 'react';

import {
  CONNECTION_CHANGED,
  PRESALE_BUY,
  PRESALE_STATE,
} from '../../stores/constants';
import {
  ConnectResult,
  PresaleResult,
  StatusResult,
  StoreClasses,
} from '../../stores/store';

interface CSTATE {
  connected: boolean;
  waiting: boolean;
  inputValid: boolean;
  ethRaised: number;
  hasClosed: boolean;
  isOpen: boolean;
  timeToNextEvent: number;
  ethUser: number;
  tokenUser: number;
}

const INITIALSTATE: CSTATE = {
  connected: false,
  waiting: false,
  inputValid: false,
  ethRaised: 0,
  hasClosed: false,
  isOpen: false,
  timeToNextEvent: 0,
  ethUser: 0,
  tokenUser: 0,
};

class Presale extends Component<unknown, CSTATE> {
  emitter = StoreClasses.emitter;
  dispatcher = StoreClasses.dispatcher;
  static readonly defaultEthValue = '0 ETH';
  inputRef: React.RefObject<HTMLInputElement> = React.createRef();
  timeoutHandle: NodeJS.Timeout | undefined = undefined;

  constructor(props: unknown) {
    super(props);
    this.state = { ...INITIALSTATE };

    this.handleOnBlur = this.handleOnBlur.bind(this);
    this.handleOnFocus = this.handleOnFocus.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onPresaleState = this.onPresaleState.bind(this);
    this.onPresaleBuy = this.onPresaleBuy.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
  }

  componentDidMount(): void {
    this.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    this.emitter.on(PRESALE_STATE, this.onPresaleState);
    this.emitter.on(PRESALE_BUY, this.onPresaleBuy);
  }

  componentWillUnmount(): void {
    this.emitter.off(PRESALE_BUY, this.onPresaleBuy);
    this.emitter.off(PRESALE_STATE, this.onPresaleState);
    this.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.address === '') this.setState({ ...INITIALSTATE });
    else {
      this.setState({ connected: true });
      this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
    }
  }

  onPresaleState(params: PresaleResult): void {
    if (params['error'] === undefined) {
      this.setState(params.state);
      if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
      if (params.state.timeToNextEvent)
        this.timeoutHandle = setTimeout(
          this.onTimeout,
          params.state.timeToNextEvent * 1000
        );
    }
  }

  onTimeout(): void {
    this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
  }

  onPresaleBuy(params: StatusResult): void {
    this.setState({ waiting: false });
    if (params['error'] === undefined && this.inputRef.current) {
      this.inputRef.current.value = Presale.defaultEthValue;
      this.setState({ inputValid: false });
    }
  }

  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    this.setState({ waiting: true });
    if (this.inputRef.current) {
      const amount = parseFloat(this.inputRef.current.value.replace(',', '.'));
      this.dispatcher.dispatch({
        type: PRESALE_BUY,
        content: { amount: amount },
      });
    }
    event.preventDefault();
  }

  handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    event.target.value = event.target.value
      .replace(/[^0-9,.]/gi, '')
      .replace('.', ',');
    this.setState({
      inputValid: parseFloat(event.target.value.replace(',', '.')) > 0,
    });
  }

  handleOnFocus(event: React.FocusEvent<HTMLInputElement>): void {
    if (event.target.value.indexOf('ETH') >= 0) event.target.value = '';
  }

  handleOnBlur(event: React.FocusEvent<HTMLInputElement>): void {
    if (event.target.value.trim() === '')
      event.target.value = Presale.defaultEthValue;
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
          id="eth_amount"
          ref={this.inputRef}
          className="dp-pre-input"
          onChange={this.handleOnChange}
          onFocus={this.handleOnFocus}
          onBlur={this.handleOnBlur}
        />
        <input
          className="dp-pre-btn"
          type="submit"
          value={
            this.state.hasClosed
              ? 'CLOSED'
              : !this.state.isOpen
              ? 'NOT OPEN'
              : this.state.waiting
              ? '...'
              : 'SEND'
          }
          disabled={
            !(this.state.isOpen && this.state.connected) ||
            this.state.waiting ||
            !this.state.inputValid
          }
        />
        {this._renderStatus(this.state.ethRaised)}
      </form>
    );
  }
}

export default Presale;
