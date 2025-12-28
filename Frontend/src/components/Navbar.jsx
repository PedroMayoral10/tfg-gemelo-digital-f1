import { Link } from "react-router-dom";
// Importamos las "piezas de lego" de Shadcn
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export default function Navbar() {
  return (
    // ESTE ES TU CONTENEDOR DE SIEMPRE (Tu diseño)
    <div className="p-3 shadow-sm border-bottom border-secondary bg-dark">
      <div className="d-flex justify-content-between align-items-center">
        
        {/* TU LOGO / TÍTULO CON ESTILO F1 */}
        <h1 
          className="text-uppercase fw-bold m-0 h4 text-white" 
          style={{ borderLeft: '5px solid #e10600', paddingLeft: '15px' }}
        >
          F1 Digital Twin
        </h1>

        {/* AQUÍ USAMOS LAS PIEZAS DE SHADCN */}
        <NavigationMenu>
          <NavigationMenuList className="d-flex gap-2 list-unstyled m-0">
            
            {/* BOTÓN 1: CIRCUITO */}
            <NavigationMenuItem>
              {/* 'Link' es el componente que hace que la página no se recargue */}
              <Link to="/circuito-interactivo">
                {/* 'NavigationMenuLink' es el estilo bonito de Shadcn */}
                {/* Añadimos clases para que se vea bien en fondo oscuro */}
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

          </NavigationMenuList>
        </NavigationMenu>

      </div>
    </div>
  );
}