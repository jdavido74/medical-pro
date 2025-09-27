// utils/userProfiles.js
// Exemples de profils utilisateurs avec spécialités et modules

export const USER_PROFILES_EXAMPLES = {
  // Médecin généraliste
  generalPractitioner: {
    id: 'dr_garcia',
    name: 'Dr. María García',
    email: 'maria.garcia@medicalpro.es',
    role: 'doctor',
    specialties: ['general'],
    medicalNumber: '123456789',
    avatar: '👩‍⚕️',
    companyName: 'Centro Médico García',
    plan: 'premium',
    permissions: {
      read: true,
      write: true,
      delete: false,
      manage: false
    },
    preferences: {
      language: 'es',
      timezone: 'Europe/Madrid',
      notifications: true
    }
  },

  // Cardiólogo
  cardiologist: {
    id: 'dr_martinez',
    name: 'Dr. Juan Martínez',
    email: 'juan.martinez@medicalpro.es',
    role: 'specialist',
    specialties: ['cardiology', 'general'],
    medicalNumber: '987654321',
    avatar: '👨‍⚕️',
    companyName: 'Clínica Cardiológica Martínez',
    plan: 'premium',
    permissions: {
      read: true,
      write: true,
      delete: true,
      manage: false
    },
    preferences: {
      language: 'es',
      timezone: 'Europe/Madrid',
      notifications: true
    }
  },

  // Pediatra
  pediatrician: {
    id: 'dr_lopez',
    name: 'Dr. Ana López',
    email: 'ana.lopez@medicalpro.es',
    role: 'specialist',
    specialties: ['pediatrics'],
    medicalNumber: '456789123',
    avatar: '👩‍⚕️',
    companyName: 'Pediatría López',
    plan: 'premium',
    permissions: {
      read: true,
      write: true,
      delete: false,
      manage: false
    },
    preferences: {
      language: 'es',
      timezone: 'Europe/Madrid',
      notifications: true
    }
  },

  // Enfermera
  nurse: {
    id: 'enf_rodriguez',
    name: 'Carmen Rodríguez',
    email: 'carmen.rodriguez@medicalpro.es',
    role: 'nurse',
    specialties: [], // Solo módulos básicos
    medicalNumber: '789123456',
    avatar: '👩‍⚕️',
    companyName: 'Hospital San Rafael',
    plan: 'free',
    permissions: {
      read: true,
      write: true, // Limitado a ciertos campos
      delete: false,
      manage: false
    },
    preferences: {
      language: 'es',
      timezone: 'Europe/Madrid',
      notifications: true
    }
  },

  // Secretaria médica
  secretary: {
    id: 'sec_fernandez',
    name: 'Isabel Fernández',
    email: 'isabel.fernandez@medicalpro.es',
    role: 'secretary',
    specialties: [],
    medicalNumber: null,
    avatar: '👩‍💼',
    companyName: 'Centro Médico San José',
    plan: 'free',
    permissions: {
      read: true,
      write: false, // Solo lectura
      delete: false,
      manage: false
    },
    preferences: {
      language: 'es',
      timezone: 'Europe/Madrid',
      notifications: false
    }
  },

  // Super Admin
  superAdmin: {
    id: 'admin_super',
    name: 'Super Administrador',
    email: 'admin@medicalpro.es',
    role: 'super_admin',
    specialties: ['*'], // Acceso a todas las especialidades
    medicalNumber: null,
    avatar: '🔧',
    companyName: 'MedicalPro Admin',
    plan: 'premium',
    permissions: {
      read: true,
      write: true,
      delete: true,
      manage: true
    },
    preferences: {
      language: 'es',
      timezone: 'Europe/Madrid',
      notifications: true
    }
  }
};

// Función para simular el login con diferentes perfiles
export const simulateLogin = (profileKey) => {
  const profile = USER_PROFILES_EXAMPLES[profileKey];
  if (!profile) {
    throw new Error(`Profile ${profileKey} not found`);
  }

  return {
    ...profile,
    timestamp: new Date().toISOString(),
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
};

// Configuración de módulos por especialidad
export const SPECIALTY_MODULE_CONFIG = {
  general: {
    required: ['base', 'preventive'],
    optional: ['chronic'],
    restricted: []
  },

  cardiology: {
    required: ['base', 'cardiac'],
    optional: ['preventive', 'chronic'],
    restricted: ['pediatric'] // Un cardiólogo no necesita módulos pediátricos
  },

  pediatrics: {
    required: ['base', 'pediatric'],
    optional: ['preventive'],
    restricted: ['cardiac'] // Los niños tienen consideraciones cardíacas especiales
  },

  dermatology: {
    required: ['base', 'skin'],
    optional: ['preventive'],
    restricted: ['cardiac', 'pediatric']
  },

  gynecology: {
    required: ['base', 'gyneco'],
    optional: ['preventive'],
    restricted: ['cardiac', 'pediatric']
  },

  orthopedics: {
    required: ['base', 'orthopedic'],
    optional: ['preventive'],
    restricted: ['cardiac', 'gyneco']
  }
};

// Función para obtener los módulos permitidos según el perfil
export const getModulesForProfile = (profile) => {
  let allowedModules = new Set(['base']); // Base siempre está incluido

  // Si es super admin, tiene acceso a todo
  if (profile.role === 'super_admin') {
    return ['*'];
  }

  // Según las especialidades del usuario
  profile.specialties?.forEach(specialty => {
    const config = SPECIALTY_MODULE_CONFIG[specialty];
    if (config) {
      // Añadir módulos requeridos
      config.required.forEach(module => allowedModules.add(module));

      // Añadir módulos opcionales según el rol
      if (profile.role === 'specialist' || profile.role === 'doctor') {
        config.optional.forEach(module => allowedModules.add(module));
      }
    }
  });

  // Restricciones según el rol
  if (profile.role === 'nurse') {
    // Las enfermeras solo tienen acceso a módulos básicos
    allowedModules = new Set(['base', 'preventive']);
  } else if (profile.role === 'secretary') {
    // Las secretarias solo ven información básica
    allowedModules = new Set(['base']);
  }

  return Array.from(allowedModules);
};

// Función para validar si un usuario puede acceder a un módulo
export const canAccessModule = (profile, moduleId) => {
  const allowedModules = getModulesForProfile(profile);

  // Super admin puede acceder a todo
  if (allowedModules.includes('*')) {
    return true;
  }

  return allowedModules.includes(moduleId);
};

// Función para validar si un usuario puede editar un módulo
export const canEditModule = (profile, moduleId) => {
  // Primero verificar si puede acceder
  if (!canAccessModule(profile, moduleId)) {
    return false;
  }

  // Verificar permisos de escritura
  if (!profile.permissions?.write) {
    return false;
  }

  // Restricciones específicas por rol
  if (profile.role === 'secretary') {
    return false; // Secretarias solo leen
  }

  if (profile.role === 'nurse') {
    // Enfermeras pueden editar solo ciertos campos del módulo base
    return moduleId === 'base' || moduleId === 'preventive';
  }

  return true;
};

// Función de utilidad para obtener el color de la especialidad
export const getSpecialtyColor = (specialtyId) => {
  const colors = {
    general: 'green',
    cardiology: 'red',
    pediatrics: 'blue',
    dermatology: 'orange',
    gynecology: 'pink',
    orthopedics: 'gray'
  };

  return colors[specialtyId] || 'gray';
};

// Datos de ejemplo para testing
export const DEMO_SCENARIOS = {
  // Escenario 1: Médico general con paciente adulto
  generalAdult: {
    user: USER_PROFILES_EXAMPLES.generalPractitioner,
    patient: {
      id: 'P001',
      name: 'Carlos Mendoza',
      age: 45,
      gender: 'M'
    },
    expectedModules: ['base', 'preventive', 'chronic']
  },

  // Escenario 2: Cardiólogo con paciente cardíaco
  cardiologyCase: {
    user: USER_PROFILES_EXAMPLES.cardiologist,
    patient: {
      id: 'P002',
      name: 'María González',
      age: 62,
      gender: 'F'
    },
    expectedModules: ['base', 'cardiac', 'preventive', 'chronic']
  },

  // Escenario 3: Pediatra con niño
  pediatricCase: {
    user: USER_PROFILES_EXAMPLES.pediatrician,
    patient: {
      id: 'P003',
      name: 'Sofía Ramírez',
      age: 5,
      gender: 'F'
    },
    expectedModules: ['base', 'pediatric', 'preventive']
  }
};

export default USER_PROFILES_EXAMPLES;