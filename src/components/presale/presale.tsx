/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './presale.css';

import React, { Component, createRef, ReactNode } from 'react';
import { TFunction, withTranslation } from 'react-i18next';

import {
  CONNECTION_CHANGED,
  PRESALE_BUY,
  PRESALE_CLAIM,
  PRESALE_STATE,
} from '../../stores/constants';
import {
  ConnectResult,
  PresaleResult,
  StatusResult,
  StoreClasses,
} from '../../stores/store';
import { TimeTicker } from '../timeticker';

type PRESALEPROPS = {
  t: TFunction;
};

type PRESALESTATE = {
  connected: boolean;
  waiting: boolean;
  inputValid: boolean;
  ethRaised: number;
  hasClosed: boolean;
  isOpen: boolean;
  timeToNextEvent: number;
  ethUser: number;
  ethInvested: number;
  tokenUser: number;
  tokenLocked: number;
};

const INITIALSTATE: PRESALESTATE = {
  connected: false,
  waiting: false,
  inputValid: false,
  ethRaised: 0,
  hasClosed: true,
  isOpen: false,
  timeToNextEvent: 0,
  ethUser: 0,
  ethInvested: 0,
  tokenUser: 0,
  tokenLocked: 0,
};

const INITIALCONNSTATE = {
  connected: false,
  ethUser: 0,
  ethInvested: 0,
  tokenUser: 0,
  tokenLocked: 0,
};

const FAILURESTATE = {
  ethRaised: 0,
  hasClosed: true,
  isOpen: false,
  timeToNextEvent: 0,
  ethUser: 0,
  ethInvested: 0,
  tokenUser: 0,
  tokenLocked: 0,
};

class Presale extends Component<PRESALEPROPS, PRESALESTATE> {
  emitter = StoreClasses.emitter;
  dispatcher = StoreClasses.dispatcher;
  static readonly defaultEthValue = '0 ETH';

  textRef: React.RefObject<HTMLSpanElement> = React.createRef();
  clockRef: React.RefObject<HTMLDivElement> = React.createRef();
  inputRef: React.RefObject<HTMLInputElement> = createRef();
  buttonRef: HTMLInputElement | null = null;
  timeoutHandle: NodeJS.Timeout | undefined = undefined;
  tickerHandle: number | undefined = undefined;

  constructor(props: PRESALEPROPS) {
    super(props);
    this.state = { ...INITIALSTATE };

    this.handleOnBlur = this.handleOnBlur.bind(this);
    this.handleOnFocus = this.handleOnFocus.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClaim = this.handleClaim.bind(this);
    this.onConnectionChanged = this.onConnectionChanged.bind(this);
    this.onPresaleState = this.onPresaleState.bind(this);
    this.onPresaleBuy = this.onPresaleBuy.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.handleTickEvent = this.handleTickEvent.bind(this);
    this.onButtonRefChanged = this.onButtonRefChanged.bind(this);
  }

  componentDidMount(): void {
    this.emitter.on(CONNECTION_CHANGED, this.onConnectionChanged);
    this.emitter.on(PRESALE_STATE, this.onPresaleState);
    this.emitter.on(PRESALE_BUY, this.onPresaleBuy);
    if (StoreClasses.store.isEventConnected())
      this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
    window.addEventListener('PRESALE_TICKER', this.handleTickEvent);
  }

  componentWillUnmount(): void {
    this.emitter.off(PRESALE_BUY, this.onPresaleBuy);
    this.emitter.off(PRESALE_STATE, this.onPresaleState);
    this.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
    window.removeEventListener('PRESALE_TICKER', this.handleTickEvent);
    if (this.tickerHandle !== undefined) clearInterval(this.tickerHandle);
  }

  onConnectionChanged(params: ConnectResult): void {
    if (params.type === 'event') {
      this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
    } else if (params.address === '') {
      this.setState(INITIALCONNSTATE);
    } else {
      this.setState({ connected: true });
      this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
    }
  }

  onPresaleState(params: PresaleResult): void {
    if (params['error'] === undefined) {
      this.setState(params.state);
      this._manageTimers(
        params.state.isOpen,
        params.state.hasClosed,
        params.state.timeToNextEvent
      );
    } else {
      this.setState(FAILURESTATE);
      this._manageTimers(false, true, 0);
    }
  }

  onTimeout(): void {
    this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
  }

  onTicker(tickerEnd: number): void {
    const secondsLeft = tickerEnd - Date.now() + 500;

    if (secondsLeft < 0) return;

    const msecInMinute = 1000 * 60;
    const msecInHour = msecInMinute * 60;
    const msecInDay = msecInHour * 24;

    const days = Math.floor(secondsLeft / msecInDay)
      .toString()
      .padStart(2, '0');
    const hours = Math.floor((secondsLeft % msecInDay) / msecInHour)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((secondsLeft % msecInHour) / msecInMinute)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor((secondsLeft % msecInMinute) / 1000)
      .toString()
      .padStart(2, '0');

    const result = days + 'd:' + hours + 'h:' + minutes + 'm:' + seconds + 's';
    window.dispatchEvent(
      new CustomEvent('PRESALE_TICKER', { detail: { time: result } })
    );
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

  handleClaim(event: React.MouseEvent): void {
    this.dispatcher.dispatch({
      type: PRESALE_CLAIM,
      content: { amount: 0 },
    });
  }

  handleTickEvent(event: Event): void {
    const detail = (event as CustomEvent).detail;
    if (detail.time && this.clockRef.current)
      this.clockRef.current.innerHTML = detail.time;
    else if (detail.text && this.textRef.current) {
      this.textRef.current.innerHTML = detail.text;
      if (this.clockRef.current)
        this.clockRef.current.style.color = detail.isOpen ? 'lime' : 'red';
    }
  }

  _manageTimers(
    isOpen: boolean,
    hasClosed: boolean,
    timeToNextEvent: number
  ): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = undefined;
    }
    if (timeToNextEvent)
      this.timeoutHandle = setTimeout(this.onTimeout, timeToNextEvent * 1000);
    const { t } = this.props;
    window.dispatchEvent(
      new CustomEvent('PRESALE_TICKER', {
        detail: {
          text: isOpen
            ? t('presale.notOpen')
            : hasClosed
            ? t('presale.closed')
            : t('presale.live'),
          isOpen: isOpen,
        },
      })
    );

    if (this.tickerHandle !== undefined) {
      clearInterval(this.tickerHandle);
      this.tickerHandle = undefined;
    }
    if (timeToNextEvent) {
      this.tickerHandle = setInterval(this.onTicker, 1000, [
        Date.now() + timeToNextEvent * 1000,
      ]);
    } else
      window.dispatchEvent(
        new CustomEvent('PRESALE_TICKER', { detail: { time: '-- : --' } })
      );
  }

  _getPresaleContractAddress(): string {
    return StoreClasses.store._getPresaleContractAddress() || '';
  }

  onButtonRefChanged(ref: HTMLInputElement): void {
    this.buttonRef = ref;
    this.forceUpdate();
  }

  render(): ReactNode {
    const disabled =
      !(this.state.isOpen && this.state.connected) ||
      this.state.waiting ||
      !this.state.inputValid;

    const claimDisabled = !this.state.connected || this.state.tokenLocked <= 0;

    const investLimit = Math.min(
      this.state.ethUser,
      3.0 - this.state.ethInvested
    );

    const { t } = this.props;

    return (
      <div className="tk-aktiv-grotesk-condensed presale-main presale-column">
        <div className="presale-info">
          <TimeTicker
            value={t('presale.unknown')}
            textRef={this.textRef}
            clockRef={this.clockRef}
          />
        </div>
        <div className="presale-text-container presale-column">
          <div className="presale-text presale-text-top presale-small-top">
            Presale will occur in 1 round with a current hard cap of 100ETH.
            There will be a maximum cap of 3ETH per wallet. Keep in touch
            through our Telegram and Discord channels linked in header
          </div>
          <div className="presale-text presale-text-width presale-small">
            <b>
              The pre-sale, when it goes live, will run directly through our
              contract, integrated here, which will automatically lock 50% of
              all ETH sent to the contract ready for Uniswap Liquidity and will
              send the other 50% to our vested team wallet which will be used
              for marketing & development.
            </b>
          </div>
          <div className="presale-text presale-text-width presale-small">
            <b>
              Bought tokens are locked in the contract until after the presale
              closes, at which point users can claim their tokens. Any remaining
              WOLF token not bought from the presale allocation of 3000, will be
              added to the rewards pool for public investors.
            </b>
          </div>
        </div>
        <form className="dp-pre-form" onSubmit={this.handleSubmit}>
          <span className="dp-pre-label">
            Your spend limit:{' '}
            {this.state.connected
              ? investLimit.toFixed(2).toString().replace('.', ',')
              : '--,--'}{' '}
            ETH
          </span>
          <br />
          <input
            type="text"
            defaultValue={Presale.defaultEthValue}
            name="eth_amount"
            id="eth_amount"
            ref={this.inputRef}
            autoComplete="off"
            className="dp-pre-input"
            onChange={this.handleOnChange}
            onFocus={this.handleOnFocus}
            onBlur={this.handleOnBlur}
          />
          <input
            className="dp-pre-btn"
            type="submit"
            value="SEND"
            disabled={disabled}
            ref={this.onButtonRefChanged}
          />
          <div>
            <div className="presale-text presale-smaller">
              Or send ETH to our pre-sale contract:
              <br /> <b>{this._getPresaleContractAddress()}</b>
            </div>
            <div className="tk-vincente-bold progress-form">
              <div
                className="progress-label"
                style={{ textAlign: 'right', paddingRight: '6px' }}
              >
                {this.state.ethRaised.toFixed(2).toString().replace('.', ',')}{' '}
                ETH
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
          <div className="dp-pre-claim-container">
            <span className="dp-pre-claim-label">
              {' '}
              WOLF token locked:&nbsp;
              <b>
                {this.state.connected
                  ? this.state.tokenLocked
                      .toFixed(2)
                      .toString()
                      .replace('.', ',')
                  : '-,-'}
              </b>
            </span>
            <input
              className="dp-pre-btn dp-pre-btn-claim"
              type="button"
              value="CLAIM"
              disabled={claimDisabled}
              onClick={this.handleClaim}
            />
          </div>
        </form>
      </div>
    );
  }
}

export default withTranslation()(Presale);
// for testing export without hook
export { Presale };
