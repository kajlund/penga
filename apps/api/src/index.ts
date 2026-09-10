import { AccountType } from '@penga/shared';

export function startServer(): void {
  console.log('Starting Penga API server...');
  console.log('Supported account types:', Object.values(AccountType));
}

startServer();
