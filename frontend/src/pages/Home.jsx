function Home() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to Mock API</h1>
      <p className="text-gray-600 mb-4">
        Create and manage mock APIs with ease. Log in or register to get started.
      </p>
      <div className="space-x-4">
        <a
          href="/login"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Login
        </a>
        <a
          href="/register"
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
        >
          Register
        </a>
      </div>
    </div>
  );
}

export default Home;