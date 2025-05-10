import { useNavigate } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';

function Register() {
  const navigate = useNavigate();

  const handleRegister = () => {
    navigate('/login');
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
      <RegisterForm onRegister={handleRegister} />
    </div>
  );
}

export default Register;