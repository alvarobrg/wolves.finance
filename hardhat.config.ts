/*
 * Copyright (C) 2020 wolves.finance developers
 * This file is part of wolves.finance - https://github.com/peak3d/wolves.finance
 *
 * SPDX-License-Identifier: Apache-2.0
 * See the file LICENSES/README.md for more information.
 */

/* eslint @typescript-eslint/ban-ts-comment: "off" */
// @ts-ignore

/**
 * You need to export an object to set up your config. Go to
 * https://hardhat.org/config/ to learn more.
 *
 * @type import('hardhat/config').HardhatUserConfig
 */
const config = {
  solidity: {
    compilers: [
      {
        version: '0.7.4',
        settings: {
          evmVersion: 'berlin',
          optimizer: {
            enabled: true,
            runs: 1000000,
            details: {
              yul: true,
              deduplicate: true,
              cse: true,
              constantOptimizer: true,
            },
          },
        },
      },
      {
        version: '0.6.5',
        settings: {
          evmVersion: 'berlin',
          optimizer: {
            enabled: true,
            runs: 1000000,
            details: {
              yul: true,
              deduplicate: true,
              cse: true,
              constantOptimizer: true,
            },
          },
        },
      },
    ],
  },
  loggingEnabled: true,
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      tags: ['test', 'local'],
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};

module.exports = config;
