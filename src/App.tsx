/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See LICENSE.txt for more information.
 */

import './App.css';

import React from 'react';

import Header from './components/header/header';
import Presale from './components/presale';
import { StoreClasses } from './stores/store';

const store = StoreClasses.store;

class App extends React.Component {
  componentDidMount(): void {
    store.autoconnect();
  }

  componentWillUnmount(): void {
    store.disconnect();
  }

  render(): JSX.Element {
    return (
      <div className="App">
        <Header />
        <Presale />
      </div>
    );
  }
}

export default App;
