/**
 * Index des utilitaires de sécurité
 *
 * Utilisation:
 * import { dataEncryption, secureDataAccess, sensitiveLevels } from '../../utils/security';
 */

export { dataEncryption } from './dataEncryption';
export { secureDataAccess } from './secureDataAccess';
export {
  SENSITIVITY_LEVELS,
  DATA_TYPE_SENSITIVITY,
  getSensitivityLevel,
  getFieldSensitivityLevel,
  isHighlySensitive,
  isFieldHighlySensitive,
  markSensitiveFields
} from './sensitiveLevels';
