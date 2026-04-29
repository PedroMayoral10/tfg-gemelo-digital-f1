import React, { useState, useEffect, useRef } from 'react';
import { URL_API_BACKEND } from "../../config";

const flagColorMapper = {
    "GREEN": "#00d21e",
    "YELLOW": "#ffeb00",
    "DOUBLE YELLOW": "#ffeb00",
    "DOUBLE YELLOW LIGHT": "#ffeb00",
    "DOUBLE YELLOW DARK": "#c49316",
    "RED": "#ff1801",
    "CLEAR": "#00d21e",
    "CHEQUERED": "#ffffff",
    "BLUE": "#00a2ff",
    "BLACK AND WHITE": "#ffffff",
    "B&W_WHITE": "#ffffff",
    "B&W_BLACK": "#000000",
};

export default function TablaRaceControl({ session_key, sim_time }) {
    const [raceMessages, setRaceMessages] = useState([]);
    const lastSessionKeyRef = useRef(null);
    const simTimeRef = useRef(sim_time);
    const raceMessagesRef = useRef([]);
    const scrollRef = useRef(null);

    const fetchMessages = async () => {
        if (!simTimeRef.current || !lastSessionKeyRef.current) return;

        const simTimeActual = new Date(simTimeRef.current);
        const mensajes = raceMessagesRef.current;
        const ultimoMsgDate = mensajes.length > 0
            ? new Date(mensajes[mensajes.length - 1].date)
            : null;

        // Lógica de salto atrás
        if (ultimoMsgDate && simTimeActual < ultimoMsgDate) {
            setRaceMessages([]);
            return;
        }

        try {
            const lastDateParam = ultimoMsgDate ? ultimoMsgDate.toISOString() : "null";
            const res = await fetch(
                `${URL_API_BACKEND}/race_control/openf1/race_control/${lastSessionKeyRef.current}?sim_time=${simTimeRef.current}&last_date=${lastDateParam}`
            );
            const nuevos = await res.json();
            if (nuevos && nuevos.length > 0) {
                setRaceMessages(prev => [...prev, ...nuevos]);
            }
        } catch (err) {
            console.error("Error sincronizando Race Control:", err);
        }
    };

    // Auto-scroll al recibir mensajes
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [raceMessages]);

    // Mantiene los refs sincronizados con el estado
    useEffect(() => {
        simTimeRef.current = sim_time;
    }, [sim_time]);

    useEffect(() => {
        raceMessagesRef.current = raceMessages;
    }, [raceMessages]);

    // Limpiar si cambia la sesión
    useEffect(() => {
        if (session_key && session_key !== lastSessionKeyRef.current) {
            setRaceMessages([]);
            lastSessionKeyRef.current = session_key;
        }
    }, [session_key]);

    useEffect(() => {
        if (!sim_time) return;
        const simTimeActual = new Date(sim_time);
        const mensajes = raceMessagesRef.current;
        const ultimoMsgDate = mensajes.length > 0
            ? new Date(mensajes[mensajes.length - 1].date)
            : null;

        if (ultimoMsgDate && simTimeActual < ultimoMsgDate) {
            setRaceMessages([]);
            raceMessagesRef.current = []; // Limpiamos también el ref para que fetchMessages arranque desde cero
            fetchMessages();
        }
    }, [sim_time]);

    // Fetch inmediato cuando cambia la sesión o el sim_time salta atrás
    useEffect(() => {
        if (session_key) fetchMessages();
    }, [session_key]);

    // Fetch cada 5 segundos
    useEffect(() => {
        if (!session_key) return;
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [session_key]);

    return (
        <div
            ref={scrollRef}
            className="pr-2 custom-scrollbar"
            style={{
                height: '230px',
                overflowY: 'auto',
                backgroundColor: '#000000',
                borderRadius: '8px',
                padding: '15px'
            }}
        >
            {raceMessages.length === 0 ? (
                <div className="d-flex h-100 align-items-center justify-content-center">
                    <p className="text-secondary small italic m-0">Esperando sesión...</p>
                </div>
            ) : (
                <div className="d-flex flex-column gap-2">
                    {raceMessages.map((msg, index) => {
                        const flagColor = flagColorMapper[msg.flag] || "#da5757";
                        return (
                            <div key={index} className="border-danger p-3 border-start border-3 w-100 shadow-sm" style={{ backgroundColor: '#000000' }}>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <div className="d-flex gap-3 align-items-center">
                                        {msg.flag && (
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: flagColor, boxShadow: `0 0 10px ${flagColor}` }} />
                                        )}
                                        <span className="fw-bold" style={{ fontSize: '0.8rem', color: flagColor }}>
                                            LAP {msg.lap_number && msg.lap_number !== "N/A" ? msg.lap_number : "---"}
                                        </span>
                                        <span className="text-secondary font-monospace" style={{ fontSize: '0.75rem' }}>
                                            [{new Date(msg.date).toLocaleTimeString()}]
                                        </span>
                                    </div>
                                    <span className="badge bg-dark text-secondary border border-secondary text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                                        {msg.category}
                                    </span>
                                </div>
                                <p className="text-white m-0 font-monospace d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                                    {msg.flag && (
                                        <div style={{
                                            width: '20px',
                                            height: '14px',
                                            background:
                                                msg.flag === "DOUBLE YELLOW"
                                                    ? `linear-gradient(135deg, ${flagColorMapper["DOUBLE YELLOW LIGHT"]} 50%, ${flagColorMapper["DOUBLE YELLOW DARK"]} 50%)`
                                                    : msg.flag === "BLACK AND WHITE"
                                                        ? `linear-gradient(135deg, ${flagColorMapper["B&W_WHITE"]} 50%, ${flagColorMapper["B&W_BLACK"]} 50%)`
                                                        : flagColor,
                                            borderRadius: '2px',
                                            flexShrink: 0,
                                            border: '1px solid rgba(255,255,255,0.2)'
                                        }} />
                                    )}
                                    {msg.message}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}