module.exports = {
  bugsnag: {
    token: process.env.BUGSNAG_TOKEN || null,
  },
  database: {
    connectionString: process.env.CONNECTION_STRING,
  },
  maxChunkSize: {
    default: parseInt(process.env.MAX_CHUNK_SIZE, 10),
    sushiswapSwap: {
      v3: 1800, // 30 minutes
    },
    uniswapV2Swap: {
      v3: 1800, // 30 minutes
    },
  },
  maxPollingInterval: parseInt(process.env.MAX_POLLING_INTERVAL, 10),
  minConfirmations: 12,
  minPollingInterval: parseInt(process.env.MIN_POLLING_INTERVAL, 10),
  pino: {
    elasticsearch: {
      batchSize: 200,
      index: 'logs_event_extractor',
      url: process.env.PINO_ELASTIC_SEARCH_URL || null,
    },
  },
  startBlock: {
    fill: {
      v2: 11973365,
      v3: 11973365,
    },
    limitOrderFilled: {
      v4: 11973365,
    },
    liquidityProviderSwap: {
      v4: 11973365,
    },
    logFill: {
      v1: 11973365,
    },
    rfqOrderFilled: {
      v4: 11591021,
    },
    sushiswapSwap: {
      v3: 1605168000, // Represents a point in time, not a block number
    },
    transformedErc20: {
      v3: 11973365,
    },
    uniswapV2Swap: {
      v3: 1605168000, // Represents a point in time, not a block number
    },
  },
  web3: {
    endpoint: process.env.WEB3_ENDPOINT,
    networkId: 1,
  },
};
