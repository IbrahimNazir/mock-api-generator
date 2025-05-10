import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

function Login() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
      <LoginForm onLogin={handleLogin} />
    </div>
  );
}

export default Login;