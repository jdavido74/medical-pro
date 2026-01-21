#!/usr/bin/env node
/**
 * Test d'Intégration Frontend - Login Flow
 * Simule le comportement du frontend lors du login
 */

// Node 18+ has native fetch

const API_URL = 'http://localhost:3001/api/v1';
const TEST_USER = {
  email: 'test.migration@clinic-test.com',
  password: 'TestPass123'
};

// Couleurs pour output console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
}

async function testLoginFlow() {
  log('\n🧪 TEST D\'INTÉGRATION FRONTEND - LOGIN FLOW\n', 'cyan');
  log('═══════════════════════════════════════════════\n', 'cyan');

  let allTestsPassed = true;
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  try {
    // TEST 1: Login Request
    log('Test 1: POST /auth/login', 'blue');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    const loginData = await loginResponse.json();
    const test1Passed = loginData.success === true;
    results.total++;
    if (test1Passed) results.passed++; else results.failed++;
    logTest('Login successful', test1Passed, `Status: ${loginResponse.status}`);

    if (!test1Passed) {
      throw new Error('Login failed');
    }

    const { user, company, subscription, permissions, tokens } = loginData.data;

    // TEST 2: User Data Present
    log('\nTest 2: User Data', 'blue');
    const test2Checks = [
      { name: 'user.id', value: user?.id, check: !!user?.id },
      { name: 'user.email', value: user?.email, check: user?.email === TEST_USER.email },
      { name: 'user.firstName', value: user?.firstName, check: !!user?.firstName },
      { name: 'user.lastName', value: user?.lastName, check: !!user?.lastName },
      { name: 'user.role', value: user?.role, check: !!user?.role },
      { name: 'user.isActive', value: user?.isActive, check: user?.isActive === true }
    ];

    test2Checks.forEach(check => {
      results.total++;
      if (check.check) {
        results.passed++;
        logTest(`${check.name}: ${check.value}`, true);
      } else {
        results.failed++;
        allTestsPassed = false;
        logTest(`${check.name}: ${check.value}`, false);
      }
    });

    // TEST 3: Company Data Present
    log('\nTest 3: Company Data', 'blue');
    const test3Checks = [
      { name: 'company.id', value: company?.id, check: !!company?.id },
      { name: 'company.name', value: company?.name, check: !!company?.name },
      { name: 'company.country', value: company?.country, check: company?.country === 'FR' },
      { name: 'company.locale', value: company?.locale, check: company?.locale === 'fr-FR' },
      { name: 'company.settings', value: 'Object', check: typeof company?.settings === 'object' }
    ];

    test3Checks.forEach(check => {
      results.total++;
      if (check.check) {
        results.passed++;
        logTest(`${check.name}: ${check.value}`, true);
      } else {
        results.failed++;
        allTestsPassed = false;
        logTest(`${check.name}: ${check.value}`, false);
      }
    });

    // TEST 4: Subscription Data Present (CRITICAL)
    log('\nTest 4: Subscription Data (CRITICAL)', 'blue');
    const test4Checks = [
      { name: 'subscription exists', value: !!subscription, check: !!subscription },
      { name: 'subscription.status', value: subscription?.status, check: subscription?.status === 'active' },
      { name: 'subscription.plan', value: subscription?.plan, check: !!subscription?.plan },
      { name: 'subscription.features', value: `Array[${subscription?.features?.length || 0}]`, check: Array.isArray(subscription?.features) },
      { name: 'subscription.planLimits', value: 'Object', check: typeof subscription?.planLimits === 'object' },
      { name: 'subscription.usage', value: 'Object', check: typeof subscription?.usage === 'object' },
      { name: 'subscription.isActive', value: subscription?.isActive, check: subscription?.isActive === true }
    ];

    test4Checks.forEach(check => {
      results.total++;
      if (check.check) {
        results.passed++;
        logTest(`${check.name}: ${check.value}`, true);
      } else {
        results.failed++;
        allTestsPassed = false;
        logTest(`${check.name}: ${check.value}`, false, '⚠️  CRITICAL FIELD MISSING');
      }
    });

    // TEST 5: Permissions Data Present (CRITICAL)
    log('\nTest 5: Permissions Data (CRITICAL)', 'blue');
    const test5Checks = [
      { name: 'permissions exists', value: !!permissions, check: !!permissions },
      { name: 'permissions is Array', value: Array.isArray(permissions), check: Array.isArray(permissions) },
      { name: 'permissions.length > 0', value: permissions?.length || 0, check: (permissions?.length || 0) > 0 },
      { name: 'permissions format', value: permissions?.[0], check: permissions?.[0]?.includes(':') }
    ];

    test5Checks.forEach(check => {
      results.total++;
      if (check.check) {
        results.passed++;
        logTest(`${check.name}: ${check.value}`, true);
      } else {
        results.failed++;
        allTestsPassed = false;
        logTest(`${check.name}: ${check.value}`, false, '⚠️  CRITICAL FIELD MISSING');
      }
    });

    // TEST 6: Tokens Present
    log('\nTest 6: Tokens Data', 'blue');
    const test6Checks = [
      { name: 'tokens.accessToken', value: tokens?.accessToken ? '✓ Present' : '✗ Missing', check: !!tokens?.accessToken },
      { name: 'tokens.refreshToken', value: tokens?.refreshToken ? '✓ Present' : '✗ Missing', check: !!tokens?.refreshToken },
      { name: 'tokens.expiresIn', value: tokens?.expiresIn, check: !!tokens?.expiresIn }
    ];

    test6Checks.forEach(check => {
      results.total++;
      if (check.check) {
        results.passed++;
        logTest(`${check.name}: ${check.value}`, true);
      } else {
        results.failed++;
        allTestsPassed = false;
        logTest(`${check.name}: ${check.value}`, false);
      }
    });

    // TEST 7: /auth/me with Token
    log('\nTest 7: GET /auth/me (avec token)', 'blue');
    const meResponse = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`
      }
    });

    const meData = await meResponse.json();
    const test7Checks = [
      { name: '/auth/me success', value: meData.success, check: meData.success === true },
      { name: '/auth/me has user', value: !!meData.data?.user, check: !!meData.data?.user },
      { name: '/auth/me has company', value: !!meData.data?.company, check: !!meData.data?.company },
      { name: '/auth/me has subscription', value: !!meData.data?.subscription, check: !!meData.data?.subscription },
      { name: '/auth/me has permissions', value: !!meData.data?.permissions, check: !!meData.data?.permissions }
    ];

    test7Checks.forEach(check => {
      results.total++;
      if (check.check) {
        results.passed++;
        logTest(`${check.name}: ${check.value}`, true);
      } else {
        results.failed++;
        allTestsPassed = false;
        logTest(`${check.name}: ${check.value}`, false);
      }
    });

    // TEST 8: Frontend Would Work - Simulated Checks
    log('\nTest 8: Frontend Compatibility Checks', 'blue');

    // Simuler ce que le frontend SecureAuthContext fait
    const frontendChecks = [
      {
        name: 'hasPermission("users:read")',
        value: permissions.includes('users:read'),
        check: permissions.includes('users:read')
      },
      {
        name: 'hasPermission("patients:write")',
        value: permissions.includes('patients:write'),
        check: permissions.includes('patients:write')
      },
      {
        name: 'isSubscriptionActive()',
        value: subscription.isActive && subscription.status === 'active',
        check: subscription.isActive && subscription.status === 'active'
      },
      {
        name: 'hasFeature("appointments")',
        value: subscription.features.includes('appointments'),
        check: subscription.features.includes('appointments')
      },
      {
        name: 'Token can be decoded',
        value: tokens.accessToken.split('.').length === 3,
        check: tokens.accessToken.split('.').length === 3
      }
    ];

    frontendChecks.forEach(check => {
      results.total++;
      if (check.check) {
        results.passed++;
        logTest(`${check.name}: ${check.value}`, true);
      } else {
        results.failed++;
        allTestsPassed = false;
        logTest(`${check.name}: ${check.value}`, false);
      }
    });

    // RÉSUMÉ
    log('\n═══════════════════════════════════════════════', 'cyan');
    log('📊 RÉSUMÉ DES TESTS\n', 'cyan');

    const percentage = Math.round((results.passed / results.total) * 100);
    const statusColor = percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';

    log(`Total: ${results.total} tests`, 'blue');
    log(`Passés: ${results.passed} ✅`, 'green');
    log(`Échoués: ${results.failed} ❌`, 'red');
    log(`Pourcentage: ${percentage}%`, statusColor);

    log('\n═══════════════════════════════════════════════\n', 'cyan');

    if (allTestsPassed && results.failed === 0) {
      log('🎉 TOUS LES TESTS PASSENT - FRONTEND FONCTIONNEL! 🎉\n', 'green');
      return 0;
    } else {
      log('⚠️  CERTAINS TESTS ONT ÉCHOUÉ - VÉRIFIER LES DÉTAILS CI-DESSUS\n', 'red');
      return 1;
    }

  } catch (error) {
    log('\n❌ ERREUR CRITIQUE\n', 'red');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    return 1;
  }
}

// Exécuter les tests
testLoginFlow()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
