import { useState } from 'react';

function SchemaFieldForm({ initialData = {}, onSubmit, existingFieldNames = [] }) {
  console.log('SchemaFieldForm rendered with initialData:', initialData, 'existingFieldNames:', existingFieldNames);
  const [name, setName] = useState(initialData.name || '');
  const [type, setType] = useState(initialData.config?.type || 'string');
  const [faker, setFaker] = useState(initialData.config?.faker || '');
  const [min, setMin] = useState(initialData.config?.min ?? 18);
  const [max, setMax] = useState(initialData.config?.max ?? 65);

  const typeOptions = [
    { value: 'id', label: 'ID' },
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
  ];

  const fakerOptions = [
    { value: '', label: 'None' },
    { value: 'person.fullName', label: 'Full Name' },
    { value: 'internet.email', label: 'Email' },
    { value: 'internet.url', label: 'URL' },
    { value: 'address.city', label: 'City' },
    { value: 'commerce.productName', label: 'Product Name' },
  ];

  const handleSubmit = (e) => {
    console.log('Form submitted, preventing default');

    e.preventDefault();
    try {
      if (!name || !type) {
        alert('Field name and type are required.');
        return;
      }
      if (!initialData.name && existingFieldNames.includes(name)) {
        alert('Field name already exists. Please choose a unique name.');
        return;
      }
      const config = { type };
      if (type === 'string' && faker) {
        config.faker = faker;
      } else if (type === 'number') {
        const minVal = parseInt(min);
        const maxVal = parseInt(max);
        if (isNaN(minVal) || isNaN(maxVal)) {
          alert('Min and Max values must be valid numbers.');
          return;
        }
        if (minVal >= maxVal) {
          alert('Max value must be greater than Min value.');
          return;
        }
        config.min = minVal;
        config.max = maxVal;
      }
      const field = { name, config };
      console.log('Submitting field:', field);
      onSubmit(field);
    } catch (error) {
      console.error('Error in SchemaFieldForm handleSubmit:', error);
      alert('Failed to add field: ' + error.message);
    }
  };

  const handleCancel = () => {
    console.log('Field submission cancelled');
    onSubmit(null);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h2 className="text-xl font-bold mb-4">{initialData.name ? 'Edit Field' : 'Add Field'}</h2>
      <div className="mb-4">
        <label className="block text-gray-700">Field Name:asdasd</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          placeholder="e.g., name"
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full p-2 border rounded"
          required
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {type === 'string' && (
        <div className="mb-4">
          <label className="block text-gray-700">Value (Faker)</label>
          <select
            value={faker}
            onChange={(e) => setFaker(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {fakerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {type === 'number' && (
        <>
          <div className="mb-4">
            <label className="block text-gray-700">Min Value</label>
            <input
              type="number"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Max Value</label>
            <input
              type="number"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </>
      )}
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {initialData.name ? 'Update Field' : 'Add Field'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default SchemaFieldForm;