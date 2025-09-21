import { useState } from "react";
import { UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, HashtagIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const countryOptions = [
  { name: 'Venezuela', code: '+58', flag: '🇻🇪' },
  { name: 'Colombia', code: '+57', flag: '🇨🇴' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽' },
  { name: 'Ecuador', code: '+593', flag: '🇪🇨' },
  { name: 'Argentina', code: '+54', flag: '🇦🇷' },
  { name: 'Chile', code: '+56', flag: '🇨🇱' },
  { name: 'Peru', code: '+51', flag: '🇵🇪' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'Uruguay', code: '+598', flag: '🇺🇾' }
];

// Función para formatear cédula venezolana
const formatCedula = (value) => {
  // Eliminar caracteres no numéricos excepto la V inicial
  const cleanValue = value.replace(/[^0-9Vv]/g, '');
  
  // Si comienza con V o v, mantenerla y procesar los números
  if (cleanValue.match(/^[Vv]/)) {
    let numbers = cleanValue.substring(1).replace(/\D/g, '');
    // Limitar a 8 dígitos
    numbers = numbers.substring(0, 8);
    
    // Formatear los números con separadores de miles
    const formattedNumbers = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `V-${formattedNumbers}`;
  }
  
  // Si no tiene V, agregarla y formatear
  let numbers = cleanValue.replace(/\D/g, '');
  // Limitar a 8 dígitos
  numbers = numbers.substring(0, 8);
  
  const formattedNumbers = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return numbers ? `V-${formattedNumbers}` : '';
};

// Función para limpiar la cédula (eliminar formato y guardar solo números)
const cleanCedula = (formattedValue) => {
  return formattedValue.replace(/[^0-9]/g, '');
};

// Función para validar cédula venezolana
const validateCedula = (cedula) => {
  // Limpiar la cédula para obtener solo números
  const cleanCedulaValue = cleanCedula(cedula);
  
  // Validar que tenga exactamente 8 dígitos
  if (cleanCedulaValue.length === 0) {
    return {
      isValid: false,
      message: '' // No mostrar error si está vacío
    };
  }
  
  if (cleanCedulaValue.length < 8) {
    return {
      isValid: false,
      message: 'La cédula debe tener 8 dígitos'
    };
  }
  
  if (cleanCedulaValue.length > 8) {
    return {
      isValid: false,
      message: 'La cédula no puede tener más de 8 dígitos'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
};

// Función para validar números de teléfono venezolanos
const validateVenezuelanPhone = (phone, countryCode) => {
  if (countryCode === '+58') {
    // Limpiar el número de caracteres no numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Prefijos válidos para Venezuela
    const validPrefixes = ['412', '414', '416', '422', '424', '426'];
    
    // Verificar si el número comienza con uno de los prefijos válidos
    const isValid = validPrefixes.some(prefix => cleanPhone.startsWith(prefix));
    
    return {
      isValid,
      message: isValid ? '' : 'El número debe comenzar con 412, 414, 416, 422 o 424'
    };
  }
  
  // Para otros países, simplemente verificar que no esté vacío
  return {
    isValid: phone.trim().length > 0,
    message: phone.trim().length > 0 ? '' : 'El número de teléfono es requerido'
  };
};

export function NuevoJugador() {
  const [cedulaError, setCedulaError] = useState('');
  const { empresaId } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState(countryOptions[0]);

  const handleChange = e => {
    const { name, value } = e.target;
    
    if (name === 'cedula') {
      // Formatear la cédula automáticamente
      const formattedCedula = formatCedula(value);
      setForm({ ...form, [name]: formattedCedula });
      
      // Validar la cédula después de un pequeño delay
      setTimeout(() => {
        const validation = validateCedula(formattedCedula);
        setCedulaError(validation.message);
      }, 300);
    } else if (name === 'phone') {
      // Filtrar solo números para el teléfono
      const phoneValue = value.replace(/\D/g, '');
      setForm({ ...form, [name]: phoneValue });
      
      // Validar después de un pequeño delay para no afectar el rendimiento
      setTimeout(() => {
        const validation = validateVenezuelanPhone(phoneValue, selectedCountry.code);
        setPhoneError(validation.message);
      }, 300);
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleCountryChange = (countryCode) => {
    const country = countryOptions.find(c => c.code === countryCode);
    setSelectedCountry(country);
    
    // Revalidar el teléfono cuando cambia el país
    const validation = validateVenezuelanPhone(form.phone, countryCode);
    setPhoneError(validation.message);
  };

  const handleAddNumber = () => {
    const num = parseInt(form.favInput);
    if (!isNaN(num) && num >= 0 && num <= 999 && !form.favoriteNumbers.includes(num)) {
      toast.success(`Número ${num} agregado a favoritos.`);
      setForm({ ...form, favoriteNumbers: [...form.favoriteNumbers, num], favInput: "" });
    } else if (isNaN(num) || num < 0 || num > 999) {
      toast.error("Por favor, ingresa un número válido entre 0 y 999.");
    } else if (form.favoriteNumbers.includes(num)) {
      toast.info(`El número ${num} ya está en tu lista de favoritos.`);
    }
  };

  const handleRemoveNumber = (num) => {
    toast.warning(`Número ${num} eliminado de favoritos.`);
    setForm({ ...form, favoriteNumbers: form.favoriteNumbers.filter(n => n !== num) });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validación básica
    if (!form.firstName || !form.lastName) {
      toast.error("Nombre y apellido son obligatorios.");
      setLoading(false);
      return;
    }

    // Validar teléfono
    const phoneValidation = validateVenezuelanPhone(form.phone, selectedCountry.code);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.message);
      setLoading(false);
      return;
    }

    // Construir objeto para Supabase
    const playerData = {
      nombre: form.firstName,
      apellido: form.lastName,
      cedula: cleanCedula(form.cedula), // Guardar solo números sin formato
      email: form.email,
      telefono: `${selectedCountry.code}${form.phone.replace(/\D/g, '')}`,
      direccion: form.street,
      numeros_favoritos: form.favoriteNumbers,
      empresa_id: empresaId
      // Agrega campos extra según tu tabla
    };

    // Insertar en Supabase
    const { error } = await supabase
      .from("t_jugadores")
      .insert([playerData]);

    if (error) {
      if (error.status === 404) {
        toast.error("No se encontró la tabla");
      }
      toast.error("Error al guardar el jugador: " + error.message);
    } else {
      toast.success("¡Jugador agregado correctamente!");
      setTimeout(() => navigate("/jugadores"), 1200);
    }
    setLoading(false);
  };

  return (
    <>
      {loading && <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-[#181c24] p-6 rounded-lg flex items-center gap-4">
          <span className="text-white text-lg font-bold">Loading...</span>
          <div className="w-8 h-8 border-[#7c3bed] border-2 rounded-full animate-spin"></div>
        </div>
      </div>
      }

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto py-8">
        {/* Personal Info */}
        <div className="bg-[#181c24] rounded-xl p-6 border border-[#23283a] mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <UserIcon className="w-5 h-5" />Información personal
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full bg-[#11141a] border border-[#23283a] rounded-lg p-2 text-white" placeholder="Ingrese el nombre" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Apellido *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full bg-[#11141a] border border-[#23283a] rounded-lg p-2 text-white" placeholder="Ingrese el apellido" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cédula de Identidad</label>
              <div className={`flex items-center bg-[#11141a] border rounded-lg focus-within:border-[#7c3bed] transition-colors ${cedulaError ? 'border-red-500' : 'border-[#23283a]'}`}>
                <UserIcon className="w-5 h-5 text-gray-400 ml-2" />
                <input 
                  name="cedula" 
                  value={form.cedula} 
                  onChange={handleChange} 
                  className="bg-transparent flex-1 p-2 text-white outline-none" 
                  placeholder="V-12.345.678" 
                  maxlength="12" 
                />
              </div>
              {cedulaError && (
                <p className="text-red-400 text-xs mt-1">{cedulaError}</p>
              )}
              {!cedulaError && form.cedula && (
                <p className="text-gray-500 text-xs mt-1">La cédula debe tener 8 dígitos</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Correo electrónico</label>
              <div className="flex items-center bg-[#11141a] border border-[#23283a] rounded-lg">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 ml-2" />
                <input type="email" name="email" value={form.email} onChange={handleChange} className="bg-transparent flex-1 p-2 text-white outline-none" placeholder="jugador@ejemplo.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Número de teléfono *</label>
              <div className="flex items-center bg-[#11141a] border border-[#23283a] rounded-lg focus-within:border-[#7c3bed] transition-colors">
                <select
                  value={selectedCountry.code}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="bg-transparent border-r border-[#23283a] p-2 text-white outline-none rounded-l-lg cursor-pointer appearance-none"
                >
                  {countryOptions.map(c => (
                    <option key={c.code} value={c.code} className="bg-[#181c24]">
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input 
                  name="phone" 
                  value={form.phone} 
                  onChange={handleChange} 
                  className={`bg-transparent flex-1 p-2 text-white outline-none ${phoneError ? 'border-red-500' : ''}`} 
                  placeholder="412-123-4567" 
                  required 
                />
              </div>
              {phoneError && (
                <p className="text-red-400 text-xs mt-1">{phoneError}</p>
              )}
              {selectedCountry.code === '+58' && !phoneError && (
                <p className="text-gray-500 text-xs mt-1">El número debe comenzar con 412, 414, 416, 422 o 424</p>
              )}
            </div>
          </div>
        </div>

        {/* Números favoritos */}
        <div className="bg-[#181c24] rounded-xl p-6 border border-[#23283a]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <HashtagIcon className="w-5 h-5" /> Números favoritos
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="favInput"
              min="0"
              max="999"
              value={form.favInput}
              onChange={handleChange}
              className="flex-1 bg-[#11141a] border border-[#23283a] rounded-lg p-2 text-white"
              placeholder="Ingrese un número (0-999)"
            />
            <button type="button" onClick={handleAddNumber} className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg font-bold text-lg">+</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {form.favoriteNumbers.map(num => (
              <span key={num} className="inline-flex items-center bg-[#23283a] text-white px-2 py-1 rounded-md font-mono text-xs">
                {num}
                <button type="button" onClick={() => handleRemoveNumber(num)} className="ml-1 text-[#d54ff9] hover:text-red-500 font-bold">&times;</button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button type="submit" className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-2 rounded-lg font-semibold transition" disabled={loading}>
            {loading ? "Guardando..." : "Agregar Jugador"}
          </button>
        </div>
      </form>
    </>
  );
}
