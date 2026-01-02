import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Check, ChevronsUpDown } from "lucide-react";
import { URL_API_BACKEND } from "../config";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Años disponibles en OpenF1 
const AVAILABLE_YEARS = ["2023", "2024","2025"];

export default function SessionSelector({ onStartSimulation }) {
  // --- ESTADOS ---
  const [selectedYear, setSelectedYear] = useState("2023"); // Por defecto 2023
  const [races, setRaces] = useState([]);
  const [drivers, setDrivers] = useState([]);
  
  const [selectedRace, setSelectedRace] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  
  // Estados de apertura de los menús
  const [openYear, setOpenYear] = useState(false);
  const [openRace, setOpenRace] = useState(false);
  const [openDriver, setOpenDriver] = useState(false);
  
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // 1. CARGAR CARRERAS (Cada vez que cambia el año)
  useEffect(() => {
    // Reseteamos selecciones al cambiar de año
    setRaces([]);
    setSelectedRace(null);
    setSelectedDriver(null);
    setDrivers([]);

    fetch(`${URL_API_BACKEND}/races/openf1/${selectedYear}`)
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) {
            // Ordenamos las carreras por fecha (de más antigua a más nueva)
            const sorted = data.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
            setRaces(sorted);
        }
      })
      .catch(() => toast.error(`Error al cargar carreras de ${selectedYear}`));
  }, [selectedYear]);

  // 2. CARGAR PILOTOS (Al elegir carrera)
  const handleSelectRace = (sessionKey) => {
    setSelectedRace(sessionKey);
    setSelectedDriver(null); 
    setDrivers([]); 
    setOpenRace(false); 
    
    if (!sessionKey) return;

    setLoadingDrivers(true);
    fetch(`${URL_API_BACKEND}/drivers/openf1/${sessionKey}`)
      .then(res => res.json())
      .then(data => {
        const uniqueDrivers = Array.from(
            new Map(data.map(item => [item.driver_number, item])).values()
        );
        setDrivers(uniqueDrivers);
        setLoadingDrivers(false);
      })
      .catch(() => {
        toast.error("Error al cargar pilotos");
        setLoadingDrivers(false);
      });
  };

  // 3. START
  const handleStart = async () => {
    if (!selectedRace || !selectedDriver) return;

    try {
      const response = await fetch(`${URL_API_BACKEND}/location/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            session_key: selectedRace, 
            driver_number: selectedDriver 
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success(`🏁 Simulación iniciada: ${result.startTime}`);
        onStartSimulation(); 
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl mb-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        
        {/* === COLUMNA 1: AÑO (2 espacios) === */}
        <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
                Año
            </label>
            <Popover open={openYear} onOpenChange={setOpenYear}>
                <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openYear} className="w-full justify-between bg-black border-zinc-700 text-white hover:bg-zinc-900">
                    {selectedYear}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[120px] p-0 bg-black border-zinc-800 text-white">
                <Command className="bg-black text-white">
                    <CommandList>
                    <CommandGroup>
                        {AVAILABLE_YEARS.map((year) => (
                        <CommandItem key={year} value={year} onSelect={(val) => { setSelectedYear(val); setOpenYear(false); }} className="text-zinc-300 hover:bg-zinc-800 cursor-pointer">
                            <Check className={cn("mr-2 h-4 w-4", selectedYear === year ? "opacity-100 text-red-600" : "opacity-0")} />
                            {year}
                        </CommandItem>
                        ))}
                    </CommandGroup>
                    </CommandList>
                </Command>
                </PopoverContent>
            </Popover>
        </div>


        {/* === COLUMNA 2: CARRERA (4 espacios) === */}
        <div className="md:col-span-4 flex flex-col gap-2">
          <label className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
            Gran Premio
          </label>
          <Popover open={openRace} onOpenChange={setOpenRace}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openRace} className="w-full justify-between bg-black border-zinc-700 text-white hover:bg-zinc-900">
                {selectedRace ? races.find((r) => r.session_key === selectedRace)?.circuit_short_name : "Selecciona circuito..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-black border-zinc-800 text-white">
              <Command className="bg-black text-white">
                <CommandInput placeholder="Buscar circuito..." className="h-9 text-white" />
                <CommandList>
                    <CommandEmpty>No encontrado.</CommandEmpty>
                    <CommandGroup>
                    {races.map((race) => (
                        <CommandItem key={race.session_key} value={race.circuit_short_name + " " + race.country_name} onSelect={() => handleSelectRace(race.session_key)} className="text-zinc-300 hover:bg-zinc-800 cursor-pointer">
                        <Check className={cn("mr-2 h-4 w-4", selectedRace === race.session_key ? "opacity-100 text-red-600" : "opacity-0")} />
                        {race.country_name} - {race.circuit_short_name}
                        </CommandItem>
                    ))}
                    </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* === COLUMNA 3: PILOTO (4 espacios) === */}
        <div className="md:col-span-4 flex flex-col gap-2">
          <label className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
            Piloto
          </label>
          <Popover open={openDriver} onOpenChange={setOpenDriver}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openDriver} disabled={!selectedRace || loadingDrivers} className="w-full justify-between bg-black border-zinc-700 text-white hover:bg-zinc-900 disabled:opacity-50">
                {loadingDrivers ? "Cargando..." : (selectedDriver ? drivers.find((d) => d.driver_number === selectedDriver)?.full_name : "Selecciona piloto...")}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-black border-zinc-800 text-white">
              <Command className="bg-black text-white">
                <CommandInput placeholder="Buscar piloto..." className="h-9 text-white" />
                <CommandList>
                    <CommandEmpty>No encontrado.</CommandEmpty>
                    <CommandGroup>
                    {drivers.map((driver) => (
                        <CommandItem key={driver.driver_number} value={driver.full_name + " " + driver.driver_number} onSelect={() => { setSelectedDriver(driver.driver_number); setOpenDriver(false); }} className="text-zinc-300 hover:bg-zinc-800 cursor-pointer">
                        <Check className={cn("mr-2 h-4 w-4", selectedDriver === driver.driver_number ? "opacity-100 text-red-600" : "opacity-0")} />
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: `#${driver.team_colour}` }}></span>
                        <span className="font-bold mr-2">#{driver.driver_number}</span>
                        {driver.full_name}
                        </CommandItem>
                    ))}
                    </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* === COLUMNA 4: START (2 espacios) === */}
        <div className="md:col-span-2">
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.5)] border-none" onClick={handleStart} disabled={!selectedRace || !selectedDriver}>
            START
          </Button>
        </div>
        
      </div>
    </div>
  );
}