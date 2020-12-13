/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './news.css';

import React, { Component, ReactNode } from 'react';
import { Carousel } from 'react-bootstrap';

class News extends Component {
  render(): ReactNode {
    return (
      <div className="news-main">
        <span className="ticker-text">PRE-SALE COUNTDOWN IS ON</span>
        <div className="time-ticker" />
        <Carousel interval={null}>
          <Carousel.Item>
            <div className="slidex" />
          </Carousel.Item>
          <Carousel.Item>
            <div className="slidex" />
          </Carousel.Item>
          <Carousel.Item>
            <div className="slidex" />
          </Carousel.Item>
        </Carousel>
      </div>
    );
  }
}

export default News;
