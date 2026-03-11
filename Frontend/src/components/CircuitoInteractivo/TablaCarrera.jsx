import React, { useMemo, useState, useEffect } from "react";
import { URL_API_BACKEND } from "../../config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"; 

// Mantenemos solo la leyenda, el contador ya está en el sticky del padre
const LeyendaColores = () => (
  <div className="flex justify-end gap-6 pb-2 px-2">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
      <span className="text-[10px] text-gray-400 font-bold uppercase">Récord general</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
      <span className="text-[10px] text-gray-400 font-bold uppercase">Récord personal</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
      <span className="text-[10px] text-gray-400 font-bold uppercase">Sin mejora</span>
    </div>
  </div>
);

export default function TablaCarrera({ raceData }) {
  const [records, setRecords] = useState({
    session: { s1: 999, s2: 999, s3: 999 },
    personal: {},
    lastGaps: {} 
  });

  const [displayedLaps, setDisplayedLaps] = useState({});

  // 1. Extraer el snapshot
  const actualData = useMemo(() => {
    return raceData?.snapshot || raceData?.race_table || {};
  }, [raceData]);

  // 2. Crear array de pilotos
  const driversArray = useMemo(() => {
    if (!actualData) return [];
    return Object.entries(actualData)
      .filter(([key]) => key !== 'session_key')
      .map(([number, details]) => ({
        number,
        ...details,
        pNum: parseInt(details.position) || 999 
      }))
      .sort((a, b) => a.pNum - b.pNum);
  }, [actualData]);

  // 3. Lógica de récords y sectores (MANTENIDA INTACTA)
  useEffect(() => {
    if (!actualData || Object.keys(actualData).length === 0) return;
    
    let updatedSession = { ...records.session };
    let updatedPersonal = { ...records.personal };
    let updatedGaps = { ...records.lastGaps };
    let updatedDisplayedLaps = { ...displayedLaps };
    let changed = false;

    Object.entries(actualData).forEach(([driverNum, data]) => {
      if (driverNum === 'session_key') return;

      const currentSimTime = new Date(raceData.sim_time).getTime();
      const lapStartTime = new Date(data.date_start).getTime();
      const elapsedInLap = (currentSimTime - lapStartTime) / 1000;
      
      const s1 = parseFloat(data.s1) || 0;
      const s2 = parseFloat(data.s2) || 0;
      const s3 = parseFloat(data.s3) || 0;
      const totalLapTime = s1 + s2 + s3;

      if (elapsedInLap >= totalLapTime || !updatedDisplayedLaps[driverNum]) {
        if (data.last_lap && data.last_lap !== "-") {
          updatedDisplayedLaps[driverNum] = data.last_lap;
          changed = true;
        }
      }

      if (data.gap && data.gap !== "-" && data.gap !== "") {
        if (!updatedGaps[driverNum]) updatedGaps[driverNum] = {};
        updatedGaps[driverNum].gap = data.gap;
        changed = true;
      }
      if (data.interval && data.interval !== "-" && data.interval !== "") {
        if (!updatedGaps[driverNum]) updatedGaps[driverNum] = {};
        updatedGaps[driverNum].interval = data.interval;
        changed = true;
      }
      
      if (!updatedPersonal[driverNum]) updatedPersonal[driverNum] = { s1: 999, s2: 999, s3: 999 };
      ["s1", "s2", "s3"].forEach(s => {
        const val = parseFloat(data[s]);
        if (val > 0) {
          if (val < updatedSession[s]) { updatedSession[s] = val; changed = true; }
          if (val < updatedPersonal[driverNum][s]) { updatedPersonal[driverNum][s] = val; changed = true; }
        }
      });
    });

    if (changed) {
      setRecords({ session: updatedSession, personal: updatedPersonal, lastGaps: updatedGaps });
      setDisplayedLaps(updatedDisplayedLaps);
    }
  }, [actualData, raceData?.sim_time]);

  const formatRaceTime = (val) => {
    if (val === "LEADER") return "LEADER";
    if (!val || val === "-" || isNaN(parseFloat(val))) return val;
    const totalSeconds = parseFloat(val);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return minutes > 0 ? `${minutes}:${seconds.padStart(6, '0')}` : seconds;
  };

  const renderLastLap = (driver) => {
    const currentLapNum = parseInt(driver.lap_number) || 0;
    const displayedValue = displayedLaps[driver.number];
    
    if (currentLapNum <= 1) {
        const currentSimTime = new Date(raceData.sim_time).getTime();
        const lapStartTime = new Date(driver.date_start).getTime();
        const elapsedInLap = (currentSimTime - lapStartTime) / 1000;
        const sTotal = (parseFloat(driver.s1)||0) + (parseFloat(driver.s2)||0) + (parseFloat(driver.s3)||0);
        
        if (elapsedInLap < sTotal) return <span className="animate-pulse text-gray-700">...</span>;
    }
    return formatRaceTime(displayedValue || "NO DISPONIBLE");
  };

  const renderSector = (driver, sectorValue, sectorNumber) => {
    if (!sectorValue || sectorValue === "-" || sectorValue === 0) return "NO DISPONIBLE";
    const currentSimTime = new Date(raceData?.sim_time).getTime();
    const lapStartTime = new Date(driver.date_start).getTime();
    const elapsedInLap = (currentSimTime - lapStartTime) / 1000;
    const val = parseFloat(sectorValue);
    
    let timeToReveal = 0;
    if (sectorNumber === 1) timeToReveal = val;
    else if (sectorNumber === 2) timeToReveal = (parseFloat(driver.s1) || 0) + val;
    else if (sectorNumber === 3) timeToReveal = (parseFloat(driver.s1) || 0) + (parseFloat(driver.s2) || 0) + val;
    
    if (elapsedInLap < timeToReveal) return <span className="animate-pulse text-gray-700 text-[10px]">...</span>;
    
    const sKey = `s${sectorNumber}`;
    let colorClass = "text-yellow-400";
    if (val <= records.session[sKey]) colorClass = "text-purple-500 font-bold";
    else if (val <= records.personal[driver.number]?.[sKey]) colorClass = "text-green-400 font-bold";
    return <span className={colorClass}>{val.toFixed(3)}</span>;
  };

  if (driversArray.length === 0) return <div className="p-8 text-center text-gray-400 italic">Esperando telemetría...</div>;

  return (
    <div className="w-full">
      <LeyendaColores />
      <div className="w-full shadow-2xl bg-black border-danger border-2 rounded-[15px] overflow-hidden">
        <Table className="w-full table-fixed border-collapse">
          <TableHeader>
            <TableRow className="bg-black border-b border-danger hover:bg-black h-9">
              {["POS", "PILOTO", "GAP", "INTERVAL", "S1", "S2", "S3", "ÚLTIMA VUELTA", "NEUMÁTICO"].map((head) => (
                <TableHead key={head} className="text-white text-center font-bold px-0 text-[12px] uppercase tracking-wider">{head}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {driversArray.map((driver) => {
               const isLeader = driver.pNum === 1;
               const rawGap = (driver.gap && driver.gap !== "-") ? driver.gap : (records.lastGaps[driver.number]?.gap || "NO DISPONIBLE");
               const rawInterval = (driver.interval && driver.interval !== "-") ? driver.interval : (records.lastGaps[driver.number]?.interval || "NO DISPONIBLE");
               return (
                <TableRow key={driver.number} className="bg-black text-white border-zinc-800 hover:bg-zinc-900 transition-colors h-11">
                  <TableCell className="text-center font-bold text-xl italic p-0">{driver.position}</TableCell>
                  <TableCell className="text-center p-0">
                    <div className="flex justify-center w-full">
                      <div className="py-1 rounded-sm font-black text-[13px] uppercase shadow-sm text-center" 
                           style={{ backgroundColor: `#${(driver.team_color || '444').replace('#','')}`, width: '65px' }}>
                        {driver.acronym}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm p-0">
                    <span className={isLeader ? "text-yellow-500 font-bold" : "text-white"}>
                      {isLeader ? "LEADER" : formatRaceTime(rawGap)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm text-white p-0">
                    <span className={isLeader ? "text-yellow-500 font-bold" : "text-white"}>
                      {isLeader ? "LEADER" : formatRaceTime(rawInterval)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-[14px] p-0">{renderSector(driver, driver.s1, 1)}</TableCell>
                  <TableCell className="text-center font-mono text-[14px] p-0">{renderSector(driver, driver.s2, 2)}</TableCell>
                  <TableCell className="text-center font-mono text-[14px] p-0">{renderSector(driver, driver.s3, 3)}</TableCell>
                  <TableCell className="text-center font-mono font-bold text-white text-[15px] p-0">{renderLastLap(driver)}</TableCell>
                  <TableCell className="text-center p-0">
                     <div className="flex justify-center items-center">
                        <span className={`text-[14px] font-black w-7 h-7 flex items-center justify-center rounded-full border-[3px] ${
                          driver.compound?.toLowerCase().includes('soft') ? 'border-red-600 text-red-600' : 
                          driver.compound?.toLowerCase().includes('medium') ? 'border-yellow-500 text-yellow-500' :
                          driver.compound?.toLowerCase().includes('hard') ? 'border-zinc-300 text-zinc-300' : 'border-gray-500 text-gray-500'
                        }`}>{driver.compound?.charAt(0).toUpperCase() || '-'}</span>
                     </div>
                  </TableCell>
                </TableRow>
               );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}