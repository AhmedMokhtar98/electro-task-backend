"use strict";

const applySearchFilter = require("./applySearchFilter.js");

module.exports = function prepareQueryObjects(
  rawFilter = {},
  rawSort = {},
  options = {}
) {
  const {
    defaultSort = "-createdAt",
    allowAllFields = false,
    allowedSortFields = [],
    searchFields = [],
    tieBreaker = null,
  } = options;

  let filterObject =
    typeof structuredClone === "function"
      ? structuredClone(rawFilter)
      : JSON.parse(JSON.stringify(rawFilter));

  const pageNumber = Math.max(Number(filterObject.page) || 1, 1);
  const limitNumber = Math.min(
    Math.max(Number(filterObject.limit) || 10, 1),
    100
  );

  const sortParam = filterObject.sort;
  const sortBy = filterObject.sortBy;
  const sortOrder = filterObject.sortOrder;

  delete filterObject.page;
  delete filterObject.limit;
  delete filterObject.sort;
  delete filterObject.sortBy;
  delete filterObject.sortOrder;

  if (searchFields.length > 0) {
    filterObject = applySearchFilter(filterObject, searchFields);
  }

  let sortObject = {};

  if (rawSort && Object.keys(rawSort).length > 0) {
    sortObject = { ...rawSort };
  } else {
    const requestedSort = sortParam || toSortExpression(sortBy, sortOrder);

    sortObject = buildSort(requestedSort || defaultSort, {
      allowAllFields,
      allowedSortFields,
    });

    if (Object.keys(sortObject).length === 0) {
      sortObject = buildSort(defaultSort, {
        allowAllFields,
        allowedSortFields,
      });
    }
  }

  if (tieBreaker && sortObject[tieBreaker] === undefined) {
    const firstDirection = Object.values(sortObject)[0];
    sortObject[tieBreaker] = firstDirection === 1 ? 1 : -1;
  }

  return {
    filterObject,
    sortObject,
    pageNumber,
    limitNumber,
  };
};

function toSortExpression(sortBy, sortOrder) {
  if (!sortBy) return null;
  return sortOrder === "desc" ? `-${sortBy}` : sortBy;
}

function buildSort(sortExpression, options = {}) {
  if (!sortExpression) return {};

  const {
    allowAllFields = false,
    allowedSortFields = [],
  } = options;

  let field = String(sortExpression);
  let direction = 1;

  if (field.startsWith("-")) {
    field = field.slice(1);
    direction = -1;
  }

  if (!/^[\w.]+$/.test(field)) {
    return {};
  }

  if (
    !allowAllFields &&
    allowedSortFields.length > 0 &&
    !allowedSortFields.includes(field)
  ) {
    return {};
  }

  return { [field]: direction };
}
