import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from './Register';
import '@testing-library/jest-dom';

// Simulamos fetch y toast
global.fetch = jest.fn();
jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

const renderRegister = () => {
    return render(
        <BrowserRouter>
            <Register />
        </BrowserRouter>
    );
};

describe('Pruebas del Componente Register', () => {

    beforeEach(() => {
        fetch.mockClear();
        jest.clearAllMocks();
    });

    test('Debe renderizar los inputs y el botón de registro', () => {
        renderRegister();
        expect(screen.getByPlaceholderText('Usuario')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
        expect(screen.getByText('CREAR CUENTA')).toBeInTheDocument();
    });

    test('Debe permitir escribir en los campos de registro', () => {
        renderRegister();
        const userInput = screen.getByPlaceholderText('Usuario');
        const passInput = screen.getByPlaceholderText('Contraseña');

        fireEvent.change(userInput, { target: { value: 'name' } });
        fireEvent.change(passInput, { target: { value: '123' } });

        expect(userInput.value).toBe('name');
        expect(passInput.value).toBe('123');
    });

    test('Registro exitoso: redirige al Login', async () => {
        // Simulamos respuesta exitosa del backend
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ message: "Usuario creado" }),
        });

        const { toast } = require('react-toastify');
        renderRegister();

        fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'pedro' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: '1234' } });
        fireEvent.click(screen.getByText('CREAR CUENTA'));

        await waitFor(() => expect(fetch).toHaveBeenCalled());
        expect(toast.success).toHaveBeenCalledWith("¡Registro exitoso! Ahora inicia sesión.");
        expect(window.location.pathname).toBe('/');
    });

    test('Error en registro: muestra mensaje de error del backend', async () => {
        // Simula que el usuario ya existe 
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({ error: "El usuario ya existe" }),
        });

        const { toast } = require('react-toastify');
        renderRegister();

        fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'repetido' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: '123' } });
        fireEvent.click(screen.getByText('CREAR CUENTA'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("El usuario ya existe");
        });
    });

    test('No debe llamar a la API si los campos están vacíos', async () => {
        renderRegister();
        const botonSubmit = screen.getByText('CREAR CUENTA');
        fireEvent.click(botonSubmit);
        expect(fetch).not.toHaveBeenCalled();
    });



});