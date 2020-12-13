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

import Header from './components/header/header';
import HowTo from './components/howto/howto';
import Info from './components/info/info';
import News from './components/news/news';

//import Presale from './components/presale';
//import { StoreClasses } from './stores/store';

//const store = StoreClasses.store;

class App extends React.Component {
  componentDidMount(): void {
    //    store.autoconnect();
  }

  componentWillUnmount(): void {
    //  store.disconnect();
  }

  render(): JSX.Element {
    return (
      <div className="App">
        <Header />
        <News />
        <HowTo />
        <Info />
        {/*<Presale />*/}
      </div>
    );
  }
}

export default App;
