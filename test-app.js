// Test simple pour vérifier les imports
import React from 'react';
import { createRoot } from 'react-dom/client';

function TestApp() {
  return React.createElement('div', {}, 'Test App Working');
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(React.createElement(TestApp));