/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { setAPIRequestTimingObserver } from './hooks/apiClient';
import 'mana-font/css/mana.css';
import './index.css';

if (
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  && new URLSearchParams(window.location.search).has('diagnostics')
) {
  setAPIRequestTimingObserver(timing => {
    console.debug('[Videre API timing]', timing);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
