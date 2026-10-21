import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/materials')({
  beforeLoad: () => {
    throw redirect({ to: '/tracking' });
  },
  component: () => null,
});
