const RSERVED_QUERY_PARAMS = ['page', 'limit', 'sort', 'fields','delay'];

function filterData(req, res, data) {
  // Return empty array if data is empty
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  // Dynamically determine fields and their types from the first object
  const sampleObject = data[0];
  const validFields = {};
  for (const [key, value] of Object.entries(sampleObject)) {
    if (typeof value === 'number') {
      validFields[key] = 'number';
    } else {
      validFields[key] = 'string'; // default for other types
      if (!isNaN(value)) validFields[key] = 'number';
    }
  }

  // Supported operators
  const operators = {
    string: {
      eq: (value, filterValue) => value === filterValue,
      like: (value, filterValue) => value.toLowerCase().includes(filterValue.toLowerCase()),
    },
    number: {
      eq: (value, filterValue) => value === parseFloat(filterValue),
      gt: (value, filterValue) => value > parseFloat(filterValue),
      lt: (value, filterValue) => value < parseFloat(filterValue),
      gte: (value, filterValue) => value >= parseFloat(filterValue),
      lte: (value, filterValue) => value <= parseFloat(filterValue),
    }
  };

  // Parse query parameters
  const filters = {};
  console.log("req.query: ", req.query)
  for (const [key, val] of Object.entries(req.query)) {
    const field = key;
    if (RSERVED_QUERY_PARAMS.includes(field)) continue; // Skip reserved query params
    var operator = 'eq'; // default operator
    var value = val; // default value

    if (typeof val === 'object') {
      operator = Object.entries(val)[0][0];
      value = Object.entries(val)[0][1];
    }
    console.log("field: ", field, " operator: ", operator, "value: ", value);

    if (validFields[field] && operators[validFields[field]][operator]) {
      filters[field] = { operator, value: value };
      console.log("filters: ", filters)
    } else {
      return res.status(400).json({ error: `Invalid field or operator: ${key}` });
    }
  }

  // Filter the data
  const filteredData = data.filter(item => {
    return Object.entries(filters).every(([field, { operator, value }]) => {
      const fieldType = validFields[field];
      const itemValue = item[field];

      // Skip null or undefined values
      if (itemValue == null) return false;
      try {
        switch (fieldType) {
          case 'string':
            return operators.string[operator](itemValue, value);
          case 'number':
            return operators.number[operator](itemValue, value);
          default:
            return false;
        }
      } catch (error) {
        return res.status(400).json({ error: `Invalid value for ${field}: ${value}` });
      }
    });
  });

  return filteredData;
}

function concatenateAndDeleteNestedKey(obj, keyToConcat) {
  // Array to store values
  let result = [];

  if (!obj || typeof obj !== 'object') {
    return '';
  }
  // Store and delete the key value if it exists in the current object
  if (keyToConcat in obj) {
    result.push(obj[keyToConcat]);
    delete obj[keyToConcat];
  }

  // Recursively process all nested objects
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Recursively call for nested objects
        const nestedResult = concatenateAndDeleteNestedKey(obj[key], keyToConcat);
        if (nestedResult) {
          result.push(nestedResult);
        }
      }
    }
  }
  return result.join('');
}

module.exports = { filterData, concatenateAndDeleteNestedKey };