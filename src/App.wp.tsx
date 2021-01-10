/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import React from 'react';

import Presale from './components/presale/presale';
import { StoreContainer } from './dapp/stores/store';

class App extends React.Component {
  render(): JSX.Element {
    return (
      <div className="App">
        <StoreContainer>
          <Presale />
        </StoreContainer>
      </div>
    );
  }
}

export default App;
