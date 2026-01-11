import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { URL_API_BACKEND } from "../../config"; // Asegúrate de tener esto configurado

export default function Register() {
  const [formData, setFormData] = useState({ username: "", password: "" }); // Estado para los datos del formulario
  const navigate = useNavigate();

  // Función para manejar cambios en los campos del formulario
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Función para manejar el envío del formulario de login
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${URL_API_BACKEND}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();

      if (res.ok) {
        toast.success("¡Registro exitoso! Ahora inicia sesión.");
        navigate('/'); // Te manda al Login
      } else {
        toast.error(data.error || "Error en el registro");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    }
  };

  // Renderizado del formulario de registro
  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-dark">
      <div className="card bg-black border-secondary p-4 text-white shadow" style={{ width: '400px' }}>
        <h2 className="text-center mb-4">REGISTRO F1</h2>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <input 
            name="username" type="text" placeholder="Usuario" 
            className="form-control" required 
            onChange={handleChange}
          />
          <input 
            name="password" type="password" placeholder="Contraseña" 
            className="form-control" required 
            onChange={handleChange}
          />
          <button type="submit" className="btn btn-secondary fw-bold mt-2">CREAR CUENTA</button>
        </form>
        <div className="mt-3 text-center">
          <small>¿Ya tienes cuenta? <Link to="/" className="text-danger">Inicia sesión</Link></small>
        </div>
      </div>
    </div>
  );
}