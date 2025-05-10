const buildWhereClause = (filters) => {
  if (!filters || Object.keys(filters).length === 0) {
    return { whereClause: '', values: [] };
  }
  
  const conditions = [];
  const values = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'object' && value !== null) {
      // Handle operators like $gt, $lt, etc.
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case '$gt':
            conditions.push(`data->>'${key}' > $${paramIndex}`);
            values.push(String(opValue));
            paramIndex++;
            break;
          case '$lt':
            conditions.push(`data->>'${key}' < $${paramIndex}`);
            values.push(String(opValue));
            paramIndex++;
            break;
          case '$gte':
            conditions.push(`data->>'${key}' >= $${paramIndex}`);
            values.push(String(opValue));
            paramIndex++;
            break;
          case '$lte':
            conditions.push(`data->>'${key}' <= $${paramIndex}`);
            values.push(String(opValue));
            paramIndex++;
            break;
          case '$in':
            if (Array.isArray(opValue) && opValue.length > 0) {
              const placeholders = opValue.map((_, i) => `$${paramIndex + i}`).join(', ');
              conditions.push(`data->>'${key}' IN (${placeholders})`);
              values.push(...opValue.map(String));
              paramIndex += opValue.length;
            }
            break;
        }
      }
    } else {
      // Simple equality
      conditions.push(`data->>'${key}' = $${paramIndex}`);
      values.push(String(value));
      paramIndex++;
    }
  }
  
  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
};

const buildSortClause = (sort) => {
  if (!sort) return '';
  
  const sortFields = [];
  
  for (const [field, order] of Object.entries(sort)) {
    const direction = order === -1 || order === 'desc' ? 'DESC' : 'ASC';
    sortFields.push(`data->>'${field}' ${direction}`);
  }
  
  return sortFields.length > 0 ? `ORDER BY ${sortFields.join(', ')}` : '';
};

const buildPaginationClause = (pagination) => {
  if (!pagination) return { limitClause: '', offsetClause: '' };
  
  const { limit, page } = pagination;
  const limitValue = limit && limit > 0 ? limit : 10;
  const pageValue = page && page > 0 ? page : 1;
  const offset = (pageValue - 1) * limitValue;
  
  return {
    limitClause: `LIMIT ${limitValue}`,
    offsetClause: `OFFSET ${offset}`
  };
};

module.exports = {
  buildWhereClause,
  buildSortClause,
  buildPaginationClause
};