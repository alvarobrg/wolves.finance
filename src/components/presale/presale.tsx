/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './presale.css';

import React, { Component, ReactNode } from 'react';

import DappHeader from '../../dapp/components/header/header';
import DappForm from '../../dapp/components/presale/presale';
import { TimeTicker } from '../timeticker';

class PresaleForm extends DappForm {
  tickerHandle: number | undefined = undefined;

  componentWillUnmount(): void {
    super.componentWillUnmount();
    if (this.tickerHandle !== undefined) clearInterval(this.tickerHandle);
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

  _manageTimers(
    isOpen: boolean,
    hasClosed: boolean,
    timeToNextEvent: number
  ): void {
    super._manageTimers(isOpen, hasClosed, timeToNextEvent);

    window.dispatchEvent(
      new CustomEvent('PRESALE_TICKER', {
        detail: {
          text: isOpen
            ? 'PRE-SALE IS LIVE NOW'
            : hasClosed
            ? 'PRE-SALE IS OVER'
            : 'PRE-SALE COUNTDOWN IS ON',
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

  _renderStatus(): ReactNode {
    return (
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
            {this.state.ethRaised.toFixed(2).toString().replace('.', ',')} ETH
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

class Presale extends Component<unknown> {
  textRef: React.RefObject<HTMLSpanElement> = React.createRef();
  clockRef: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: unknown) {
    super(props);
    this.handleTickEvent = this.handleTickEvent.bind(this);
  }

  componentDidMount(): void {
    window.addEventListener('PRESALE_TICKER', this.handleTickEvent);
  }

  componentWillUnmount(): void {
    window.removeEventListener('PRESALE_TICKER', this.handleTickEvent);
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

  render(): ReactNode {
    return (
      <div className="tk-aktiv-grotesk-condensed presale-main presale-column">
        <div className="helper-conn-btn" />
        <div className="presale-Info">
          <TimeTicker textRef={this.textRef} clockRef={this.clockRef} />
        </div>
        <DappHeader />
        <div className="presale-text-container presale-column">
          <div className="presale-text presale-text-top presale-small-top">
          Presale will occur in 1 round with a current hard cap of 100ETH. There will be a maximum cap of 3ETH per wallet. Keep in touch through our Telegram and Discord channels linked in header
          </div>
          <div className="presale-text presale-text-width presale-small">
          <b>The pre-sale, when it goes live, will run directly through our contract, integrated here, which will automatically lock 50% of all ETH sent to the contract ready for Uniswap Liquidity and will send the other 50% to our vested team wallet which will be used for marketing & development.</b>
          </div>
          <div className="presale-text presale-text-width presale-small">
          <b>Bought tokens are locked in the contract until after the presale closes, at which point users can claim their tokens. Any remaining WOLF token not bought from the presale allocation of 3000, will be added to the rewards pool for public investors.</b>
          </div>
        </div>
        <PresaleForm />
      </div>
    );
  }
}

export default Presale;
