import { useState, useEffect } from "react";
import { XMarkIcon, UserIcon, EnvelopeIcon, PhoneIcon, IdentificationIcon, MapPinIcon, StarIcon } from "@heroicons/react/24/outline";
import { useAuth } from '../context/AuthContext.jsx';

const countryOptions = [
  { name: 'Venezuela', code: '+58', flag: '🇻🇪', placeholder: '414-123-4567' },
  { name: 'Colombia', code: '+57', flag: '🇨🇴', placeholder: '300 123 4567' },
  { name: 'United States', code: '+1', flag: '🇺🇸', placeholder: '(201) 555-0123' },
  { name: 'Spain', code: '+34', flag: '🇪🇸', placeholder: '612 34 56 78' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽', placeholder: '55 1234 5678' },
  { name: 'Ecuador', code: '+593', flag: '🇪🇨', placeholder: '99 123 4567' },
  { name: 'Argentina', code: '+54', flag: '🇦🇷', placeholder: '11 1234-5678' },
  { name: 'Chile', code: '+56', flag: '🇨🇱', placeholder: '9 1234 5678' },
  { name: 'Peru', code: '+51', flag: '🇵🇪', placeholder: '912 345 678' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷', placeholder: '(11) 91234-5678' },
  { name: 'Uruguay', code: '+598', flag: '🇺🇾', placeholder: '91 234 567' },
  { name: 'Panama', code: '+507', flag: '🇵🇦', placeholder: '6123-4567' },
  { name: 'Alemania', code: '+49', flag: '🇩🇪', placeholder: '151 12345678' }
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

    // Formatear según la longitud
    let formattedNumbers = '';
    if (numbers.length > 0) {
      if (numbers.length <= 3) {
        formattedNumbers = numbers;
      } else if (numbers.length <= 6) {
        formattedNumbers = numbers.slice(0, 3) + '.' + numbers.slice(3);
      } else {
        // Para 7-8 dígitos: primer grupo (1-2 dígitos), segundo grupo (3 dígitos), tercer grupo (resto)
        const firstGroupLength = numbers.length === 7 ? 1 : 2;
        formattedNumbers =
          numbers.slice(0, firstGroupLength) + '.' +
          numbers.slice(firstGroupLength, firstGroupLength + 3) + '.' +
          numbers.slice(firstGroupLength + 3);
      }
    }

    return `V-${formattedNumbers}`;
  }

  // Si no tiene V, agregarla y formatear
  let numbers = cleanValue.replace(/\D/g, '');
  // Limitar a 8 dígitos
  numbers = numbers.substring(0, 8);

  // Formatear según la longitud
  let formattedNumbers = '';
  if (numbers.length > 0) {
    if (numbers.length <= 3) {
      formattedNumbers = numbers;
    } else if (numbers.length <= 6) {
      formattedNumbers = numbers.slice(0, 3) + '.' + numbers.slice(3);
    } else {
      // Para 7-8 dígitos: primer grupo (1-2 dígitos), segundo grupo (3 dígitos), tercer grupo (resto)
      const firstGroupLength = numbers.length === 7 ? 1 : 2;
      formattedNumbers =
        numbers.slice(0, firstGroupLength) + '.' +
        numbers.slice(firstGroupLength, firstGroupLength + 3) + '.' +
        numbers.slice(firstGroupLength + 3);
    }
  }

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

  // Validar que tenga entre 7 y 8 dígitos
  if (cleanCedulaValue.length === 0) {
    return {
      isValid: true,
      message: '' // No mostrar error si está vacío
    };
  }

  if (cleanCedulaValue.length < 7) {
    return {
      isValid: false,
      message: 'La cédula debe tener entre 7 y 8 dígitos'
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
    const cleanValue = phone.replace(/\D/g, '');

    // Si está vacío, es válido
    if (cleanValue.length === 0) {
      return { isValid: true, message: '' };
    }

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
  if (phone.trim().length === 0) {
    return { isValid: true, message: '' };
  }

  return {
    isValid: phone.trim().length > 0,
    message: ''
  };
};

// Función para validar correo electrónico
const validateEmail = (email) => {
  // Si el campo está vacío, es válido (no es obligatorio)
  if (!email || email.trim().length === 0) {
    return {
      isValid: true,
      message: ''
    };
  }

  // Expresión regular para validar formato de correo electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email.trim());

  return {
    isValid,
    message: isValid ? '' : 'El formato del correo electrónico no es válido'
  };
};

const applyPhoneMask = (value, countryCode) => {
  const digits = value.replace(/\D/g, '');
  switch (countryCode) {
    case '+58': // Venezuela: 414-123-4567 (10 digits)
      return digits.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    case '+57': // Colombia: 300 123 4567 (10 digits)
      return digits.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    case '+1': // US: (201) 555-0123 (10 digits)
      return digits.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    case '+34': // Spain: 612 34 56 78 (9 digits)
      return digits.slice(0, 9).replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    case '+52': // Mexico: 55 1234 5678 (10 digits)
      return digits.slice(0, 10).replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3');
    case '+593': // Ecuador: 99 123 4567 (9 digits)
      return digits.slice(0, 9).replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3');
    case '+54': // Argentina: 11 1234-5678 (10 digits)
      return digits.slice(0, 10).replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2-$3');
    case '+56': // Chile: 9 1234 5678 (9 digits)
      return digits.slice(0, 9).replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2 $3');
    case '+51': // Peru: 912 345 678 (9 digits)
      return digits.slice(0, 9).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    case '+55': // Brazil: (11) 91234-5678 (11 digits)
      return digits.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    case '+598': // Uruguay: 91 234 567 (8 digits)
      return digits.slice(0, 8).replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3');
    case '+507': // Panama: 6123-4567 (8 digits)
      return digits.slice(0, 8).replace(/(\d{4})(\d{4})/, '$1-$2');
    case '+49': // Germany: 151 12345678 (up to 11 digits)
      return digits.slice(0, 11).replace(/(\d{3})(\d+)/, '$1 $2');
    default:
      return digits;
  }
};

// Función para formatear teléfono para guardar en base de datos
const formatPhoneForDatabase = (phoneDigits, countryCode) => {
  const digits = phoneDigits.replace(/\D/g, '');
  switch (countryCode) {
    case '+58': // Venezuela: +58 414-123-4567
      return digits.length >= 10 ? `${countryCode} ${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}` : `${countryCode}${digits}`;
    case '+57': // Colombia: +57 300 123 4567
      return digits.length >= 10 ? `${countryCode} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}` : `${countryCode}${digits}`;
    case '+1': // US: +1 (201) 555-0123
      return digits.length >= 10 ? `${countryCode} (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}` : `${countryCode}${digits}`;
    case '+34': // Spain: +34 612 34 56 78
      return digits.length >= 9 ? `${countryCode} ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}` : `${countryCode}${digits}`;
    case '+52': // Mexico: +52 55 1234 5678
      return digits.length >= 10 ? `${countryCode} ${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}` : `${countryCode}${digits}`;
    case '+593': // Ecuador: +593 99 123 4567
      return digits.length >= 9 ? `${countryCode} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}` : `${countryCode}${digits}`;
    case '+54': // Argentina: +54 11 1234-5678
      return digits.length >= 10 ? `${countryCode} ${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6, 10)}` : `${countryCode}${digits}`;
    case '+56': // Chile: +56 9 1234 5678
      return digits.length >= 9 ? `${countryCode} ${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5, 9)}` : `${countryCode}${digits}`;
    case '+51': // Peru: +51 912 345 678
      return digits.length >= 9 ? `${countryCode} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}` : `${countryCode}${digits}`;
    case '+55': // Brazil: +55 (11) 91234-5678
      return digits.length >= 11 ? `${countryCode} (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}` : `${countryCode}${digits}`;
    case '+598': // Uruguay: +598 91 234 567
      return digits.length >= 8 ? `${countryCode} ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}` : `${countryCode}${digits}`;
    case '+49': // Germany: +49 151 12345678
      return digits.length >= 10 ? `${countryCode} ${digits.slice(0, 3)} ${digits.slice(3)}` : `${countryCode}${digits}`;
    case '+507': // Panama: +507 6123-4567
      return digits.length >= 8 ? `${countryCode} ${digits.slice(0, 4)}-${digits.slice(4, 8)}` : `${countryCode}${digits}`;
    default:
      return `${countryCode}${digits}`;
  }
};

export default function JugadorFormModal({ isOpen, onClose, onSave, initialData }) {
  const { empresaId } = useAuth();
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    email: "",
    telefono: "",
    direccion: "",
    numeros_favoritos: "",
  });
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countryOptions[0]);
  const [cedulaError, setCedulaError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (initialData) {
      let phone = initialData.telefono || "";
      let country = countryOptions[0]; // Default
      let numberPart = phone;

      // Find the longest matching country code to handle cases like +593 vs +5
      const matchingCountry = countryOptions
        .sort((a, b) => b.code.length - a.code.length)
        .find(c => phone.startsWith(c.code));

      if (matchingCountry) {
        country = matchingCountry;
        numberPart = phone.substring(matchingCountry.code.length);
      }

      setSelectedCountry(country);
      setForm({
        nombre: initialData.nombre || "",
        apellido: initialData.apellido || "",
        cedula: initialData.cedula || "",
        email: initialData.email || "",
        telefono: numberPart,
        direccion: initialData.direccion || "",
        numeros_favoritos: Array.isArray(initialData.numeros_favoritos)
          ? initialData.numeros_favoritos.join(",")
          : initialData.numeros_favoritos || "",
      });
    } else {
      setForm({
        nombre: "",
        apellido: "",
        cedula: "",
        email: "",
        telefono: "",
        direccion: "",
        numeros_favoritos: "",
      });
      setSelectedCountry(countryOptions[0]);
    }
  }, [initialData, isOpen]);

  // Efecto para manejar cambios de país y revalidar el teléfono
  useEffect(() => {
    if (form.telefono) {
      const validation = validateVenezuelanPhone(form.telefono, selectedCountry.code);
      setPhoneError(validation.message);
    }
  }, [selectedCountry, form.telefono]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cedula') {
      // Permitir solo números y la letra V (para cédula venezolana)
      const cleanValue = value.replace(/[^0-9Vv]/g, '');
      // Formatear la cédula
      const formattedValue = formatCedula(cleanValue);
      setForm({ ...form, [name]: formattedValue });

      // Validar la cédula
      const validation = validateCedula(formattedValue);
      setCedulaError(validation.message);
    } else if (name === 'telefono') {
      // Permitir solo números para teléfono
      const cleanValue = value.replace(/\D/g, '');
      // Formatear el teléfono
      const formattedValue = applyPhoneMask(cleanValue, selectedCountry.code);
      setForm({ ...form, [name]: formattedValue });

      // Validar el teléfono
      const validation = validateVenezuelanPhone(formattedValue, selectedCountry.code);
      setPhoneError(validation.message);
    } else if (name === 'email') {
      // Actualizar el valor del email
      setForm({ ...form, [name]: value });

      // Validar el correo electrónico
      const validation = validateEmail(value);
      setEmailError(validation.message);
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar todos los campos antes de enviar
    const emailValidation = validateEmail(form.email);
    const cedulaValidation = validateCedula(form.cedula);
    const phoneValidation = validateVenezuelanPhone(form.telefono, selectedCountry.code);

    // Actualizar los estados de error
    setEmailError(emailValidation.message);
    setCedulaError(cedulaValidation.message);
    setPhoneError(phoneValidation.message);

    // Si hay algún error, no enviar el formulario
    if (!emailValidation.isValid || !cedulaValidation.isValid || !phoneValidation.isValid) {
      return;
    }

    setLoading(true);
    const data = {
      ...form,
      telefono: formatPhoneForDatabase(form.telefono, selectedCountry.code),
      numeros_favoritos: form.numeros_favoritos
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n),
      empresa_id: empresaId,
    };
    await onSave(data);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-[#181c24] border border-[#23283a] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#23283a] sticky top-0 bg-[#181c24] z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#7c3bed]/20 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-[#7c3bed]" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {initialData ? "Editar Jugador" : "Nuevo Jugador"}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a] disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid max-md:grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                  Información Personal
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Nombre *</label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        placeholder="Ingresa el nombre"
                        className="w-full pl-10 pr-4 py-3 bg-[#23283a] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Apellido *</label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="apellido"
                        value={form.apellido}
                        onChange={handleChange}
                        placeholder="Ingresa el apellido"
                        className="w-full pl-10 pr-4 py-3 bg-[#23283a] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Cédula</label>
                    <div className="relative">
                      <IdentificationIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="cedula"
                        value={form.cedula}
                        onChange={handleChange}
                        placeholder="V-12.345.678 o V-1.234.567"
                        className={`w-full pl-10 pr-4 py-3 bg-[#23283a] border rounded-lg text-white focus:outline-none transition-colors ${cedulaError ? 'border-red-500' : 'border-[#2d3748] focus:border-[#7c3bed]'}`}
                        disabled={loading}
                      />
                    </div>
                    {cedulaError && (
                      <p className="text-red-500 text-sm mt-1">{cedulaError}</p>
                    )}
                  </div>
                </div>
              </div>


            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <EnvelopeIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                  Información de Contacto
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Email</label>
                    <div className="relative">
                      <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="ejemplo@correo.com"
                        className={`w-full pl-10 pr-4 py-3 bg-[#23283a] border rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors ${emailError ? 'border-red-500' : 'border-[#2d3748]'}`}
                        disabled={loading}
                      />
                    </div>
                    {emailError && (
                      <p className="text-red-500 text-sm mt-1">{emailError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Teléfono</label>
                    <div className={`flex items-center bg-[#23283a] border rounded-lg focus-within:border-[#7c3bed] transition-colors ${phoneError ? 'border-red-500' : 'border-[#2d3748]'}`}>
                      <select
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const country = countryOptions.find(c => c.code === e.target.value);
                          setSelectedCountry(country);
                        }}
                        className="bg-transparent border-r border-[#2d3748] p-3 text-white outline-none rounded-l-lg cursor-pointer appearance-none"
                        disabled={loading}
                      >
                        {countryOptions.map(c => (
                          <option key={c.code} value={c.code} className="bg-[#181c24]">
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        name="telefono"
                        value={form.telefono}
                        onChange={handleChange}
                        placeholder={selectedCountry.placeholder || "414-1234567"}
                        className="bg-transparent flex-1 p-3 text-white outline-none"
                        disabled={loading}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-red-500 text-sm mt-1">{phoneError}</p>
                    )}
                  </div>
                </div>
              </div>
              {/* Additional Information */}
              <div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Números Favoritos</label>
                    <div className="relative">
                      <StarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="numeros_favoritos"
                        value={form.numeros_favoritos}
                        onChange={handleChange}
                        placeholder="1, 7, 13, 21 (separados por coma)"
                        className="w-full pl-10 pr-4 py-3 bg-[#23283a] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Ingresa los números favoritos separados por comas. Ejemplo: 1, 7, 13, 21
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex space-x-4 pt-6 border-t border-[#23283a] mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-[#23283a] hover:bg-[#2d3748] text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{initialData ? "Guardando..." : "Creando..."}</span>
                  </>
                ) : (
                  <span>{initialData ? "Guardar Cambios" : "Crear Jugador"}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}