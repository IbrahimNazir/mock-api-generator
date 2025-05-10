import { useState } from 'react';
import SchemaFieldForm from './SchemaFieldForm';
import MockDataPreview from './MockDataPreview';
import Modal from './Modal';
import ErrorBoundary from './ErrorBoundary';

function EndpointForm({ initialData = {}, onSubmit }) {
  const [path, setPath] = useState(initialData.path || '');
  const [methods, setMethods] = useState(initialData.methods || []);
  const [generateInitialData, setGenerateInitialData] = useState(
    initialData.generateInitialData ?? true
  );
  const [initialCount, setInitialCount] = useState(initialData.initialCount || 20);
  const [schema, setSchema] = useState(initialData.schema || {});
  const [showSchemaForm, setShowSchemaForm] = useState(false);
  const [editingField, setEditingField] = useState(null);

  const handleMethodToggle = (method) => {
    setMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleAddField = (field) => {
    try {
      if (!field) {
        console.log('Field submission cancelled');
        setShowSchemaForm(false);
        return;
      }
      console.log('Adding field:', field);
      if (!field.name || !field.config || !field.config.type) {
        throw new Error('Invalid field data');
      }
      setSchema((prev) => ({ ...prev, [field.name]: field.config }));
      setShowSchemaForm(false);
    } catch (error) {
      console.error('Error in handleAddField:', error);
      alert('Failed to add field: ' + error.message);
    }
  };

  const handleEditField = (field, oldName) => {
    try {
      if (!field) {
        console.log('Field edit cancelled');
        setShowSchemaForm(false);
        return;
      }
      console.log('Editing field:', field, 'Old name:', oldName);
      if (!field.name || !field.config || !field.config.type) {
        throw new Error('Invalid field data');
      }
      const updatedSchema = { ...schema };
      if (oldName !== field.name) {
        delete updatedSchema[oldName];
      }
      updatedSchema[field.name] = field.config;
      setSchema(updatedSchema);
      setShowSchemaForm(false);
      setEditingField(null);
    } catch (error) {
      console.error('Error in handleEditField:', error);
      alert('Failed to edit field: ' + error.message);
    }
  };

  const handleDeleteField = (fieldName) => {
    if (window.confirm(`Delete field ${fieldName}?`)) {
      const updatedSchema = { ...schema };
      delete updatedSchema[fieldName];
      setSchema(updatedSchema);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      if (!path || methods.length === 0 || Object.keys(schema).length === 0) {
        alert('Path, at least one method, and schema are required.');
        return;
      }
      console.log('Submitting endpoint:', { path, methods, generateInitialData, initialCount, schema });
      onSubmit({
        path,
        methods,
        generateInitialData,
        initialCount,
        schema,
      });
    } catch (error) {
      console.error('Error in EndpointForm handleSubmit:', error);
      alert('Failed to submit endpoint: ' + error.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">{initialData.path ? 'Edit Endpoint' : 'Add Endpoint'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700">Path</label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value.replace(/[^a-zA-Z0-9\\/]/g, ''))}
            placeholder="e.g., users"
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">HTTP Methods</label>
          <div className="flex space-x-4">
            {['get', 'post', 'put', 'delete'].map((method) => (
              <label key={method} className="flex items-center">
                <input
                  type="checkbox"
                  checked={methods.includes(method)}
                  onChange={() => handleMethodToggle(method)}
                  className="mr-2"
                />
                {method.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={generateInitialData}
              onChange={(e) => setGenerateInitialData(e.target.checked)}
              className="mr-2"
            />
            Generate Initial Data
          </label>
        </div>
        {generateInitialData && (
          <div className="mb-4">
            <label className="block text-gray-700">Initial Record Count</label>
            <input
              type="number"
              value={initialCount}
              onChange={(e) => setInitialCount(parseInt(e.target.value) || 1)}
              min="1"
              max="100"
              className="w-full p-2 border rounded"
              required
            />
          </div>
        )}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Schema</h3>
          {Object.keys(schema).length === 0 ? (
            <p className="text-gray-500">No fields defined.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(schema).map(([name, config]) => (
                <div key={name} className="flex justify-between items-center border p-2 rounded">
                  <span>
                    {name}: {config.type}
                    {config.faker ? ` (${config.faker})` : config.min != null ? ` (${config.min}-${config.max})` : ''}
                  </span>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Editing field:', { name, config });
                        setEditingField({ name, config });
                        setShowSchemaForm(true);
                      }}
                      className="text-blue-600 hover:underline mr-2"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(name)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              console.log('Opening SchemaFieldForm with editingField:', {});
              setEditingField({});
              setShowSchemaForm(true);
            }}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Field
          </button>
        </div>
        <MockDataPreview schema={schema} count={initialCount} />
        <button
          type="button"
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {initialData.path ? 'Update Endpoint' : 'Add Endpoint'}
        </button>
      </form>

      <ErrorBoundary>
        {showSchemaForm && (
          <Modal isOpen={showSchemaForm} onClose={() => setShowSchemaForm(false)}>
            <SchemaFieldForm
              initialData={editingField || {}}
              existingFieldNames={Object.keys(schema)}
              onSubmit={(field) =>
                editingField?.name ? handleEditField(field, editingField.name) : handleAddField(field)
              }
            />
          </Modal>
        )}
      </ErrorBoundary>
    </div>
  );
}

export default EndpointForm;