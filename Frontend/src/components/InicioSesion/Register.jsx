import { useState, useEffect } from 'react'; // <--- AÑADIDO useEffect
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { URL_API_BACKEND } from "../../config"; // Asegúrate de tener esto configurado

export default function Register() {
  const [formData, setFormData] = useState({ username: "", password: "" }); // Estado para los datos del formulario
  const navigate = useNavigate();

  // --- LÓGICA DEL CARRUSEL (AÑADIDO) ---
  const imagenesFondo = [
    '/foto_login_1.jpeg',
    '/foto_login_2.jpeg',
    '/foto_login_3.jpeg',
    '/foto_login_4.jpeg'
  ];

  const [indiceImagen, setIndiceImagen] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndiceImagen((prev) => (prev + 1) % imagenesFondo.length);
    }, 5000); 
    return () => clearInterval(intervalo);
  }, []);
  // -------------------------------------

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
    // 1. CONTENEDOR NUEVO PARA EL FONDO
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#000' }}>
      
      {/* 2. CAPA DE FONDO (CARRUSEL) */}
      {imagenesFondo.map((foto, index) => (
        <div
          key={index}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundImage: `url('${foto}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            opacity: index === indiceImagen ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out' 
          }}
        />
      ))}

      {/* 3. CAPA OSCURA */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1
      }}></div>

      {/* 4. CONTENEDOR DEL FORMULARIO (TU CÓDIGO ORIGINAL) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 2
      }}>
        
        {/* NOTA: He cambiado 'bg-black' por estilo transparente para ver el fondo */}
        <div className="card border-secondary p-4 text-white shadow" style={{ width: '400px', backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
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
    </div>
  );
}