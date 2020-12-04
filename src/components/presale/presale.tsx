import React from 'react';

import { CONNECTION_CHANGED } from '../../stores/constants';
import { ConnectResult, StoreClasses } from '../../stores/store';

interface CSTATE {
  connected: boolean;
}

const emitter = StoreClasses.emitter;

class Presale extends React.Component<unknown, CSTATE> {
  componentDidMount(): void {
    emitter.on(CONNECTION_CHANGED, this.onConnectionChanged.bind(this));
  }

  componentWillUnmount(): void {
    emitter.off(CONNECTION_CHANGED, this.onConnectionChanged.bind(this));
  }

  onConnectionChanged(params: ConnectResult): void {
    this.setState({ connected: params.address !== '' });
  }

  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
  }

  handleOnChange(event: React.ChangeEvent<HTMLInputElement>): void {
    //event.preventDefault();
  }

  render(): JSX.Element {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>ETH amount:</label>
        <input
          type="text"
          value="0"
          name="eth_amount"
          onChange={this.handleOnChange}
        />
        <input type="submit" value="Buy Token" />
      </form>
    );
  }
}

export default Presale;
