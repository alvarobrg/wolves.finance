/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

import './howto.css';

import React, { Component, ReactNode } from 'react';

import howto from '../../assets/howto.jpg';

class HowTo extends Component {
  render(): ReactNode {
    return <img alt="" className="howto-img" src={howto} />;
  }
}

export default HowTo;
