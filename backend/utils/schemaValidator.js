// DynamicSchemaValidator.js
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class schemaValidator {
  static ajv = new Ajv({
    allErrors: true,
    strict: false,
    verbose: true,
    additionalProperties: true,
    removeAdditional: false
  });

  static init() {
    addFormats(this.ajv);
  }

  /**
   * Transform raw custom schema --> valid JSON Schema
   */
  static transformSchema(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const schema = {
      type: raw.type || 'object',
      required: Array.isArray(raw.required) ? [...raw.required] : [],
      properties: {},
      additionalProperties: false
    };

    if (raw.properties) {
      for (const [key, prop] of Object.entries(raw.properties)) {
        const cleanProp = this.transformProperty(prop, key);
        schema.properties[key] = cleanProp;

        // masterDetail: true --> make required
        if (prop.masterDetail === true) {
          schema.required.push(key);
        }

        // Nested required array (for object types)
        if (prop.required && Array.isArray(prop.required)) {
          if (cleanProp.type === 'object' && !cleanProp.required) {
            cleanProp.required = [];
          }
          prop.required.forEach(req => {
            if (!cleanProp.required.includes(req)) {
              cleanProp.required.push(req);
            }
          });
        }
      }
    }

    return schema;
  }

  /**
   * Transform a single property (recursive)
   */
  static transformProperty(prop) {
    if (!prop || typeof prop !== 'object') return {};

    const result = {};

    // === TYPE MAPPING ===
    if (prop.type === 'relationship') {
      result.type = 'string';  // relationship = string only
    }
    else if (prop.type === 'object' && prop.properties) {
      result.type = 'object';
      result.properties = {};
      result.additionalProperties = false;

      for (const [subKey, subProp] of Object.entries(prop.properties)) {
        result.properties[subKey] = this.transformProperty(subProp);
      }
    }
    else if (prop.type === 'array' && prop.items) {
      result.type = 'array';
      result.items = this.transformProperty(prop.items);
    }
    else {
      result.type = prop.type || 'string';
    }

    // === CONSTRAINTS ===
    if (prop.min !== undefined) result.minimum = prop.min;
    if (prop.max !== undefined) result.maximum = prop.max;
    if (prop.minLength !== undefined) result.minLength = prop.minLength;
    if (prop.maxLength !== undefined) result.maxLength = prop.maxLength;
    if (prop.format) result.format = prop.format;

    return result;
  }

  /**
   * Format AJV errors. clean messages
   */
  static formatAjvErrors(errors = []) {
    if (!Array.isArray(errors) || errors.length === 0) return [];

    return errors
      .filter(e => e.keyword !== 'additionalProperties')
      .map(e => {
        const path = e.instancePath || '';
        const field = path ? path.slice(1).replace(/\//g, '.') : '';
        const missing = e.keyword === 'required' ? e.params.missingProperty : null;
        const base = (missing || field) ? `${missing || field}` : '';

        switch (e.keyword) {
          case 'required': return `'${base}' is required.`;
          case 'type': return `'${base}' must be a ${e.params.type}.`;
          case 'format': return `'${base}'must be a valid ${e.params.format}.`;
          case 'minimum': return `'${base}' must be >= ${e.params.limit}.`;
          case 'maximum': return `'${base}' must be <= ${e.params.limit}.`;
          case 'minLength': return `'${base}' must be at least ${e.params.limit} characters.`;
          case 'maxLength': return `'${base}' must be <= ${e.params.limit} characters.`;
          case 'additionalProperties':
            return `Property '${e.params.additionalProperty}' not allowed${field ? ` at ${field}` : ''}.`;
          default: return `'${base}' ${e.message || 'is invalid'}.`.trim();
        }
      });
  }

  /**
   * Validate data against raw schema
   */
  static async validate(rawSchema, data) {
    if (!rawSchema) return true;

    try {
      const schema = this.transformSchema(rawSchema);
      const validate = this.ajv.compile(schema);
      const valid = validate(data);

      if (!valid) {
        const errors = this.formatAjvErrors(validate.errors);
        if (errors.length > 0){ 
          throw new Error(`Validation failed:\n ${errors.join('\n')}`);
        }
      }

      return true;
    } catch (err) {
      if (err.message.includes('schema is invalid')) {
        throw new Error(`Invalid schema: ${err.message}`);
      }
      throw err;
    }
  }
}

// Initialize formats
schemaValidator.init();

module.exports = schemaValidator;