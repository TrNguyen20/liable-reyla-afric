import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/audit-costs')({
  beforeLoad: () => {
    throw redirect({ to: '/tracking' });
  },
  component: () => null,
});
