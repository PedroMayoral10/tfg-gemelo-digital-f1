import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import '@testing-library/jest-dom';
import { toast } from 'react-toastify';

// 1. Simulamos fetch y toast
global.fetch = jest.fn();
jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

const renderLogin = () => {
    return render(
        <BrowserRouter>
            <Login />
        </BrowserRouter>
    );
};

describe('Pruebas Login', () => {

    beforeEach(() => {
        fetch.mockClear();
        jest.clearAllMocks();
    });

    test('Renderizado de la pantalla del Login', () => {
        renderLogin();
        // Buscamos los elementos que deberían estar en el formulario
        expect(screen.getByPlaceholderText('Usuario')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
        expect(screen.getByText('ENTRAR A PISTA')).toBeInTheDocument();
    });

    test('Debe permitir escribir en los campos de texto', () => {
        renderLogin();
        const userInput = screen.getByPlaceholderText('Usuario');
        const passInput = screen.getByPlaceholderText('Contraseña');

        fireEvent.change(userInput, { target: { value: 'qwer' } });
        fireEvent.change(passInput, { target: { value: '123' } });

        expect(userInput.value).toBe('qwer');
        expect(passInput.value).toBe('123');
    });

    test('Error si el backend devuelve 401 (Credenciales incorrectas)', async () => {
        // Simulamos la respuesta de error que configuramos en el backend
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({ error: "Credenciales inválidas" }),
        });
        

        renderLogin();

        fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'qwer' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: '123' } });
        fireEvent.click(screen.getByText('ENTRAR A PISTA'));

        // Verificamos que se llamó a la URL correcta
        await waitFor(() => expect(fetch).toHaveBeenCalled());

        expect(toast.error).toHaveBeenCalledWith("Credenciales inválidas");
    });

    test('Debe entrar como invitado al pulsar el botón correspondiente', () => {
        renderLogin();
        const btn = screen.getByText(/Entrar como Invitado/i);

        fireEvent.click(btn);
        // Verificar que lleva a la ruta de circuito interactivo.
        expect(window.location.pathname).toBe('/circuito-interactivo');
    });

    test('Login exitoso, se guardan los datos y redirige ', async () => {

        // Simulamos la respuesta exitosa del backend
        const mockResponse = {
            token: 'token',
            user: { username: 'Pedro' }
        };

        // Simulamos que el backend devuelve un login exitoso y su contenido
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockResponse,
        });

        // Espiamos el localStorage para ver si se guardan los datos que el backend devuelve
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        const { toast } = require('react-toastify');

        renderLogin();

        // Rellenar el formulario y hacer submit
        fireEvent.change(screen.getByPlaceholderText('Usuario'), { target: { value: 'Pedro' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: '1234' } });
        fireEvent.click(screen.getByText('ENTRAR A PISTA'));

        // Verificar que se guardan los datos 
        await waitFor(() => {
            expect(setItemSpy).toHaveBeenCalledWith('token', 'token');
            expect(setItemSpy).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.user));
        });

        // Verificar mensaje de bienvenida y redirección
        expect(toast.success).toHaveBeenCalledWith("Bienvenido, Pedro");
        expect(window.location.pathname).toBe('/circuito-interactivo');
    });



});