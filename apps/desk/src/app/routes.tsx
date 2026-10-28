import { createBrowserRouter } from 'react-router';
import { CaseDetail } from '../screens/CaseDetail.js';
import { Cases } from '../screens/Cases.js';
import { ErrorScreen } from '../screens/ErrorScreen.js';
import { Ledger } from '../screens/Ledger.js';
import { Menu } from '../screens/Menu.js';
import { NotFound } from '../screens/NotFound.js';
import { Now } from '../screens/Now.js';
import { RecordDetail } from '../screens/RecordDetail.js';
import { Shell } from './Shell.js';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Shell,
    ErrorBoundary: ErrorScreen,
    children: [
      { index: true, Component: Now },
      { path: 'cases', Component: Cases },
      { path: 'cases/:id', Component: CaseDetail },
      { path: 'ledger', Component: Ledger },
      { path: 'records/:id', Component: RecordDetail },
      { path: 'menu', Component: Menu },
      { path: '*', Component: NotFound },
    ],
  },
]);
