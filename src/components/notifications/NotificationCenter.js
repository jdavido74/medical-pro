// components/notifications/NotificationCenter.js
import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, AlertTriangle, CheckCircle, Info, Calendar } from 'lucide-react';
import { appointmentsStorage } from '../../utils/appointmentsStorage';

const NotificationCenter = ({ onNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [pendingReminders, setPendingReminders] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [followUpReport, setFollowUpReport] = useState(null);

  // Charger les notifications toutes les 30 secondes
  useEffect(() => {
    const loadNotifications = () => {
      try {
        const realTimeNotifications = appointmentsStorage.getRealTimeNotifications();
        const reminders = appointmentsStorage.getPendingReminders();
        const report = appointmentsStorage.generateFollowUpReport();

        setNotifications(realTimeNotifications);
        setPendingReminders(reminders);
        setFollowUpReport(report);
      } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh toutes les 30 secondes

    return () => clearInterval(interval);
  }, []);

  const getNotificationIcon = (type, level) => {
    switch (type) {
      case 'upcoming':
        return level === 'urgent' ?
          <AlertTriangle className="h-4 w-4 text-red-600" /> :
          <Clock className="h-4 w-4 text-yellow-600" />;
      case 'late':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'reminder':
        return <Bell className="h-4 w-4 text-blue-600" />;
      case 'follow_up':
        return <Calendar className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type, level) => {
    switch (level) {
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const handleReminderSent = (reminderId) => {
    try {
      appointmentsStorage.markReminderAsSent(reminderId);
      setPendingReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Erreur lors du marquage du rappel:', error);
    }
  };

  const totalNotifications = notifications.length + pendingReminders.length;
  const urgentCount = notifications.filter(n => n.level === 'urgent' || n.level === 'error').length;

  return (
    <div className="relative">
      {/* Bouton notification */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          urgentCount > 0
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : totalNotifications > 0
              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Bell className="h-6 w-6" />
        {totalNotifications > 0 && (
          <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-medium flex items-center justify-center ${
            urgentCount > 0 ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
          }`}>
            {totalNotifications > 9 ? '9+' : totalNotifications}
          </span>
        )}
      </button>

      {/* Panel de notifications */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Centre de notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {followUpReport && (
              <div className="mt-2 text-sm text-gray-600">
                {followUpReport.upcoming} RDV à venir • {followUpReport.followUpNeeded} suivis nécessaires
              </div>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* Notifications en temps réel */}
            {notifications.length > 0 && (
              <div className="p-3 border-b">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Notifications temps réel</h4>
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${getNotificationColor(notification.type, notification.level)}`}
                      onClick={() => {
                        onNotificationClick?.(notification);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type, notification.level)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs mt-1">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rappels en attente */}
            {pendingReminders.length > 0 && (
              <div className="p-3 border-b">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Rappels en attente</h4>
                <div className="space-y-2">
                  {pendingReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="p-3 rounded-lg border bg-blue-50 border-blue-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0 mt-0.5">
                            <Bell className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-blue-900">
                              Rappel {reminder.type === 'patient' ? 'patient' : 'praticien'}
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              {reminder.patientName} - {reminder.title}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              {new Date(reminder.appointmentDate).toLocaleDateString('fr-FR')} à {reminder.appointmentTime}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleReminderSent(reminder.id)}
                          className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Envoyé
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rapport de suivi */}
            {followUpReport && followUpReport.followUpNeeded > 0 && (
              <div className="p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Suivi requis</h4>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-900">
                      {followUpReport.followUpNeeded} rendez-vous nécessitent un suivi
                    </span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Taux de présence: {followUpReport.completionRate}% •
                    Taux d'absence: {followUpReport.noShowRate}%
                  </p>
                </div>
              </div>
            )}

            {/* Aucune notification */}
            {totalNotifications === 0 && (
              <div className="p-6 text-center text-gray-500">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">Aucune notification en attente</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;