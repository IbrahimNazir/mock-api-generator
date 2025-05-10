function MockDataPreview({ schema, count }) {
  const generateMockRecord = () => {
    const record = {};
    Object.entries(schema).forEach(([key, config]) => {
      if (config.type === 'id') {
        record[key] = Math.floor(Math.random() * 1000) + 1;
      } else if (config.type === 'string') {
        if (config.faker === 'person.fullName') {
          record[key] = `John Doe${Math.random().toString(36).substring(7)}`;
        } else if (config.faker === 'internet.email') {
          record[key] = `user${Math.random().toString(36).substring(7)}@example.com`;
        } else {
          record[key] = 'Sample Text';
        }
      } else if (config.type === 'number') {
        const min = config.min || 0;
        const max = config.max || 100;
        record[key] = Math.floor(Math.random() * (max - min + 1)) + min;
      } else if (config.type === 'boolean') {
        record[key] = Math.random() > 0.5;
      }
    });
    return record;
  };

  const mockData = Array.from({ length: Math.min(count, 3) }, generateMockRecord);

  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Mock Data Preview</h3>
      {mockData.length === 0 ? (
        <p className="text-gray-500">No schema defined.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                {Object.keys(schema).map((key) => (
                  <th key={key} className="p-2 border-b text-left">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockData.map((record, index) => (
                <tr key={index} className="border-b">
                  {Object.entries(record).map(([key, value]) => (
                    <td key={key} className="p-2">
                      {value.toString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MockDataPreview;