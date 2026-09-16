const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const getSortOptions = (query, allowedFields = [], defaultField = 'createdAt') => {
  const sortField = allowedFields.includes(query.sortBy) ? query.sortBy : defaultField;
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  return { [sortField]: sortOrder };
};

module.exports = { getPagination, getSortOptions };
