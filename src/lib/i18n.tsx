import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Lang = 'en' | 'rw';

type Messages = Record<string, Record<Lang, string>>;

const messages: Messages = {
  'lang.english': { en: 'English', rw: 'Icyongereza' },
  'lang.kinyarwanda': { en: 'Kinyarwanda', rw: 'Ikinyarwanda' },
  'app.title': { en: 'UCS Management System', rw: 'UCS Ubuyobozi bwa Sisitemu' },
  'app.subtitle': { en: 'Streamlined operations management', rw: "Ubuyobozi bw'imikorere bworoshye" },
  'app.systemOnline': { en: 'System Online', rw: 'Sisitemu Irakora' },
  'app.copyright': { en: ' 2023', rw: ' 2023' },
  'nav.help': { en: 'Help', rw: 'Ifashwa' },
  'nav.privacy': { en: 'Privacy', rw: 'Ubuzima bwite' },
  'nav.terms': { en: 'Terms', rw: 'Amasezerano' },
  // Weekdays
  'weekday.mon': { en: 'Monday', rw: 'Kuwa Mbere' },
  'weekday.tue': { en: 'Tuesday', rw: 'Kuwa Kabiri' },
  'weekday.wed': { en: 'Wednesday', rw: 'Kuwa Gatatu' },
  'weekday.thu': { en: 'Thursday', rw: 'Kuwa Kane' },
  'weekday.fri': { en: 'Friday', rw: 'Kuwa Gatanu' },
  'weekday.sat': { en: 'Saturday', rw: 'Kuwa Gatandatu' },
  'weekday.sun': { en: 'Sunday', rw: 'Ku Cyumweru' },
  // Client Dashboard
  'clientDashboard.title': { en: 'Client Dashboard', rw: 'Ibiro bya Umukiriya' },
  'clientDashboard.subtitle': { en: 'Welcome back! Manage your payments and account', rw: 'Murakaza neza! Tunganiriza kwishyura no kubika konti yawe' },
  'client.profile': { en: 'Client Profile', rw: 'Umwirondoro w’Umukiriya' },
  'common.verified': { en: 'Verified', rw: 'Byemejwe' },
  'clientDashboard.serviceDay': { en: 'Service Day', rw: 'Umunsi w’Isuku' },
  'clientDashboard.amountToPay': { en: 'Amount To Pay', rw: 'Amafaranga yo Kwishyura' },
  'clientDashboard.paidThisMonth': { en: 'Amount Paid This Month', rw: 'Amafaranga Yishyuwe Uku kwezi' },
  'clientDashboard.paymentUpToDate': { en: 'Payment up to date', rw: 'Kwishyura biri ku gihe' },
  'clientDashboard.paymentPending': { en: 'Payment pending', rw: 'Kwishyura biracyategereje' },
  'clientDashboard.serviceSchedule': { en: 'Service Schedule', rw: 'Igenamigambi ry’Isuku' },
  'clientDashboard.noSchedule': { en: 'No scheduled services yet.', rw: 'Nta igenamigambi ry’Isuku rirateganywa.' },
  // Payment
  'payment.makePayment': { en: 'Make a Payment', rw: 'Kora Kwishyura' },
  'payment.phoneNumber': { en: 'Phone Number', rw: 'Numero ya Telefone' },
  'payment.processing': { en: 'Processing Payment...', rw: 'Kwishyura Birimo Gukorwa...' },
  'payment.payNow': { en: 'Pay Now', rw: 'Ishyura Ubu' },
  'payment.infoTitle': { en: 'Payment Information', rw: 'Amakuru yo Kwishyura' },
  // Payments page
  'payments.title': { en: 'Payment Management', rw: 'Ubuyobozi bw’Imyishyurire' },
  'payments.subtitle': { en: 'Initiate mobile money payments and track transactions', rw: 'Tangira kwishyura ukoresheje mobile money kandi ukurikire imirimo' },
  'payments.totalTransactions': { en: 'Total Transactions', rw: 'Imirimo yose' },
  'common.refresh': { en: 'Refresh', rw: 'Ongera usubize' },
  'payments.initiatePayment': { en: 'Initiate Payment', rw: 'Tangira Kwishyura' },
  'payments.serviceName': { en: 'Mobile Money Service', rw: 'Serivisi ya Mobile Money' },
  'payments.amountRWF': { en: 'Amount (RWF)', rw: 'Amafaranga (RWF)' },
  'payments.phoneNumber': { en: 'Phone Number', rw: 'Numero ya Telefone' },
  'payments.paymentPurpose': { en: 'Payment Purpose', rw: 'Impamvu yo Kwishyura' },
  'payments.editPurpose': { en: 'Edit Purpose', rw: 'Hindura Impamvu' },
  'payments.doneEditing': { en: 'Done Editing', rw: 'Byarangiye Guhindura' },
  'payments.pendingThisMonth': { en: 'Pending Transactions — This month', rw: 'Imirimo Itegereje — Uku kwezi' },
  'payments.completedThisMonth': { en: 'Completed Payments — This month', rw: 'Imyishyurire Yarangijwe — Uku kwezi' },
  'payments.pendingTransactions': { en: 'Pending Transactions', rw: 'Imirimo Itegereje' },
  'payments.waitingCount': { en: '{count} waiting', rw: '{count} itegereje' },
  'payments.client': { en: 'Client', rw: 'Umukiriya' },
  'payments.amount': { en: 'Amount', rw: 'Amafaranga' },
  'payments.phone': { en: 'Phone', rw: 'Telefone' },
  'payments.complete': { en: 'Complete', rw: 'Hera iherezo' },
  'payments.noPendingTitle': { en: 'No Pending Transactions', rw: 'Nta Mirimo Itegereje' },
  'payments.noPendingDesc': { en: 'All transactions are processed and completed', rw: 'Imirimo yose yakorewe kandi yarangiye' },
  'payments.completedPayments': { en: 'Completed Payments', rw: 'Imyishyurire Yarangijwe' },
  'payments.processedCount': { en: '{count} processed', rw: '{count} byarangiye' },
  'payments.status': { en: 'Status', rw: 'Imiterere' },
  'payments.date': { en: 'Date', rw: 'Itariki' },
  'payments.noCompletedTitle': { en: 'No Completed Payments', rw: 'Nta Myishyurire Yarangijwe' },
  'payments.noCompletedDesc': { en: 'Completed payments will appear here', rw: 'Imyishyurire yarangiye izagaragara hano' },
  // Payments placeholders and templates
  'payments.payForMonth': { en: 'Pay for {month}', rw: 'Ishyura uku kwezi kwa {month}' },
  'payments.amountPlaceholder': { en: 'Enter amount', rw: 'Injiza amafaranga' },
  'payments.phonePlaceholder': { en: 'Enter phone number', rw: 'Injiza numero ya telefone' },
  'payments.purposePlaceholder': { en: 'Payment purpose', rw: 'Impamvu yo kwishyura' },
  'payments.transaction': { en: 'Transaction #{id}', rw: 'Transisiyo #{id}' },
  'payments.payment': { en: 'Payment #{id}', rw: 'Kwishyura #{id}' },
  // Reports
  'reports.title': { en: 'Reports', rw: 'Raporo' },
  'reports.filters.year': { en: 'Year', rw: 'Umwaka' },
  'reports.filters.month': { en: 'Month', rw: 'Ukwezi' },
  'reports.filters.zone': { en: 'Zone', rw: 'Agace' },
  'reports.filters.paidRemaining': { en: 'Paid & Remaining', rw: 'Byishyuwe & Bisigaye' },
  'reports.filters.supervisor': { en: 'Supervisor', rw: 'Umusuperivizo' },
  'reports.filters.startDate': { en: 'Start Date', rw: 'Itariki itangiriro' },
  'reports.filters.endDate': { en: 'End Date', rw: 'Itariki isoza' },
  'reports.filters.status': { en: 'Status', rw: 'Imiterere' },
  'reports.filters.all': { en: 'All', rw: 'Byose' },
  'reports.filters.paid': { en: 'Paid', rw: 'Byishyuwe' },
  'reports.filters.remaining': { en: 'Remaining', rw: 'Atarishyurwa' },
  'reports.status.all': { en: 'All', rw: 'Byose' },
  'reports.status.success': { en: 'Success', rw: 'Byakunze' },
  'reports.status.failed': { en: 'Failed', rw: 'Byanze' },
  'reports.status.pending': { en: 'Pending', rw: 'Birategereje' },
  'reports.manager.zonesSummary': { en: 'Zones Summary Report', rw: 'Inshamake y’Utugari' },
  'reports.columns.zone': { en: 'Zone', rw: 'Agace' },
  'reports.columns.clients': { en: '# Clients', rw: '# Abakiriya' },
  'reports.columns.toPay': { en: 'Amount To Pay', rw: 'Amafaranga yo Kwishyura' },
  'reports.columns.paid': { en: 'Amount Paid', rw: 'Amafaranga Yishyuwe' },
  'reports.columns.remaining': { en: 'Remaining', rw: 'Atarishyurwa' },
  'reports.noData': { en: 'No data found.', rw: 'Nta makuru abonetse.' },
  'reports.totals': { en: 'Totals', rw: 'Icyegeranyo' },
  'reports.chief.clientsHeading': { en: 'Clients', rw: 'Abakiriya' },
  'reports.downloadCsv': { en: 'Download CSV', rw: 'Kuramo CSV' },
  'reports.downloadPdf': { en: 'Download PDF', rw: 'Kuramo PDF' },
  'reports.chief.showingClients': { en: 'Showing clients in your assigned zones', rw: 'Abakiriya bo mu tugari washinzwe' },
  'reports.client.showingSummary': { en: 'Showing your monthly summary', rw: 'Ufashe mu kwezi kwawe' },
  'reports.payments.heading': { en: 'Payments (filtered)', rw: 'Imyishyurire (yahiswemo)' },
  'reports.myPayments.heading': { en: 'My Payments (filtered)', rw: 'Imyishyurire Yanjye (yahiswemo)' },
  'reports.period': { en: 'Period', rw: 'Igihe' },
  'reports.filter': { en: 'Filter', rw: 'Muyunguruzi' },
  'reports.supervisor': { en: 'Supervisor', rw: 'Umusuperivizo' },
  'reports.zones': { en: 'Zones', rw: 'Utugari' },
  'reports.count': { en: 'Count', rw: 'Umubare' },
  'reports.date': { en: 'Date', rw: 'Itariki' },
  'reports.client': { en: 'Client', rw: 'Umukiriya' },
  'reports.amount': { en: 'Amount', rw: 'Amafaranga' },
  'reports.currency': { en: 'Currency', rw: 'Ifaranga' },
  'reports.status': { en: 'Status', rw: 'Imiterere' },
  'reports.allZones': { en: 'All Zones', rw: 'Utugari Twose' },
  'reports.allSupervisors': { en: 'All Supervisors', rw: 'Abasuperivizo Bose' },
  'reports.company': { en: 'UCS Company Ltd.', rw: 'UCS Company Ltd.' },
  'reports.export.zonesTitle': { en: 'Zones Summary Report', rw: 'Raporo y’Inshamake y’Utugari' },
  'reports.export.chiefClientsTitle': { en: 'Chief Clients Report', rw: 'Raporo y’Abakiriya ba Chief' },
  'reports.export.chiefPaymentsTitle': { en: 'Chief Payments Report', rw: 'Raporo y’Imyishyurire ya Chief' },
  'reports.export.clientPaymentsTitle': { en: 'My Payments Report', rw: 'Raporo y’Imyishyurire Yanjye' },
  // Supervisor Dashboard
  'supervisor.title': { en: 'Zone Supervision', rw: 'Igenzura ry’Utugari' },
  'supervisor.subtitle': { en: 'Manage your assigned zones and oversee operations', rw: 'Tunganya utugari wahawe kandi ukurikirane imirimo' },
  'supervisor.systemsOk': { en: 'All Systems Operational', rw: 'Sisitemu zose zirakora' },
  'supervisor.stats.totalZones': { en: 'Total Zones', rw: 'Utugari Twose' },
  'supervisor.stats.assignedToYou': { en: 'Assigned to you', rw: 'Twaguhariwe' },
  'supervisor.stats.activeChiefs': { en: 'Active Chiefs', rw: 'Ba Chief Bakora' },
  'supervisor.stats.active': { en: 'Active', rw: 'Bakora' },
  'supervisor.stats.totalClients': { en: 'Total Clients', rw: 'Abakiriya Bose' },
  'supervisor.stats.acrossZones': { en: 'Across all zones', rw: 'Mu tugari twose' },
  'supervisor.stats.avgPerZone': { en: 'Avg per Zone', rw: 'Impuzandengo kuri Zone' },
  'supervisor.stats.clientsPerZone': { en: 'Clients per zone', rw: 'Abakiriya kuri zone' },
  'supervisor.trends.title': { en: 'Payment Trends', rw: 'Imigendekere y’Imyishyurire' },
  'supervisor.trends.subtitle': { en: 'Completed payments overview', rw: 'Incamake y’imyishyurire yarangiye' },
  'supervisor.trends.year': { en: 'Year', rw: 'Umwaka' },
  'supervisor.trends.monthly': { en: 'Monthly', rw: 'Buri kwezi' },
  'supervisor.trends.weekly': { en: 'Weekly', rw: 'Buri cyumweru' },
  'supervisor.trends.daily': { en: 'Daily', rw: 'Buri munsi' },
  'supervisor.trends.loading': { en: 'Loading payments...', rw: 'Kuremera imyishyurire...' },
  'supervisor.trends.empty': { en: 'No payments to display', rw: 'Nta myishyurire ihari' },
  'supervisor.yourZones.title': { en: 'Your Zones', rw: 'Utugari twawe' },
  'supervisor.yourZones.subtitle': { en: 'Manage and supervise your assigned zones', rw: 'Tunganya kandi ukurikirane utugari wahawe' },
  'supervisor.yourZones.assignedCount': { en: '{count} zone{suffix} assigned', rw: 'Utugari {count} twaguhariwe' },
  'supervisor.zone': { en: 'Zone', rw: 'Zone' },
  'supervisor.zoneChief': { en: 'Zone Chief', rw: 'Umugenzuzi wa Zone' },
  'supervisor.unassigned': { en: 'Unassigned', rw: 'Nta wayihariwe' },
  'supervisor.activeClients': { en: 'Active Clients', rw: 'Abakiriya Bakora' },
  'supervisor.manageZone': { en: 'Manage Zone', rw: 'Tunganya Zone' },
  'supervisor.noZones.title': { en: 'No zones assigned', rw: 'Nta zone waguhariwe' },
  'supervisor.noZones.desc': { en: "You haven't been assigned to any zones yet. Please contact your administrator to get started with zone supervision.", rw: 'Nta zone waguhariwe. Vugana n’umuyobozi wawe kugira ngo utangire igenzura rya zone.' },
  // Supervisor filters and errors
  'supervisor.filters.zone': { en: 'Zone', rw: 'Zone' },
  'supervisor.filters.startDate': { en: 'Start Date', rw: 'Itariki itangiriro' },
  'supervisor.filters.endDate': { en: 'End Date', rw: 'Itariki isoza' },
  'supervisor.filters.allZones': { en: 'All Zones', rw: 'Utugari Twose' },
  'supervisor.filters.onlyWithChief': { en: 'Only zones with a chief', rw: 'H only zone zifite Chief' },
  'supervisor.error.generic': { en: 'Something went wrong.', rw: 'Habaye ikibazo.' },
  'supervisor.retry': { en: 'Retry', rw: 'Ongera ugerageze' },
  'supervisor.quick.viewZones': { en: 'View Zones', rw: 'Reba Utugari' },
  'supervisor.quick.viewChiefs': { en: 'View Chiefs', rw: 'Reba Ba Chief' },
  'supervisor.quick.viewClients': { en: 'View Clients', rw: 'Reba Abakiriya' },
  // Pending tasks
  'supervisor.tasks.title': { en: 'Pending Service Tasks by Zone', rw: 'Imirimo itarangiye ku rwego rwa Zone' },
  'supervisor.tasks.zone': { en: 'Zone', rw: 'Zone' },
  'supervisor.tasks.count': { en: 'Pending', rw: 'Birategereje' },
  'supervisor.tasks.empty': { en: 'No pending tasks found.', rw: 'Nta mirimo itarangiye.' },
  'supervisor.tasks.error': { en: 'Failed to load pending tasks.', rw: 'Ntibyashobotse gukuraho imirimo itarangiye.' },
  // Manpower Dashboard
  'manpower.title': { en: 'Manpower Dashboard', rw: 'Ibiro bya Manpower' },
  'manpower.subtitle': { en: 'Your assignment and payroll overview', rw: 'Incamake y’imirimo n’umushahara' },
  'manpower.profileActive': { en: 'Profile Active', rw: 'Umwirondoro Urakora' },
  'manpower.name': { en: 'Name', rw: 'Izina' },
  'manpower.assignedVehicle': { en: 'Assigned Vehicle', rw: 'Imodoka Wahawe' },
  'manpower.driver': { en: 'Driver', rw: 'Umushoferi' },
  'manpower.supervisor': { en: 'Supervisor', rw: 'Umusuperivizo' },
  'manpower.notAssigned': { en: 'Not assigned', rw: 'Ntayeguriwe' },
  'manpower.salary': { en: 'Salary', rw: 'Umushahara' },
  'manpower.schedule.title': { en: 'Service Schedule', rw: 'Igenaminsi ry’Imirimo' },
  'manpower.schedule.none': { en: 'No scheduled services yet.', rw: 'Nta mirimo iteganyijwe.' },
  'manpower.zone': { en: 'Zone', rw: 'Agace' },
  'manpower.vehicle': { en: 'Vehicle', rw: 'Imodoka' },
  'manpower.team': { en: 'Team', rw: 'Itsinda' },
  'manpower.reason': { en: 'Reason', rw: 'Impamvu' },
  'status.pending': { en: 'Pending', rw: 'Birategereje' },
  'status.completed': { en: 'Completed', rw: 'Byarangiye' },
  'status.notCompleted': { en: 'Not Completed', rw: 'Ntabyo' },
  // Driver Dashboard
  'driver.title': { en: 'Driver Dashboard', rw: 'Ibiro by’Umushoferi' },
  'driver.subtitle': { en: 'Your vehicle assignment and routes overview', rw: 'Incamake y’imodoka n’inzira ugenzayo' },
  'driver.profileActive': { en: 'Profile Active', rw: 'Umwirondoro Urakora' },
  'driver.name': { en: 'Name', rw: 'Izina' },
  'driver.assignedCar': { en: 'Assigned Car (Plate)', rw: 'Imodoka Wahawe (Plaque)' },
  'driver.salary': { en: 'Salary', rw: 'Umushahara' },
  'driver.assignedZones': { en: 'Assigned Zones', rw: 'Utugari wahawe' },
  'driver.none': { en: 'None', rw: 'Nta na kimwe' },
  'driver.schedule.title': { en: 'Service Schedule', rw: 'Igenaminsi ry’Imirimo' },
  'driver.schedule.none': { en: 'No scheduled services yet.', rw: 'Nta mirimo iteganyijwe.' },
  'driver.zone': { en: 'Zone', rw: 'Agace' },
  'driver.vehicle': { en: 'Vehicle', rw: 'Imodoka' },
  'driver.team': { en: 'Team', rw: 'Itsinda' },
};

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
    return (stored === 'rw' || stored === 'en') ? (stored as Lang) : 'en';
  });

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch {}
  }

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>) => {
      const entry = messages[key];
      const template = entry ? (entry[lang] ?? entry['en'] ?? key) : key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (_, k: string) =>
        params[k] !== undefined && params[k] !== null ? String(params[k]) : `{${k}}`
      );
    };
  }, [lang]);

  useEffect(() => {
    try { document.documentElement.lang = lang; } catch {}
  }, [lang]);

  const value: I18nContextValue = { lang, setLang, t };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}
