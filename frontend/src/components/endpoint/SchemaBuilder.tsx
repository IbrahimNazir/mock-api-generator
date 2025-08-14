import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Code } from 'lucide-react';
import { Endpoint } from '@/lib/api';

interface SchemaProperty {
  name: string;
  type: string;
  faker?: string;
  format?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  minItems?: number;
  maxItems?: number;
  required?: boolean; // kept for UI convenience
  default?: any;
  description?: string;
  properties?: { [key: string]: SchemaProperty };
  items?: SchemaProperty;
  endpointId?: string;
  masterDetail?: boolean;
  _id?: string; // stable ID for React keys
}

interface SchemaBuilderProps {
  schema: any;
  onSchemaChange: (schema: any) => void;
  availableEndpoints?: Endpoint[];
}

// Grouped faker methods by type (common methods). Expand as needed.
const FAKER_BY_TYPE: Record<string, string[]> = {
  string: [
    'string.uuid', 'internet.email', 'internet.userName', 'person.fullName',
    'person.firstName', 'person.lastName', 'phone.number', 'internet.url',
    'company.name', 'location.streetAddress', 'location.city', 'location.country',
    'location.state', 'lorem.word', 'lorem.sentence', 'lorem.paragraph',
    'commerce.productName', 'commerce.department', 'commerce.productAdjective',
    'commerce.productDescription',
    'date.past', 'date.future', 'date.recent', 'date.soon',
    'finance.amount', 'commerce.price', 
    'image.avatar', 'image.image', 'image.url'
  ],
  number: [
    'number.int', 'number.float', 'number.binary','number.hex', 'number.romanNumeral',
  ],
  integer: [
    'number.int', 'number.bigInt'
  ],
  boolean: [
    'datatype.boolean'
  ],
  date: [
    'date.past', 'date.future', 'date.recent', 'date.soon'
  ],

  // object and array typically don't have faker methods at property-level in this editor
  object: [],
  array: []
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const SchemaBuilder: React.FC<SchemaBuilderProps> = memo(({
  schema,
  onSchemaChange,
  availableEndpoints = []
}) => {
  const [jsonView, setJsonView] = useState(false);
  const [jsonError, setJsonError] = useState('');

  // Helper: traverse schema and return the container (object map) for the parent of path's last key
  // Also returns the parent property object (if any) for required-array placement
  const getContainer = (newSchema: any, parentPath: string[]) => {
    let container = newSchema.properties = newSchema.properties || {};
    let parentProp: any = null;
    let lastWasArray = false;

    for (const segment of parentPath) {
      if (lastWasArray && segment === 'items') {
        // This 'items' is the array.items keyword, not a field name
        lastWasArray = false;
        continue;
      }

      if (!container[segment]) {
        container[segment] = { name: segment, type: 'object', properties: {}, _id: generateId() };
      }

      parentProp = container[segment];

      if (parentProp.type === 'array') {
        parentProp.items = parentProp.items || { type: 'object', properties: {} };
        parentProp.items.properties = parentProp.items.properties || {};
        container = parentProp.items.properties;
        lastWasArray = true;
      } else {
        parentProp.properties = parentProp.properties || {};
        container = parentProp.properties;
        lastWasArray = false;
      }
    }

    return { container, parentProp };
  };

  const getRequiredOwner = (newSchema: any, parentProp: any) => {
    if (!parentProp) return newSchema;
    if (parentProp.type === 'array') {
      parentProp.items = parentProp.items || {};
      return parentProp.items;
    }
    return parentProp;
  };

  const convertDefaultToType = (value: any, type: string) => {
    if (value === undefined || value === null || type === undefined) return undefined;
    try {
      switch (type) {
        case 'string':
          return String(value);
        case 'integer': {
          const n = parseInt(value as any, 10);
          return Number.isNaN(n) ? undefined : n;
        }
        case 'number': {
          const f = parseFloat(value as any);
          return Number.isNaN(f) ? undefined : f;
        }
        case 'boolean':
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const v = value.toLowerCase();
            if (v === 'true' || v === '1') return true;
            if (v === 'false' || v === '0') return false;
          }
          return undefined;
        case 'array':
          if (Array.isArray(value)) return value;
          try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            // fallback: wrap single value
            return [value];
          }
        case 'object':
          if (typeof value === 'object' && !Array.isArray(value)) return value;
          try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
          } catch (e) {
            return undefined;
          }
        case 'date':
          // accept ISO strings
          if (typeof value === 'string' || value instanceof Date) return value;
          return undefined;
        default:
          return value;
      }
    } catch (e) {
      return undefined;
    }
  };

  const updateProperty = (path: string[], updates: Partial<SchemaProperty>) => {
    const newSchema = JSON.parse(JSON.stringify(schema || {}));

    const parentPath = path.slice(0, -1);
    const key = path[path.length - 1];

    const { container, parentProp } = getContainer(newSchema, parentPath);

    const existing = container[key] || { name: key, _id: generateId() };

    // merge updates
    const merged = { ...existing, ...updates } as SchemaProperty;

    // If type changed, ensure items/default/faker are coerced/created appropriately
    if (updates.type !== undefined && updates.type !== existing.type) {
      // convert default value to new type
      merged.default = convertDefaultToType(existing.default, updates.type);

      // when switching to array ensure items exists
      if (updates.type === 'array') {
        merged.items = merged.items || { type: 'string', name: 'item', _id: generateId() } as SchemaProperty;
      }

      // clear faker if it's not allowed for the new type
      const allowedFakers = FAKER_BY_TYPE[updates.type || ''] || [];
      if (!allowedFakers.includes(String(merged.faker))) {
        merged.faker = undefined;
      }
    }

    // If items were updated (eg. items.type changed), coerce items.default and clear invalid faker
    if (updates.items) {
      merged.items = { ...existing.items, ...updates.items } as SchemaProperty;
      if (updates.items.type && existing.items) {
        merged.items.default = convertDefaultToType(existing.items.default, updates.items.type);
        const allowed = FAKER_BY_TYPE[updates.items.type || ''] || [];
        if (!allowed.includes(String(merged.items.faker))) {
          merged.items.faker = undefined;
        }
      }
    }

    container[key] = merged;

    // Ensure array has minItems/maxItems fields left intact if present in updates
    if (merged.type === 'array') {
      container[key].minItems = merged.minItems;
      container[key].maxItems = merged.maxItems;
    }

    // Update required array in the correct owner (top-level, parent object, or array.items)
    if (updates.required !== undefined) {
      const owner = getRequiredOwner(newSchema, parentProp);
      owner.required = owner.required || [];
      const reqSet = new Set(owner.required);
      if (updates.required) reqSet.add(key); else reqSet.delete(key);
      owner.required = Array.from(reqSet);
    }

    onSchemaChange(newSchema);
  };

  const updatePropertyName = (path: string[], oldName: string, newName: string) => {
    if (oldName === newName) return;
    const newSchema = JSON.parse(JSON.stringify(schema || {}));

    const parentPath = path.slice(0, -1);
    const { container, parentProp } = getContainer(newSchema, parentPath);

    if (!container[oldName]) return; // nothing to rename

    const propertyData = { ...container[oldName], name: newName };

    // Preserve order
    const keys = Object.keys(container);
    const newCurrent: any = {};
    keys.forEach(key => {
      if (key === oldName) {
        newCurrent[newName] = propertyData;
      } else {
        newCurrent[key] = container[key];
      }
    });

    // Replace container contents
    // If parentProp is null => top-level
    if (!parentProp) {
      newSchema.properties = newCurrent;
    } else if (parentProp.type === 'array') {
      parentProp.items = parentProp.items || {};
      parentProp.items.properties = newCurrent;
    } else {
      parentProp.properties = newCurrent;
    }

    // Update required array if present
    const owner = getRequiredOwner(newSchema, parentProp);
    if (owner.required) {
      const idx = owner.required.indexOf(oldName);
      if (idx > -1) owner.required[idx] = newName;
    }

    onSchemaChange(newSchema);
  };

  const addProperty = (parentPath: string[] = []) => {
    const newSchema = JSON.parse(JSON.stringify(schema || {}));
    const { container } = getContainer(newSchema, parentPath);

    const newPropName = `property_${Object.keys(container || {}).length + 1}`;
    container[newPropName] = {
      name: newPropName,
      type: 'string',
      required: false,
      _id: generateId(),
    };

    onSchemaChange(newSchema);
  };

  const removeProperty = (path: string[]) => {
    const newSchema = JSON.parse(JSON.stringify(schema || {}));

    const parentPath = path.slice(0, -1);
    const key = path[path.length - 1];

    const { container, parentProp } = getContainer(newSchema, parentPath);

    delete container[key];

    // Remove from required array
    const owner = getRequiredOwner(newSchema, parentProp);
    if (owner.required) {
      owner.required = (owner.required || []).filter((r: string) => r !== key);
    }

    onSchemaChange(newSchema);
  };

  const handleJsonChange = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      setJsonError('');
      onSchemaChange(parsed);
    } catch (error) {
      setJsonError('Invalid JSON format');
    }
  };

  const renderProperty = (
    property: SchemaProperty,
    path: string[],
    depth: number = 0
  ): React.ReactNode => {
    const isRequired = (() => {
      try {
        const parentPath = path.slice(0, -1);
        if (parentPath.length === 0) {
          return (schema.required || []).includes(property.name) || false;
        }

        // Walk the live schema to find the owner that holds 'required'
        let cur: any = schema.properties || {};
        for (const segment of parentPath) {
          const prop = cur[segment];
          if (!prop) return false;
          if (prop.type === 'array') {
            cur = prop.items?.properties || {};
          } else {
            cur = prop.properties || {};
          }
        }
        // if we found parent object, check its required
        const parentOwner = parentPath.length === 0 ? schema : undefined;
        // fallback to checking top-level required
        return (schema.required || []).includes(property.name) || false;
      } catch (e) {
        return false;
      }
    })();

    const stableKey = property._id || path.join('.');

    // Determine allowed faker methods for this property's type
    const allowedFakersForType = FAKER_BY_TYPE[property.type || ''] || [];

    return (
      <Card key={stableKey} className={`ml-${depth * 4}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Input
                value={property.name}
                onChange={(e) => updatePropertyName(path, property.name, e.target.value)}
                className="font-medium max-w-[200px]"
              />
              <Badge variant={property.type === 'relationship' ? 'default' : 'secondary'}>
                {property.type}
              </Badge>
              {isRequired && <Badge variant="destructive">Required</Badge>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeProperty(path)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select
                value={property.type}
                onValueChange={(value) => updateProperty(path, { type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="integer">Integer</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="object">Object</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                  <SelectItem value="relationship">Relationship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(() => {
              switch (property.type) {
                case 'relationship':
                  return (
                    <>
                      <div>
                        <Label>Related Endpoint</Label>
                        <Select
                          value={(property as any).endpointId || ''}
                          onValueChange={(value) => updateProperty(path, { endpointId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select endpoint" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableEndpoints.map((endpoint) => (
                              <SelectItem key={endpoint.id} value={endpoint.id}>
                                {endpoint.path}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={(property as any).masterDetail || false}
                            onCheckedChange={(checked) => updateProperty(path, { masterDetail: checked })}
                          />
                          <Label>Master-Detail Relationship</Label>
                        </div>
                      </div>
                    </>
                  );
                case 'array':
                  return (
                    <>
                      <div className="col-span-2">
                        <Label>Array Item Type</Label>
                        <Select
                          value={(property.items && property.items.type) || 'string'}
                          onValueChange={(value) => updateProperty(path, { items: { ...property.items, type: value, name: 'item' } })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="integer">Integer</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="object">Object</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Always show minItems/maxItems for arrays */}
                      <div>
                        <Label>Min Items</Label>
                        <Input
                          type="number"
                          value={(property.minItems as any) || ''}
                          onChange={(e) => updateProperty(path, { minItems: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Max Items</Label>
                        <Input
                          type="number"
                          value={(property.maxItems as any) || ''}
                          onChange={(e) => updateProperty(path, { maxItems: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                        />
                      </div>

                      {/* If array items are primitive, allow faker for items of that primitive type */}
                      {property.items?.type !== 'object' && (
                        <div className="col-span-2">
                          <Label>Item Faker</Label>
                          <Select
                            value={property.items?.faker || ''}
                            onValueChange={(value) => updateProperty(path, { items: { ...property.items, faker: value || undefined, type: property.items?.type || 'string', name: 'item' } })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select faker for array items" />
                            </SelectTrigger>
                            <SelectContent>
                              {(FAKER_BY_TYPE[property.items?.type || 'string'] || []).map((fakerMethod) => (
                                <SelectItem key={fakerMethod} value={fakerMethod}>
                                  {fakerMethod}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  );
                default:
                  return (
                    <div>
                      <Label>Faker</Label>
                      <Select
                        value={property.faker || ''}
                        onValueChange={(value) => updateProperty(path, { faker: value || undefined })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select faker" />
                        </SelectTrigger>
                        <SelectContent searchable>
                          {(FAKER_BY_TYPE[property.type || 'string'] || []).map((faker) => (
                            <SelectItem key={faker} value={faker}>
                              {faker}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
              }
            })()}

          </div>

          {property.type === 'string' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Length</Label>
                <Input
                  type="number"
                  value={(property.minLength as any) || ''}
                  onChange={(e) => updateProperty(path, { minLength: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Max Length</Label>
                <Input
                  type="number"
                  value={(property.maxLength as any) || ''}
                  onChange={(e) => updateProperty(path, { maxLength: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                />
              </div>
            </div>
          )}

          {(property.type === 'integer' || property.type === 'number') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minimum</Label>
                <Input
                  type="number"
                  value={(property.min as any) || ''}
                  onChange={(e) => updateProperty(path, { min: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Maximum</Label>
                <Input
                  type="number"
                  value={(property.max as any) || ''}
                  onChange={(e) => updateProperty(path, { max: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              checked={isRequired}
              onCheckedChange={(checked) => updateProperty(path, { required: checked })}
            />
            <Label>Required</Label>
          </div>

          <div>
            
            {/* Only show default if there is no faker selected for this property */}
            {!property.faker && (
              <><Label>Default Value</Label>
              <Input
                value={typeof property.default === 'object' ? JSON.stringify(property.default) : property.default ?? ''}
                onChange={(e) => {
                  let value: any = e.target.value;
                  if (property.type === 'integer') {
                    const v = value === '' ? undefined : parseInt(value);
                    updateProperty(path, { default: Number.isNaN(v as any) ? undefined : v });
                    return;
                  }
                  if (property.type === 'number') {
                    const v = value === '' ? undefined : parseFloat(value);
                    updateProperty(path, { default: Number.isNaN(v as any) ? undefined : v });
                    return;
                  }
                  if (property.type === 'boolean') {
                    updateProperty(path, { default: value === 'true' });
                    return;
                  }
                  if (property.type === 'array' || property.type === 'object') {
                    // try parse JSON for object/array
                    try {
                      const parsed = value === '' ? undefined : JSON.parse(value);
                      updateProperty(path, { default: parsed });
                    } catch (e) {
                      // if parse fails, just store string until next conversion
                      updateProperty(path, { default: value });
                    }
                    return;
                  }

                  updateProperty(path, { default: value === '' ? undefined : value });
                }}
                placeholder={`Default ${property.type} value...`}
              /></>
            )}
          </div>

          {property.type === 'object' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Nested Properties</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addProperty(path)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </div>
              {property.properties && Object.keys(property.properties).map(key => {
                const nestedProperty = { ...property.properties![key], name: key };
                return renderProperty(
                  nestedProperty,
                  [...path, key],
                  depth + 1
                );
              })}
            </div>
          )}

          {property.type === 'array' && property.items?.type === 'object' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Array Item Properties</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newSchema = JSON.parse(JSON.stringify(schema));

                    // Use getContainer to reliably reach the items.properties container (creates missing structures)
                    const { container } = getContainer(newSchema, [...path, 'items']);

                    const newPropName = `property_${Object.keys(container || {}).length + 1}`;
                    container[newPropName] = {
                      name: newPropName,
                      type: 'string',
                      required: false,
                      _id: generateId(), // Add stable ID
                    };

                    onSchemaChange(newSchema);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item Property
                </Button>
              </div>
              {property.items?.properties && Object.keys(property.items.properties).map(key => {
                const itemProperty = { ...property.items!.properties![key], name: key };
                // IMPORTANT: path for item properties is [ ...path, 'items', key ]
                // getContainer will correctly navigate into property.items.properties when the parent is an array
                return renderProperty(
                  itemProperty,
                  [...path, 'items', key],
                  depth + 1
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (jsonView) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Schema JSON</h3>
          <Button variant="outline" onClick={() => setJsonView(false)}>
            <Code className="h-4 w-4 mr-2" />
            Visual Editor
          </Button>
        </div>
        <div>
          <Textarea
            value={JSON.stringify(schema, null, 2)}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="font-mono text-sm min-h-[400px]"
          />
          {jsonError && (
            <p className="text-destructive text-sm mt-2">{jsonError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold mr-2">Fields Schema</h3>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setJsonView(true)}>
            <Code className="h-4 w-4 mr-2" />
            JSON View
          </Button>
          <Button variant="outline" onClick={() => addProperty()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {schema.properties && Object.keys(schema.properties).map(key => {
          const property = { ...schema.properties[key], name: key };
          return renderProperty(property, [key]);
        })}

        {(!schema.properties || Object.keys(schema.properties).length === 0) && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No properties defined</p>
            <Button onClick={() => addProperty()}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Field
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
});

export default SchemaBuilder;