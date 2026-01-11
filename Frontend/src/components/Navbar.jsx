import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
// Importamos las "piezas de lego" de Shadcn
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export default function Navbar() {
  
  // Estado para saber si hay alguien logueado o es un invitado
  const [estaLogueado, setEstaLogueado] = useState(false);
  
  const navigate = useNavigate();

  // Función para cerrar sesión
  const handleLogout = () => {
    // Borramos el token (Limpieza explícita)
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirigimos al Login
    navigate('/');
  };

  // Al cargar la barra, comprobamos si existe el token
  useEffect(() => {
    const token = localStorage.getItem('token');
    // Si hay token, es true. Si es null, es false.
    setEstaLogueado(!!token);
  }, []);

  return (
    <div className="p-3 shadow-sm border-bottom border-secondary bg-dark">
      <div className="d-flex justify-content-between align-items-center">
        
        <h1 
          className="text-uppercase fw-bold m-0 h4 text-white" 
          style={{ borderLeft: '5px solid #e10600', paddingLeft: '15px' }}
        >
          F1 Digital Twin
        </h1>

        <NavigationMenu>
          <NavigationMenuList className="d-flex gap-2 list-unstyled m-0">
            
            {/* BOTÓN 1: CIRCUITO */}
            <NavigationMenuItem>
              <Link to="/circuito-interactivo">
                <NavigationMenuLink className={`${navigationMenuTriggerStyle()} bg-transparent text-white hover:bg-white hover:text-black`}>
                  Circuito interactivo
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            {/* BOTÓN 2: PILOTOS */}
            <NavigationMenuItem>
              <Link to="/pilotos">
                <NavigationMenuLink className={`${navigationMenuTriggerStyle()} bg-transparent text-white hover:bg-white hover:text-black`}>
                  Pilotos
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            {/* BOTÓN 3: TELEMETRÍA */}
            <NavigationMenuItem>
              <Link to="/telemetria">
                <NavigationMenuLink className={`${navigationMenuTriggerStyle()} bg-transparent text-white hover:bg-white hover:text-black`}>
                  Telemetría
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            {/* INICIAR/CERRAR SESIÓN */}
            {estaLogueado ? (
                <NavigationMenuItem>
                    <button 
                      onClick={handleLogout}
                      className={`${navigationMenuTriggerStyle()} bg-transparent text-danger fw-bold border-0 hover:bg-danger hover:text-white`}
                      style={{ cursor: 'pointer' }}
                    >
                      Cerrar Sesión
                    </button>
                </NavigationMenuItem>
            ) : (
                <NavigationMenuItem>
                    <button 
                        onClick={() => navigate('/')} // <--- Usamos navigate en vez de Link
                        className={`${navigationMenuTriggerStyle()} bg-transparent text-danger fw-bold border-0 hover:bg-danger hover:text-white`}
                        style={{ cursor: 'pointer' }}
                    >
                        Iniciar Sesión
                    </button>
                </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

      </div>
    </div>
  );
}