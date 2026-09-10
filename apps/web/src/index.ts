import { AccountType } from '@penga/shared';

export function renderApp(): void {
  console.log('Rendering Penga Web App...');
  console.log('Account types available to UI:', Object.keys(AccountType));
}

renderApp();
