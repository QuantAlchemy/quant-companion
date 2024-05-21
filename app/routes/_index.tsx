import type { MetaFunction } from '@remix-run/node';
import { Button, Typography } from '@mui/material';
// import { Link } from '@remix-run/react';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Remix SPA' },
    { name: 'description', content: 'Welcome to Remix (SPA Mode)!' },
  ];
};

export default function Index() {
  return (
    <div>
      <Typography>Hello Remix</Typography>
      <Button variant="contained">Primary Button</Button>
    </div>
  );
}
