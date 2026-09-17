/**
 * Query-string parameter names that control mock endpoint behaviour.
 * They are never treated as data filters by `filterData`.
 */
const PAGINATION_PARAMS = [
  'pagination',    // explicit style: page | offset | cursor | keyset
  'page', 'limit', 'per_page', 'page_size',
  'offset',
  'cursor',
  'after_id', 'before_id',
  'include_total',
];

const VERSION_PARAMS = ['api-version', 'api_version', 'v'];

const MISC_PARAMS = ['sort', 'fields', 'delay'];

const RESERVED_QUERY_PARAMS = [...PAGINATION_PARAMS, ...VERSION_PARAMS, ...MISC_PARAMS];

module.exports = { PAGINATION_PARAMS, VERSION_PARAMS, MISC_PARAMS, RESERVED_QUERY_PARAMS };
