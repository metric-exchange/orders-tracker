const moment = require('moment');
const mongoose = require('mongoose');
const Router = require('koa-router');

const { logSearch } = require('../../../search');
const Fill = require('../../../model/fill');
const InvalidParameterError = require('../../errors/invalid-parameter-error');
const middleware = require('../../middleware');
const searchFills = require('../../../fills/search-fills');
const transformFill = require('./util/transform-fill');
const transformFills = require('./util/transform-fills');

const parseDate = dateString => {
  if (
    dateString === undefined ||
    dateString === null ||
    dateString.trim().length === 0
  ) {
    return undefined;
  }

  return moment(dateString);
};

const parseBoolean = booleanString => {
  if (
    booleanString === undefined ||
    booleanString === null ||
    booleanString.trim().length === 0
  ) {
    return undefined;
  }

  return booleanString === 'true';
};

const normalizeQueryParam = param => {
  if (param === undefined || param === null) {
    return undefined;
  }

  if (param.trim().length === 0) {
    return undefined;
  }

  return param;
};

const createRouter = () => {
  const router = new Router({ prefix: '/fills' });

  router.get(
    '/',
    middleware.pagination({
      defaultLimit: 20,
      maxLimit: 50,
      maxPage: Infinity,
    }),
    middleware.number('protocolVersion'),
    middleware.number('valueFrom'),
    middleware.number('valueTo'),
    middleware.relayer('relayer'),
    middleware.token('token'),
    middleware.fillStatus('status'),
    middleware.trader('trader'),
    middleware.apps('apps'),
    middleware.enum('sortBy', ['date', 'protocolFeeUSD', 'value'], 'date'),
    middleware.enum('sortDirection', ['asc', 'desc'], 'desc'),
    async ({ pagination, params, request, response }, next) => {
      const { query } = request;
      const { limit, page } = pagination;

      const {
        apps,
        protocolVersion,
        relayer,
        sortBy,
        sortDirection,
        status,
        token,
        trader,
        valueFrom,
        valueTo,
      } = params;

      const bridged = parseBoolean(query.bridged);
      const bridgeAddress = normalizeQueryParam(query.bridgeAddress);
      const dateFrom = parseDate(query.dateFrom);
      const dateTo = parseDate(query.dateTo);
      const searchTerm = normalizeQueryParam(query.q);

      if (dateFrom !== undefined && !dateFrom.isValid()) {
        throw new InvalidParameterError(
          'Must be in ISO 8601 format',
          'Invalid query parameter: dateFrom',
        );
      } else if (
        dateFrom !== undefined &&
        dateTo !== undefined &&
        dateFrom > dateTo
      ) {
        throw new InvalidParameterError(
          'Cannot be greater than dateTo',
          'Invalid query parameter: dateFrom',
        );
      }

      if (dateTo !== undefined && !dateTo.isValid()) {
        throw new InvalidParameterError(
          'Must be in ISO 8601 format',
          'Invalid query parameter: dateTo',
        );
      }

      const [{ docs, pages, total }] = await Promise.all([
        searchFills(
          {
            apps,
            bridgeAddress,
            bridged,
            dateFrom,
            dateTo,
            protocolVersion,
            query: searchTerm,
            relayerId: relayer,
            status,
            token,
            trader,
            valueFrom,
            valueTo,
          },
          { limit, page, sortBy, sortDirection },
        ),
        searchTerm !== undefined
          ? logSearch(searchTerm, new Date())
          : Promise.resolve(),
      ]);

      response.body = {
        fills: transformFills(docs),
        limit,
        page,
        pageCount: pages,
        total,
      };

      await next();
    },
  );

  router.get('/:id', async ({ params, response }, next) => {
    const fillId = params.id;
    const fill = mongoose.Types.ObjectId.isValid(fillId)
      ? await Fill.findById(fillId, undefined, {
          populate: [
            {
              path: 'assets.bridgeMetadata',
              select: 'imageUrl isContract name',
            },
            {
              path: 'assets.token',
              select: 'decimals imageUrl name symbol type',
            },
            { path: 'fees.token', select: 'decimals name symbol type' },
            { path: 'affiliate', select: 'name imageUrl isContract' },
            { path: 'makerMetadata', select: 'name imageUrl isContract' },
            { path: 'takerMetadata', select: 'name imageUrl isContract' },
            { path: 'senderMetadata', select: 'name imageUrl isContract' },
            {
              path: 'feeRecipientMetadata',
              select: 'name imageUrl isContract',
            },
            {
              path: 'transaction',
              populate: [
                { path: 'toMetadata', select: 'name imageUrl isContract' },
                { path: 'fromMetadata', select: 'name imageUrl isContract' },
              ],
              select: 'from to',
            },
            { path: 'attributions.entity', select: 'id logoUrl name urlSlug' },
          ],
        })
      : null;

    if (fill === null) {
      response.status = 404;
      await next();
      return;
    }

    response.body = transformFill(fill);

    await next();
  });

  return router;
};

module.exports = createRouter;
