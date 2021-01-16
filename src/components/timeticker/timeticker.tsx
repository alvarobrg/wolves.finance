/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './timeticker.css';

import React, { Component, ReactNode } from 'react';

type TimeTickerProps = {
  value: string;
  description: string;
  footer: string;
  textRef: React.RefObject<HTMLSpanElement>;
  footerRef: React.RefObject<HTMLSpanElement>;
  clockRef: React.RefObject<HTMLDivElement>;
};

class TimeTicker extends Component<TimeTickerProps> {
  render(): ReactNode {
    return (
      <>
        <span className="ticker-text" ref={this.props.textRef}>
          {this.props.value}
        </span>
        <br />
        <span className="ticker-description">{this.props.description}</span>
        <div
          className="tk-grotesk-bold time-ticker"
          ref={this.props.clockRef}
        />
        <span className="ticker-footer" ref={this.props.footerRef}>
          {this.props.footer}
        </span>
      </>
    );
  }
}

export { TimeTicker };
