const { JOB, QUEUE } = require('../constants');
const { publishJob } = require('../queues');
const Event = require('../model/event');
const transactions = require('../transactions/get-transaction-by-hash');

/**
 * Scheduler which finds unprocessed events and publishes jobs to create their
 * associated fills. Decoupling scheduling from fill creation ensures that
 * events which cannot be processed for some reason don't cause a bottleneck
 * preventing other events from being processed.
 *
 * @param {Object} config
 */
const batchScheduleFillCreation = async ({ batchSize }, { logger }) => {
  logger.info(`scheduling creation of fills for next ${batchSize} events`);

  const events = await Event.find({
    'scheduler.fillCreationScheduled': null,
    type: {
      $in: [
        'LimitOrderFilled',
        'LiquidityProviderSwap',
        'RfqOrderFilled',
        'SushiswapSwap',
        'TransformedERC20',
        'UniswapV2Swap',
      ],
    },
  })
    .select('_id')
    .limit(batchSize)
    .lean();

  let eventsHashes = []
  events.map(event => eventsHashes.push(event.transactionHash));

  let fetchedTransactions = await transactions.getTransactionByHashes(eventsHashes);

  let eventsWithTransactions = []
  events.map(async (event) => {
      if (fetchedTransactions.find(hash => hash === event.transactionHash) !== null) {
          eventsWithTransactions.push(event);
      }
  })

  await Promise.all(
      eventsWithTransactions
        .map(event =>
      publishJob(QUEUE.EVENT_PROCESSING, JOB.CREATE_FILLS_FOR_EVENT, {
        eventId: event._id,
      }),
    ),
  );

  await Event.updateMany(
    {
      _id: { $in: eventsWithTransactions.map(event => event._id) },
    },
    { $set: { 'scheduler.fillCreationScheduled': true } },
  );

  logger.info(`scheduled creation of fills for ${eventsWithTransactions.length}  events`);
};

module.exports = batchScheduleFillCreation;
