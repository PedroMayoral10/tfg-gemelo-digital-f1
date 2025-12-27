import { useState } from 'react';
import { Container, Row, Col, Card, Tab, Tabs } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import CircuitMap from './components/Circuito';
import './App.css'; // Tu CSS oscuro personalizado

function App() {

  return (
    <div className="app-container" style={{ minHeight: '100vh', backgroundColor: '#121212', color: 'white' }}>
      {/* Contenedor de Notificaciones */}
      <ToastContainer position="top-right" theme="dark" />

      <Container fluid className="p-4">
        <Row className="mb-4">
          <Col>
            <h1 className="text-uppercase fw-bold" style={{ borderLeft: '5px solid #e10600', paddingLeft: '15px' }}>
              F1 Digital Twin <span style={{ fontSize: '0.5em', color: '#641717ff' }}>BETA</span>
            </h1>
          </Col>
        </Row>

        <Row>
          <Col md={12}>
            <Card className="bg-secondary text-white shadow-lg" style={{ backgroundColor: '#1e1e1e', border: 'none' }}>
              {/* Aquí va nuestro Mapa */}
              <div className="p-3">
                <Row>
                  <Col>
                    <CircuitMap />
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;