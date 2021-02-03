/*
 * Copyright (C) 2020 The Wolfpack
 * This file is part of wolves.finance - https://github.com/wolvesofwallstreet/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */
import './presale.css';

import React, { Component, createRef, ReactNode } from 'react';
import { Clipboard } from 'react-bootstrap-icons';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { TFunction, withTranslation } from 'react-i18next';

import WolfToken from '../../assets/wolves-token_233.png';
import {
  CONNECTION_CHANGED,
  PRESALE_BUY,
  PRESALE_LIQUIDITY,
  PRESALE_STATE,
} from '../../stores/constants';
import {
  ConnectResult,
  PresaleResult,
  StatusResult,
  StoreClasses,
} from '../../stores/store';
import { TimeTicker } from '../timeticker';
import Social from './social';

type PRESALEPROPS = {
  t: TFunction;
};

type PRESALESTATE = {
  connected: boolean;
  waiting: boolean;
  inputValid: boolean;
  termsChecked: boolean;
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
  termsChecked: false,
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

  textRef: React.RefObject<HTMLSpanElement> = React.createRef();
  clockRef: React.RefObject<HTMLDivElement> = React.createRef();
  inputRef: React.RefObject<HTMLInputElement> = createRef();
  liquidityRef: React.RefObject<HTMLInputElement> = createRef();
  buttonRef: HTMLInputElement | null = null;
  checkRef: HTMLInputElement | null = null;

  timeoutHandle: NodeJS.Timeout | undefined = undefined;
  tickerHandle: number | undefined = undefined;

  static readonly EthMin = 0.2;
  static readonly EthMax = 3;
  // transform buy ETH into total ETH
  static readonly buy2Total = (68 * 4412 + 240000) / 240000;

  static readonly defaultEthValue = Presale.EthMin.toString();
  static readonly defaultLiquidityValue = (
    Presale.EthMin * Presale.buy2Total
  ).toFixed(2);

  investLimit = { min: Presale.EthMin, max: Presale.EthMax };
  liquidityLimit = {
    min: Presale.EthMin * Presale.buy2Total,
    max: Presale.EthMax * Presale.buy2Total,
  };

  constructor(props: PRESALEPROPS) {
    super(props);
    this.state = { ...INITIALSTATE };

    this.handleOnBlur = this.handleOnBlur.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
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
    this.emitter.on(PRESALE_LIQUIDITY, this.onPresaleBuy);
    if (StoreClasses.store.isEventConnected())
      this.dispatcher.dispatch({ type: PRESALE_STATE, content: {} });
    window.addEventListener('PRESALE_TICKER', this.handleTickEvent);
  }

  componentWillUnmount(): void {
    this.emitter.off(PRESALE_BUY, this.onPresaleBuy);
    this.emitter.off(PRESALE_STATE, this.onPresaleState);
    this.emitter.off(CONNECTION_CHANGED, this.onConnectionChanged);
    this.emitter.off(PRESALE_LIQUIDITY, this.onPresaleBuy);
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
      this._updateInvestLimits(params.state.ethUser, params.state.ethInvested);
      this.setState(params.state);
      this._manageTimers(
        params.state.isOpen,
        params.state.hasClosed,
        params.state.timeToNextEvent
      );
    } else {
      this._updateInvestLimits(0, 0);
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
    if (params['error'] === undefined) {
      if (this.inputRef.current) {
        this.inputRef.current.value = Presale.defaultEthValue;
      }
      if (this.liquidityRef.current) {
        this.liquidityRef.current.value = Presale.defaultLiquidityValue;
      }
      this._updateInvestLimits(this.state.ethUser, this.state.ethInvested);
    }
  }

  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    this.setState({ waiting: true });
    if (document.activeElement?.id === 'buy' && this.inputRef.current) {
      const amount = parseFloat(this.inputRef.current.value);
      this.dispatcher.dispatch({
        type: PRESALE_BUY,
        content: { amount: amount },
      });
    } else if (
      document.activeElement?.id === 'liquidity' &&
      this.liquidityRef.current
    ) {
      const amount = parseFloat(this.liquidityRef.current.value);
      this.dispatcher.dispatch({
        type: PRESALE_LIQUIDITY,
        content: { amount: amount },
      });
    } else this.setState({ waiting: false });
    event.preventDefault();
  }

  handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    event.target.value = event.target.value
      .replace(/[^0-9,.]/gi, '')
      .replace(',', '.');
    this._validateInput(event.target.value);
  }

  handleOnBlur(event: React.FocusEvent<HTMLInputElement>): void {
    if (event.target.value.trim() === '')
      event.target.value = Presale.defaultEthValue;
  }

  handleTickEvent(event: Event): void {
    const detail = (event as CustomEvent).detail;
    if (detail.time && this.clockRef.current) {
      this.clockRef.current.innerHTML = detail.time;
      if (this.buttonRef && !this.state.hasClosed && !this.state.isOpen) {
        this.buttonRef.value = this._getButtonText(detail.time);
      }
    } else if (detail.text && this.textRef.current) {
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
          text: hasClosed
            ? t('presale.closed')
            : isOpen
            ? t('presale.live')
            : t('presale.notOpen'),
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

  _calculateWOLF(val: string | undefined): string {
    return val && this.state.inputValid
      ? (parseFloat(val) * 40).toFixed(2).toString()
      : '--:--';
  }

  _updateInvestLimits(ethUser: number, ethInvested: number): void {
    this.investLimit.max = Math.min(
      this.state.connected ? ethUser : 3,
      3 - ethInvested
    );
    this.liquidityLimit.max = this.investLimit.max * Presale.buy2Total;
    this._validateInput(this.inputRef.current?.value);
  }

  _validateInput(val: string | undefined): void {
    const parsed = parseFloat(val || '0');
    this.setState({
      inputValid:
        parsed >= this.investLimit.min && parsed <= this.investLimit.max,
    });
  }

  _getButtonText(time: string | undefined): string {
    const { t } = this.props;
    return this.state.hasClosed
      ? t('presale.closed').toString()
      : t(time && !this.state.isOpen ? 'presale.buyIn' : 'presale.buy', {
          num: this._calculateWOLF(this.inputRef.current?.value),
          time: time,
        }).toString();
  }

  _getButtonTextLiquidity(time: string | undefined): string {
    const { t } = this.props;
    return this.state.hasClosed
      ? t('presale.closed').toString()
      : t(time && !this.state.isOpen ? 'presale.buyIn' : 'presale.buy', {
          num: this._calculateWOLF(this.inputRef.current?.value),
          time: time,
        }).toString();
  }

  onButtonRefChanged(ref: HTMLInputElement): void {
    this.buttonRef = ref;
    this.forceUpdate();
  }

  render(): ReactNode {
    const disabled =
      !(this.state.isOpen && this.state.connected) ||
      this.state.waiting ||
      !this.state.inputValid ||
      !this.state.termsChecked;

    //const claimDisabled = !this.state.connected || this.state.tokenLocked <= 0;
    const failureClass = this.state.inputValid ? '' : ' pcr-input-failure';

    const liquidityLimitFormatted = {
      min: this.liquidityLimit.min.toFixed(2),
      max: this.liquidityLimit.max.toFixed(2),
    };

    const { t } = this.props;

    return (
      <div className="tk-grotesk-lightbold presale-main">
        <div className="presale-info">
          <TimeTicker
            value={t('presale.unknown')}
            description={t('presale.description')}
            textRef={this.textRef}
            clockRef={this.clockRef}
          />
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
            75 ETH {t('presale.target')}
          </div>
        </div>
        <div className="presale-content-container">
          <div className="presale-content presale-content-left">
            <h1>
              {t('title')} {t('presale.id')}
            </h1>
            <h2>1 ETH = 40 WOLF</h2>
            <h3>
              75 ETH {t('presale.target')} - 3000 WOLF {t('presale.available')}
            </h3>
            <table>
              <tbody>
                <tr>
                  <td />
                  <td>
                    {t('presale.contract')}
                    <br />
                    {this._getPresaleContractAddress()}&nbsp;&nbsp;
                    <CopyToClipboard text={this._getPresaleContractAddress()}>
                      <Clipboard
                        style={{
                          color: 'var(--wolves-orange)',
                          cursor: 'pointer',
                          marginBottom: '2px',
                        }}
                      />
                    </CopyToClipboard>
                  </td>
                </tr>
                <tr>
                  <td />
                  <td>{t('presale.locked')}</td>
                </tr>
                <tr>
                  <td />
                  <td>{t('presale.wallet')}</td>
                </tr>
                <tr>
                  <td />
                  <td>{t('presale.limits')}</td>
                </tr>
              </tbody>
            </table>
            <hr />
            <span style={{ float: 'left' }}>
              <h3>{t('presale.followUs')}</h3>
            </span>
            <span style={{ float: 'right' }}>
              <Social />
            </span>
          </div>
          <div className="presale-content presale-content-right">
            <img alt={WolfToken} src={WolfToken} width="50px" />
            <br />
            <span className="tk-vincente-bold font24">WOLF {t('token')}</span>
            <form className="pcr-form" onSubmit={this.handleSubmit}>
              <table>
                <tbody>
                  <tr>
                    <td style={{ width: '16px' }}>
                      <input
                        onChange={(e) =>
                          this.setState({
                            termsChecked: e.currentTarget.checked,
                          })
                        }
                        id="terms"
                        type="checkbox"
                      />
                    </td>
                    <td colSpan={2}>
                      <label className="pcr-label" htmlFor="terms">
                        {t('presale.terms')}
                      </label>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <hr style={{ margin: '8px 0px 8px 0px' }} />
                    </td>
                  </tr>
                  {/************ Buy ************ */}
                  <tr>
                    <td colSpan={3}>
                      <span className="pcr-input-label">
                        {t('presale.purchase', this.investLimit)}
                      </span>
                      <br />
                      <div className="pcr-input-container">
                        <input
                          type="text"
                          defaultValue={Presale.defaultEthValue}
                          name="eth_amount"
                          id="eth_amount"
                          ref={this.inputRef}
                          autoComplete="off"
                          className={'pcr-input' + failureClass}
                          onChange={this.handleOnChange}
                          onBlur={this.handleOnBlur}
                        />
                        <div className="pcr-input-currency">ETH</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <input
                        id="buy"
                        className="pcr-btn"
                        type="submit"
                        value={this._getButtonText(undefined)}
                        disabled={disabled}
                        ref={this.onButtonRefChanged}
                      />
                    </td>
                  </tr>
                  {/************ Liquidity ************ */}
                  <tr>
                    <td colSpan={3}>
                      <span className="pcr-input-label">
                        {t('presale.liquidity', liquidityLimitFormatted)}
                      </span>
                      <br />
                      <div className="pcr-input-container">
                        <input
                          type="text"
                          defaultValue={Presale.defaultLiquidityValue}
                          name="eth_liquidity_invest"
                          id="eth_liquidity"
                          ref={this.liquidityRef}
                          autoComplete="off"
                          className={'pcr-input' + failureClass}
                          //onChange={this.handleOnChange}
                          //onBlur={this.handleOnBlur}
                        />
                        <div className="pcr-input-currency">ETH</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3}>
                      <input
                        id="liquidity"
                        className="pcr-btn"
                        type="submit"
                        value={this._getButtonTextLiquidity(undefined)}
                        disabled={disabled}
                        //ref={this.onButtonRefChanged}
                      />
                    </td>
                  </tr>
                  {/*<tr>
                    <td colSpan={2}>
                      WOLF {t('presale.tokenLocked')}:&nbsp;
                      <b>
                        {this.state.connected
                          ? this.state.tokenLocked.toFixed(2)
                          : '-,-'}
                      </b>
                    </td>
                    <td style={{ width: '80px' }}>
                      <input
                        className="pcr-btn"
                        type="button"
                        value={t('presale.claim').toString()}
                        disabled={claimDisabled}
                        onClick={this.handleClaim}
                      />
                    </td>
                  </tr>*/}
                </tbody>
              </table>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default withTranslation()(Presale);
// for testing export without hook
export { Presale };
