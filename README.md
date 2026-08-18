# Portal de seguimiento ODN

Ver `02_brief_desarrollo_claude_code.md` para el detalle funcional completo.

## Setup de Supabase

Correr en el SQL Editor de Supabase, en este orden:

1. `01_schema_supabase.sql` — esquema completo (tablas, triggers, RLS).
2. `03_migration_force_password_change.sql` — agrega el flag de cambio de
   contraseña obligatorio en primer login.

Crear también el bucket privado `nap-photos` desde Storage > New bucket.

Después, seguir `04_bootstrap_primer_superadmin.md` para dar de alta al
primer superadmin (ese alta se hace a mano desde el dashboard de Supabase,
no desde la app).

Completar `.env.local` con las credenciales del proyecto (ver
`.env.local.example`).

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
