import React, { useMemo, useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export default function TablaCarrera({ raceData, driverStatus = [] }) {
  const [records, setRecords] = useState({
    session: { s1: 999, s2: 999, s3: 999 },
    personal: {},
  });

  const [displayedLaps, setDisplayedLaps] = useState({});

  const actualData = useMemo(() => {
    return raceData?.race_table || {};
  }, [raceData]);

  // COLORES DE NEUMÁTICOS
  const getTyreColor = (compound) => {
    if (!compound) return "border-zinc-700 text-zinc-400";
    const c = compound.toUpperCase();
    if (c.includes("SOFT")) return "border-red-600 text-red-600";
    if (c.includes("MEDIUM")) return "border-yellow-500 text-yellow-500";
    if (c.includes("HARD")) return "border-white text-white";
    if (c.includes("INTERMEDIATE")) return "border-green-600 text-green-600";
    if (c.includes("WET")) return "border-blue-600 text-blue-600";
    return "border-zinc-700 text-zinc-400";
  };

  const driversArray = useMemo(() => {
    if (!actualData) return [];

    // Vuelta actual del líder
    const leaderLap = Math.max(
      ...Object.values(actualData)
        .filter(d => d.lap_number)
        .map(d => parseInt(d.lap_number) || 0),
      0
    );

    return Object.entries(actualData)
      .filter(([key]) => key !== 'session_key')
      .map(([number, details]) => {
        const statusInfo = driverStatus.find(s => String(s.driver_number) === String(number));
        const lapsCompletedInDB = statusInfo ? parseInt(statusInfo.number_of_laps) : 999;

        let displayPos = details.position;
        let isOut = false;

        if (statusInfo) {
          if (statusInfo.dns) { isOut = true; displayPos = "DNS"; }
          else if (statusInfo.dsq && lapsCompletedInDB >= 0 && leaderLap > lapsCompletedInDB) {
            isOut = true;
            displayPos = "DSQ";
          }
          else if (statusInfo.dnf && lapsCompletedInDB >= 0 && leaderLap > lapsCompletedInDB) {
            isOut = true;
            displayPos = "DNF";
          }
        }

        return {
          number,
          ...details,
          displayPos,
          isOut,
          pNum: isOut ? 1000 + (parseInt(details.position) || 50) : (parseInt(details.position) || 999)
        };
      })
      .sort((a, b) => a.pNum - b.pNum);
  }, [actualData, driverStatus]);

  // Lógica de actualización de tiempos
  useEffect(() => {
    if (!actualData || Object.keys(actualData).length === 0) return;

    let updatedSession = { ...records.session };
    let updatedPersonal = { ...records.personal };
    let updatedDisplayedLaps = { ...displayedLaps };
    let changed = false;

    const currentSimTime = new Date(raceData?.sim_time).getTime();

    Object.entries(actualData).forEach(([driverNum, data]) => {
      if (driverNum === 'session_key') return;

      // Revelación de última vuelta basada en tiempo transcurrido
      const lapStartTime = new Date(data.date_start).getTime();
      const elapsedInLap = (currentSimTime - lapStartTime) / 1000;
      const s1 = parseFloat(data.s1) || 0;
      const s2 = parseFloat(data.s2) || 0;
      const s3 = parseFloat(data.s3) || 0;
      const totalLapTime = s1 + s2 + s3;

      if (elapsedInLap >= totalLapTime && data.last_lap && data.last_lap !== "-") {
        if (updatedDisplayedLaps[driverNum] !== data.last_lap) {
          updatedDisplayedLaps[driverNum] = data.last_lap;
          changed = true;
        }
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
      setRecords(prev => ({ ...prev, session: updatedSession, personal: updatedPersonal }));
      setDisplayedLaps(updatedDisplayedLaps);
    }
  }, [actualData, raceData?.sim_time]); // sim_time para revelar en tiempo real

  const formatRaceTime = (val) => {
    if (val === "LEADER") return "LEADER";
    if (!val || val === "-" || isNaN(parseFloat(val))) return val;
    const totalSeconds = parseFloat(val);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return minutes > 0 ? `${minutes}:${seconds.padStart(6, '0')}` : seconds;
  };

  const renderLastLap = (driver) => {
    if (driver.isOut) return "-";
    const displayedValue = displayedLaps[driver.number];
    return (displayedValue && displayedValue !== "-")
      ? formatRaceTime(displayedValue)
      : <span className="animate-pulse text-gray-700">...</span>;
  };

  const renderSector = (driver, sectorValue, sectorNumber) => {
    if (driver.isOut) return "-";

    // En la vuelta de formación (lap 0) no hay sectores, mostramos esperando
    const currentLap = parseInt(driver.lap_number) || 0;
    if (currentLap < 1) {
      return <span className="animate-pulse text-gray-700 text-[10px]">...</span>;
    }

    // Si no hay dato en vueltas normales, es que no está disponible
    if (!sectorValue || sectorValue === "-" || sectorValue === 0) {
      return <span className="text-zinc-600 text-[10px] font-bold">N/D</span>;
    }

    const currentSimTime = new Date(raceData?.sim_time).getTime();
    const lapStartTime = new Date(driver.date_start).getTime();
    const elapsedInLap = (currentSimTime - lapStartTime) / 1000;
    const val = parseFloat(sectorValue);

    const s1 = parseFloat(driver.s1);
    const s2 = parseFloat(driver.s2);
    const s1Valid = s1 > 0;
    const s2Valid = s2 > 0;

    let timeToReveal = 0;
    if (sectorNumber === 1) {
      timeToReveal = val;
    } else if (sectorNumber === 2) {
      // Si no hay S1, esperamos al final de la vuelta completa
      if (!s1Valid) {
        const s3 = parseFloat(driver.s3) || 0;
        timeToReveal = val + s3;
      } else {
        timeToReveal = s1 + val;
      }
    } else if (sectorNumber === 3) {
      // Si falta S1 o S2, esperamos al final de la vuelta
      if (!s1Valid || !s2Valid) {
        timeToReveal = val + 999;
      } else {
        timeToReveal = s1 + s2 + val;
      }
    }

    // Dato existe pero aún no toca revelarlo
    if (elapsedInLap < timeToReveal) {
      return <span className="animate-pulse text-gray-700 text-[10px]">...</span>;
    }

    const sKey = `s${sectorNumber}`;
    let colorClass = "text-yellow-400";
    if (val <= records.session[sKey]) colorClass = "text-purple-500 font-bold";
    else if (val <= records.personal[driver.number]?.[sKey]) colorClass = "text-green-400 font-bold";
    return <span className={colorClass}>{val.toFixed(3)}</span>;
  };

  return (
    <div className="w-full">
      <div className="w-full shadow-2xl bg-black border-danger border-2 rounded-[15px] overflow-hidden">

        {driversArray.length === 0 ? (
          <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
            <p className="text-secondary fst-italic m-0">Esperando sesión...</p>
          </div>
        ) : (
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
                const isLeader = driver.displayPos === "1" || driver.displayPos === 1;
                const loadingDots = <span className="animate-pulse text-gray-700">...</span>;

                return (
                  <TableRow
                    key={driver.number}
                    className={`bg-black text-white border-zinc-800 transition-colors h-11 ${driver.isOut ? "opacity-40 grayscale-[0.8]" : "hover:bg-zinc-900"
                      }`}
                  >
                    <TableCell className={`text-center font-bold text-xl p-0 ${driver.isOut ? "text-red-600" : ""}`}>
                      {driver.displayPos}
                    </TableCell>

                    <TableCell className="text-center p-0">
                      <div className="flex flex-col items-center justify-center">
                        <div className="py-0.5 rounded-sm font-black text-[13px] uppercase shadow-sm text-center"
                          style={{
                            backgroundColor: `#${(driver.team_color || '444').replace('#', '')}`,
                            width: '65px',
                            filter: driver.isOut ? 'brightness(0.5)' : 'none'
                          }}>
                          {driver.acronym}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono text-sm p-0">
                      <span className={isLeader ? "text-yellow-500 font-bold" : "text-white"}>
                        {driver.isOut ? "-" : (isLeader ? "LEADER" : (driver.gap || loadingDots))}
                      </span>
                    </TableCell>

                    <TableCell className="text-center font-mono text-sm text-white p-0">
                      <span className={isLeader ? "text-yellow-500 font-bold" : "text-white"}>
                        {driver.isOut ? "-" : (isLeader ? "LEADER" : (driver.interval || loadingDots))}
                      </span>
                    </TableCell>

                    <TableCell className="text-center font-mono text-[14px] p-0">{renderSector(driver, driver.s1, 1)}</TableCell>
                    <TableCell className="text-center font-mono text-[14px] p-0">{renderSector(driver, driver.s2, 2)}</TableCell>
                    <TableCell className="text-center font-mono text-[14px] p-0">{renderSector(driver, driver.s3, 3)}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-white text-[15px] p-0">{renderLastLap(driver)}</TableCell>

                    <TableCell className="text-center p-0">
                      <div className="flex justify-center items-center">
                        <span className={`text-[14px] font-black w-7 h-7 flex items-center justify-center rounded-full border-[3px] ${getTyreColor(driver.compound)}`}>
                          {driver.compound?.charAt(0).toUpperCase() || '-'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

      </div>
    </div>
  );
}