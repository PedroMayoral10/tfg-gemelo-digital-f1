import React, { useState, useEffect } from 'react';
import { URL_API_BACKEND } from "../../config";

const countryToIso = {
    "spain": "es", "united-kingdom": "gb", "germany": "de", "brazil": "br", "france": "fr",
    "italy": "it", "netherlands": "nl", "monaco": "mc", "austria": "at", "australia": "au",
    "finland": "fi", "belgium": "be", "canada": "ca", "mexico": "mx", "japan": "jp",
    "switzerland": "ch", "argentina": "ar", "new-zealand": "nz", "south-africa": "za",
    "sweden": "se", "colombia": "co", "united-states-of-america": "us", "china": "cn",
    "uruguay": "uy", "malasya": "my", "malaysia": "my", "ireland": "ie", "hong-kong": "hk",
    "zimbabwe": "zw", "portugal": "pt", "poland": "pl", "morocco": "ma", "marruecos": "ma",
    "israel": "il", "indonesia": "id"
};

const Pilotos = () => {
    const [drivers, setDrivers] = useState([]);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [teams, setTeams] = useState([]);

    const getFlagCode = (countryId) => {
        if (!countryId) return "un"; 
        const cleanId = countryId.toLowerCase().trim();
        return countryToIso[cleanId] || (cleanId.length >= 2 ? cleanId.substring(0, 2) : "un");
    };

    const processTrajectory = (data) => {
        if (!data || !Array.isArray(data) || data.length === 0) return [];
        const sortedDesc = [...data].sort((a, b) => b.year - a.year);
        const grouped = [];

        sortedDesc.forEach((entry) => {
            const lastGroup = grouped[grouped.length - 1];
            if (lastGroup && lastGroup.constructorId === entry.constructorId) {
                lastGroup.yearsInfo.push({ year: entry.year, rounds: entry.roundsText });
            } else {
                grouped.push({
                    constructorId: entry.constructorId,
                    yearsInfo: [{ year: entry.year, rounds: entry.roundsText }]
                });
            }
        });
        return grouped;
    };

    useEffect(() => {
        fetch(`${URL_API_BACKEND}/drivers/pilotos_historicos`)
            .then(res => res.json())
            .then(data => {
                const results = Array.isArray(data) ? data : [];
                setDrivers(results);
                if (results.length > 0) setSelectedDriver(results[0]);
            })
            .catch(err => console.error("Error cargando pilotos:", err));
    }, []);

    useEffect(() => {
        if (selectedDriver) {
            fetch(`${URL_API_BACKEND}/drivers/trayectoria/${selectedDriver.id}`)
                .then(res => res.json())
                .then(data => {
                    setTeams(processTrajectory(data));
                })
                .catch(err => {
                    console.error("Error cargando escuderías:", err);
                    setTeams([]);
                });
        }
    }, [selectedDriver]);

    const filteredDrivers = (drivers || []).filter(d => {
        const name = d?.fullName || ""; 
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="flex h-screen bg-zinc-900 text-white p-6 font-sans gap-2 overflow-hidden" style={{ height: 'calc(100vh - 70px)' }}>
            {/* PANEL IZQUIERDO */}
            <div className="w-[20%] flex flex-col border-r border-zinc-800 pr-4">
                <input 
                    type="text" 
                    placeholder="Buscar piloto..." 
                    className="w-full p-2 mb-4 bg-black border border-zinc-700 rounded text-sm outline-none focus:border-red-600 transition-all"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {filteredDrivers.map(d => (
                        <div 
                            key={d._id}
                            onClick={() => setSelectedDriver(d)}
                            className={`p-3 rounded cursor-pointer flex items-center border-l-4 transition-all ${
                                selectedDriver?._id === d._id ? 'bg-black border-red-600' : 'bg-transparent border-transparent hover:bg-black/50'
                            }`}
                        >
                            <span className={`fi fi-${getFlagCode(d.nationalityCountryId)} mr-3 shadow-sm flex-shrink-0`}></span>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm m-0 leading-tight break-words">{d.fullName}</p>
                                <p className="text-[10px] uppercase text-zinc-500 m-0 truncate">{d.nationalityCountryId}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PANEL CENTRAL */}
            <div className="w-[60%] px-8 overflow-hidden">
                {selectedDriver ? (
                    <div className="animate-in fade-in duration-500 pb-10">
                        <div className="flex justify-between items-end border-b border-zinc-800 pb-4 mb-8">
                            <div>
                                <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-tight">
                                    {selectedDriver.fullName}
                                </h1>
                                <p className="text-red-600 font-mono text-7xl uppercase leading-none m-0">
                                    {selectedDriver.abbreviation || "---"}
                                </p>
                            </div>
                            <div className="text-7xl font-black text-zinc-800">
                                #{selectedDriver.permanentNumber || "0"}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-zinc-950 p-6 rounded-xl border border-danger">
                                    <h6 className="text-red-600 text-xm font-bold uppercase mb-3">Datos Personales</h6>
                                    <div className="space-y-4">
                                        <InfoItem label="Fecha de Nacimiento" value={selectedDriver.dateOfBirth} />
                                        <InfoItem label="Lugar de Nacimiento" value={selectedDriver.placeOfBirth} />
                                        <InfoItem label="Nacionalidad" value={selectedDriver.nationalityCountryId} />
                                    </div>
                                </div>
                                <div className="bg-zinc-950 p-6 rounded-xl border border-danger">
                                    <h6 className="text-red-600 text-xm font-bold uppercase mb-6">Hitos en Carrera</h6>
                                    <div className="space-y-8">
                                        <InfoItem label="Mejor Posición Salida" value={selectedDriver.bestStartingGridPosition} isBadge />
                                        <InfoItem label="Mejor Resultado Carrera" value={selectedDriver.bestRaceResult} isBadge />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2">
                                <h6 className="text-zinc-500 text-xm font-bold uppercase mb-4 px-1">Estadísticas Totales</h6>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-10">
                                    <StatCard label="Mundiales" value={selectedDriver.totalChampionshipWins} isRed />
                                    <StatCard label="Carreras" value={selectedDriver.totalRaceEntries} />
                                    <StatCard label="Victorias" value={selectedDriver.totalRaceWins} />
                                    <StatCard label="Podios" value={selectedDriver.totalPodiums} />
                                    <StatCard label="Puntos" value={selectedDriver.totalPoints} />
                                    <StatCard label="Poles" value={selectedDriver.totalPolePositions} />
                                    <StatCard label="Vueltas Rápidas" value={selectedDriver.totalFastestLaps} />
                                    <StatCard label="Piloto del Día" value={selectedDriver.totalDriverOfTheDay} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-zinc-700 font-medium text-lg">Selecciona un piloto</div>
                )}
            </div>

            {/* PANEL DERECHO: TRAYECTORIA */}
            <div className="w-[20%] border-l border-zinc-800 pl-4 flex flex-col">
                <h6 className="text-red-600 text-xm font-bold uppercase mb-4">Trayectoria</h6>
                <div className="flex-1 overflow-y-auto space-y-4 pb-10 custom-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style>{`.custom-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                    {teams.map((group, index) => (
                        <div key={index} className="bg-zinc-950 p-4 rounded border border-danger group flex flex-col items-start gap-y-2">  
                            <div className="w-full flex justify-between items-center">
                                <p className="text-xm font-bold text-zinc-200 uppercase truncate pr-4 leading-none m-0">
                                    {group.constructorId?.replace(/-/g, ' ')}
                                </p>
                                <span className="text-xm text-zinc-700 font-black group-hover:text-red-600 transition-colors">
                                    {Math.max(...group.yearsInfo.map(y => y.year))} 
                                    {group.yearsInfo.length > 1 ? ` - ${Math.min(...group.yearsInfo.map(y => y.year))}` : ''}
                                </span>
                            </div>

                            <div className="w-full flex flex-col gap-y-1">
                                {group.yearsInfo.map((y, idx) => (
                                    <p key={idx} className="text-[12px] text-zinc-500 font-medium leading-none m-0">
                                        Año {y.year}: {y.rounds ? `Ronda ${y.rounds}` : 'Sin datos'}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ label, value, isBadge }) => (
    <div className="flex flex-col">
        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{label}</span>
        {isBadge ? (
            <span className="bg-zinc-800 text-white text-xs font-bold px-2 py-1 rounded w-fit border border-zinc-700">{value || "N/A"}º Posición</span>
        ) : (
            <span className="text-sm text-zinc-200 capitalize font-medium">{value?.replace(/-/g, ' ') || "---"}</span>
        )}
    </div>
);

const StatCard = ({ label, value, isRed }) => (
    <div className="p-4 rounded-lg border border-danger bg-zinc-950">
        <p className="text-[10px] uppercase text-zinc-500 font-bold mb-1">{label}</p>
        <p className={`text-3xl font-black ${isRed ? 'text-red-600' : 'text-white'} tracking-tighter`}>{value || 0}</p>
    </div>
);

export default Pilotos;