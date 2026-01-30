// components/dashboard/modules/AppointmentsModule.js
import React, { useState, useEffect, useContext } from 'react';
import {
  Plus, Search, Calendar, Filter, Edit2, Trash2, Clock,
  User, Phone, ChevronUp, ChevronDown, MapPin, AlertCircle,
  Check, X, Bell, MoreVertical, RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import AppointmentContext from '../../../contexts/AppointmentContext';
import { patientsStorage } from '../../../utils/patientsStorage';
import { loadPractitioners } from '../../../utils/practitionersLoader';
import { isPractitionerRole } from '../../../utils/userRoles';
import { usePermissions } from '../../auth/PermissionGuard';
import AppointmentFormModal from '../../modals/AppointmentFormModal';
import AvailabilityManager from '../../calendar/AvailabilityManager';
import PractitionerFilter from '../../common/PractitionerFilter';
import {
  enrichAppointmentWithPermissions,
  filterAppointmentsByPermissions,
  shouldShowPractitionerFilter
} from '../../../utils/appointmentPermissions';
import { PERMISSIONS } from '../../../utils/permissionsStorage';
import { useLocale } from '../../../contexts/LocaleContext';

const AppointmentsModule = ({ navigateToPatient }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { locale } = useLocale();

  // Use AppointmentContext for API-based appointments
  const appointmentContext = useContext(AppointmentContext);
  const contextAppointments = appointmentContext?.appointments || [];

  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterPractitioner, setFilterPractitioner] = useState('all'); // 'all' pour vue globale
  const [practitioners, setPractitioners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Déterminer les permissions de l'utilisateur
  const canViewAllAppointments = shouldShowPractitionerFilter(hasPermission);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({
    today: 0,
    confirmed: 0,
    waiting: 0,
    avgDuration: '30min'
  });
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' ou 'availability'
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [preselectedDate, setPreselectedDate] = useState(null);
  const [preselectedTime, setPreselectedTime] = useState(null);
  const [preselectedPractitioner, setPreselectedPractitioner] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Pour forcer le rafraîchissement du calendrier

  // Charger les données - recharger quand le contexte change (nouveaux RDV)
  useEffect(() => {
    loadData();
    // Initialiser le praticien sélectionné seulement si l'utilisateur EST un praticien
    if (user && !selectedPractitioner && isPractitionerRole(user.role)) {
      setSelectedPractitioner(user);
    }
  }, [contextAppointments]);

  useEffect(() => {
    // Pour les praticiens, initialiser le filtre sur leurs propres RDV
    // Utiliser providerId (healthcare_provider.id) et non user.id (central user id)
    if (user && isPractitionerRole(user.role)) {
      if (!selectedPractitioner) {
        setSelectedPractitioner(user);
      }
      // Si l'utilisateur ne peut pas voir tous les RDV, forcer le filtre sur ses RDV
      const practitionerFilterId = user.providerId || user.id;
      if (!canViewAllAppointments && filterPractitioner !== practitionerFilterId) {
        setFilterPractitioner(practitionerFilterId);
      }
    }
    // Pour les secrétaires et admins, initialiser avec 'all'
    else if (user && (user.role === 'secretary' || user.role === 'admin')) {
      if (filterPractitioner !== 'all') {
        setFilterPractitioner('all');
      }
    }
  }, [user, canViewAllAppointments]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Charger les praticiens de la clinique via la fonction centralisée
      const allPractitioners = loadPractitioners(user);
      console.log('Praticiens chargés:', allPractitioners.length, allPractitioners);
      setPractitioners(allPractitioners);

      // Charger les rendez-vous depuis le contexte API (plus localStorage)
      let allAppointments = [...contextAppointments];
      console.log('[AppointmentsModule] Rendez-vous depuis contexte API:', allAppointments.length);

      // Filtrer les RDV supprimés
      allAppointments = allAppointments.filter(apt => !apt.deleted);

      // Note: Ne pas filtrer par praticien - les données viennent de l'API qui a déjà validé
      // Extraire les praticiens uniques des rendez-vous pour le filtre
      const practitionerIdsFromAppointments = [...new Set(allAppointments.map(apt => apt.practitionerId).filter(Boolean))];
      console.log('[AppointmentsModule] Praticiens dans les RDV:', practitionerIdsFromAppointments);

      // FILTRER selon les permissions: voir tous les RDV ou seulement les siens
      const filteredByPermissions = filterAppointmentsByPermissions(allAppointments, user, hasPermission);

      // Enrichir avec les données des patients
      const allPatients = patientsStorage.getAll();
      setPatients(allPatients);

      // ENRICHIR les RDV avec les données patient et praticien en respectant les permissions
      const enrichedAppointments = filteredByPermissions.map(appointment => {
        const patient = allPatients.find(p => p.id === appointment.patientId);
        const practitioner = allPractitioners.find(p => p.id === appointment.practitionerId);
        return enrichAppointmentWithPermissions(appointment, patient, practitioner, user, hasPermission);
      });

      setAppointments(enrichedAppointments);
      console.log(`[AppointmentsModule] Chargement des RDV: ${allAppointments.length} valides, ${filteredByPermissions.length} après permissions`);

      // Calculer les statistiques
      calculateStats(enrichedAppointments);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (appointments) => {
    const today = new Date().toISOString().split('T')[0];

    const todayAppointments = appointments.filter(apt => apt.date === today && !apt.deleted);
    const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmed' && !apt.deleted);
    const waitingAppointments = appointments.filter(apt => apt.status === 'in_progress' && !apt.deleted);

    const totalDuration = appointments
      .filter(apt => apt.status === 'completed' && !apt.deleted)
      .reduce((sum, apt) => sum + apt.duration, 0);
    const completedCount = appointments.filter(apt => apt.status === 'completed' && !apt.deleted).length;
    const avgDuration = completedCount > 0 ? Math.round(totalDuration / completedCount) : 30;

    setStats({
      today: todayAppointments.length,
      confirmed: confirmedAppointments.length,
      waiting: waitingAppointments.length,
      avgDuration: `${avgDuration}min`
    });
  };

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchQuery, filterStatus, filterDate, filterPractitioner, sortField, sortDirection]);

  const filterAppointments = () => {
    let filtered = appointments.filter(apt => !apt.deleted);

    // Filtrer par recherche
    if (searchQuery) {
      filtered = filtered.filter(appointment =>
        appointment.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.patientNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrer par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === filterStatus);
    }

    // Filtrer par praticien
    if (filterPractitioner !== 'all') {
      filtered = filtered.filter(appointment => appointment.practitionerId === filterPractitioner);
    }

    // Filtrer par date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filterDate) {
      case 'today':
        const todayStr = today.toISOString().split('T')[0];
        filtered = filtered.filter(appointment => appointment.date === todayStr);
        break;
      case 'week':
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        filtered = filtered.filter(appointment => {
          const appointmentDate = new Date(appointment.date);
          return appointmentDate >= today && appointmentDate <= weekEnd;
        });
        break;
      case 'month':
        const monthEnd = new Date(today);
        monthEnd.setMonth(today.getMonth() + 1);
        filtered = filtered.filter(appointment => {
          const appointmentDate = new Date(appointment.date);
          return appointmentDate >= today && appointmentDate <= monthEnd;
        });
        break;
      default:
        break;
    }

    // Trier
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'date') {
          aValue = new Date(`${a.date} ${a.startTime || '00:00'}`);
          bValue = new Date(`${b.date} ${b.startTime || '00:00'}`);
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredAppointments(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return t('appointments:statuses.scheduled');
      case 'confirmed': return t('appointments:statuses.confirmed');
      case 'in_progress': return t('appointments:statuses.in_progress');
      case 'completed': return t('appointments:statuses.completed');
      case 'cancelled': return t('appointments:statuses.cancelled');
      case 'no_show': return t('appointments:statuses.no_show');
      default: return status;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'consultation': return <User className="h-4 w-4" />;
      case 'followup': return <Clock className="h-4 w-4" />;
      case 'emergency': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'specialist': return <User className="h-4 w-4" />;
      case 'checkup': return <Calendar className="h-4 w-4" />;
      case 'vaccination': return <Plus className="h-4 w-4" />;
      case 'surgery': return <AlertCircle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  // Fonctions de gestion des rendez-vous
  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setPreselectedDate(null);
    setPreselectedTime(null);
    setIsAppointmentModalOpen(true);
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setPreselectedDate(null);
    setPreselectedTime(null);
    setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = (appointmentData) => {
    // Recharger les données pour synchroniser les deux vues
    loadData();
    // Incrémenter la clé de rafraîchissement pour forcer le rechargement du calendrier
    setRefreshKey(prev => prev + 1);
  };

  // Callback appelé depuis le calendrier quand un RDV est modifié
  const handleAppointmentUpdated = () => {
    loadData(); // Recharge automatiquement la liste
    setRefreshKey(prev => prev + 1); // Force le rafraîchissement du calendrier
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (window.confirm(t('appointments:messages.deleteConfirm'))) {
      try {
        if (appointmentContext?.deleteAppointment) {
          await appointmentContext.deleteAppointment(appointmentId);
        }
        setRefreshKey(prev => prev + 1); // Force le rafraîchissement du calendrier
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      if (appointmentContext?.updateAppointment) {
        await appointmentContext.updateAppointment(appointmentId, { status: newStatus });
      }
      setRefreshKey(prev => prev + 1); // Force le rafraîchissement du calendrier
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fonction pour planifier un rendez-vous depuis le calendrier
  const handleAppointmentScheduledFromCalendar = (date, time) => {
    setEditingAppointment(null);

    // Définir la date et l'heure pré-sélectionnées
    const selectedDate = date instanceof Date ? date.toISOString().split('T')[0] : date;
    setPreselectedDate(selectedDate);
    setPreselectedTime(time);

    // Pré-sélectionner le praticien actuellement filtré du calendrier
    if (filterPractitioner !== 'all') {
      const practitioner = practitioners.find(p => p.id === filterPractitioner);
      if (practitioner) {
        setPreselectedPractitioner(practitioner);
      }
    }

    setIsAppointmentModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('appointments:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tete : Titre + Bouton */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('appointments:title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('appointments:subtitle')}</p>
        </div>
        <button
          onClick={handleNewAppointment}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('appointments:newAppointment')}</span>
        </button>
      </div>

      {/* Navigation par onglets */}
      <div className="flex items-center">
        <div className="flex items-center bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === 'appointments' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
            }`}
          >
            {t('appointments:tabs.appointments')}
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === 'availability' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
            }`}
          >
            {t('appointments:tabs.availability')}
          </button>
        </div>
      </div>

      {/* Contenu conditionnel selon l'onglet */}
      {activeTab === 'appointments' ? (
        <>
          {/* Filtres et recherche */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('appointments:list.search')}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filtre de praticiens compact - intégré dans la ligne */}
          {canViewAllAppointments && (
            <PractitionerFilter
              practitioners={practitioners}
              selectedPractitionerId={filterPractitioner}
              onPractitionerChange={setFilterPractitioner}
              canViewAll={canViewAllAppointments}
              isPractitioner={false}
              currentUser={user}
            />
          )}

          {/* Filtre de statut */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">{t('appointments:filters.allStatuses')}</option>
              <option value="scheduled">{t('appointments:statuses.scheduled')}</option>
              <option value="confirmed">{t('appointments:statuses.confirmed')}</option>
              <option value="in_progress">{t('appointments:statuses.in_progress')}</option>
              <option value="completed">{t('appointments:statuses.completed')}</option>
              <option value="cancelled">{t('appointments:statuses.cancelled')}</option>
              <option value="no_show">{t('appointments:statuses.no_show')}</option>
            </select>
            <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>

          {/* Filtres de temps */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterDate(filterDate === 'today' ? 'all' : 'today')}
              className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                filterDate === 'today' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t('appointments:today')}
            </button>
            <button
              onClick={() => setFilterDate(filterDate === 'week' ? 'all' : 'week')}
              className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                filterDate === 'week' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t('appointments:thisWeek')}
            </button>
            <button
              onClick={() => setFilterDate(filterDate === 'month' ? 'all' : 'month')}
              className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                filterDate === 'month' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {t('appointments:thisMonth')}
            </button>
          </div>
          <button onClick={loadData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('appointments:stats.today')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('appointments:stats.confirmed')}</p>
              <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
            </div>
            <Check className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('appointments:stats.inProgress')}</p>
              <p className="text-2xl font-bold text-orange-600">{stats.waiting}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('appointments:stats.avgDuration')}</p>
              <p className="text-2xl font-bold text-blue-600">{stats.avgDuration}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Liste des rendez-vous */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">{t('appointments:list.title')} ({filteredAppointments.length})</h3>
            <div className="flex items-center space-x-2 text-sm">
              <button
                onClick={() => handleSort('date')}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
              >
                <span>{t('appointments:table.date')}</span>
                {sortField === 'date' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                )}
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => handleSort('patientName')}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
              >
                <span>{t('appointments:table.patient')}</span>
                {sortField === 'patientName' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getTypeIcon(appointment.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-medium text-gray-900">{appointment.patientName}</h4>
                      {appointment.patientNumber && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {appointment.patientNumber}
                        </span>
                      )}
                      {appointment.priority === 'urgent' && (
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded font-medium">
                          {t('appointments:priority.urgent')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(appointment.date).toLocaleDateString(locale)} à {appointment.startTime}
                        {appointment.additionalSlots && appointment.additionalSlots.length > 0 && (
                          <span className="ml-2 text-blue-600 font-medium">
                            +{appointment.additionalSlots.length} slot(s)
                          </span>
                        )}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {appointment.additionalSlots && appointment.additionalSlots.length > 0
                          ? appointment.duration * (1 + appointment.additionalSlots.length)
                          : appointment.duration} min
                      </span>
                      {hasPermission(PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER) && appointment.practitionerName && (
                        <span className="flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                          <User className="h-3 w-3 mr-1" />
                          {appointment.practitionerName}
                          {appointment.practitionerSpecialty && ` (${appointment.practitionerSpecialty})`}
                        </span>
                      )}
                      {appointment.patientPhone && (
                        <span className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {appointment.patientPhone}
                        </span>
                      )}
                      {appointment.location && (
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {appointment.location}
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      {/* Afficher le type de rendez-vous (traduit) - utiliser namespace:key */}
                      {appointment.type && (
                        <p className="text-gray-900 font-medium">
                          {t(`appointments:types.${appointment.type}`, { defaultValue: appointment.type })}
                        </p>
                      )}
                      {/* Afficher le titre seulement s'il est différent du nom du patient */}
                      {appointment.title && appointment.title !== appointment.patientName && (
                        <p className="text-gray-600 mt-1">{appointment.title}</p>
                      )}
                      {appointment.description && (
                        <p className="text-gray-600 mt-1">{appointment.description}</p>
                      )}
                      {appointment.notes && (
                        <p className="text-gray-500 text-xs mt-1">
                          <span className="font-medium">{t('appointments:list.internalNotes')}</span> {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {getStatusText(appointment.status)}
                  </span>

                  {/* Actions rapides selon le statut */}
                  {appointment.status === 'scheduled' && (
                    <button
                      onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                      className="p-1 hover:bg-green-100 rounded text-green-600 transition-colors"
                      title={t('appointments:actions.confirm')}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  {appointment.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(appointment.id, 'in_progress')}
                      className="p-1 hover:bg-yellow-100 rounded text-yellow-600 transition-colors"
                      title={t('appointments:actions.start')}
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                  )}
                  {appointment.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusChange(appointment.id, 'completed')}
                      className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                      title={t('appointments:actions.complete')}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleEditAppointment(appointment)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('appointments:actions.edit')}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAppointment(appointment.id)}
                    className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors"
                    title={t('appointments:actions.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredAppointments.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filterStatus !== 'all' || filterDate !== 'all'
              ? t('appointments:list.noAppointmentsFound')
              : t('appointments:list.noAppointmentsScheduled')
            }
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filterStatus !== 'all' || filterDate !== 'all'
              ? t('appointments:list.modifyFilters')
              : t('appointments:list.firstAppointment')
            }
          </p>
          <button
            onClick={handleNewAppointment}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t('appointments:newAppointment')}
          </button>
        </div>
      )}
        </>
      ) : (
        /* Onglet Calendrier - Gestion des disponibilités */
        <AvailabilityManager
          onAppointmentScheduled={handleAppointmentScheduledFromCalendar}
          onAppointmentUpdated={handleAppointmentUpdated}
          onAppointmentEdit={(appointment) => {
            setEditingAppointment(appointment);
            setIsAppointmentModalOpen(true);
          }}
          selectedPractitioner={filterPractitioner !== 'all' ? practitioners.find(p => p.id === filterPractitioner) : null}
          canViewAllPractitioners={canViewAllAppointments}
          refreshKey={refreshKey}
          filterPractitioner={filterPractitioner}
          onFilterPractitionerChange={setFilterPractitioner}
          contextAppointments={contextAppointments}
        />
      )}

      {/* Modal de rendez-vous */}
      <AppointmentFormModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setEditingAppointment(null);
          setPreselectedDate(null);
          setPreselectedTime(null);
          setPreselectedPractitioner(null);
        }}
        onSave={handleSaveAppointment}
        editingAppointment={editingAppointment}
        preselectedDate={preselectedDate}
        preselectedTime={preselectedTime}
        preselectedPractitioner={preselectedPractitioner}
      />
    </div>
  );
};

export default AppointmentsModule;